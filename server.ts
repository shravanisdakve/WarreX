import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import cors from 'cors';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Database Setup
const db = new Database('warranty_vault.db');
db.pragma('journal_mode = WAL');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    warranty_months INTEGER NOT NULL,
    expiry_date TEXT NOT NULL,
    invoice_file_url TEXT,
    invoice_text TEXT,
    invoice_number TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    scheduled_for DATETIME,
    sent_at DATETIME,
    error_message TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
  );
`);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

// ── Security Middleware ──────────────────────────────────────────────
// Helmet sets various HTTP security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for Vite dev HMR
  crossOriginEmbedderPolicy: false,
}));

// CORS – restrict to app origin
const allowedOrigins = [
  'http://localhost:3000',
  process.env.APP_URL || ''
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // In dev, allow all; tighten in prod
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

// Rate limiting for auth routes (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: { error: 'Too many attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Auth Middleware ──────────────────────────────────────────────────
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ── Auth Routes ──────────────────────────────────────────────────────
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
      const info = stmt.run(name, email, hashedPassword);
      res.status(201).json({ message: 'User created', userId: info.lastInsertRowid });
    } catch (e: any) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw e;
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as any;

    if (!user) return res.status(400).json({ error: 'User not found' });

    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Product Routes ───────────────────────────────────────────────────
app.get('/api/products/check-invoice', authenticateToken, (req: any, res) => {
  try {
    const { invoiceNumber } = req.query;
    if (!invoiceNumber) return res.json({ exists: false });
    const stmt = db.prepare('SELECT id, product_name FROM products WHERE user_id = ? AND invoice_number = ? LIMIT 1');
    const existing = stmt.get(req.user.id, invoiceNumber) as any;
    res.json({ exists: !!existing, productName: existing?.product_name });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products', authenticateToken, (req: any, res) => {
  try {
    const { search, expiringSoon, dateFrom, dateTo, category } = req.query;
    let query = 'SELECT * FROM products WHERE user_id = ?';
    const params: any[] = [req.user.id];

    if (search) {
      query += ' AND (product_name LIKE ? OR brand LIKE ? OR category LIKE ? OR invoice_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (dateFrom) {
      query += ' AND purchase_date >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ' AND purchase_date <= ?';
      params.push(dateTo);
    }

    if (expiringSoon === 'true') {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      query += ' AND expiry_date BETWEEN ? AND ?';
      params.push(today.toISOString().split('T')[0], thirtyDaysFromNow.toISOString().split('T')[0]);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const products = stmt.all(...params);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', authenticateToken, (req: any, res) => {
  try {
    const { productName, brand, category, purchaseDate, warrantyMonths, expiryDate, invoiceFileUrl, invoiceText, invoiceNumber, notes } = req.body;

    if (!productName || !category || !purchaseDate || !warrantyMonths || !expiryDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare(`
      INSERT INTO products (user_id, product_name, brand, category, purchase_date, warranty_months, expiry_date, invoice_file_url, invoice_text, invoice_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(req.user.id, productName, brand, category, purchaseDate, warrantyMonths, expiryDate, invoiceFileUrl, invoiceText, invoiceNumber, notes);
    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id — Update product
app.put('/api/products/:id', authenticateToken, (req: any, res) => {
  try {
    const { productName, brand, category, purchaseDate, warrantyMonths, expiryDate, invoiceFileUrl, invoiceText, invoiceNumber, notes } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const stmt = db.prepare(`
      UPDATE products SET
        product_name = COALESCE(?, product_name),
        brand = COALESCE(?, brand),
        category = COALESCE(?, category),
        purchase_date = COALESCE(?, purchase_date),
        warranty_months = COALESCE(?, warranty_months),
        expiry_date = COALESCE(?, expiry_date),
        invoice_file_url = COALESCE(?, invoice_file_url),
        invoice_text = COALESCE(?, invoice_text),
        invoice_number = COALESCE(?, invoice_number),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(productName, brand, category, purchaseDate, warrantyMonths, expiryDate, invoiceFileUrl, invoiceText, invoiceNumber, notes, req.params.id, req.user.id);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.get('/api/products/:id', authenticateToken, (req: any, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?');
    const product = stmt.get(req.params.id, req.user.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', authenticateToken, (req: any, res) => {
  try {
    // Also delete associated notifications
    db.prepare('DELETE FROM notifications WHERE product_id = ? AND user_id = ?').run(req.params.id, req.user.id);
    const stmt = db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?');
    const info = stmt.run(req.params.id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── File Upload ──────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
  'application/pdf'
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, GIF, BMP) and PDFs are allowed.'));
    }
  }
});

app.post('/api/upload/invoice', authenticateToken, (req: any, res: any) => {
  upload.single('invoice')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5 MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// ── Service Directory ────────────────────────────────────────────────
const serviceDirectory: Record<string, any> = {
  "Samsung": { phone: "1800-40-7267864", email: "support@samsung.com", website: "https://www.samsung.com/in/support/" },
  "LG": { phone: "1800-315-9999", email: "support@lg.com", website: "https://www.lg.com/in/support" },
  "Sony": { phone: "1800-103-7799", email: "support@sony.com", website: "https://www.sony.co.in/support" },
  "Apple": { phone: "000-800-040-1966", email: "", website: "https://support.apple.com/en-in" },
  "HP": { phone: "1800-108-4747", email: "", website: "https://support.hp.com/in-en" },
  "Dell": { phone: "1800-425-4026", email: "", website: "https://www.dell.com/support/home/en-in" },
  "Lenovo": { phone: "1800-419-7555", email: "", website: "https://support.lenovo.com/in/en" },
  "Whirlpool": { phone: "1800-208-1800", email: "", website: "https://www.whirlpoolindia.com/support" },
  "Bosch": { phone: "1800-266-1880", email: "", website: "https://www.bosch-home.in/support" },
  "OnePlus": { phone: "1800-102-8411", email: "support@oneplus.com", website: "https://www.oneplus.in/support" },
  "Xiaomi": { phone: "1800-103-6286", email: "service.in@xiaomi.com", website: "https://www.mi.com/in/support" },
  "Realme": { phone: "1800-102-2777", email: "service@realme.com", website: "https://www.realme.com/in/support" },
  "Panasonic": { phone: "1800-103-1333", email: "", website: "https://www.panasonic.com/in/support.html" },
  "Godrej": { phone: "1800-209-5511", email: "", website: "https://www.godrej.com/support" },
  "Voltas": { phone: "1800-599-9555", email: "", website: "https://www.voltas.com/contact-us" },
  "Haier": { phone: "1800-200-9999", email: "", website: "https://www.haier.com/in/support/" },
  "Asus": { phone: "1800-209-0365", email: "", website: "https://www.asus.com/in/support/" },
  "Acer": { phone: "1800-115-553", email: "", website: "https://www.acer.com/ac/en/IN/content/support" },
};

app.get('/api/service/:brand', (req, res) => {
  const brand = req.params.brand;
  const key = Object.keys(serviceDirectory).find(k => k.toLowerCase() === brand.toLowerCase());
  if (key) {
    res.json(serviceDirectory[key]);
  } else {
    res.status(404).json({ error: 'Brand not found in directory' });
  }
});

app.get('/api/service', (req, res) => {
  res.json(Object.keys(serviceDirectory));
});

// ── AI Assistant Backend ─────────────────────────────────────────────
app.post('/api/assistant', authenticateToken, async (req: any, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Fetch user's products for context
    const products = db.prepare('SELECT * FROM products WHERE user_id = ?').all(req.user.id) as any[];

    const productContext = products.map(p => {
      const daysLeft = Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return `- ${p.product_name} (${p.brand || 'No brand'}, ${p.category}): purchased ${p.purchase_date}, warranty ${p.warranty_months} months, expires ${p.expiry_date} (${daysLeft > 0 ? daysLeft + ' days left' : 'EXPIRED'})${p.invoice_number ? ', Invoice#: ' + p.invoice_number : ''}`;
    }).join('\n');

    const systemPrompt = `You are Warrify Assistant – a helpful, concise warranty management AI. You help users track product warranties, find service centers, draft complaint emails, and understand their warranty status.

Current user: ${req.user.name} (${req.user.email})
Today's date: ${new Date().toISOString().split('T')[0]}

User's registered products:
${productContext || 'No products registered yet.'}

Available service center brands: ${Object.keys(serviceDirectory).join(', ')}

Instructions:
- Be concise and helpful. Use bullet points where appropriate.
- When asked about warranty status, refer to the product list above.
- When asked about service centers, provide the contact info from the directory.
- When asked to draft a complaint email, write a professional email template.
- If the user asks in Hindi or Marathi, respond in that language.
- If unsure, politely say you can help with warranty checks, invoices, or service centers.
- Never make up product information not in the list above.`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      // Fallback: rule-based response when no API key
      const fallbackResponse = generateFallbackResponse(message, products, req.user.name);
      return res.json({ response: fallbackResponse });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\nUser message: ' + message }] }
        ],
      });

      const text = result.text || 'I apologize, I could not process your request. Please try again.';
      res.json({ response: text });
    } catch (aiError: any) {
      console.error('Gemini API error:', aiError.message);
      // Fallback to rule-based
      const fallbackResponse = generateFallbackResponse(message, products, req.user.name);
      res.json({ response: fallbackResponse });
    }

  } catch (error) {
    console.error('Assistant error:', error);
    res.status(500).json({ error: 'Assistant service unavailable' });
  }
});

// Rule-based fallback when Gemini API is unavailable
function generateFallbackResponse(query: string, products: any[], userName: string): string {
  const q = query.toLowerCase();

  // Warranty status check
  if (q.includes('warranty') || q.includes('expir') || q.includes('status')) {
    const product = products.find(p => q.includes(p.product_name.toLowerCase()) || q.includes(p.brand?.toLowerCase()));
    if (product) {
      const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        return `⚠️ The warranty for **${product.product_name}** expired ${Math.abs(daysLeft)} days ago (on ${product.expiry_date}). Consider purchasing an extended warranty if available.`;
      }
      return `✅ **${product.product_name}** warranty is active. It expires on ${product.expiry_date} (${daysLeft} days remaining).`;
    }
    if (products.length > 0) {
      const summary = products.map(p => {
        const dl = Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const status = dl < 0 ? '🔴 Expired' : dl <= 30 ? '🟡 Expiring Soon' : '🟢 Active';
        return `• **${p.product_name}** – ${status} (${dl > 0 ? dl + ' days left' : 'expired ' + Math.abs(dl) + ' days ago'})`;
      }).join('\n');
      return `Here's your warranty overview:\n\n${summary}`;
    }
    return 'You have no products registered yet. Add a product to start tracking warranties!';
  }

  // Invoice query
  if (q.includes('invoice') || q.includes('bill') || q.includes('receipt')) {
    const product = products.find(p => q.includes(p.product_name.toLowerCase()));
    if (product?.invoice_file_url) {
      return `📄 Invoice for **${product.product_name}**: [View Invoice](${product.invoice_file_url})${product.invoice_number ? '\nInvoice #: ' + product.invoice_number : ''}`;
    }
    return 'Please specify the product name, and make sure an invoice was uploaded when adding the product.';
  }

  // Complaint email
  if (q.includes('complaint') || q.includes('email') || q.includes('write') || q.includes('draft')) {
    const product = products.find(p => q.includes(p.product_name.toLowerCase()));
    if (product) {
      return `📧 **Draft Complaint Email:**\n\n**Subject:** Warranty Service Request – ${product.product_name}\n\n**Body:**\nDear ${product.brand || 'Customer'} Support Team,\n\nI purchased a ${product.product_name} on ${product.purchase_date}${product.invoice_number ? ' (Invoice #' + product.invoice_number + ')' : ''}. The product is under warranty until ${product.expiry_date}.\n\nI am writing to request service/repair due to [describe issue here].\n\nPlease arrange for the necessary support at the earliest.\n\nThank you,\n${userName}`;
    }
    return 'Please mention the product name so I can draft a complaint email for you.';
  }

  // Service center
  if (q.includes('service') || q.includes('support') || q.includes('contact') || q.includes('help') || q.includes('care')) {
    const brands = Object.keys(serviceDirectory);
    const brand = brands.find(b => q.includes(b.toLowerCase()));
    if (brand) {
      const info = serviceDirectory[brand];
      let response = `📞 **${brand} Service Center:**\n`;
      if (info.phone) response += `• Phone: ${info.phone}\n`;
      if (info.email) response += `• Email: ${info.email}\n`;
      if (info.website) response += `• Website: ${info.website}`;
      return response;
    }
    return `I can help with service center info for: ${brands.join(', ')}. Which brand do you need?`;
  }

  // General greeting
  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hello, ${userName}! 👋 I can help you with:\n• 📋 **Warranty status** – Ask about any product\n• 📄 **Invoice lookup** – Find your uploaded invoices\n• 📞 **Service centers** – Get brand contact info\n• 📧 **Complaint emails** – Draft professional emails\n\nJust ask away!`;
  }

  return `I can help with warranty checks, invoice lookup, service center info, and drafting complaint emails. Try asking:\n• "What's the warranty status of my products?"\n• "Show invoice for [product name]"\n• "Samsung service center contact"\n• "Draft complaint for [product name]"`;
}

// ── Upcoming Warranties Endpoint ─────────────────────────────────────
app.get('/api/products/upcoming/expiring', authenticateToken, (req: any, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

    const stmt = db.prepare(`
      SELECT * FROM products
      WHERE user_id = ? AND expiry_date BETWEEN ? AND ?
      ORDER BY expiry_date ASC
    `);
    const products = stmt.all(req.user.id, today, thirtyDaysStr);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch upcoming expirations' });
  }
});

// ── Notifications & Cron ─────────────────────────────────────────────
const sendEmail = async (to: string, subject: string, text: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`);
    return true;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
  return true;
};

app.post('/api/notifications/test', authenticateToken, async (req: any, res) => {
  try {
    const { productId } = req.body;
    const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?');
    const product = stmt.get(productId, req.user.id) as any;

    if (!product) return res.status(404).json({ error: 'Product not found' });

    const userStmt = db.prepare('SELECT email FROM users WHERE id = ?');
    const user = userStmt.get(req.user.id) as any;

    const subject = `TEST REMINDER: Warranty for ${product.product_name}`;
    const body = `This is a test reminder.\n\nProduct: ${product.product_name}\nExpiry Date: ${product.expiry_date}\n\nPlease check your dashboard for details.`;

    await sendEmail(user.email, subject, body);

    const logStmt = db.prepare('INSERT INTO notifications (user_id, product_id, type, status, sent_at) VALUES (?, ?, ?, ?, ?)');
    logStmt.run(req.user.id, productId, 'TEST', 'SENT', new Date().toISOString());

    res.json({ message: 'Test email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

app.get('/api/notifications', authenticateToken, (req: any, res) => {
  try {
    const stmt = db.prepare(`
      SELECT n.*, p.product_name
      FROM notifications n
      JOIN products p ON n.product_id = p.id
      WHERE n.user_id = ?
      ORDER BY n.sent_at DESC
    `);
    const logs = stmt.all(req.user.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Cron Job – check every minute in dev, daily at 9 AM in prod
cron.schedule('* * * * *', async () => {
  console.log('[CRON] Running warranty check...');
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const thirtyDays = new Date();
    thirtyDays.setDate(today.getDate() + 30);
    const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

    const sevenDays = new Date();
    sevenDays.setDate(today.getDate() + 7);
    const sevenDaysStr = sevenDays.toISOString().split('T')[0];

    const products30 = db.prepare('SELECT * FROM products WHERE expiry_date = ?').all(thirtyDaysStr) as any[];
    const products7 = db.prepare('SELECT * FROM products WHERE expiry_date = ?').all(sevenDaysStr) as any[];

    const processReminder = async (product: any, type: string) => {
      const checkStmt = db.prepare('SELECT * FROM notifications WHERE product_id = ? AND type = ? AND status = "SENT"');
      const existing = checkStmt.get(product.id, type);
      if (existing) return;

      const userStmt = db.prepare('SELECT email FROM users WHERE id = ?');
      const user = userStmt.get(product.user_id) as any;
      if (!user) return;

      const subject = `⚠️ Warranty Expiring Soon: ${product.product_name}`;
      const body = `Your product ${product.product_name} warranty expires on ${product.expiry_date}. You have ${type === '30_DAY' ? '30' : '7'} days left.\n\nVisit your Warrify dashboard to take action.`;

      try {
        await sendEmail(user.email, subject, body);
        db.prepare('INSERT INTO notifications (user_id, product_id, type, status, sent_at) VALUES (?, ?, ?, ?, ?)').run(product.user_id, product.id, type, 'SENT', new Date().toISOString());
        console.log(`[CRON] Sent ${type} reminder for ${product.product_name}`);
      } catch (e) {
        console.error(`[CRON] Failed to send email for ${product.product_name}`, e);
        db.prepare('INSERT INTO notifications (user_id, product_id, type, status, error_message) VALUES (?, ?, ?, ?, ?)').run(product.user_id, product.id, type, 'FAILED', String(e));
      }
    };

    for (const p of products30) await processReminder(p, '30_DAY');
    for (const p of products7) await processReminder(p, '7_DAY');

  } catch (error) {
    console.error('[CRON] Error:', error);
  }
});

// ── Start Server ─────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛡️  Warrify server running on http://localhost:${PORT}`);
  });
}

startServer();
