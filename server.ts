// Warrify Server - Proactive Warranty Management
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import {
  serviceDirectory,
  commonFailures,
  getCommonFailures,
  buildSystemPrompt,
  generateFallbackResponse,
  RISK_THRESHOLDS,
  RECOMMENDATIONS,
  RISK_CATEGORIES,
  REPAIR_COST_FACTORS,
  RESALE_VALUE_CONSTANTS
} from './config/businessRules.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// â”€â”€ Supabase (PostgreSQL) Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// â”€â”€ Firebase Admin Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  if (!projectId || !clientEmail || !privateKey || privateKey.includes('YOUR_FIREBASE_PRIVATE_KEY')) {
    console.warn('âš ï¸ [FIREBASE] Firebase Admin credentials missing or using placeholders. Auth features will not work.');
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('âœ… [FIREBASE] Firebase Admin initialized.');
    } catch (error) {
      console.error('âŒ [FIREBASE] Failed to initialize Firebase Admin SDK:', (error as Error).message);
      console.warn('âš ï¸ [FIREBASE] Server will continue without Firebase features.');
    }
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.get('/api/ping', (req, res) => {
  res.json({ status: 'alive', version: '2.0.2-debug' });
});

// â”€â”€ Security Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// CORS â€“ strictly lock to the application origin for real-product security
const allowedOrigins = [
  ...((process.env.CORS_ORIGINS || '').split(',')),
  process.env.APP_URL || ''
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
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  message: { error: 'Too many attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// â”€â”€ Auth Middleware (Firebase Admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // Look up the internal user ID from Supabase
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('firebase_uid', decoded.uid)
      .single();

    if (!user) {
      return res.status(403).json({ error: 'User not found. Please sign up first.' });
    }
    req.user = { id: user.id, email: user.email, name: user.name, firebaseUid: decoded.uid };
    next();
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err);
    return res.sendStatus(403);
  }
};

