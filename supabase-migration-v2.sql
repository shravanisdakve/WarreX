-- ================================================================
-- Warrify v2 Migration: Externalize Hardcoded Business Data to DB
-- Run this in Supabase SQL Editor after the initial schema
-- ================================================================

-- ── 1. Brands Table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  logo TEXT DEFAULT '📦',              -- emoji or URL
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Service Centers (per brand, per city) ─────────────────────
CREATE TABLE IF NOT EXISTS service_centers (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  center_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Mumbai',
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  country TEXT NOT NULL DEFAULT 'India',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Categories Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '📦',              -- emoji
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- ── 4. Warranty Month Options ────────────────────────────────────
CREATE TABLE IF NOT EXISTS warranty_options (
  id SERIAL PRIMARY KEY,
  months INTEGER UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- ── 5. Claim Statuses ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claim_statuses (
  id SERIAL PRIMARY KEY,
  value TEXT UNIQUE NOT NULL,          -- '' for no claim, 'PENDING', etc.
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- ── 6. Failure Patterns (for risk assessment) ────────────────────
CREATE TABLE IF NOT EXISTS failure_patterns (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,              -- 'Electronics', 'Appliances', etc.
  subcategory TEXT NOT NULL DEFAULT 'default', -- 'phone', 'laptop', etc.
  failure_description TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ── 7. Risk Rules ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_rules (
  id SERIAL PRIMARY KEY,
  rule_key TEXT UNIQUE NOT NULL,       -- 'threshold_expired', 'threshold_80', etc.
  days_limit INTEGER,
  used_percent_limit INTEGER,
  probability INTEGER NOT NULL DEFAULT 10,
  recommendation TEXT DEFAULT ''
);

-- ── 8. Impact Factors (UNEP CO2 / E-waste) ──────────────────────
CREATE TABLE IF NOT EXISTS impact_factors (
  id SERIAL PRIMARY KEY,
  category TEXT UNIQUE NOT NULL,
  co2_kg REAL NOT NULL DEFAULT 10,     -- kg CO2e saved per active product
  ewaste_kg REAL NOT NULL DEFAULT 0.2  -- kg e-waste avoided per active product
);

-- ── 9. App Settings (key-value store for misc config) ────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_centers_brand ON service_centers(brand_id);
CREATE INDEX IF NOT EXISTS idx_service_centers_city ON service_centers(city);
CREATE INDEX IF NOT EXISTS idx_failure_patterns_cat ON failure_patterns(category, subcategory);

-- =================================================================
-- SEED DATA: From existing hardcoded values in businessRules.ts
-- =================================================================

-- ── Seed Brands ──────────────────────────────────────────────────
INSERT INTO brands (name, logo, phone, email, website, sort_order) VALUES
  ('Samsung', '🔵', '1800-40-7267864', 'support@samsung.com', 'https://www.samsung.com/in/support/', 1),
  ('LG', '🔴', '1800-315-9999', 'support@lg.com', 'https://www.lg.com/in/support', 2),
  ('Sony', '⚫', '1800-103-7799', 'support@sony.com', 'https://www.sony.co.in/support', 3),
  ('Apple', '🍎', '000-800-040-1966', '', 'https://support.apple.com/en-in', 4),
  ('HP', '💻', '1800-108-4747', '', 'https://support.hp.com/in-en', 5),
  ('Dell', '🖥️', '1800-425-4026', '', 'https://www.dell.com/support/home/en-in', 6),
  ('Lenovo', '🔷', '1800-419-7555', '', 'https://support.lenovo.com/in/en', 7),
  ('Whirlpool', '🌀', '1800-208-1800', '', 'https://www.whirlpoolindia.com/support', 8),
  ('Bosch', '🔧', '1800-266-1880', '', 'https://www.bosch-home.in/support', 9),
  ('OnePlus', '🔴', '1800-102-8411', 'support@oneplus.com', 'https://www.oneplus.in/support', 10),
  ('Xiaomi', '🟠', '1800-103-6286', 'service.in@xiaomi.com', 'https://www.mi.com/in/support', 11),
  ('Realme', '🟡', '1800-102-2777', 'service@realme.com', 'https://www.realme.com/in/support', 12),
  ('Panasonic', '🔵', '1800-103-1333', '', 'https://www.panasonic.com/in/support.html', 13),
  ('Godrej', '🟢', '1800-209-5511', '', 'https://www.godrej.com/support', 14),
  ('Voltas', '❄️', '1800-599-9555', '', 'https://www.voltas.com/contact-us', 15),
  ('Haier', '🏠', '1800-200-9999', '', 'https://www.haier.com/in/support/', 16),
  ('Asus', '🎮', '1800-209-0365', '', 'https://www.asus.com/in/support/', 17),
  ('Acer', '💚', '1800-115-553', '', 'https://www.acer.com/ac/en/IN/content/support', 18)
ON CONFLICT (name) DO NOTHING;

-- ── Seed Service Centers ─────────────────────────────────────────
-- Samsung
INSERT INTO service_centers (brand_id, center_name, city, state) VALUES
  ((SELECT id FROM brands WHERE name='Samsung'), 'Samsung Service Plaza, Andheri West, Mumbai', 'Mumbai', 'Maharashtra'),
  ((SELECT id FROM brands WHERE name='Samsung'), 'Samsung Authorised Centre, Dadar, Mumbai', 'Mumbai', 'Maharashtra'),
  ((SELECT id FROM brands WHERE name='Samsung'), 'Samsung Smart Café, Thane', 'Thane', 'Maharashtra'),
  -- LG
  ((SELECT id FROM brands WHERE name='LG'), 'LG Service Center, Goregaon, Mumbai', 'Mumbai', 'Maharashtra'),
  ((SELECT id FROM brands WHERE name='LG'), 'LG Authorised Service, Borivali, Mumbai', 'Mumbai', 'Maharashtra'),
  ((SELECT id FROM brands WHERE name='LG'), 'LG Care Center, Navi Mumbai', 'Navi Mumbai', 'Maharashtra'),
  -- Sony
  ((SELECT id FROM brands WHERE name='Sony'), 'Sony Center, Fort, Mumbai', 'Mumbai', 'Maharashtra'),
  ((SELECT id FROM brands WHERE name='Sony'), 'Sony Service Hub, Powai, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Apple
  ((SELECT id FROM brands WHERE name='Apple'), 'Apple BKC, Mumbai', 'Mumbai', 'Maharashtra'),
  ((SELECT id FROM brands WHERE name='Apple'), 'Apple Authorised Service, Andheri, Mumbai', 'Mumbai', 'Maharashtra'),
  -- HP
  ((SELECT id FROM brands WHERE name='HP'), 'HP Service Center, Lower Parel, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Dell
  ((SELECT id FROM brands WHERE name='Dell'), 'Dell Service Center, Andheri, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Lenovo
  ((SELECT id FROM brands WHERE name='Lenovo'), 'Lenovo Exclusive Store, Dadar, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Whirlpool
  ((SELECT id FROM brands WHERE name='Whirlpool'), 'Whirlpool Service, Bandra, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Bosch
  ((SELECT id FROM brands WHERE name='Bosch'), 'Bosch Home Appliance Service, Worli, Mumbai', 'Mumbai', 'Maharashtra'),
  -- OnePlus
  ((SELECT id FROM brands WHERE name='OnePlus'), 'OnePlus Experience Store, Phoenix Mall, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Xiaomi
  ((SELECT id FROM brands WHERE name='Xiaomi'), 'Mi Service Center, Malad, Mumbai', 'Mumbai', 'Maharashtra'),
  ((SELECT id FROM brands WHERE name='Xiaomi'), 'Xiaomi Authorised Service, Vashi', 'Navi Mumbai', 'Maharashtra'),
  -- Realme
  ((SELECT id FROM brands WHERE name='Realme'), 'Realme Service Center, Ghatkopar, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Panasonic
  ((SELECT id FROM brands WHERE name='Panasonic'), 'Panasonic Service, Kurla, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Godrej
  ((SELECT id FROM brands WHERE name='Godrej'), 'Godrej Service Hub, Vikhroli, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Voltas
  ((SELECT id FROM brands WHERE name='Voltas'), 'Voltas Service, Thane, Mumbai', 'Thane', 'Maharashtra'),
  -- Haier
  ((SELECT id FROM brands WHERE name='Haier'), 'Haier Service Center, Andheri, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Asus
  ((SELECT id FROM brands WHERE name='Asus'), 'Asus Service Center, Lamington Road, Mumbai', 'Mumbai', 'Maharashtra'),
  -- Acer
  ((SELECT id FROM brands WHERE name='Acer'), 'Acer Service Center, Dadar, Mumbai', 'Mumbai', 'Maharashtra');

-- ── Seed Categories ──────────────────────────────────────────────
INSERT INTO categories (name, icon, sort_order) VALUES
  ('Electronics', '📱', 1),
  ('Appliances', '🏠', 2),
  ('Furniture', '🪑', 3),
  ('Vehicle', '🚗', 4),
  ('Accessories', '⌚', 5),
  ('Other', '📦', 6)
ON CONFLICT (name) DO NOTHING;

-- ── Seed Warranty Options ────────────────────────────────────────
INSERT INTO warranty_options (months, sort_order) VALUES
  (3, 1), (6, 2), (12, 3), (18, 4), (24, 5), (36, 6), (48, 7), (60, 8)
ON CONFLICT (months) DO NOTHING;

-- ── Seed Claim Statuses ──────────────────────────────────────────
INSERT INTO claim_statuses (value, label, sort_order) VALUES
  ('', 'No Claim Filed', 1),
  ('PENDING', '⏳ Pending', 2),
  ('SUCCESSFUL', '✅ Successful', 3),
  ('REJECTED', '❌ Rejected', 4)
ON CONFLICT (value) DO NOTHING;

-- ── Seed Failure Patterns ────────────────────────────────────────
INSERT INTO failure_patterns (category, subcategory, failure_description, sort_order) VALUES
  -- Electronics
  ('Electronics', 'phone', 'Battery degradation', 1),
  ('Electronics', 'phone', 'Screen flickering', 2),
  ('Electronics', 'phone', 'Charging port issues', 3),
  ('Electronics', 'phone', 'Speaker malfunction', 4),
  ('Electronics', 'laptop', 'Battery swelling', 1),
  ('Electronics', 'laptop', 'Keyboard key failure', 2),
  ('Electronics', 'laptop', 'Screen backlight bleed', 3),
  ('Electronics', 'laptop', 'Hinge wobble', 4),
  ('Electronics', 'headphones', 'Driver unit failure', 1),
  ('Electronics', 'headphones', 'Bluetooth connectivity issues', 2),
  ('Electronics', 'headphones', 'Cushion deterioration', 3),
  ('Electronics', 'tv', 'Panel dead pixels', 1),
  ('Electronics', 'tv', 'Backlight failure', 2),
  ('Electronics', 'tv', 'HDMI port issues', 3),
  ('Electronics', 'tv', 'Sound board failure', 4),
  ('Electronics', 'default', 'Battery issues', 1),
  ('Electronics', 'default', 'Component wear', 2),
  ('Electronics', 'default', 'Connectivity problems', 3),
  -- Appliances
  ('Appliances', 'washing', 'Drum bearing failure', 1),
  ('Appliances', 'washing', 'Water inlet valve', 2),
  ('Appliances', 'washing', 'Door seal deterioration', 3),
  ('Appliances', 'washing', 'Motor capacitor', 4),
  ('Appliances', 'refrigerator', 'Compressor issues', 1),
  ('Appliances', 'refrigerator', 'Thermostat failure', 2),
  ('Appliances', 'refrigerator', 'Defrost heater', 3),
  ('Appliances', 'refrigerator', 'Door seal wear', 4),
  ('Appliances', 'ac', 'Compressor failure', 1),
  ('Appliances', 'ac', 'Gas leakage', 2),
  ('Appliances', 'ac', 'PCB malfunction', 3),
  ('Appliances', 'ac', 'Fan motor issues', 4),
  ('Appliances', 'microwave', 'Magnetron failure', 1),
  ('Appliances', 'microwave', 'Door switch issues', 2),
  ('Appliances', 'microwave', 'Turntable motor', 3),
  ('Appliances', 'default', 'Motor wear', 1),
  ('Appliances', 'default', 'Seal deterioration', 2),
  ('Appliances', 'default', 'Control board issues', 3),
  -- Vehicle
  ('Vehicle', 'default', 'Battery failure', 1),
  ('Vehicle', 'default', 'Electrical issues', 2),
  ('Vehicle', 'default', 'Suspension wear', 3),
  ('Vehicle', 'default', 'Brake pad wear', 4),
  -- Furniture
  ('Furniture', 'default', 'Joint loosening', 1),
  ('Furniture', 'default', 'Surface delamination', 2),
  ('Furniture', 'default', 'Mechanism failure', 3),
  -- Default/Other
  ('default', 'default', 'General wear and tear', 1),
  ('default', 'default', 'Component degradation', 2);

-- ── Seed Risk Rules ──────────────────────────────────────────────
INSERT INTO risk_rules (rule_key, days_limit, used_percent_limit, probability, recommendation) VALUES
  ('expired', 0, NULL, 85, 'Warranty has expired. Consider extended warranty or replacement plans.'),
  ('critical', NULL, 80, 65, ''),
  ('moderate', NULL, 60, 40, ''),
  ('low', NULL, 40, 25, ''),
  ('minimal', NULL, NULL, 10, '')
ON CONFLICT (rule_key) DO NOTHING;

-- ── Seed Impact Factors ──────────────────────────────────────────
INSERT INTO impact_factors (category, co2_kg, ewaste_kg) VALUES
  ('Electronics', 18, 0.2),
  ('Appliances', 65, 1.5),
  ('Vehicle', 120, 3.0),
  ('Furniture', 25, 0.5)
ON CONFLICT (category) DO NOTHING;

-- ── Seed App Settings ────────────────────────────────────────────
INSERT INTO app_settings (key, value, description) VALUES
  ('resale_constants', '{"min_age_depreciation": 0.3, "max_age_depreciation_factor": 0.5, "without_warranty_factor": 0.65, "warranty_premium_per_year_factor": 0.08}', 'Resale value calculation constants'),
  ('repair_cost_factors', '{"base_percentage": 0.3, "default_base_cost": 5000}', 'Repair cost estimation factors'),
  ('risk_categories', '["Electronics", "Appliances"]', 'Categories that get +10% risk boost'),
  ('platform_version', '"2.1.0"', 'Current platform version string'),
  ('recommendations', '{"good_shape": "Your product is in good shape. Continue regular use.", "expired": "Warranty has expired. Consider extended warranty or replacement plans."}', 'Static recommendation messages'),
  ('quick_actions', '[{"label": "📋 Warranty Overview", "message": "Show me the warranty status of all my products"}, {"label": "⚠️ Expiring Soon", "message": "Which of my products have warranties expiring this month?"}, {"label": "📞 Service Centers", "message": "Show me service center locations near me for my registered brands"}, {"label": "📧 Draft Claim", "message": "Help me draft a warranty claim email for my product with an issue"}, {"label": "🔮 Risk Analysis", "message": "What are the common failure risks for my products based on their age?"}, {"label": "💰 Resale Value", "message": "What is the estimated resale value of my products with warranty?"}]', 'Quick action buttons for AI assistant'),
  ('welcome_messages', '{"welcome": "Hello! I''m your Warrify AI Advisor. 🧠\\n\\nI don''t just answer questions — I proactively analyze your warranty portfolio and suggest actions.\\n\\n**Here''s what I can do:**\\n• 📋 Check warranty status of all your products\\n• 🔮 Predict failure risks based on product age\\n• 📧 Draft professional claim emails with specific issues\\n• 📞 Find nearest service centers with contact details\\n• 💰 Estimate product resale value with/without warranty\\n\\nTry the quick actions below, or just ask me anything!", "welcomeShort": "Hello! I''m your Warrify AI Advisor. 🧠\\n\\nI proactively analyze your warranty portfolio and suggest actions.\\n\\n**Quick actions:**\\n• Check warranty status\\n• Predict failure risks\\n• Draft claim emails\\n• Find service centers\\n• Estimate resale value\\n\\nJust ask!"}', 'Customizable AI welcome messages'),
  ('system_prompt', '"You are Warrify AI Advisor – a proactive, intelligent warranty management advisor.\\nCurrent user: {{userName}} ({{userEmail}})\\nToday''s date: {{date}}\\n\\nUser''s registered products:\\n{{productContext}}\\n\\nAvailable service center brands: {{availableBrands}}\\n\\nInstructions:\\n- Be concise, actionable and helpful. Use bullet points and formatting.\\n- When asked about warranty status, provide detailed analysis with days remaining.\\n- When asked about service centers, provide the contact info AND nearby service center locations.\\n- When asked to draft a claim email, write a HIGHLY PROFESSIONAL email with subject line, formal greeting, and specific product details (Invoice#, Date).\\n- If the user asks in Hindi or Marathi, respond in that language.\\n- Proactively suggest actions (e.g. \\"Warranty expires in 15 days, check for common issues\\")."', 'The main system prompt for the AI Advisor')
ON CONFLICT (key) DO NOTHING;
