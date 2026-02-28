import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'warranty_vault.db');
const db = new Database(dbPath);

export async function seedDemoDatabase(existingDb?: any) {
  const database = existingDb || db;
  console.log('🌱 Seeding Warrify database...\n');

  // Ensure tables and columns exist
  try { database.exec(`ALTER TABLE users ADD COLUMN city TEXT DEFAULT 'Mumbai'`); } catch (e) { }
  try { database.exec(`ALTER TABLE products ADD COLUMN purchase_price REAL DEFAULT 0`); } catch (e) { }
  try { database.exec(`ALTER TABLE products ADD COLUMN claim_status TEXT DEFAULT NULL`); } catch (e) { }
  try { database.exec(`CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date)`); } catch (e) { }

  // 1. Create Demo User
  const email = 'shravani@warrify.com';
  const password = 'demo123';
  const hashedPassword = await bcrypt.hash(password, 10);
  const name = 'Shravani Dakve';

  let userId: any;
  try {
    const stmt = database.prepare('INSERT INTO users (name, email, password, city) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, email, hashedPassword, 'Mumbai');
    userId = info.lastInsertRowid;
    console.log(`✅ Created user: ${email} (Password: ${password})`);
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const stmt = database.prepare('SELECT id FROM users WHERE email = ?');
      const user = stmt.get(email) as any;
      userId = user.id;
      console.log(`ℹ️  User ${email} already exists. ID: ${userId}`);
    } else {
      throw e;
    }
  }

  // Clear existing products for this user to avoid duplicates
  database.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  database.prepare('DELETE FROM products WHERE user_id = ?').run(userId);
  console.log('🧹 Cleared existing demo data.\n');

  // 2. Create 12 Diverse Demo Products (with claim statuses for some)
  const today = new Date();

  const products = [
    {
      product_name: 'Samsung Galaxy S24 Ultra',
      brand: 'Samsung',
      category: 'Electronics',
      purchase_date: '2025-06-15',
      warranty_months: 12,
      expiry_date: '2026-06-15',
      purchase_price: 129999,
      invoice_number: 'SAM-2025-78432',
      notes: 'Primary phone, 256GB Titanium Black',
      claim_status: null
    },
    {
      product_name: 'LG Front Load Washing Machine',
      brand: 'LG',
      category: 'Appliances',
      purchase_date: '2024-04-20',
      warranty_months: 24,
      expiry_date: '2026-04-20',
      purchase_price: 42990,
      invoice_number: 'LG-2024-55123',
      notes: '8kg capacity, AI Direct Drive',
      claim_status: null
    },
    {
      product_name: 'Sony WH-1000XM5 Headphones',
      brand: 'Sony',
      category: 'Electronics',
      purchase_date: '2025-02-01',
      warranty_months: 12,
      expiry_date: '2026-02-01',
      purchase_price: 26990,
      invoice_number: 'SONY-2025-11209',
      notes: 'Noise cancelling, Silver — faded receipt digitized via Warrify',
      claim_status: 'claimed'  // Successfully claimed!
    },
    {
      product_name: 'HP Pavilion Laptop 15',
      brand: 'HP',
      category: 'Electronics',
      purchase_date: '2025-08-10',
      warranty_months: 24,
      expiry_date: '2027-08-10',
      purchase_price: 65999,
      invoice_number: 'HP-2025-66778',
      notes: 'Intel i7, 16GB RAM, 512GB SSD',
      claim_status: null
    },
    {
      product_name: 'Whirlpool Double Door Refrigerator',
      brand: 'Whirlpool',
      category: 'Appliances',
      purchase_date: '2024-11-25',
      warranty_months: 36,
      expiry_date: '2027-11-25',
      purchase_price: 38500,
      invoice_number: 'WP-2024-99321',
      notes: '340L Frost Free, 3-Star Energy Rating',
      claim_status: null
    },
    {
      product_name: 'OnePlus Nord CE 4',
      brand: 'OnePlus',
      category: 'Electronics',
      purchase_date: '2025-09-05',
      warranty_months: 12,
      expiry_date: '2026-09-05',
      purchase_price: 24999,
      invoice_number: 'OP-2025-44567',
      notes: 'Secondary phone for work',
      claim_status: null
    },
    {
      product_name: 'Godrej Interio Office Chair',
      brand: 'Godrej',
      category: 'Furniture',
      purchase_date: '2025-01-10',
      warranty_months: 60,
      expiry_date: '2030-01-10',
      purchase_price: 18500,
      invoice_number: 'GDR-2025-12890',
      notes: 'Ergonomic Motion High-Back',
      claim_status: null
    },
    {
      product_name: 'Voltas Split AC 1.5 Ton',
      brand: 'Voltas',
      category: 'Appliances',
      purchase_date: '2024-03-18',
      warranty_months: 12,
      expiry_date: '2025-03-18',
      purchase_price: 35990,
      invoice_number: 'VOL-2024-87654',
      notes: '5-Star Inverter, Copper condenser',
      claim_status: 'claimed' // Was claimed before expiry!
    },
    {
      product_name: 'Apple AirPods Pro 2',
      brand: 'Apple',
      category: 'Electronics',
      purchase_date: '2025-12-25',
      warranty_months: 12,
      expiry_date: '2026-12-25',
      purchase_price: 24900,
      invoice_number: 'APL-2025-33221',
      notes: 'USB-C, with MagSafe case',
      claim_status: null
    },
    {
      product_name: 'Bosch Dishwasher Series 4',
      brand: 'Bosch',
      category: 'Appliances',
      purchase_date: '2025-05-12',
      warranty_months: 24,
      expiry_date: '2027-05-12',
      purchase_price: 54990,
      invoice_number: 'BSH-2025-77890',
      notes: '13 Place Settings, Silence Plus',
      claim_status: null
    },
    // NEW: 2 additional products for richer demo
    {
      product_name: 'Xiaomi Redmi Note 13 Pro',
      brand: 'Xiaomi',
      category: 'Electronics',
      purchase_date: '2025-10-01',
      warranty_months: 12,
      expiry_date: '2026-10-01',
      purchase_price: 18999,
      invoice_number: 'XI-2025-55678',
      notes: 'Rescued from faded thermal receipt — original receipt was unreadable after 3 months',
      claim_status: null
    },
    {
      product_name: 'Panasonic Microwave Oven',
      brand: 'Panasonic',
      category: 'Appliances',
      purchase_date: '2025-07-20',
      warranty_months: 12,
      expiry_date: '2026-07-20',
      purchase_price: 11490,
      invoice_number: 'PAN-2025-44321',
      notes: '27L Convection, Auto-cook menu',
      claim_status: 'pending' // Claim in progress
    },
  ];

  // Adjust some dates relative to today to create the right demo scenarios:

  // Product 3 (Sony Headphones) - Expired 27 days ago (but was successfully claimed!)
  const expired1 = new Date(today);
  expired1.setDate(expired1.getDate() - 27);
  products[2].expiry_date = expired1.toISOString().split('T')[0];
  const purch2 = new Date(expired1);
  purch2.setFullYear(purch2.getFullYear() - 1);
  products[2].purchase_date = purch2.toISOString().split('T')[0];

  // Product 8 (Voltas AC) - Expired 11 months ago (but was claimed!)
  const expired2 = new Date(today);
  expired2.setMonth(expired2.getMonth() - 11);
  products[7].expiry_date = expired2.toISOString().split('T')[0];
  const purch8 = new Date(expired2);
  purch8.setFullYear(purch8.getFullYear() - 1);
  products[7].purchase_date = purch8.toISOString().split('T')[0];

  // Product 2 (LG Washing Machine) - Expiring in 8 days!
  const expSoon1 = new Date(today);
  expSoon1.setDate(expSoon1.getDate() + 8);
  products[1].expiry_date = expSoon1.toISOString().split('T')[0];
  const purch1 = new Date(expSoon1);
  purch1.setFullYear(purch1.getFullYear() - 2);
  products[1].purchase_date = purch1.toISOString().split('T')[0];

  // Product 1 (Samsung) - Expiring in 22 days
  const expSoon2 = new Date(today);
  expSoon2.setDate(expSoon2.getDate() + 22);
  products[0].expiry_date = expSoon2.toISOString().split('T')[0];
  const purch0 = new Date(expSoon2);
  purch0.setFullYear(purch0.getFullYear() - 1);
  products[0].purchase_date = purch0.toISOString().split('T')[0];

  // Product 12 (Panasonic Microwave) - Expiring in 3 days (urgent claim scenario!)
  const expSoon3 = new Date(today);
  expSoon3.setDate(expSoon3.getDate() + 3);
  products[11].expiry_date = expSoon3.toISOString().split('T')[0];
  const purch11 = new Date(expSoon3);
  purch11.setFullYear(purch11.getFullYear() - 1);
  products[11].purchase_date = purch11.toISOString().split('T')[0];

  // Insert products
  const insertProduct = database.prepare(`
    INSERT INTO products (user_id, product_name, brand, category, purchase_date, warranty_months, expiry_date, purchase_price, invoice_number, notes, claim_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const productIds: any[] = [];

  for (const p of products) {
    const info = insertProduct.run(
      userId, p.product_name, p.brand, p.category,
      p.purchase_date, p.warranty_months, p.expiry_date,
      p.purchase_price, p.invoice_number, p.notes, p.claim_status || null
    );
    productIds.push(info.lastInsertRowid);
    const statusIcon = p.claim_status === 'claimed' ? '✅ Claimed' : p.claim_status === 'pending' ? '⏳ Pending' : new Date(p.expiry_date) > today ? '🟢 Active' : '🔴 Expired';
    console.log(`  📦 Added: ${p.product_name} (₹${p.purchase_price.toLocaleString('en-IN')}) — ${statusIcon}`);
  }

  // 3. Seed Notification History
  console.log('\n📬 Seeding notification history...');

  const insertNotif = database.prepare(`
    INSERT INTO notifications (user_id, product_id, type, status, sent_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const notificationHistory = [
    { productIdx: 0, type: 'PRODUCT_ADDED', status: 'SENT', daysAgo: 365 },
    { productIdx: 1, type: 'PRODUCT_ADDED', status: 'SENT', daysAgo: 700 },
    { productIdx: 1, type: '30_DAY', status: 'SENT', daysAgo: 22 },
    { productIdx: 0, type: '30_DAY', status: 'SENT', daysAgo: 8 },
    { productIdx: 2, type: '30_DAY', status: 'SENT', daysAgo: 57 },
    { productIdx: 2, type: '7_DAY', status: 'SENT', daysAgo: 34 },
    { productIdx: 2, type: 'CLAIM_EMAIL', status: 'SENT', daysAgo: 30 },  // Claim email was sent!
    { productIdx: 7, type: '30_DAY', status: 'SENT', daysAgo: 365 },
    { productIdx: 7, type: '7_DAY', status: 'SENT', daysAgo: 342 },
    { productIdx: 7, type: 'CLAIM_EMAIL', status: 'SENT', daysAgo: 340 }, // Claim email was sent!
    { productIdx: 3, type: 'PRODUCT_ADDED', status: 'SENT', daysAgo: 200 },
    { productIdx: 4, type: 'PRODUCT_ADDED', status: 'SENT', daysAgo: 460 },
    { productIdx: 5, type: 'PRODUCT_ADDED', status: 'SENT', daysAgo: 175 },
    { productIdx: 6, type: 'PRODUCT_ADDED', status: 'SENT', daysAgo: 415 },
    { productIdx: 10, type: 'PRODUCT_ADDED', status: 'SENT', daysAgo: 150 },
    { productIdx: 11, type: 'PRODUCT_ADDED', status: 'SENT', daysAgo: 345 },
    { productIdx: 11, type: '7_DAY', status: 'SENT', daysAgo: 0 }, // Fresh notification!
  ];

  for (const n of notificationHistory) {
    const sentDate = new Date(today);
    sentDate.setDate(sentDate.getDate() - n.daysAgo);
    insertNotif.run(userId, productIds[n.productIdx], n.type, n.status, sentDate.toISOString());
  }

  console.log(`  ✅ Added ${notificationHistory.length} notification records\n`);

  // Calculate environmental impact for summary
  const activeProducts = products.filter(p => new Date(p.expiry_date) > today);
  const claimedProducts = products.filter(p => p.claim_status === 'claimed');
  const co2Saved = activeProducts.reduce((sum, p) => {
    const co2Map: Record<string, number> = { 'Electronics': 18, 'Appliances': 65, 'Vehicle': 120, 'Furniture': 25 };
    return sum + (co2Map[p.category] || 10);
  }, 0);

  // Summary
  const active = activeProducts.length;
  const expired = products.length - active;
  const totalValue = products.reduce((sum, p) => sum + p.purchase_price, 0);

  console.log('═══════════════════════════════════════');
  console.log(`✅ Seeding complete!`);
  console.log(`   📦 Products: ${products.length} (${active} active, ${expired} expired, ${claimedProducts.length} claimed)`);
  console.log(`   💰 Total Protected Value: ₹${totalValue.toLocaleString('en-IN')}`);
  console.log(`   🌍 CO₂e Saved (UNEP): ${co2Saved} kg/year`);
  console.log(`   📬 Notifications: ${notificationHistory.length} records`);
  console.log(`\n   🔑 Login: ${email} / ${password}`);
  console.log('═══════════════════════════════════════\n');

  return { userId, email, password, productCount: products.length };
}

// Run directly if called as script
seedDemoDatabase().catch(console.error);
