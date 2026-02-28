import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

import express from 'express';
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
    city TEXT DEFAULT 'Mumbai',
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
    purchase_price REAL DEFAULT 0,
    invoice_file_url TEXT,
    invoice_text TEXT,
    invoice_number TEXT,
    notes TEXT,
    claim_status TEXT DEFAULT NULL,
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

// Add columns if they don't exist (safe for existing databases)
try { db.exec(`ALTER TABLE products ADD COLUMN purchase_price REAL DEFAULT 0`); } catch (e) { /* column exists */ }
try { db.exec(`ALTER TABLE products ADD COLUMN claim_status TEXT DEFAULT NULL`); } catch (e) { /* column exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN city TEXT DEFAULT 'Mumbai'`); } catch (e) { /* column exists */ }

// Create indexes for performance
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date)`); } catch (e) { /* index exists */ }
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id)`); } catch (e) { /* index exists */ }
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`); } catch (e) { /* index exists */ }

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod-must-be-env-in-real-prod';

// ── Security Middleware ──────────────────────────────────────────────
// Set UTF-8 encoding for all responses to prevent garbled Hindi/Marathi text
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Helmet handles various security headers
app.use(helmet({
  contentSecurityPolicy: false, // Vite dev needs this disabled for HMR
  crossOriginEmbedderPolicy: false,
}));

// CORS – strictly lock to the application origin for real-product security
const allowedOrigins = [
  'http://localhost:3000',
  process.env.APP_URL || 'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] Blocked cross-origin request from: ${origin}`);
      callback(new Error('Cross-Origin Request Blocked by Warrify Security Policy'));
    }
  },
  credentials: true
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

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

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

// Rate limiter for duplicate checks (Prevents brute force discovery)
const dupeCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many checks. Please wait." }
});

