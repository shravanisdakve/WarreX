import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'warranty_vault.db');
const db = new Database(dbPath);

async function seed() {
  console.log('Seeding database...');

  // 1. Create Demo User
  const email = 'demo@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);
  const name = 'Demo User';

  let userId;
  try {
    const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    const info = stmt.run(name, email, hashedPassword);
    userId = info.lastInsertRowid;
    console.log(`Created user: ${email} (Password: ${password})`);
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const stmt = db.prepare('SELECT id FROM users WHERE email = ?');
      const user = stmt.get(email) as any;
      userId = user.id;
      console.log(`User ${email} already exists. ID: ${userId}`);
    } else {
      throw e;
    }
  }

  // 2. Create Demo Products
  const products = [
    {
      product_name: 'Samsung Galaxy S24',
      brand: 'Samsung',
      category: 'Electronics',
      purchase_date: '2025-01-15',
      warranty_months: 12,
      expiry_date: '2026-01-15', // Active
      notes: 'Main phone'
    },
    {
      product_name: 'LG Washing Machine',
      brand: 'LG',
      category: 'Appliances',
      purchase_date: '2023-03-10',
      warranty_months: 24,
      expiry_date: '2025-03-10', // Expiring soon (assuming current date is around Feb 2026 based on prompt context, wait, prompt said 2026-02-27. So March 10 2026 is soon)
      // Wait, current time is 2026-02-27. 
      // If expiry is 2025-03-10, it is EXPIRED.
      // Let's make it expiring soon: 2026-03-15 (in ~16 days)
      notes: 'Front load'
    },
    {
      product_name: 'Sony Headphones',
      brand: 'Sony',
      category: 'Electronics',
      purchase_date: '2024-01-01',
      warranty_months: 12,
      expiry_date: '2025-01-01', // Expired
      notes: 'Noise cancelling'
    }
  ];

  // Adjust dates relative to "now" (2026-02-27) to ensure they show up correctly in dashboard categories
  const today = new Date('2026-02-27');
  
  // Product 1: Active (Expires in 6 months)
  const date1 = new Date(today);
  date1.setMonth(date1.getMonth() + 6);
  products[0].expiry_date = date1.toISOString().split('T')[0];

  // Product 2: Expiring Soon (Expires in 10 days)
  const date2 = new Date(today);
  date2.setDate(date2.getDate() + 10);
  products[1].expiry_date = date2.toISOString().split('T')[0];
  // Purchase date for this one (2 years ago)
  const purch2 = new Date(date2);
  purch2.setFullYear(purch2.getFullYear() - 2);
  products[1].purchase_date = purch2.toISOString().split('T')[0];


  // Product 3: Expired (Expired 1 month ago)
  const date3 = new Date(today);
  date3.setMonth(date3.getMonth() - 1);
  products[2].expiry_date = date3.toISOString().split('T')[0];
  // Purchase date (1 year before expiry)
  const purch3 = new Date(date3);
  purch3.setFullYear(purch3.getFullYear() - 1);
  products[2].purchase_date = purch3.toISOString().split('T')[0];


  const insertProduct = db.prepare(`
    INSERT INTO products (user_id, product_name, brand, category, purchase_date, warranty_months, expiry_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    // Check if exists to avoid duplicates on re-run
    const check = db.prepare('SELECT id FROM products WHERE user_id = ? AND product_name = ?').get(userId, p.product_name);
    if (!check) {
      insertProduct.run(userId, p.product_name, p.brand, p.category, p.purchase_date, p.warranty_months, p.expiry_date, p.notes);
      console.log(`Added product: ${p.product_name}`);
    }
  }

  console.log('Seeding complete.');
}

seed().catch(console.error);