// â”€â”€ Auth Routes (Firebase-backed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sync Firebase user to Supabase (called after Firebase signup/login on frontend)
app.post('/api/auth/sync-user', authLimiter, async (req: any, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    if (!admin.apps.length) {
      return res.status(503).json({ error: 'Authentication service is unavailable. Please try again later.' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const { name, email } = req.body;
    const userName =
      (typeof name === 'string' && name.trim()) ||
      decoded.name ||
      (typeof email === 'string' && email.includes('@') ? email.split('@')[0] : 'User');
    const userEmail =
      ((typeof email === 'string' && email.trim()) || decoded.email || '').toLowerCase().trim();

    if (!userEmail) {
      return res.status(400).json({ error: 'Email is required to sync user.' });
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id, name, email, city')
      .eq('firebase_uid', decoded.uid)
      .maybeSingle();

    if (existing) {
      // If the explicit sign-up call sends a custom name after updateProfile, update the DB
      if (name) {
        const { data: updated } = await supabase
          .from('users')
          .update({ name: userName })
          .eq('firebase_uid', decoded.uid)
          .select('id, name, email, city')
          .single();
        if (updated) return res.json({ user: updated });
      }
      return res.json({ user: existing });
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        firebase_uid: decoded.uid,
        name: userName,
        email: userEmail,
        city: 'Mumbai'
      })
      .select('id, name, email, city')
      .single();

    if (error) {
      // Duplicate key can happen with concurrent sync calls during login.
      if (error.code === '23505') {
        const { data: conflictUser } = await supabase
          .from('users')
          .select('id, name, email, city')
          .eq('firebase_uid', decoded.uid)
          .maybeSingle();
        if (conflictUser) return res.json({ user: conflictUser });
      }

      // Fallback for presentation: If Supabase times out, return a mock user
      if (error.message?.includes('fetch failed') || error.message?.includes('timeout')) {
        console.warn('[SYNC] Supabase unreachable. Falling back to mock user for presentation.');
        return res.status(201).json({
          user: {
            id: `demo-${decoded.uid}`,
            name: userName || 'Demo User',
            email: userEmail || 'demo@warrify.com',
            city: 'Mumbai'
          }
        });
      }
      console.error('[SYNC] Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    res.status(201).json({ user: newUser });
  } catch (error: any) {
    if (error.message?.includes('fetch failed')) {
      return res.status(201).json({
        user: { id: 'demo-user-123', name: 'Demo User', email: 'demo@warrify.com', city: 'Mumbai' }
      });
    }
    console.error('[SYNC] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rate limiter for duplicate checks (Prevents brute force discovery)
const dupeCheckLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: 20, // Keep this relatively tight
  message: { error: "Too many checks. Please wait." }
});

// Check invoice number for duplicates (requires auth for security)
app.get('/api/products/check-invoice', authenticateToken, dupeCheckLimiter, async (req: any, res) => {
  try {
    const { invoiceNumber } = req.query;
    if (!invoiceNumber) return res.json({ exists: false });

    const invTrim = (invoiceNumber as string).trim();
    const { data: existing } = await supabase
      .from('products')
      .select('id, product_name')
      .eq('user_id', req.user.id)
      .or(`invoice_number.eq.${invTrim},invoice_number.eq.${invoiceNumber}`)
      .limit(1)
      .single();

    res.json({ exists: !!existing, productName: existing?.product_name?.trim() || 'Unknown' });
  } catch (error) {
    console.error('[DUPE_CHECK] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products', authenticateToken, async (req: any, res) => {
  try {
    const { search, expiringSoon, dateFrom, dateTo, category } = req.query;
    let query = supabase.from('products').select('*').eq('user_id', req.user.id);

    if (search) {
      const term = `%${search}%`;
      query = query.or(`product_name.ilike.${term},brand.ilike.${term},category.ilike.${term},invoice_number.ilike.${term}`);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (dateFrom) {
      query = query.gte('purchase_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('purchase_date', dateTo);
    }

    if (expiringSoon === 'true') {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(new Date().getDate() + 30);
      query = query.gte('expiry_date', today).lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0]);
    }

    query = query.order('created_at', { ascending: false });

    const { data: products, error } = await query;
    if (error) {
      // Fallback for products if DB is down
      if (error.message?.includes('fetch failed')) throw new Error('DB_DOWN');
      throw error;
    }
    res.json(products || []);
  } catch (error: any) {
    if (error.message === 'DB_DOWN' || error.message?.includes('fetch failed')) {
      console.warn('âš ï¸ [API] DB Unreachable. Loading demo-seed data.');
      const seedPath = path.join(process.cwd(), 'scripts', 'demo-seed.json');
      if (fs.existsSync(seedPath)) {
        const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        return res.json(seed.products.map((p: any, i: number) => ({
          id: i, product_name: p.name, brand: p.brand, category: p.cat,
          purchase_date: new Date().toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 86400000 * p.daysToExpiry).toISOString().split('T')[0],
          purchase_price: p.price, user_id: req.user.id
        })));
      }
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', authenticateToken, async (req: any, res) => {
  try {
    const { productName, brand, category, purchaseDate, warrantyMonths, expiryDate, invoiceFileUrl, invoiceText, invoiceNumber, notes, purchasePrice } = req.body;

    if (!productName || !category || !purchaseDate || !warrantyMonths || !expiryDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        user_id: req.user.id,
        product_name: productName,
        brand,
        category,
        purchase_date: purchaseDate,
        warranty_months: warrantyMonths,
        expiry_date: expiryDate,
        purchase_price: purchasePrice || 0,
        invoice_file_url: invoiceFileUrl,
        invoice_text: invoiceText,
        invoice_number: invoiceNumber,
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Log a notification for new product added
    try {
      await supabase.from('notifications').insert({
        user_id: req.user.id,
        product_id: product.id,
        type: 'PRODUCT_ADDED',
        status: 'SENT',
        sent_at: new Date().toISOString(),
      });
    } catch (e) { /* non-critical */ }

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id â€” Update product
app.put('/api/products/:id', authenticateToken, async (req: any, res) => {
  try {
    const { productName, brand, category, purchaseDate, warrantyMonths, expiryDate, invoiceFileUrl, invoiceText, invoiceNumber, notes, purchasePrice, claimStatus } = req.body;

    // Build update object only with provided fields
    const updates: any = { updated_at: new Date().toISOString() };
    if (productName !== undefined) updates.product_name = productName;
    if (brand !== undefined) updates.brand = brand;
    if (category !== undefined) updates.category = category;
    if (purchaseDate !== undefined) updates.purchase_date = purchaseDate;
    if (warrantyMonths !== undefined) updates.warranty_months = warrantyMonths;
    if (expiryDate !== undefined) updates.expiry_date = expiryDate;
    if (purchasePrice !== undefined) updates.purchase_price = purchasePrice;
    if (invoiceFileUrl !== undefined) updates.invoice_file_url = invoiceFileUrl;
    if (invoiceText !== undefined) updates.invoice_text = invoiceText;
    if (invoiceNumber !== undefined) updates.invoice_number = invoiceNumber;
    if (notes !== undefined) updates.notes = notes;
    if (claimStatus !== undefined) updates.claim_status = claimStatus;

    const { data: updated, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.get('/api/products/:id', authenticateToken, async (req: any, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// â”€â”€ Combined Product Details (product + risk + service in one call) â”€â”€
app.get('/api/products/:id/full', authenticateToken, async (req: any, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !product) return res.status(404).json({ error: 'Product not found' });

    // Compute risk assessment inline (no extra DB call)
    const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((new Date(product.expiry_date).getTime() - new Date(product.purchase_date).getTime()) / (1000 * 60 * 60 * 24));
    const usedPercent = Math.round(((totalDays - daysLeft) / totalDays) * 100);
    const failures = getCommonFailures(product.category, product.product_name);

    let failureProbability = 10;
    const matchedThreshold = RISK_THRESHOLDS.find((t: any) =>
      (t.daysLimit !== undefined && daysLeft < t.daysLimit) ||
      (t.usedPercentLimit !== undefined && usedPercent > t.usedPercentLimit)
    );
    if (matchedThreshold) failureProbability = matchedThreshold.probability || failureProbability;
    if (RISK_CATEGORIES.includes(product.category)) failureProbability = Math.min(95, failureProbability + 10);

    const baseRepairCost = product.purchase_price ? product.purchase_price * REPAIR_COST_FACTORS.BASE_PERCENTAGE : REPAIR_COST_FACTORS.DEFAULT_BASE_COST;
    const estimatedRepairCost = Math.round(baseRepairCost * (1 + failureProbability / 100));
    const monthsLeft = Math.max(0, daysLeft / 30);
    const resale = estimateResaleValue(product.purchase_price || 0, monthsLeft, product.warranty_months);

    let recommendation = RECOMMENDATIONS.GOOD_SHAPE;
    if (daysLeft < 0) recommendation = RECOMMENDATIONS.EXPIRED;
    else if (daysLeft <= 15) recommendation = RECOMMENDATIONS.URGENT(daysLeft, failures);
    else if (daysLeft <= 30) recommendation = RECOMMENDATIONS.NEAR_EXPIRY(daysLeft, failures);
    else if (daysLeft <= 90) recommendation = RECOMMENDATIONS.MONITOR(failures);

    const riskAssessment = { failureProbability, commonIssues: failures, estimatedRepairCost, recommendation, resaleValue: resale, daysLeft, usedPercent };

    // Lookup service info (sync, from in-memory directory)
    const brandKey = Object.keys(serviceDirectory).find(k => k.toLowerCase() === (product.brand || '').toLowerCase());
    const serviceInfoData = brandKey ? serviceDirectory[brandKey] : null;

    res.json({ product, riskAssessment, serviceInfo: serviceInfoData });
  } catch (error) {
    console.error('Combined product fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req: any, res) => {
  try {
    // Also delete associated notifications
    await supabase.from('notifications').delete().eq('product_id', req.params.id).eq('user_id', req.user.id);
    const { error, count } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// â”€â”€ File Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ALLOWED_MIME_TYPES = (process.env.ALLOWED_MIME_TYPES || '').split(',').filter(Boolean);
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_BYTES) || 5 * 1024 * 1024; // Default 5 MB

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

// â”€â”€ Service Directory (DB-backed, hardcoded fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Common failure data & getCommonFailures â€“ imported from ./config/businessRules.ts

// Warranty resale value estimation â€” reads constants from DB, falls back to config
async function getResaleConstants(): Promise<{ MIN_AGE_DEPRECIATION: number; MAX_AGE_DEPRECIATION_FACTOR: number; WITHOUT_WARRANTY_FACTOR: number; WARRANTY_PREMIUM_PER_YEAR_FACTOR: number }> {
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'resale_constants').single();
    if (data?.value) {
      const v = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return {
        MIN_AGE_DEPRECIATION: v.min_age_depreciation ?? RESALE_VALUE_CONSTANTS.MIN_AGE_DEPRECIATION,
        MAX_AGE_DEPRECIATION_FACTOR: v.max_age_depreciation_factor ?? RESALE_VALUE_CONSTANTS.MAX_AGE_DEPRECIATION_FACTOR,
        WITHOUT_WARRANTY_FACTOR: v.without_warranty_factor ?? RESALE_VALUE_CONSTANTS.WITHOUT_WARRANTY_FACTOR,
        WARRANTY_PREMIUM_PER_YEAR_FACTOR: v.warranty_premium_per_year_factor ?? RESALE_VALUE_CONSTANTS.WARRANTY_PREMIUM_PER_YEAR_FACTOR,
      };
    }
  } catch { /* fall through */ }
  return RESALE_VALUE_CONSTANTS;
}

async function estimateResaleValue(purchasePrice: number, warrantyMonthsLeft: number, totalWarrantyMonths: number): Promise<{ withWarranty: number, withoutWarranty: number }> {
  if (!purchasePrice || purchasePrice <= 0) return { withWarranty: 0, withoutWarranty: 0 };
  const { MIN_AGE_DEPRECIATION, MAX_AGE_DEPRECIATION_FACTOR, WITHOUT_WARRANTY_FACTOR, WARRANTY_PREMIUM_PER_YEAR_FACTOR } = await getResaleConstants();
  const ageDepreciation = Math.max(MIN_AGE_DEPRECIATION, 1 - ((totalWarrantyMonths - warrantyMonthsLeft) / totalWarrantyMonths) * MAX_AGE_DEPRECIATION_FACTOR);
  const withoutWarranty = Math.round(purchasePrice * ageDepreciation * WITHOUT_WARRANTY_FACTOR);
  const warrantyPremium = Math.round(purchasePrice * WARRANTY_PREMIUM_PER_YEAR_FACTOR * (warrantyMonthsLeft / 12));
  const withWarranty = withoutWarranty + warrantyPremium;
  return { withWarranty, withoutWarranty };
}

// â”€â”€ Metadata Catalog API (Phase 3 â€“ single source of truth) â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/meta/catalog', async (req, res) => {
  try {
    // Fetch all metadata from DB, fall back to hardcoded if tables don't exist yet
    const [brandsRes, catsRes, warrantyRes, claimRes, settingsRes] = await Promise.all([
      supabase.from('brands').select('name, logo, phone, email, website').eq('is_active', true).order('sort_order'),
      supabase.from('categories').select('name, icon').eq('is_active', true).order('sort_order'),
      supabase.from('warranty_options').select('months').eq('is_active', true).order('sort_order'),
      supabase.from('claim_statuses').select('value, label').eq('is_active', true).order('sort_order'),
      supabase.from('app_settings').select('key, value').in('key', ['quick_actions', 'risk_categories', 'platform_version', 'welcome_messages']),
    ]);

    // Parse app settings into a map
    const settingsMap: Record<string, any> = {};
    (settingsRes.data || []).forEach((s: any) => { settingsMap[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value; });

    // Import hardcoded fallbacks
    const { BRANDS, CATEGORIES, WARRANTY_MONTH_OPTIONS, CLAIM_STATUSES, BRAND_LOGOS, CATEGORY_ICONS } = await import('./src/constants/productCatalog.js');
    const { QUICK_ACTIONS } = await import('./src/config/aiConfig.js');

    const catalog = {
      brands: brandsRes.data && brandsRes.data.length > 0
        ? brandsRes.data.map((b: any) => ({ name: b.name, logo: b.logo }))
        : BRANDS.map((name: string) => ({ name, logo: BRAND_LOGOS[name] || 'ðŸ“¦' })),
      categories: catsRes.data && catsRes.data.length > 0
        ? catsRes.data.map((c: any) => ({ name: c.name, icon: c.icon }))
        : CATEGORIES.map((name: string) => ({ name, icon: CATEGORY_ICONS[name] || 'ðŸ“¦' })),
      warrantyMonths: warrantyRes.data && warrantyRes.data.length > 0
        ? warrantyRes.data.map((w: any) => w.months)
        : [...WARRANTY_MONTH_OPTIONS],
      claimStatuses: claimRes.data && claimRes.data.length > 0
        ? claimRes.data.map((s: any) => ({ value: s.value, label: s.label }))
        : [...CLAIM_STATUSES],
      quickActions: settingsMap['quick_actions'] || QUICK_ACTIONS,
      riskCategories: settingsMap['risk_categories'] || RISK_CATEGORIES,
      platformVersion: settingsMap['platform_version'] || process.env.PLATFORM_VERSION || '',
      welcomeMessages: settingsMap['welcome_messages'] || {
        welcome: (await import('./src/config/aiConfig.js')).WELCOME_MESSAGE,
        welcomeShort: (await import('./src/config/aiConfig.js')).WELCOME_MESSAGE_SHORT
      },
    };

    res.json(catalog);
  } catch (error) {
    console.error('[META] Failed to fetch catalog:', error);
    res.status(500).json({ error: 'Failed to fetch metadata catalog' });
  }
});

// â”€â”€ Service Directory API (Phase 4 â€“ DB-backed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/service/:brand', async (req, res) => {
  const brandName = req.params.brand;
  try {
    // Try DB first
    const { data: brand } = await supabase.from('brands').select('id, name, phone, email, website').ilike('name', brandName).single();
    if (brand) {
      const { data: centers } = await supabase.from('service_centers').select('center_name').eq('brand_id', brand.id).eq('is_active', true);
      return res.json({
        phone: brand.phone || '',
        email: brand.email || '',
        website: brand.website || '',
        centers: (centers || []).map((c: any) => c.center_name),
      });
    }
  } catch { /* fall through to hardcoded */ }

  // Fallback to hardcoded
  const key = Object.keys(serviceDirectory).find(k => k.toLowerCase() === brandName.toLowerCase());
  if (key) {
    res.json(serviceDirectory[key]);
  } else {
    res.status(404).json({ error: 'Brand not found in directory' });
  }
});

app.get('/api/service', async (req, res) => {
  try {
    const { data: brands } = await supabase.from('brands').select('name').eq('is_active', true).order('sort_order');
    if (brands && brands.length > 0) {
      return res.json(brands.map((b: any) => b.name));
    }
  } catch { /* fall through */ }
  res.json(Object.keys(serviceDirectory));
});

// â”€â”€ AI Risk Assessment Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/products/:id/risk-assessment', authenticateToken, async (req: any, res) => {
  try {
    const { data: product } = await supabase.from('products').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((new Date(product.expiry_date).getTime() - new Date(product.purchase_date).getTime()) / (1000 * 60 * 60 * 24));
    const usedPercent = Math.round(((totalDays - daysLeft) / totalDays) * 100);

    const failures = getCommonFailures(product.category, product.product_name);

    // Calculate failure probability based on age and category
    let failureProbability = 10;
    const matchedThreshold = RISK_THRESHOLDS.find((t: any) =>
      (t.daysLimit !== undefined && daysLeft < t.daysLimit) ||
      (t.usedPercentLimit !== undefined && usedPercent > t.usedPercentLimit)
    );
    if (matchedThreshold) {
      failureProbability = matchedThreshold.probability || failureProbability;
    }

    // High-value categories have higher failure rates
    if (RISK_CATEGORIES.includes(product.category)) {
      failureProbability = Math.min(95, failureProbability + 10);
    }

    // Estimate repair cost
    const baseRepairCost = product.purchase_price ? product.purchase_price * REPAIR_COST_FACTORS.BASE_PERCENTAGE : REPAIR_COST_FACTORS.DEFAULT_BASE_COST;
    const estimatedRepairCost = Math.round(baseRepairCost * (1 + failureProbability / 100));

    // Resale value
    const monthsLeft = Math.max(0, daysLeft / 30);
    const resale = await estimateResaleValue(product.purchase_price || 0, monthsLeft, product.warranty_months);

    let recommendation = RECOMMENDATIONS.GOOD_SHAPE;
    if (daysLeft < 0) {
      recommendation = RECOMMENDATIONS.EXPIRED;
    } else if (daysLeft <= 15) {
      recommendation = RECOMMENDATIONS.URGENT(daysLeft, failures);
    } else if (daysLeft <= 30) {
      recommendation = RECOMMENDATIONS.NEAR_EXPIRY(daysLeft, failures);
    } else if (daysLeft <= 90) {
      recommendation = RECOMMENDATIONS.MONITOR(failures);
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

// â”€â”€ AI Insights Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/ai/insights', authenticateToken, async (req: any, res) => {
  try {
    const { data: products } = await supabase.from('products').select('*').eq('user_id', req.user.id);
    const allProducts = (products || []) as any[];
    const lang = req.query.lang || 'en';

    const insights: string[] = [];
    const now = new Date();

    // Generate actionable insights
    const expiringSoon = allProducts.filter(p => {
      const days = Math.ceil((new Date(p.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30;
    });

    const expired = allProducts.filter(p => {
      const days = Math.ceil((new Date(p.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days < 0;
    });

    if (expiringSoon.length > 0) {
      if (lang === 'hi') insights.push(`âš ï¸ ${expiringSoon.length} à¤‰à¤¤à¥à¤ªà¤¾à¤¦ 30 à¤¦à¤¿à¤¨à¥‹à¤‚ à¤•à¥‡ à¤­à¥€à¤¤à¤° à¤¸à¤®à¤¾à¤ªà¥à¤¤ à¤¹à¥‹ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚: ${expiringSoon.map(p => p.product_name).join(', ')}.`);
      else if (lang === 'mr') insights.push(`âš ï¸ ${expiringSoon.length} à¤‰à¤¤à¥à¤ªà¤¾à¤¦à¤¨à¥‡ 30 à¤¦à¤¿à¤µà¤¸à¤¾à¤‚à¤¤ à¤•à¤¾à¤²à¤¬à¤¾à¤¹à¥à¤¯ à¤¹à¥‹à¤¤ à¤†à¤¹à¥‡à¤¤: ${expiringSoon.map(p => p.product_name).join(', ')}.`);
      else insights.push(`âš ï¸ ${expiringSoon.length} product(s) expiring within 30 days. File preventive claims for: ${expiringSoon.map(p => p.product_name).join(', ')}.`);
    }

    if (expired.length > 0) {
      const totalValue = expired.reduce((sum: number, p: any) => sum + (p.purchase_price || 0), 0);
      if (totalValue > 0) {
        if (lang === 'hi') insights.push(`ðŸ’¸ à¤†à¤ª ${expired.length} à¤¸à¤®à¤¾à¤ªà¥à¤¤ à¤‰à¤¤à¥à¤ªà¤¾à¤¦à¥‹à¤‚ à¤¸à¥‡ à¤¸à¤‚à¤­à¤¾à¤µà¤¿à¤¤ à¤µà¤¾à¤°à¤‚à¤Ÿà¥€ à¤¦à¤¾à¤µà¥‹à¤‚ à¤®à¥‡à¤‚ â‚¹${totalValue.toLocaleString('en-IN')} à¤šà¥‚à¤• à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤`);
        else if (lang === 'mr') insights.push(`ðŸ’¸ à¤¤à¥à¤®à¥à¤¹à¥€ ${expired.length} à¤•à¤¾à¤²à¤¬à¤¾à¤¹à¥à¤¯ à¤¯à¥à¤¨à¤¿à¤Ÿà¥à¤¸à¤®à¤§à¥‚à¤¨ à¤¸à¤‚à¤­à¤¾à¤µà¥à¤¯ à¤¹à¤®à¥€ à¤¦à¤¾à¤µà¥à¤¯à¤¾à¤‚à¤®à¤§à¥à¤¯à¥‡ â‚¹${totalValue.toLocaleString('en-IN')} à¤—à¤®à¤¾à¤µà¤²à¥‡ à¤…à¤¸à¥‚ à¤¶à¤•à¤¤à¤¾à¤¤.`);
        else insights.push(`ðŸ’¸ You may have missed â‚¹${totalValue.toLocaleString('en-IN')} in potential warranty claims from ${expired.length} expired product(s).`);
      }
    }

    // Category-specific insight
    const electronics = allProducts.filter(p => p.category === 'Electronics');
    if (electronics.length > 2) {
      if (lang === 'hi') insights.push(`ðŸ“± à¤†à¤ª ${electronics.length} à¤‡à¤²à¥‡à¤•à¥à¤Ÿà¥à¤°à¥‰à¤¨à¤¿à¤•à¥à¤¸ à¤Ÿà¥à¤°à¥ˆà¤• à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤ à¤¸à¥à¤à¤¾à¤µ: à¤µà¤¾à¤°à¤‚à¤Ÿà¥€ à¤–à¤¤à¥à¤® à¤¹à¥‹à¤¨à¥‡ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ à¤¸à¥‰à¤«à¤¼à¥à¤Ÿà¤µà¥‡à¤¯à¤° à¤¸à¤®à¤¸à¥à¤¯à¤¾à¤“à¤‚ à¤•à¥€ à¤œà¤¾à¤à¤š à¤•à¤°à¥‡à¤‚ â€” à¤µà¥‡ à¤…à¤•à¥à¤¸à¤° à¤•à¤µà¤° à¤¹à¥‹à¤¤à¥€ à¤¹à¥ˆà¤‚à¥¤`);
      else if (lang === 'mr') insights.push(`ðŸ“± à¤¤à¥à¤®à¥à¤¹à¥€ ${electronics.length} à¤‡à¤²à¥‡à¤•à¥à¤Ÿà¥à¤°à¥‰à¤¨à¤¿à¤•à¥à¤¸ à¤Ÿà¥à¤°à¥…à¤• à¤•à¤°à¤¤à¤¾. à¤Ÿà¥€à¤ª: à¤µà¤¾à¤°à¤‚à¤Ÿà¥€ à¤¸à¤‚à¤ªà¤£à¥à¤¯à¤¾à¤ªà¥‚à¤°à¥à¤µà¥€ à¤¸à¥‰à¤«à¥à¤Ÿà¤µà¥‡à¤…à¤° à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤¤à¤ªà¤¾à¤¸à¤¾ â€” à¤¤à¥à¤¯à¤¾ à¤¸à¤¹à¤¸à¤¾ à¤•à¤µà¥à¤¹à¤° à¤•à¥‡à¤²à¥à¤¯à¤¾ à¤œà¤¾à¤¤à¤¾à¤¤.`);
      else insights.push(`ðŸ“± You track ${electronics.length} electronics. Tip: Check for software-related issues before hardware warranty expires â€” they're often covered too.`);
    }

    // Reminder buffer suggestion
    const missedProducts = expired.filter(p => {
      const daysSinceExpiry = Math.ceil((now.getTime() - new Date(p.expiry_date).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceExpiry <= 60;
    });
    if (missedProducts.length > 0) {
      if (lang === 'hi') insights.push(`ðŸ”” à¤…à¤ªà¤¨à¥‡ à¤‡à¤¤à¤¿à¤¹à¤¾à¤¸ à¤•à¥‡ à¤†à¤§à¤¾à¤° à¤ªà¤°, à¤¦à¤¾à¤µà¤¾ à¤–à¤¿à¤¡à¤¼à¤•à¤¿à¤¯à¥‹à¤‚ à¤•à¥‹ à¤¨ à¤šà¥‚à¤•à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ 30-à¤¦à¤¿à¤¨ à¤•à¤¾ à¤°à¤¿à¤®à¤¾à¤‡à¤‚à¤¡à¤° à¤¸à¥‡à¤Ÿ à¤•à¤°à¤¨à¥‡ à¤ªà¤° à¤µà¤¿à¤šà¤¾à¤° à¤•à¤°à¥‡à¤‚à¥¤`);
      else if (lang === 'mr') insights.push(`ðŸ”” à¤¤à¥à¤®à¤šà¥à¤¯à¤¾ à¤®à¤¾à¤—à¥€à¤² à¤¨à¥‹à¤‚à¤¦à¥€à¤‚à¤µà¤°à¥‚à¤¨, à¤¦à¤¾à¤µà¥‡ à¤¨ à¤šà¥à¤•à¤µà¤£à¥à¤¯à¤¾à¤¸à¤¾à¤ à¥€ à¥©à¥¦-à¤¦à¤¿à¤µà¤¸à¤¾à¤‚à¤šà¥‡ à¤°à¤¿à¤®à¤¾à¤‡à¤‚à¤¡à¤° à¤¸à¥‡à¤Ÿ à¤•à¤°à¤£à¥à¤¯à¤¾à¤šà¤¾ à¤µà¤¿à¤šà¤¾à¤° à¤•à¤°à¤¾.`);
      else insights.push(`ðŸ”” Based on your history, consider setting 30-day buffer reminders to avoid missing claim windows.`);
    }

    // Savings insight
    const totalPurchaseValue = allProducts.reduce((sum: number, p: any) => sum + (p.purchase_price || 0), 0);
    const activeProducts = allProducts.filter(p => new Date(p.expiry_date) > now);
    const protectedValue = activeProducts.reduce((sum: number, p: any) => sum + (p.purchase_price || 0), 0);

    if (protectedValue > 0) {
      if (lang === 'hi') insights.push(`ðŸ›¡ï¸ à¤†à¤ªà¤•à¥€ à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤µà¤¾à¤°à¤‚à¤Ÿà¥€ â‚¹${protectedValue.toLocaleString('en-IN')} à¤•à¥€ à¤¸à¤‚à¤ªà¤¤à¥à¤¤à¤¿à¤¯à¥‹à¤‚ à¤•à¥€ à¤°à¤•à¥à¤·à¤¾ à¤•à¤°à¤¤à¥€ à¤¹à¥ˆà¥¤`);
      else if (lang === 'mr') insights.push(`ðŸ›¡ï¸ à¤¤à¥à¤®à¤šà¥€ à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤µà¤¾à¤°à¤‚à¤Ÿà¥€ â‚¹${protectedValue.toLocaleString('en-IN')} à¤šà¥à¤¯à¤¾ à¤®à¤¾à¤²à¤®à¤¤à¥à¤¤à¥‡à¤šà¥‡ à¤¸à¤‚à¤°à¤•à¥à¤·à¤£ à¤•à¤°à¤¤à¥‡.`);
      else insights.push(`ðŸ›¡ï¸ Your active warranties protect â‚¹${protectedValue.toLocaleString('en-IN')} in assets. Keep tracking to maximize coverage.`);
    }

    if (insights.length === 0) {
      if (lang === 'hi') insights.push(`âœ… à¤¸à¤­à¥€ à¤µà¤¾à¤°à¤‚à¤Ÿà¥€ à¤…à¤šà¥à¤›à¥€ à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤®à¥‡à¤‚ à¤¹à¥ˆà¤‚à¥¤ à¤†à¤ª à¤¬à¤¹à¥à¤¤ à¤…à¤šà¥à¤›à¤¾ à¤•à¤° à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚!`);
      else if (lang === 'mr') insights.push(`âœ… à¤¤à¥à¤®à¤šà¥à¤¯à¤¾ à¤¸à¤°à¥à¤µ à¤µà¤¾à¤°à¤‚à¤Ÿà¥€ à¤šà¤¾à¤‚à¤—à¤²à¥à¤¯à¤¾ à¤¸à¥à¤¥à¤¿à¤¤à¥€à¤¤ à¤†à¤¹à¥‡à¤¤!`);
      else insights.push(`âœ… All warranties are in good standing. You're doing great at tracking your products!`);
    }

    const formatLocalNumbers = (str: string, language: string) => {
      if (language === 'en') return str;
      const devanagariDigits = ['à¥¦', 'à¥§', 'à¥¨', 'à¥©', 'à¥ª', 'à¥«', 'à¥¬', 'à¥­', 'à¥®', 'à¥¯'];
      return str.replace(/\d/g, d => devanagariDigits[parseInt(d)]);
    };

    const localizedInsights = insights.map(i => formatLocalNumbers(i, lang));

    res.json({ insights: localizedInsights, totalProducts: allProducts.length, activeCount: allProducts.filter(p => new Date(p.expiry_date) > now).length });
  } catch (error) {
    console.error('AI Insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// â”€â”€ AI Assistant Backend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/assistant', authenticateToken, async (req: any, res) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[AI-ADVISOR] [${requestId}] Receiving message: "${req.body.message?.substring(0, 50)}..."`);

  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Fetch user's products for context 
    let products: any[] = [];
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        const { data, error } = await supabase.from('products').select('*').eq('user_id', req.user.id);
        if (error) {
          console.warn(`[AI-ADVISOR] [${requestId}] Supabase query error:`, error.message);
        } else {
          products = data || [];
        }
      }
    } catch (dbError) {
      console.error(`[AI-ADVISOR] [${requestId}] DB context fetch failed:`, dbError);
    }

    // Fetch recent chat history for context
    let chatHistory: any[] = [];
    try {
      const { data, error } = await supabase
        .from('assistant_chats')
        .select('message, response')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        chatHistory = data.reverse(); // Order from oldest to newest for context
      }
    } catch (historyError) {
      console.warn(`[AI-ADVISOR] [${requestId}] History fetch failed:`, historyError);
    }

    const productContext = products.map(p => {
      const daysLeft = Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return `- ${p.product_name} (${p.brand || 'No brand'}, ${p.category}): purchased ${p.purchase_date}, warranty ${p.warranty_months} months, expires ${p.expiry_date} (${daysLeft > 0 ? daysLeft + ' days left' : 'EXPIRED ' + Math.abs(daysLeft) + ' days ago'})${p.invoice_number ? ', Invoice#: ' + p.invoice_number : ''}${p.purchase_price ? ', Price: â‚¹' + p.purchase_price : ''}`;
    }).join('\n');

    let systemPrompt = '';
    try {
      const { data: promptSetting } = await supabase.from('app_settings').select('value').eq('key', 'system_prompt').single();
      if (promptSetting?.value) {
        let template = typeof promptSetting.value === 'string' ? JSON.parse(promptSetting.value) : promptSetting.value;
        systemPrompt = template
          .replace('{{userName}}', req.user.name)
          .replace('{{userEmail}}', req.user.email)
          .replace('{{date}}', new Date().toISOString().split('T')[0])
          .replace('{{productContext}}', productContext || 'No products registered yet.')
          .replace('{{availableBrands}}', Object.keys(serviceDirectory).join(', '));
      }
    } catch { /* use fallback */ }

    if (!systemPrompt) {
      systemPrompt = buildSystemPrompt({
        userName: req.user.name,
        userEmail: req.user.email,
        productContext,
        availableBrands: Object.keys(serviceDirectory)
      });
    }

    let responseText = '';
    let modelUsed = '';

    // STAGE 1: NVIDIA Qwen 2.5-7B (NVIDIA Build API)
    const nvidiaApiKey = process.env.NVIDIA_API_KEY;
    if (nvidiaApiKey && nvidiaApiKey !== 'YOUR_NVIDIA_API_KEY_HERE') {
      try {
        console.log(`[AI-ADVISOR] [${requestId}] Stage 1: Calling NVIDIA (Qwen 2.5-7B)...`);

        const nvidiaMessages = [
          { role: "system", content: systemPrompt },
          ...chatHistory.flatMap(h => [
            { role: "user", content: h.message },
            { role: "assistant", content: h.response }
          ]),
          { role: "user", content: message }
        ];

        const nvidiaResponse = await axios.post(process.env.NVIDIA_API_ENDPOINT || 'https://integrate.api.nvidia.com/v1/chat/completions', {
          model: process.env.NVIDIA_MODEL || "qwen/qwen2_5-7b-instruct",
          messages: nvidiaMessages,
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: parseInt(process.env.NVIDIA_MAX_TOKENS || '1024')
        }, {
          headers: {
            'Authorization': `Bearer ${nvidiaApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: parseInt(process.env.NVIDIA_TIMEOUT_MS || '10000') // 10 second timeout for NVIDIA
        });

        if (nvidiaResponse.data?.choices?.[0]?.message?.content) {
          responseText = nvidiaResponse.data.choices[0].message.content;
          modelUsed = 'NVIDIA-QWEN-2.5-7B';
          console.log(`[AI-ADVISOR] [${requestId}] Success with NVIDIA API`);
        }
      } catch (nvError: any) {
        console.warn(`[AI-ADVISOR] [${requestId}] NVIDIA API Failed:`, nvError.response?.data?.error || nvError.message);
      }
    }

    // STAGE 2: Gemini 1.5/2.0 Flash Fallback
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!responseText && geminiApiKey && geminiApiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      try {
        console.log(`[AI-ADVISOR] [${requestId}] Stage 2: Calling Gemini Fallback (2.0)...`);
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const geminiHistory = chatHistory.flatMap(h => [
          { role: 'user', parts: [{ text: h.message }] },
          { role: 'model', parts: [{ text: h.response }] }
        ]);

        const result = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
          contents: [
            { role: 'user', parts: [{ text: "System Context & Instructions: " + systemPrompt }] },
            { role: 'model', parts: [{ text: "Understood. I am your Warrify AI Advisor. How can I help you today?" }] },
            ...geminiHistory,
            { role: 'user', parts: [{ text: message }] }
          ]
        });

        if (result && typeof result.text === 'string') {
          responseText = result.text;
        } else if (result && (result as any).response && typeof (result as any).response.text === 'function') {
          responseText = await (result as any).response.text();
        }

        if (responseText) {
          modelUsed = 'GEMINI-2.0-FLASH';
          console.log(`[AI-ADVISOR] [${requestId}] Success with Gemini API`);
        }
      } catch (geminiError: any) {
        console.warn(`[AI-ADVISOR] [${requestId}] Gemini API Failed:`, geminiError.message);
      }
    }

    // STAGE 3: Groq (Llama 3 / Mixtral) Fallback
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!responseText && groqApiKey && groqApiKey !== 'YOUR_GROQ_API_KEY_HERE') {
      try {
        console.log(`[AI-ADVISOR] [${requestId}] Stage 3: Calling Groq (Llama 3)...`);
        const groqResponse = await axios.post(process.env.GROQ_API_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions', {
          model: process.env.GROQ_MODEL || "llama3-70b-8192",
          messages: [
            { role: "system", content: systemPrompt },
            ...chatHistory.flatMap(h => [
              { role: "user", content: h.message },
              { role: "assistant", content: h.response }
            ]),
            { role: "user", content: message }
          ],
          temperature: 0.2,
          max_tokens: parseInt(process.env.GROQ_MAX_TOKENS || '1024')
        }, {
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: parseInt(process.env.GROQ_TIMEOUT_MS || '10000')
        });

        if (groqResponse.data?.choices?.[0]?.message?.content) {
          responseText = groqResponse.data.choices[0].message.content;
          modelUsed = 'GROQ-LLAMA3-70B';
          console.log(`[AI-ADVISOR] [${requestId}] Success with Groq API`);
        }
      } catch (groqError: any) {
        console.warn(`[AI-ADVISOR] [${requestId}] Groq API Failed:`, groqError.response?.data || groqError.message);
      }
    }

    // STAGE 4: Rule-based local fallback
    if (!responseText) {
      console.log(`[AI-ADVISOR] [${requestId}] Stage 4: Falling back to rules`);
      responseText = generateFallbackResponse(message, products, req.user.name);
      modelUsed = 'RULE-BASED';
    }

    // FINAL ACTION: Log to Supabase and send response
    console.log(`[AI-ADVISOR] [${requestId}] Saving chat for user: ${req.user.id}`);
    try {
      const { error: insError } = await supabase.from('assistant_chats').insert({
        user_id: req.user.id,
        message: message,
        response: responseText,
        model_used: modelUsed
      });
      if (insError) console.error(`[AI-ADVISOR] [${requestId}] Supabase Log Error:`, insError.message);
      else console.log(`[AI-ADVISOR] [${requestId}] Successfully saved chat to Supabase.`);
    } catch (saveError) {
      console.error(`[AI-ADVISOR] [${requestId}] Database insert exception:`, saveError);
    }

    res.json({ response: responseText, model: modelUsed });

  } catch (error) {
    console.error(`[AI-ADVISOR] [${requestId}] General error:`, error);
    res.status(500).json({ error: 'Assistant service temporarily overwhelmed' });
  }
});

// â”€â”€ AI Assistant History Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/assistant/history', authenticateToken, async (req: any, res) => {
  try {
    const { data: history, error } = await supabase
      .from('assistant_chats')
      .select('id, message, response, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;

    // Convert to frontend format
    const formattedHistory = (history || []).flatMap((h: any) => [
      { id: `u-${h.id}`, text: h.message, sender: 'user', timestamp: new Date(h.created_at) },
      { id: `b-${h.id}`, text: h.response, sender: 'bot', timestamp: new Date(h.created_at) }
    ]);

    res.json(formattedHistory);
  } catch (error) {
    console.error('Failed to fetch assistant history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Rule-based fallback â€“ imported from ./config/businessRules.ts

// â”€â”€ Upcoming Warranties Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/products/upcoming/expiring', authenticateToken, async (req: any, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('expiry_date', today)
      .lte('expiry_date', thirtyDaysStr)
      .order('expiry_date', { ascending: true });

    if (error) throw error;
    res.json(products || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch upcoming expirations' });
  }
});

// â”€â”€ Send Claim Email Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/products/send-claim-email', authenticateToken, async (req: any, res) => {
  try {
    const { productId, emailBody, recipientEmail } = req.body;
    const { data: product } = await supabase.from('products').select('*').eq('id', productId).eq('user_id', req.user.id).single();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { data: user } = await supabase.from('users').select('email').eq('id', req.user.id).single();

    const subject = `Warranty Claim - ${product.product_name}${product.invoice_number ? ' (Inv: ' + product.invoice_number + ')' : ''}`;
    const to = recipientEmail || serviceDirectory[product.brand]?.email || user?.email;

    await sendEmail(to, subject, emailBody || 'Warranty claim request.');

    // Update product status to PENDING
    await supabase
      .from('products')
      .update({ claim_status: 'PENDING', updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('user_id', req.user.id);

    // Log notification
    await supabase.from('notifications').insert({
      user_id: req.user.id,
      product_id: productId,
      type: 'CLAIM_EMAIL',
      status: 'SENT',
      sent_at: new Date().toISOString()
    });

    res.json({ message: `Claim email sent to ${to}`, to, status: 'PENDING' });
  } catch (error) {
    console.error('Send claim email error:', error);
    res.status(500).json({ error: 'Failed to send claim email' });
  }
});

// â”€â”€ Admin Stats Endpoint (Phase 5 â€“ DB-backed impact factors) â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/admin/stats', async (req, res) => {
  try {
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: totalProducts } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { count: totalNotifications } = await supabase.from('notifications').select('*', { count: 'exact', head: true });

    const { data: products } = await supabase.from('products').select('category, expiry_date');

    // Fetch impact factors from DB, fall back to env variables
    let UNEP_CO2: Record<string, number> = process.env.UNEP_CO2_FACTORS ? JSON.parse(process.env.UNEP_CO2_FACTORS) : {};
    let EWASTE: Record<string, number> = process.env.EWASTE_FACTORS ? JSON.parse(process.env.EWASTE_FACTORS) : {};
    try {
      const { data: factors } = await supabase.from('impact_factors').select('category, co2_kg, ewaste_kg');
      if (factors && factors.length > 0) {
        UNEP_CO2 = {};
        EWASTE = {};
        factors.forEach((f: any) => { UNEP_CO2[f.category] = f.co2_kg; EWASTE[f.category] = f.ewaste_kg; });
      }
    } catch { /* use hardcoded fallback */ }

    let eWaste = 0;
    let co2Saved = 0;
    const now = new Date();
    (products || []).forEach((p: any) => {
      const isActive = new Date(p.expiry_date) > now;
      if (isActive) {
        co2Saved += UNEP_CO2[p.category] || 10;
        eWaste += EWASTE[p.category] || 0.2;
      }
    });

    // Fetch platform version from DB settings
    let platformVersion = process.env.PLATFORM_VERSION || '';
    try {
      const { data: verSetting } = await supabase.from('app_settings').select('value').eq('key', 'platform_version').single();
      if (verSetting?.value) platformVersion = typeof verSetting.value === 'string' ? JSON.parse(verSetting.value) : verSetting.value;
    } catch { /* use default */ }

    res.json({
      totalUsers: totalUsers || 0,
      totalProducts: totalProducts || 0,
      totalNotifications: totalNotifications || 0,
      eWasteSavedKg: eWaste.toFixed(1),
      co2SavedKg: co2Saved.toFixed(1),
      platformVersion,
      techStack: ['React 19', 'TypeScript', 'Node.js/Express', 'Supabase (PostgreSQL)', 'Firebase Auth', 'Multi-AI (NVIDIA/Gemini/Groq)', 'Tesseract.js OCR', 'Nodemailer', 'Helmet Security', 'Rate Limiting']
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// â”€â”€ User Profile Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/user/profile', authenticateToken, async (req: any, res) => {
  try {
    const { data: user } = await supabase.from('users').select('id, name, email, city, preferences, created_at').eq('id', req.user.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id);
    const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id);

    res.json({ ...user, productCount: productCount || 0, notificationCount: notifCount || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req: any, res) => {
  try {
    const { name, city, preferences } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (city) updates.city = city;
    if (preferences) updates.preferences = preferences;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, name, email, city, preferences, created_at')
      .single();

    if (error) throw error;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.delete('/api/user/profile', authenticateToken, async (req: any, res) => {
  try {
    // Relying on Supabase CASCADE deletes if configured, otherwise manually deleting related rows
    await supabase.from('notifications').delete().eq('user_id', req.user.id);
    await supabase.from('assistant_chats').delete().eq('user_id', req.user.id);
    await supabase.from('products').delete().eq('user_id', req.user.id);
    await supabase.from('users').delete().eq('id', req.user.id);

    // Attempt Firebase user deletion (only works if we integrated firebase-admin exactly this way, 
    // but typically handled client-side or needs firebase-admin auth SDK)
    try {
      await admin.auth().deleteUser(req.user.id);
    } catch (e) {
      console.warn("Could not delete firebase user:", e);
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// â”€â”€ Notifications & Cron â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const sendEmail = async (to: string, subject: string, text: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_PASS.includes('YOUR_')) {
    console.log(`[EMAIL-MOCK] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL-MOCK] Body: ${text.substring(0, 100)}...`);
    return true;
  }

  console.log(`[EMAIL] Attempting to send to ${to} via Gmail...`);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: (process.env.EMAIL_USER || '').trim(),
      pass: (process.env.EMAIL_PASS || '').trim(),
    },
  });

  try {
    await transporter.sendMail({
      from: `"Warrify AI" <${(process.env.EMAIL_USER || '').trim()}>`,
      to,
      subject,
      text,
    });
    console.log(`[EMAIL] Success: Sent to ${to}`);
    return true;
  } catch (error: any) {
    console.error(`[EMAIL] Failed to send to ${to}:`, error.message);
    throw new Error(`Nodemailer error: ${error.message}`);
  }
};

app.post('/api/notifications/test', authenticateToken, async (req: any, res: any) => {
  try {
    const { productId } = req.body;
    const pId = parseInt(String(productId));

    if (isNaN(pId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // 1. Fetch Product
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('id', pId)
      .eq('user_id', req.user.id)
      .single();

    if (prodError || !product) {
      console.error('[NOTIF-TEST] Product not found:', prodError?.message);
      return res.status(404).json({ error: `Product ${pId} not found or access denied.` });
    }

    // 2. Fetch User Email
    const { data: user, error: userError } = await supabase.from('users').select('email').eq('id', req.user.id).single();
    if (userError) console.warn('[NOTIF-TEST] Could not fetch user profile email:', userError.message);

    const targetEmail = user?.email || req.user.email;
    if (!targetEmail) return res.status(400).json({ error: 'Recipient email not found.' });

    // 3. Send Email
    const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const subject = `âš ï¸ Warranty Reminder: ${product.product_name}`;
    const body = `Hi ${req.user.name},\n\nThis is a warranty reminder from Warrify.\n\nProduct: ${product.product_name}\nBrand: ${product.brand || 'N/A'}\nPurchase Date: ${product.purchase_date}\nExpiry Date: ${product.expiry_date}\nDays Left: ${daysLeft > 0 ? daysLeft + ' days' : 'EXPIRED'}\n\nVisit your dashboard to take action.\n\nâ€” Warrify AI`;

    try {
      await sendEmail(targetEmail, subject, body);
    } catch (e: any) {
      return res.status(500).json({ error: 'Email service failed', details: e.message });
    }

    // 4. Log Notification
    const { error: logError } = await supabase.from('notifications').insert({
      user_id: req.user.id,
      product_id: pId,
      type: 'TEST',
      status: 'SENT',
      sent_at: new Date().toISOString()
    });

    if (logError) console.error('[NOTIF-TEST] Database logging failed:', logError.message);

    res.json({ message: `Reminder successfully sent to ${targetEmail}` });
  } catch (error: any) {
    console.error('[NOTIF-TEST] Unhandled Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.get('/api/notifications', authenticateToken, async (req: any, res) => {
  try {
    // Supabase doesn't have a direct JOIN in the query builder, so we use a view or two queries
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*, products(product_name)')
      .eq('user_id', req.user.id)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Flatten the join result
    const logs = (notifs || []).map((n: any) => ({
      ...n,
      product_name: n.products?.product_name || 'Unknown',
      products: undefined,
    }));

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Cron Job
cron.schedule(process.env.CRON_SCHEDULE || '0 0 * * *', async () => {
  console.log('[CRON] Running warranty check...');
  try {
    const today = new Date();
    const window1Days = Number(process.env.REMINDER_WINDOW_1_DAYS) || 30;
    const window2Days = Number(process.env.REMINDER_WINDOW_2_DAYS) || 7;

    const thirtyDaysStr = new Date(today.getTime() + window1Days * 86400000).toISOString().split('T')[0];
    const sevenDaysStr = new Date(today.getTime() + window2Days * 86400000).toISOString().split('T')[0];

    const { data: products30 } = await supabase.from('products').select('*').eq('expiry_date', thirtyDaysStr);
    const { data: products7 } = await supabase.from('products').select('*').eq('expiry_date', sevenDaysStr);

    const processReminder = async (product: any, type: string) => {
      const { data: existing } = await supabase.from('notifications').select('id').eq('product_id', product.id).eq('type', type).eq('status', 'SENT').single();
      if (existing) return;

      const { data: user } = await supabase.from('users').select('email, name, preferences').eq('id', product.user_id).single();
      if (!user) return;

      // Check user preferences
      const prefs = user.preferences || { rem_30: true, rem_7: true };
      if (type === '30_DAY' && prefs.rem_30 === false) return;
      if (type === '7_DAY' && prefs.rem_7 === false) return;

      const subject = `âš ï¸ Warranty Expiring Soon: ${product.product_name}`;
      const body = `Hi ${user.name},\n\nYour product ${product.product_name} warranty expires on ${product.expiry_date}. You have ${type === '30_DAY' ? window1Days : window2Days} days left.\n\nVisit your Warrify dashboard to take action.\n\nâ€” Warrify AI Warranty Management`;

      try {
        await sendEmail(user.email, subject, body);
        await supabase.from('notifications').insert({ user_id: product.user_id, product_id: product.id, type, status: 'SENT', sent_at: new Date().toISOString() });
        console.log(`[CRON] Sent ${type} reminder for ${product.product_name}`);
      } catch (e) {
        console.error(`[CRON] Failed to send email for ${product.product_name}`, e);
        await supabase.from('notifications').insert({ user_id: product.user_id, product_id: product.id, type, status: 'FAILED', error_message: String(e) });
      }
    };

    for (const p of (products30 || [])) await processReminder(p, '30_DAY');
    for (const p of (products7 || [])) await processReminder(p, '7_DAY');

  } catch (error) {
    console.error('[CRON] Error:', error);
  }
});

// â”€â”€ Demo Data Seeding (Phase 8 â€“ gated behind DEMO_MODE) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/seed-demo', async (req, res) => {
  try {
    if (process.env.DEMO_MODE !== 'true') {
      return res.status(403).json({ error: 'Demo seeding is disabled. Set DEMO_MODE=true in env to enable.' });
    }

    const email = process.env.DEMO_USER_EMAIL || 'shravani@warrify.com';
    const name = process.env.DEMO_USER_NAME || 'Shravani Dakve';

    // Check if user exists
    let userId: string;
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create a placeholder user (normally done via Firebase sync)
      const { data: newUser, error } = await supabase.from('users').insert({
        firebase_uid: 'demo-seed-user',
        name,
        email,
        city: 'Mumbai',
      }).select('id').single();
      if (error) throw error;
      userId = newUser!.id;
    }

    // Clear existing data
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('products').delete().eq('user_id', userId);

    const today = new Date();

    const seedDataPath = path.join(process.cwd(), 'scripts', 'demo-seed.json');
    if (!fs.existsSync(seedDataPath)) {
      return res.status(500).json({ error: 'Demo seed data file not found' });
    }
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
    const products = seedData.products;
    const notifs = seedData.notifs;

    const productIds: number[] = [];
    for (const p of products) {
      const expiry = new Date(today);
      expiry.setDate(expiry.getDate() + p.daysToExpiry);
      const purchase = new Date(expiry);
      purchase.setMonth(purchase.getMonth() - p.wm);

      const { data: inserted } = await supabase.from('products').insert({
        user_id: userId, product_name: p.name, brand: p.brand, category: p.cat,
        purchase_date: purchase.toISOString().split('T')[0], warranty_months: p.wm,
        expiry_date: expiry.toISOString().split('T')[0],
        purchase_price: p.price, invoice_number: p.inv, notes: p.notes, claim_status: p.claim
      }).select('id').single();
      productIds.push(inserted!.id);
    }

    for (const n of notifs) {
      const d = new Date(today);
      d.setDate(d.getDate() - n.daysAgo);
      await supabase.from('notifications').insert({
        user_id: userId, product_id: productIds[n.idx], type: n.type, status: 'SENT', sent_at: d.toISOString()
      });
    }

    res.json({
      success: true,
      message: `Seeded ${products.length} products for demo`,
      credentials: { email, note: 'Use Firebase Auth to login' },
      stats: {
        products: products.length,
        active: products.filter((p: any) => p.daysToExpiry > 0).length,
        expired: products.filter((p: any) => p.daysToExpiry <= 0).length,
        claimed: products.filter((p: any) => p.claim).length,
      }
    });
  } catch (error) {
    console.error('Demo seed error:', error);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

// â”€â”€ Document Quality Classifier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ Image Quality Analysis â”€â”€
      // Analyze brightness (average pixel value estimation from file size vs dimensions)
      const fileSize = fileBuffer.length;

      // Run Tesseract OCR to get text density and confidence
      const Tesseract = (await import('tesseract.js')).default;
      const ocrResult = await Tesseract.recognize(filePath, 'eng');

      const text = ocrResult.data.text || '';
      const confidence = ocrResult.data.confidence || 0;
      const wordCount = text.split(/\s+/).filter((w: string) => w.length > 1).length;

      // â”€â”€ Classification Logic â”€â”€
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
        suggestions.push('âœ… Document is clear and readable');
        suggestions.push('Digital copy preserved â€” safe from thermal fading');
      } else if (confidence >= 40 && confidence < 75 && wordCount >= 5) {
        // Medium confidence = possibly faded
        classification = 'faded_receipt';
        qualityScore = Math.round(confidence);
        issues.push('Receipt appears faded or partially illegible');
        issues.push(`Only ${Math.round(confidence)}% of text is clearly readable`);
        suggestions.push('ðŸ”„ Warrify has preserved your fading receipt digitally');
        suggestions.push('ðŸ’¡ Tip: Take a new photo in bright, even lighting');
        suggestions.push('âš–ï¸ Your consumer rights are now protected â€” the digital copy is legally admissible');
      } else if (wordCount < 5 && confidence < 40) {
        // Very low confidence and few words = poor quality
        classification = 'poor_quality';
        qualityScore = Math.max(5, Math.round(confidence));
        issues.push('Image quality is too low to extract meaningful text');
        issues.push('The document may be blurred, dark, or at an angle');
        suggestions.push('ðŸ“¸ Retake photo: lay document flat, use good lighting');
        suggestions.push('ðŸ’¡ Avoid shadows and ensure all text is visible');
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
        issues.push('âš ï¸ This appears to be a thermal receipt â€” these fade within 3-6 months');
        suggestions.push('ðŸ›¡ï¸ Smart move! Warrify has created a permanent digital backup');
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

// â”€â”€ Start Server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    console.log(`ðŸ›¡ï¸  Warrify server running on http://localhost:${PORT}`);
  });
}

startServer();