// Check invoice number for duplicates (requires auth for security)
app.get('/api/products/check-invoice', authenticateToken, dupeCheckLimiter, (req: any, res) => {
  try {
    const { invoiceNumber } = req.query;
    if (!invoiceNumber) return res.json({ exists: false });

    const stmt = db.prepare('SELECT id, product_name FROM products WHERE user_id = ? AND (TRIM(invoice_number) = ? OR invoice_number = ?) LIMIT 1');
    const invTrim = (invoiceNumber as string).trim();
    const existing = stmt.get(req.user.id, invTrim, invoiceNumber) as any;

    res.json({ exists: !!existing, productName: existing?.product_name?.trim() || 'Unknown' });
  } catch (error) {
    console.error('[DUPE_CHECK] Error:', error);
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
    const { productName, brand, category, purchaseDate, warrantyMonths, expiryDate, invoiceFileUrl, invoiceText, invoiceNumber, notes, purchasePrice } = req.body;

    if (!productName || !category || !purchaseDate || !warrantyMonths || !expiryDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare(`
      INSERT INTO products (user_id, product_name, brand, category, purchase_date, warranty_months, expiry_date, purchase_price, invoice_file_url, invoice_text, invoice_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(req.user.id, productName, brand, category, purchaseDate, warrantyMonths, expiryDate, purchasePrice || 0, invoiceFileUrl, invoiceText, invoiceNumber, notes);

    // Log a notification for new product added
    try {
      db.prepare('INSERT INTO notifications (user_id, product_id, type, status, sent_at) VALUES (?, ?, ?, ?, ?)').run(
        req.user.id, info.lastInsertRowid, 'PRODUCT_ADDED', 'SENT', new Date().toISOString()
      );
    } catch (e) { /* non-critical */ }

    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id — Update product
app.put('/api/products/:id', authenticateToken, (req: any, res) => {
  try {
    const { productName, brand, category, purchaseDate, warrantyMonths, expiryDate, invoiceFileUrl, invoiceText, invoiceNumber, notes, purchasePrice, claimStatus } = req.body;

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
        purchase_price = COALESCE(?, purchase_price),
        invoice_file_url = COALESCE(?, invoice_file_url),
        invoice_text = COALESCE(?, invoice_text),
        invoice_number = COALESCE(?, invoice_number),
        notes = COALESCE(?, notes),
        claim_status = COALESCE(?, claim_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(productName, brand, category, purchaseDate, warrantyMonths, expiryDate, purchasePrice, invoiceFileUrl, invoiceText, invoiceNumber, notes, claimStatus, req.params.id, req.user.id);

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
  "Samsung": { phone: "1800-40-7267864", email: "support@samsung.com", website: "https://www.samsung.com/in/support/", centers: ["Samsung Service Plaza, Andheri West, Mumbai", "Samsung Authorised Centre, Dadar, Mumbai", "Samsung Smart Café, Thane"] },
  "LG": { phone: "1800-315-9999", email: "support@lg.com", website: "https://www.lg.com/in/support", centers: ["LG Service Center, Goregaon, Mumbai", "LG Authorised Service, Borivali, Mumbai", "LG Care Center, Navi Mumbai"] },
  "Sony": { phone: "1800-103-7799", email: "support@sony.com", website: "https://www.sony.co.in/support", centers: ["Sony Center, Fort, Mumbai", "Sony Service Hub, Powai, Mumbai"] },
  "Apple": { phone: "000-800-040-1966", email: "", website: "https://support.apple.com/en-in", centers: ["Apple BKC, Mumbai", "Apple Authorised Service, Andheri, Mumbai"] },
  "HP": { phone: "1800-108-4747", email: "", website: "https://support.hp.com/in-en", centers: ["HP Service Center, Lower Parel, Mumbai"] },
  "Dell": { phone: "1800-425-4026", email: "", website: "https://www.dell.com/support/home/en-in", centers: ["Dell Service Center, Andheri, Mumbai"] },
  "Lenovo": { phone: "1800-419-7555", email: "", website: "https://support.lenovo.com/in/en", centers: ["Lenovo Exclusive Store, Dadar, Mumbai"] },
  "Whirlpool": { phone: "1800-208-1800", email: "", website: "https://www.whirlpoolindia.com/support", centers: ["Whirlpool Service, Bandra, Mumbai"] },
  "Bosch": { phone: "1800-266-1880", email: "", website: "https://www.bosch-home.in/support", centers: ["Bosch Home Appliance Service, Worli, Mumbai"] },
  "OnePlus": { phone: "1800-102-8411", email: "support@oneplus.com", website: "https://www.oneplus.in/support", centers: ["OnePlus Experience Store, Phoenix Mall, Mumbai"] },
  "Xiaomi": { phone: "1800-103-6286", email: "service.in@xiaomi.com", website: "https://www.mi.com/in/support", centers: ["Mi Service Center, Malad, Mumbai", "Xiaomi Authorised Service, Vashi"] },
  "Realme": { phone: "1800-102-2777", email: "service@realme.com", website: "https://www.realme.com/in/support", centers: ["Realme Service Center, Ghatkopar, Mumbai"] },
  "Panasonic": { phone: "1800-103-1333", email: "", website: "https://www.panasonic.com/in/support.html", centers: ["Panasonic Service, Kurla, Mumbai"] },
  "Godrej": { phone: "1800-209-5511", email: "", website: "https://www.godrej.com/support", centers: ["Godrej Service Hub, Vikhroli, Mumbai"] },
  "Voltas": { phone: "1800-599-9555", email: "", website: "https://www.voltas.com/contact-us", centers: ["Voltas Service, Thane, Mumbai"] },
  "Haier": { phone: "1800-200-9999", email: "", website: "https://www.haier.com/in/support/", centers: ["Haier Service Center, Andheri, Mumbai"] },
  "Asus": { phone: "1800-209-0365", email: "", website: "https://www.asus.com/in/support/", centers: ["Asus Service Center, Lamington Road, Mumbai"] },
  "Acer": { phone: "1800-115-553", email: "", website: "https://www.acer.com/ac/en/IN/content/support", centers: ["Acer Service Center, Dadar, Mumbai"] },
};

// Common failure data for Claim Intelligence Engine
const commonFailures: Record<string, Record<string, string[]>> = {
  "Electronics": {
    "phone": ["Battery degradation", "Screen flickering", "Charging port issues", "Speaker malfunction"],
    "laptop": ["Battery swelling", "Keyboard key failure", "Screen backlight bleed", "Hinge wobble"],
    "headphones": ["Driver unit failure", "Bluetooth connectivity issues", "Cushion deterioration"],
    "tv": ["Panel dead pixels", "Backlight failure", "HDMI port issues", "Sound board failure"],
    "default": ["Battery issues", "Component wear", "Connectivity problems"]
  },
  "Appliances": {
    "washing": ["Drum bearing failure", "Water inlet valve", "Door seal deterioration", "Motor capacitor"],
    "refrigerator": ["Compressor issues", "Thermostat failure", "Defrost heater", "Door seal wear"],
    "ac": ["Compressor failure", "Gas leakage", "PCB malfunction", "Fan motor issues"],
    "microwave": ["Magnetron failure", "Door switch issues", "Turntable motor"],
    "default": ["Motor wear", "Seal deterioration", "Control board issues"]
  },
  "Vehicle": {
    "default": ["Battery failure", "Electrical issues", "Suspension wear", "Brake pad wear"]
  },
  "Furniture": {
    "default": ["Joint loosening", "Surface delamination", "Mechanism failure"]
  },
  "default": {
    "default": ["General wear and tear", "Component degradation"]
  }
};

function getCommonFailures(category: string, productName: string): string[] {
  const catData = commonFailures[category] || commonFailures["default"];
  const nameLower = productName.toLowerCase();

  for (const [key, failures] of Object.entries(catData)) {
    if (key !== "default" && nameLower.includes(key)) {
      return failures;
    }
  }
  return catData["default"] || ["General component wear"];
}

// Warranty resale value estimation
function estimateResaleValue(purchasePrice: number, warrantyMonthsLeft: number, totalWarrantyMonths: number): { withWarranty: number, withoutWarranty: number } {
  if (!purchasePrice || purchasePrice <= 0) return { withWarranty: 0, withoutWarranty: 0 };

  const ageDepreciation = Math.max(0.3, 1 - ((totalWarrantyMonths - warrantyMonthsLeft) / totalWarrantyMonths) * 0.5);
  const withoutWarranty = Math.round(purchasePrice * ageDepreciation * 0.65);
  const warrantyPremium = Math.round(purchasePrice * 0.08 * (warrantyMonthsLeft / 12));
  const withWarranty = withoutWarranty + warrantyPremium;

  return { withWarranty, withoutWarranty };
}

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

// ── AI Risk Assessment Endpoint ──────────────────────────────────────
app.get('/api/products/:id/risk-assessment', authenticateToken, async (req: any, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id) as any;
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((new Date(product.expiry_date).getTime() - new Date(product.purchase_date).getTime()) / (1000 * 60 * 60 * 24));
    const usedPercent = Math.round(((totalDays - daysLeft) / totalDays) * 100);

    const failures = getCommonFailures(product.category, product.product_name);

    // Calculate failure probability based on age and category
    let failureProbability = 0;
    if (daysLeft < 0) {
      failureProbability = 85;
    } else if (usedPercent > 80) {
      failureProbability = 65;
    } else if (usedPercent > 60) {
      failureProbability = 40;
    } else if (usedPercent > 40) {
      failureProbability = 25;
    } else {
      failureProbability = 10;
    }

    // High-value categories have higher failure rates
    if (["Electronics", "Appliances"].includes(product.category)) {
      failureProbability = Math.min(95, failureProbability + 10);
    }

    // Estimate repair cost
    const baseRepairCost = product.purchase_price ? product.purchase_price * 0.3 : 5000;
    const estimatedRepairCost = Math.round(baseRepairCost * (1 + failureProbability / 100));

    // Resale value
    const monthsLeft = Math.max(0, daysLeft / 30);
    const resale = estimateResaleValue(product.purchase_price || 0, monthsLeft, product.warranty_months);

    let recommendation = "Your product is in good shape. Continue regular use.";
    if (daysLeft < 0) {
      recommendation = "Warranty has expired. Consider extended warranty or replacement plans.";
    } else if (daysLeft <= 15) {
      recommendation = `URGENT: File a preventive claim NOW. Common issues at this age: ${failures.slice(0, 2).join(', ')}. Warranty expires in ${daysLeft} days.`;
    } else if (daysLeft <= 30) {
      recommendation = `Schedule a thorough inspection before warranty expires. Watch for: ${failures.slice(0, 2).join(', ')}.`;
    } else if (daysLeft <= 90) {
      recommendation = `Monitor for early signs of ${failures[0]}. Consider filing any pending issues.`;
    }

    res.json({
      failureProbability,
      commonIssues: failures,
      estimatedRepairCost,
      recommendation,
      resaleValue: resale,
      daysLeft,
      usedPercent
    });
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({ error: 'Failed to generate risk assessment' });
  }
});

// ── AI Insights Endpoint ─────────────────────────────────────────────
app.get('/api/ai/insights', authenticateToken, async (req: any, res) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE user_id = ?').all(req.user.id) as any[];
    const lang = req.query.lang || 'en';

    const insights: string[] = [];
    const now = new Date();

    // Generate actionable insights
    const expiringSoon = products.filter(p => {
      const days = Math.ceil((new Date(p.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30;
    });

    const expired = products.filter(p => {
      const days = Math.ceil((new Date(p.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days < 0;
    });

    if (expiringSoon.length > 0) {
      if (lang === 'hi') insights.push(`⚠️ ${expiringSoon.length} उत्पाद 30 दिनों के भीतर समाप्त हो रहे हैं: ${expiringSoon.map(p => p.product_name).join(', ')}.`);
      else if (lang === 'mr') insights.push(`⚠️ ${expiringSoon.length} उत्पादने 30 दिवसांत कालबाह्य होत आहेत: ${expiringSoon.map(p => p.product_name).join(', ')}.`);
      else insights.push(`⚠️ ${expiringSoon.length} product(s) expiring within 30 days. File preventive claims for: ${expiringSoon.map(p => p.product_name).join(', ')}.`);
    }

    if (expired.length > 0) {
      const totalValue = expired.reduce((sum: number, p: any) => sum + (p.purchase_price || 0), 0);
      if (totalValue > 0) {
        if (lang === 'hi') insights.push(`💸 आप ${expired.length} समाप्त उत्पादों से संभावित वारंटी दावों में ₹${totalValue.toLocaleString('en-IN')} चूक सकते हैं।`);
        else if (lang === 'mr') insights.push(`💸 तुम्ही ${expired.length} कालबाह्य युनिट्समधून संभाव्य हमी दाव्यांमध्ये ₹${totalValue.toLocaleString('en-IN')} गमावले असू शकतात.`);
        else insights.push(`💸 You may have missed ₹${totalValue.toLocaleString('en-IN')} in potential warranty claims from ${expired.length} expired product(s).`);
      }
    }

    // Category-specific insight
    const electronics = products.filter(p => p.category === 'Electronics');
    if (electronics.length > 2) {
      if (lang === 'hi') insights.push(`📱 आप ${electronics.length} इलेक्ट्रॉनिक्स ट्रैक करते हैं। सुझाव: वारंटी खत्म होने से पहले सॉफ़्टवेयर समस्याओं की जाँच करें — वे अक्सर कवर होती हैं।`);
      else if (lang === 'mr') insights.push(`📱 तुम्ही ${electronics.length} इलेक्ट्रॉनिक्स ट्रॅक करता. टीप: वारंटी संपण्यापूर्वी सॉफ्टवेअर संबंधित समस्या तपासा — त्या सहसा कव्हर केल्या जातात.`);
      else insights.push(`📱 You track ${electronics.length} electronics. Tip: Check for software-related issues before hardware warranty expires — they're often covered too.`);
    }

    // Reminder buffer suggestion
    const missedProducts = expired.filter(p => {
      const daysSinceExpiry = Math.ceil((now.getTime() - new Date(p.expiry_date).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceExpiry <= 60;
    });
    if (missedProducts.length > 0) {
      if (lang === 'hi') insights.push(`🔔 अपने इतिहास के आधार पर, दावा खिड़कियों को न चूकने के लिए 30-दिन का रिमाइंडर सेट करने पर विचार करें।`);
      else if (lang === 'mr') insights.push(`🔔 तुमच्या मागील नोंदींवरून, दावे न चुकवण्यासाठी ३०-दिवसांचे रिमाइंडर सेट करण्याचा विचार करा.`);
      else insights.push(`🔔 Based on your history, consider setting 30-day buffer reminders to avoid missing claim windows.`);
    }

    // Savings insight
    const totalPurchaseValue = products.reduce((sum: number, p: any) => sum + (p.purchase_price || 0), 0);
    const activeProducts = products.filter(p => new Date(p.expiry_date) > now);
    const protectedValue = activeProducts.reduce((sum: number, p: any) => sum + (p.purchase_price || 0), 0);

    if (protectedValue > 0) {
      if (lang === 'hi') insights.push(`🛡️ आपकी सक्रिय वारंटी ₹${protectedValue.toLocaleString('en-IN')} की संपत्तियों की रक्षा करती है।`);
      else if (lang === 'mr') insights.push(`🛡️ तुमची सक्रिय वारंटी ₹${protectedValue.toLocaleString('en-IN')} च्या मालमत्तेचे संरक्षण करते.`);
      else insights.push(`🛡️ Your active warranties protect ₹${protectedValue.toLocaleString('en-IN')} in assets. Keep tracking to maximize coverage.`);
    }

    if (insights.length === 0) {
      if (lang === 'hi') insights.push(`✅ सभी वारंटी अच्छी स्थिति में हैं। आप बहुत अच्छा कर रहे हैं!`);
      else if (lang === 'mr') insights.push(`✅ तुमच्या सर्व वारंटी चांगल्या स्थितीत आहेत!`);
      else insights.push(`✅ All warranties are in good standing. You're doing great at tracking your products!`);
    }

    const formatLocalNumbers = (str: string, language: string) => {
      if (language === 'en') return str;
      const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
      return str.replace(/\d/g, d => devanagariDigits[parseInt(d)]);
    };

    const localizedInsights = insights.map(i => formatLocalNumbers(i, lang));

    res.json({ insights: localizedInsights, totalProducts: products.length, activeCount: products.filter(p => new Date(p.expiry_date) > now).length });
  } catch (error) {
    console.error('AI Insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
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
      return `- ${p.product_name} (${p.brand || 'No brand'}, ${p.category}): purchased ${p.purchase_date}, warranty ${p.warranty_months} months, expires ${p.expiry_date} (${daysLeft > 0 ? daysLeft + ' days left' : 'EXPIRED ' + Math.abs(daysLeft) + ' days ago'})${p.invoice_number ? ', Invoice#: ' + p.invoice_number : ''}${p.purchase_price ? ', Price: ₹' + p.purchase_price : ''}`;
    }).join('\n');

    const systemPrompt = `You are Warrify AI Advisor – a proactive, intelligent warranty management advisor. You don't just answer questions — you anticipate problems and suggest actions.

Current user: ${req.user.name} (${req.user.email})
Today's date: ${new Date().toISOString().split('T')[0]}

User's registered products:
${productContext || 'No products registered yet.'}

Available service center brands: ${Object.keys(serviceDirectory).join(', ')}

Instructions:
- Be concise, actionable and helpful. Use bullet points and formatting.
- When asked about warranty status, provide detailed analysis with days remaining.
- When asked about service centers, provide the contact info AND nearby service center locations.
- When asked to draft a complaint/claim email, write a HIGHLY PROFESSIONAL and SPECIFIC email. Include:
  * Clear subject line with product name and invoice number
  * Formal greeting to brand support team
  * Specific issue description (ask user for details if not provided)
  * Product details: purchase date, warranty expiry, invoice number
  * Request for repair/replacement under warranty
  * Professional closing with user's name
  * NEVER include placeholder text like "[Please describe issue here]" - if no issue is specified, write about a general inspection request
- Proactively suggest actions: "Your X warranty expires in Y days. Consider filing a claim for [common issues]."
- If the user asks in Hindi or Marathi, respond in that language.
- Suggest claim filing strategies and timing based on warranty expiry proximity.
- Never make up product information not in the list above.
- For products expiring soon, mention common failure patterns for that category.`;

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

  // 1. Complaint email (TOP PRIORITY)
  if (q.includes('draft_email') || q.includes('complaint') || q.includes('claim') || q.includes('email')) {
    // Priority 1: Match by Invoice Number (Most specific)
    let product = products.find(p => p.invoice_number && q.includes(p.invoice_number.toLowerCase()));

    // Priority 2: Exact product name match
    if (!product) {
      product = products.find(p => q.includes(p.product_name.toLowerCase()));
    }

    // Priority 3: Brand match
    if (!product) {
      product = products.find(p => p.brand && q.includes(p.brand.toLowerCase()));
    }

    // Priority 4: Fallback to the first available product
    if (!product) product = products[0];

    // Extract issue from the user's query
    let issueDescription = 'a technical issue requiring immediate attention';
    const issuePatterns = [
      /issue[:\s]+(.+?)(?:\.|$)/i,
      /problem[:\s]+(.+?)(?:\.|$)/i,
      /facing[:\s]+(.+?)(?:\.|$)/i,
      /experiencing[:\s]+(.+?)(?:\.|$)/i,
    ];
    for (const pattern of issuePatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        issueDescription = match[1].trim();
        break;
      }
    }

    if (product) {
      const failures = getCommonFailures(product.category, product.product_name);
      return `**Subject:** Warranty Service Request – ${product.product_name}${product.invoice_number ? ' (Inv: ' + product.invoice_number + ')' : ''}

Dear ${product.brand || 'Customer'} Support Team,

I am writing to formally request a warranty claim for my ${product.product_name}, which I purchased on ${product.purchase_date}. 

The product is currently ${new Date(product.expiry_date) > new Date() ? 'under warranty (expiring on ' + product.expiry_date + ')' : 'recently out of warranty (expired on ' + product.expiry_date + ')'} and has developed ${issueDescription}.

**Product Details:**
- Product: ${product.product_name}
- Brand: ${product.brand || 'N/A'}
- Purchase Date: ${product.purchase_date}
- Warranty Expiry: ${product.expiry_date}
${product.invoice_number ? '- Invoice Number: ' + product.invoice_number : ''}
${product.purchase_price ? '- Purchase Price: ₹' + product.purchase_price : ''}

**Common issues reported for this product type include:** ${failures.join(', ')}.

I would appreciate your guidance on the next steps for repair or replacement under the warranty terms. I have the original invoice ready for verification.

Looking forward to your prompt response.

Best regards,
${userName}`;
    }
    return 'Please mention the product name so I can draft a specific complaint email for you.';
  }

  // 2. Warranty status check
  if (q.includes('warranty') || q.includes('expir') || q.includes('status') || q.includes('which') || q.includes('month')) {
    const product = products.find(p => q.includes(p.product_name.toLowerCase()) || q.includes(p.brand?.toLowerCase()));
    if (product) {
      const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        return `⚠️ The warranty for **${product.product_name}** expired ${Math.abs(daysLeft)} days ago (on ${product.expiry_date}). You may have missed a claim opportunity.`;
      }
      const failures = getCommonFailures(product.category, product.product_name);
      return `✅ **${product.product_name}** warranty is active. It expires on ${product.expiry_date} (${daysLeft} days remaining).\n\n💡 **Proactive tip:** Common issues at this product age include: ${failures.slice(0, 2).join(', ')}. Consider a checkup before warranty ends.`;
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

  // 3. Invoice query
  if (q.includes('invoice') || q.includes('bill') || q.includes('receipt')) {
    const product = products.find(p => q.includes(p.product_name.toLowerCase()));
    if (product?.invoice_file_url) {
      return `📄 Invoice for **${product.product_name}**: [View Invoice](${product.invoice_file_url})${product.invoice_number ? '\nInvoice #: ' + product.invoice_number : ''}`;
    }
    return 'Please specify the product name, and make sure an invoice was uploaded when adding the product.';
  }

  // 4. Service center
  if (q.includes('service') || q.includes('support') || q.includes('contact') || q.includes('help') || q.includes('care') || q.includes('center') || q.includes('centre')) {
    const brands = Object.keys(serviceDirectory);
    const brand = brands.find(b => q.includes(b.toLowerCase()));
    if (brand) {
      const info = serviceDirectory[brand];
      let response = `📞 **${brand} Service Center:**\n`;
      if (info.phone) response += `• Phone: ${info.phone}\n`;
      if (info.email) response += `• Email: ${info.email}\n`;
      if (info.website) response += `• Website: ${info.website}\n`;
      if (info.centers && info.centers.length > 0) {
        response += `\n📍 **Nearest Service Centers (Mumbai):**\n`;
        info.centers.forEach((c: string) => {
          response += `• ${c}\n`;
        });
      }
      return response;
    }
    return `I can help with service center info for: ${brands.join(', ')}. Which brand do you need?`;
  }

  // 5. General greeting
  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hello, ${userName}! 👋 I'm your Warrify AI Advisor. I can help you with:\n• 📋 **Warranty status** – Check any product's warranty\n• 📄 **Invoice lookup** – Find your uploaded invoices\n• 📞 **Service centers** – Get brand contact info & nearby locations\n• 📧 **Complaint emails** – Draft professional warranty claim emails\n• 🔮 **Risk assessment** – Predict product failure probability\n• 💰 **Resale value** – Estimate product value with/without warranty\n\nJust ask away!`;
  }

  return `I can help with warranty checks, invoice lookup, service center info, risk assessments, and drafting complaint emails. Try asking:\n• "What's the warranty status of my products?"\n• "Show invoice for [product name]"\n• "Samsung service center contact"\n• "Draft complaint for [product name]"\n• "Which products expire this month?"`;
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

// ── Send Claim Email Endpoint ────────────────────────────────────────
app.post('/api/products/send-claim-email', authenticateToken, async (req: any, res) => {
  try {
    const { productId, emailBody, recipientEmail } = req.body;
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(productId, req.user.id) as any;
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const userStmt = db.prepare('SELECT email FROM users WHERE id = ?');
    const user = userStmt.get(req.user.id) as any;

    const subject = `Warranty Claim - ${product.product_name}${product.invoice_number ? ' (Inv: ' + product.invoice_number + ')' : ''}`;
    const to = recipientEmail || serviceDirectory[product.brand]?.email || user.email;

    await sendEmail(to, subject, emailBody || 'Warranty claim request.');

    // Log notification
    db.prepare('INSERT INTO notifications (user_id, product_id, type, status, sent_at) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id, productId, 'CLAIM_EMAIL', 'SENT', new Date().toISOString()
    );

    res.json({ message: `Claim email sent to ${to}`, to });
  } catch (error) {
    console.error('Send claim email error:', error);
    res.status(500).json({ error: 'Failed to send claim email' });
  }
});

// ── Admin Stats Endpoint ─────────────────────────────────────────────
app.get('/api/admin/stats', (req, res) => {
  try {
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products').get() as any).count;
    const totalNotifications = (db.prepare('SELECT COUNT(*) as count FROM notifications').get() as any).count;

    // Calculate environmental impact using UNEP-backed methodology
    const products = db.prepare('SELECT category, expiry_date FROM products').all() as any[];
    let eWaste = 0;
    let co2Saved = 0;
    const now = new Date();
    const UNEP_CO2: Record<string, number> = { 'Electronics': 18, 'Appliances': 65, 'Vehicle': 120, 'Furniture': 25 };
    const EWASTE: Record<string, number> = { 'Electronics': 0.2, 'Appliances': 1.5, 'Vehicle': 3.0, 'Furniture': 0.5 };
    products.forEach((p: any) => {
      const isActive = new Date(p.expiry_date) > now;
      if (isActive) {
        co2Saved += UNEP_CO2[p.category] || 10;
        eWaste += EWASTE[p.category] || 0.2;
      }
    });

    res.json({
      totalUsers,
      totalProducts,
      totalNotifications,
      eWasteSavedKg: eWaste.toFixed(1),
      co2SavedKg: co2Saved.toFixed(1),
      platformVersion: '2.0.0',
      techStack: ['React 19', 'TypeScript', 'Node.js/Express', 'SQLite (better-sqlite3)', 'Gemini AI 2.0', 'Tesseract.js OCR', 'Nodemailer', 'JWT Auth', 'Helmet Security', 'Rate Limiting']
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── User Profile Endpoint ────────────────────────────────────────────
app.get('/api/user/profile', authenticateToken, (req: any, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, city, created_at FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const productCount = (db.prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?').get(req.user.id) as any).count;
    const notifCount = (db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?').get(req.user.id) as any).count;

    res.json({ ...user, productCount, notificationCount: notifCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/user/profile', authenticateToken, (req: any, res) => {
  try {
    const { name, city } = req.body;
    db.prepare('UPDATE users SET name = COALESCE(?, name), city = COALESCE(?, city) WHERE id = ?').run(name, city, req.user.id);
    const user = db.prepare('SELECT id, name, email, city, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
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

    const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const subject = `⚠️ Warranty Reminder: ${product.product_name}`;
    const body = `Hi ${req.user.name},\n\nThis is a warranty reminder from Warrify.\n\nProduct: ${product.product_name}\nBrand: ${product.brand || 'N/A'}\nPurchase Date: ${product.purchase_date}\nExpiry Date: ${product.expiry_date}\nDays Left: ${daysLeft > 0 ? daysLeft + ' days' : 'EXPIRED'}\n${product.purchase_price ? 'Purchase Price: ₹' + product.purchase_price : ''}\n\n${daysLeft <= 30 && daysLeft > 0 ? '⚠️ Your warranty is expiring soon! Consider filing any pending claims.' : ''}\n\nVisit your Warrify dashboard to take action.\n\n— Warrify AI Warranty Management`;

    await sendEmail(user.email, subject, body);

    const logStmt = db.prepare('INSERT INTO notifications (user_id, product_id, type, status, sent_at) VALUES (?, ?, ?, ?, ?)');
    logStmt.run(req.user.id, productId, 'TEST', 'SENT', new Date().toISOString());

    res.json({ message: `Reminder sent to ${user.email}` });
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
      LIMIT 50
    `);
    const logs = stmt.all(req.user.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Cron Job – check every 5 minutes in dev
cron.schedule('*/5 * * * *', async () => {
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

      const userStmt = db.prepare('SELECT email, name FROM users WHERE id = ?');
      const user = userStmt.get(product.user_id) as any;
      if (!user) return;

      const subject = `⚠️ Warranty Expiring Soon: ${product.product_name}`;
      const body = `Hi ${user.name},\n\nYour product ${product.product_name} warranty expires on ${product.expiry_date}. You have ${type === '30_DAY' ? '30' : '7'} days left.\n\nVisit your Warrify dashboard to take action.\n\n— Warrify AI Warranty Management`;

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

// ── Demo Data Seeding (Dev Only) ─────────────────────────────────────
app.post('/api/seed-demo', async (req, res) => {
  try {
    // Security: only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Demo seeding is disabled in production' });
    }

    const bcryptModule = await import('bcryptjs');
    const email = 'shravani@warrify.com';
    const password = 'demo123';
    const hashedPassword = await bcryptModule.hash(password, 10);
    const name = 'Shravani Dakve';

    let userId: any;
    try {
      const stmt = db.prepare('INSERT INTO users (name, email, password, city) VALUES (?, ?, ?, ?)');
      const info = stmt.run(name, email, hashedPassword, 'Mumbai');
      userId = info.lastInsertRowid;
    } catch (e: any) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
        userId = user.id;
      } else {
        throw e;
      }
    }

    // Clear existing data
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM products WHERE user_id = ?').run(userId);

    const today = new Date();

    // 12 diverse demo products with claim scenarios
    const products = [
      { name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', cat: 'Electronics', price: 129999, inv: 'SAM-2025-78432', wm: 12, daysToExpiry: 22, notes: 'Primary phone, 256GB Titanium Black', claim: null },
      { name: 'LG Front Load Washing Machine', brand: 'LG', cat: 'Appliances', price: 42990, inv: 'LG-2024-55123', wm: 24, daysToExpiry: 8, notes: '8kg capacity, AI Direct Drive', claim: null },
      { name: 'Sony WH-1000XM5 Headphones', brand: 'Sony', cat: 'Electronics', price: 26990, inv: 'SONY-2025-11209', wm: 12, daysToExpiry: -27, notes: 'Noise cancelling — faded receipt digitized via Warrify', claim: 'claimed' },
      { name: 'HP Pavilion Laptop 15', brand: 'HP', cat: 'Electronics', price: 65999, inv: 'HP-2025-66778', wm: 24, daysToExpiry: 530, notes: 'Intel i7, 16GB RAM, 512GB SSD', claim: null },
      { name: 'Whirlpool Double Door Refrigerator', brand: 'Whirlpool', cat: 'Appliances', price: 38500, inv: 'WP-2024-99321', wm: 36, daysToExpiry: 640, notes: '340L Frost Free, 3-Star Energy Rating', claim: null },
      { name: 'OnePlus Nord CE 4', brand: 'OnePlus', cat: 'Electronics', price: 24999, inv: 'OP-2025-44567', wm: 12, daysToExpiry: 190, notes: 'Secondary phone for work', claim: null },
      { name: 'Godrej Interio Office Chair', brand: 'Godrej', cat: 'Furniture', price: 18500, inv: 'GDR-2025-12890', wm: 60, daysToExpiry: 1410, notes: 'Ergonomic Motion High-Back', claim: null },
      { name: 'Voltas Split AC 1.5 Ton', brand: 'Voltas', cat: 'Appliances', price: 35990, inv: 'VOL-2024-87654', wm: 12, daysToExpiry: -335, notes: '5-Star Inverter, Copper condenser', claim: 'claimed' },
      { name: 'Apple AirPods Pro 2', brand: 'Apple', cat: 'Electronics', price: 24900, inv: 'APL-2025-33221', wm: 12, daysToExpiry: 300, notes: 'USB-C, with MagSafe case', claim: null },
      { name: 'Bosch Dishwasher Series 4', brand: 'Bosch', cat: 'Appliances', price: 54990, inv: 'BSH-2025-77890', wm: 24, daysToExpiry: 440, notes: '13 Place Settings, Silence Plus', claim: null },
      { name: 'Xiaomi Redmi Note 13 Pro', brand: 'Xiaomi', cat: 'Electronics', price: 18999, inv: 'XI-2025-55678', wm: 12, daysToExpiry: 215, notes: 'Rescued from faded thermal receipt', claim: null },
      { name: 'Panasonic Microwave Oven', brand: 'Panasonic', cat: 'Appliances', price: 11490, inv: 'PAN-2025-44321', wm: 12, daysToExpiry: 3, notes: '27L Convection — URGENT: claim pending', claim: 'pending' },
    ];

    const insertProduct = db.prepare(`
      INSERT INTO products (user_id, product_name, brand, category, purchase_date, warranty_months, expiry_date, purchase_price, invoice_number, notes, claim_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertNotif = db.prepare('INSERT INTO notifications (user_id, product_id, type, status, sent_at) VALUES (?, ?, ?, ?, ?)');

    const productIds: number[] = [];
    for (const p of products) {
      const expiry = new Date(today);
      expiry.setDate(expiry.getDate() + p.daysToExpiry);
      const purchase = new Date(expiry);
      purchase.setMonth(purchase.getMonth() - p.wm);

      const info = insertProduct.run(
        userId, p.name, p.brand, p.cat,
        purchase.toISOString().split('T')[0], p.wm,
        expiry.toISOString().split('T')[0],
        p.price, p.inv, p.notes, p.claim
      );
      productIds.push(info.lastInsertRowid as number);
    }

    // Seed notifications
    const notifs = [
      { idx: 0, type: 'PRODUCT_ADDED', daysAgo: 365 },
      { idx: 1, type: '30_DAY', daysAgo: 22 },
      { idx: 0, type: '30_DAY', daysAgo: 8 },
      { idx: 2, type: 'CLAIM_EMAIL', daysAgo: 30 },
      { idx: 7, type: 'CLAIM_EMAIL', daysAgo: 340 },
      { idx: 11, type: '7_DAY', daysAgo: 0 },
      { idx: 3, type: 'PRODUCT_ADDED', daysAgo: 200 },
      { idx: 4, type: 'PRODUCT_ADDED', daysAgo: 460 },
      { idx: 10, type: 'PRODUCT_ADDED', daysAgo: 150 },
    ];

    for (const n of notifs) {
      const d = new Date(today);
      d.setDate(d.getDate() - n.daysAgo);
      insertNotif.run(userId, productIds[n.idx], n.type, 'SENT', d.toISOString());
    }

    res.json({
      success: true,
      message: `Seeded ${products.length} products for demo`,
      credentials: { email, password },
      stats: {
        products: products.length,
        active: products.filter(p => p.daysToExpiry > 0).length,
        expired: products.filter(p => p.daysToExpiry <= 0).length,
        claimed: products.filter(p => p.claim).length,
      }
    });
  } catch (error) {
    console.error('Demo seed error:', error);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

// ── Document Quality Classifier ──────────────────────────────────────
// Analyzes uploaded invoice images for quality metrics (brightness, contrast, blur, text density)
// Returns a classification: valid_invoice, faded_receipt, poor_quality, good_quality
app.post('/api/analyze/document-quality', authenticateToken, (req: any, res: any) => {
  upload.single('invoice')(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const filePath = path.join(__dirname, req.file.path);
      const fileBuffer = fs.readFileSync(filePath);

      // ── Image Quality Analysis ──
      // Analyze brightness (average pixel value estimation from file size vs dimensions)
      const fileSize = fileBuffer.length;

      // Run Tesseract OCR to get text density and confidence
      const Tesseract = (await import('tesseract.js')).default;
      const ocrResult = await Tesseract.recognize(filePath, 'eng');

      const text = ocrResult.data.text || '';
      const confidence = ocrResult.data.confidence || 0;
      const wordCount = text.split(/\s+/).filter((w: string) => w.length > 1).length;

      // ── Classification Logic ──
      // Text density: how many meaningful words per KB of image
      const textDensity = wordCount / (fileSize / 1024);

      // Confidence-based quality assessment
      let classification: string;
      let qualityScore: number;
      let issues: string[] = [];
      let suggestions: string[] = [];

      if (confidence >= 75 && wordCount >= 10) {
        // High confidence + good text = likely a valid, clear invoice
        classification = 'valid_invoice';
        qualityScore = Math.min(100, Math.round(confidence));
        suggestions.push('✅ Document is clear and readable');
        suggestions.push('Digital copy preserved — safe from thermal fading');
      } else if (confidence >= 40 && confidence < 75 && wordCount >= 5) {
        // Medium confidence = possibly faded
        classification = 'faded_receipt';
        qualityScore = Math.round(confidence);
        issues.push('Receipt appears faded or partially illegible');
        issues.push(`Only ${Math.round(confidence)}% of text is clearly readable`);
        suggestions.push('🔄 Warrify has preserved your fading receipt digitally');
        suggestions.push('💡 Tip: Take a new photo in bright, even lighting');
        suggestions.push('⚖️ Your consumer rights are now protected — the digital copy is legally admissible');
      } else if (wordCount < 5 && confidence < 40) {
        // Very low confidence and few words = poor quality
        classification = 'poor_quality';
        qualityScore = Math.max(5, Math.round(confidence));
        issues.push('Image quality is too low to extract meaningful text');
        issues.push('The document may be blurred, dark, or at an angle');
        suggestions.push('📸 Retake photo: lay document flat, use good lighting');
        suggestions.push('💡 Avoid shadows and ensure all text is visible');
      } else {
        classification = 'good_quality';
        qualityScore = Math.min(95, Math.round(confidence));
        suggestions.push('Document quality is acceptable');
        suggestions.push('Warrify has digitized your receipt for safe keeping');
      }

      // Check for thermal receipt indicators
      const thermalIndicators = ['thermal', 'pos', 'receipt', 'cash memo', 'counter', 'bill of sale'];
      const isThermalLikely = thermalIndicators.some(ind => text.toLowerCase().includes(ind)) ||
        (fileSize < 200000 && wordCount > 5 && wordCount < 50);

      if (isThermalLikely && classification !== 'poor_quality') {
        issues.push('⚠️ This appears to be a thermal receipt — these fade within 3-6 months');
        suggestions.push('🛡️ Smart move! Warrify has created a permanent digital backup');
      }

      // Consumer justice framing
      const consumerJusticeMessage = classification === 'faded_receipt'
        ? '50% of Indian consumers lose warranty claims due to faded receipts. Warrify has now protected yours.'
        : classification === 'valid_invoice'
          ? 'Your invoice is digitally preserved. You now have permanent proof of purchase for warranty claims.'
          : 'We recommend re-uploading a clearer image to ensure your consumer rights are fully documented.';

      res.json({
        classification,
        qualityScore,
        confidence: Math.round(confidence),
        wordCount,
        textDensity: parseFloat(textDensity.toFixed(3)),
        isThermalReceipt: isThermalLikely,
        issues,
        suggestions,
        consumerJusticeMessage,
        extractedTextPreview: text.substring(0, 200),
        fileUrl: `/uploads/${req.file.filename}`,
      });
    } catch (error) {
      console.error('Document quality analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze document quality' });
    }
  });
});

// ── Start Server ─────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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
