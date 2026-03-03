/**
 * Centralized Product Catalog Metadata
 * 
 * Single source of truth for brands, categories, warranty options,
 * claim statuses, and their associated icons/logos.
 * 
 * Previously duplicated across:
 *   - src/pages/AddProduct.tsx
 *   - src/pages/Dashboard.tsx
 *   - src/pages/ProductDetails.tsx
 */

// ─── Brands ────────────────────────────────────────────────
export const BRANDS = [
    "Samsung", "LG", "Sony", "Apple", "HP", "Dell", "Lenovo",
    "Whirlpool", "Bosch", "OnePlus", "Xiaomi", "Realme",
    "Panasonic", "Godrej", "Voltas", "Haier", "Asus", "Acer", "Other",
] as const;

export type Brand = (typeof BRANDS)[number];

// ─── Brand Logos / Icons (emoji) ───────────────────────────
export const BRAND_LOGOS: Record<string, string> = {
    'Samsung': '🔵',
    'LG': '🔴',
    'Sony': '⚫',
    'Apple': '🍎',
    'HP': '💻',
    'Dell': '🖥️',
    'Lenovo': '🔷',
    'Whirlpool': '🌀',
    'Bosch': '🔧',
    'OnePlus': '🔴',
    'Xiaomi': '🟠',
    'Realme': '🟡',
    'Panasonic': '🔵',
    'Godrej': '🟢',
    'Voltas': '❄️',
    'Haier': '🏠',
    'Asus': '🎮',
    'Acer': '💚',
};

// ─── Categories ────────────────────────────────────────────
export const CATEGORIES = [
    "Electronics", "Appliances", "Furniture", "Vehicle", "Accessories", "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Categories prefixed with "all" — used for filter dropdowns */
export const FILTER_CATEGORIES = ["all", ...CATEGORIES] as const;

// ─── Category Icons (emoji) ───────────────────────────────
export const CATEGORY_ICONS: Record<string, string> = {
    'Electronics': '📱',
    'Appliances': '🏠',
    'Furniture': '🪑',
    'Vehicle': '🚗',
    'Accessories': '⌚',
    'Other': '📦',
};

// ─── Warranty Month Options ───────────────────────────────
export const WARRANTY_MONTH_OPTIONS = [3, 6, 12, 18, 24, 36, 48, 60] as const;

// ─── Claim Statuses ───────────────────────────────────────
export const CLAIM_STATUSES = [
    { value: '', label: 'No Claim Filed' },
    { value: 'PENDING', label: '⏳ Pending' },
    { value: 'SUCCESSFUL', label: '✅ Successful' },
    { value: 'REJECTED', label: '❌ Rejected' },
] as const;
