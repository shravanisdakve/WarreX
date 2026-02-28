import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Search, AlertTriangle, CheckCircle, Clock, Filter, X, ShieldCheck, ShieldAlert, ShieldX, Sparkles, Activity, Globe, IndianRupee, Brain, Info, TrendingDown, Package, ArrowUpRight, Zap, BarChart3 } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

interface Product {
  id: number;
  product_name: string;
  brand: string;
  category: string;
  expiry_date: string;
  purchase_date: string;
  purchase_price: number;
}

const CATEGORIES = ["all", "Electronics", "Appliances", "Furniture", "Vehicle", "Accessories", "Other"];

const BRAND_LOGOS: Record<string, string> = {
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

const CATEGORY_ICONS: Record<string, string> = {
  'Electronics': '📱',
  'Appliances': '🏠',
  'Furniture': '🪑',
  'Vehicle': '🚗',
  'Accessories': '⌚',
  'Other': '📦',
};

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [category, setCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMissedClaims, setShowMissedClaims] = useState(false);
  const [showImpactTooltip, setShowImpactTooltip] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    fetchProducts();
    fetchAiInsights();
  }, [search, expiringSoon, category, dateFrom, dateTo, i18n.language]);

  const fetchProducts = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (expiringSoon) params.expiringSoon = 'true';
      if (category !== 'all') params.category = category;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await axios.get('/api/products', { params });
      setProducts(res.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const fetchAiInsights = async () => {
    try {
      const res = await axios.get(`/api/ai/insights?lang=${i18n.language}`);
      setAiInsights(res.data.insights || []);
    } catch (error) {
      console.error('Failed to fetch insights');
    }
  };

  const getStatus = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { label: t('expired'), color: 'text-red-400 bg-red-500/10 border border-red-500/20', icon: ShieldX, dotColor: 'bg-red-500' };
    if (days <= 30) return { label: `${days} ${t('days_left')}`, color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20', icon: ShieldAlert, dotColor: 'bg-amber-500' };
    return { label: t('active'), color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20', icon: ShieldCheck, dotColor: 'bg-emerald-500' };
  };

  const getRiskScore = (product: Product, t: any) => {
    const days = differenceInDays(parseISO(product.expiry_date), new Date());
    if (days < 0) return null;

    const isHighValueCategory = ["Electronics", "Appliances", "Vehicle"].includes(product.category);

    if (isHighValueCategory) {
      if (days <= 15) {
        return { text: t('risk_claim_now'), color: "text-purple-400 bg-purple-500/10 border-purple-500/20 animate-pulse", icon: Sparkles };
      }
      if (days <= 30) {
        return { text: t('risk_high'), color: "text-red-400 bg-red-500/10 border-red-500/20 animate-pulse", icon: AlertTriangle };
      }
      if (days <= 90) {
        return { text: t('risk_moderate'), color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Activity };
      }
    } else {
      if (days <= 30) {
        return { text: t('expiring_soon'), color: "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse", icon: Clock };
      }
    }

    return { text: t('risk_low'), color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle };
  };

  const clearFilters = () => {
    setSearch('');
    setExpiringSoon(false);
    setCategory('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = expiringSoon || category !== 'all' || dateFrom || dateTo;

  // Stats
  const totalProducts = products.length;
  const activeProducts = products.filter(p => differenceInDays(parseISO(p.expiry_date), new Date()) > 30).length;
  const expiringProducts = products.filter(p => {
    const d = differenceInDays(parseISO(p.expiry_date), new Date());
    return d >= 0 && d <= 30;
  }).length;
  const expiredProducts = products.filter(p => differenceInDays(parseISO(p.expiry_date), new Date()) < 0).length;
  const expiredProductsList = products.filter(p => differenceInDays(parseISO(p.expiry_date), new Date()) < 0);

  // ₹ Savings calculation
  const activeProductsList = products.filter(p => differenceInDays(parseISO(p.expiry_date), new Date()) >= 0);
  const protectedValue = activeProductsList.reduce((sum, p) => sum + (p.purchase_price || 0), 0);
  const missedValue = expiredProductsList.reduce((sum, p) => sum + (p.purchase_price || 0), 0);

  // UNEP Environmental Impact
  const UNEP_CO2E_PER_YEAR: Record<string, number> = {
    'Electronics': 18, 'Appliances': 65, 'Vehicle': 120, 'Furniture': 25,
  };
  const EWASTE_KG: Record<string, number> = {
    'Electronics': 0.2, 'Appliances': 1.5, 'Vehicle': 3.0, 'Furniture': 0.5,
  };

  const calculateImpactStats = () => {
    let totalCo2Saved = 0;
    let totalEWasteSaved = 0;
    let activeCount = 0;

    products.forEach(p => {
      const isExpired = differenceInDays(parseISO(p.expiry_date), new Date()) < 0;
      if (!isExpired) {
        totalCo2Saved += UNEP_CO2E_PER_YEAR[p.category] || 10;
        totalEWasteSaved += EWASTE_KG[p.category] || 0.2;
        activeCount++;
      }
    });

    const score = products.length > 0
      ? Math.min(100, Math.max(10, Math.round((activeCount / products.length) * 100)))
      : 0;

    return { score, eWaste: totalEWasteSaved.toFixed(1), co2: totalCo2Saved.toFixed(1) };
  };

  const impact = calculateImpactStats();

  // Helper to enforce devanagari numerals
  const fNum = (num: number | string) => {
    if (i18n.language === 'en') return num;
    const digits: Record<string, string> = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };
    return num.toString().replace(/\d/g, d => digits[d]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* ===== COMPACT OVERVIEW GRID ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="card-interactive p-4 cursor-default group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors icon-bounce">
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-100">{fNum(totalProducts)}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('total_products')}</p>
            </div>
          </div>
        </motion.div>

        {/* Active */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="card-interactive p-4 cursor-default group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors icon-bounce">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{fNum(activeProducts)}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('stats_active')}</p>
            </div>
          </div>
        </motion.div>

        {/* Expiring Soon */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="card-interactive p-4 cursor-default group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors icon-bounce">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-400">{fNum(expiringProducts)}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('expiring_soon')}</p>
            </div>
          </div>
        </motion.div>

        {/* Expired */}
        <motion.button
          onClick={() => expiredProducts > 0 && setShowMissedClaims(true)}
          whileHover={{ y: -4, scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          className="card-interactive p-4 text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:bg-red-500/20 transition-colors icon-bounce">
              <ShieldX className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-red-400">{fNum(expiredProducts)}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('expired')}</p>
            </div>
          </div>
          {expiredProducts > 0 && <p className="text-[9px] text-red-400/70 mt-2 group-hover:text-red-400 transition-colors font-medium">Click for details →</p>}
        </motion.button>

        {/* Protected Value */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="card-interactive p-4 cursor-default group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors icon-bounce">
              <IndianRupee className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-purple-400">{protectedValue > 0 ? `${fNum((protectedValue / 1000).toFixed(0))}K` : fNum(0)}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Protected</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== AI INSIGHTS + IMPACT — Side by Side ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Insights */}
        {aiInsights.length > 0 && (
          <motion.div
            whileHover={{ scale: 1.005 }}
            className="card-interactive p-5 relative overflow-hidden group"
          >
            <div className="absolute top-[-30%] right-[-15%] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/15 transition-all duration-700 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <Brain className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">{t('ai_insights_title') || 'AI Insights'}</h3>
                </div>
                <Link to="/b2b" className="text-[10px] bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 hover:border-indigo-500/30 transition-all flex items-center gap-1 font-bold text-slate-400 hover:text-indigo-400 btn-tactile">
                  <Package className="w-3 h-3" /> {t('b2b_mode') || 'B2B Mode'}
                </Link>
              </div>
              <div className="space-y-2">
                {aiInsights.slice(0, 3).map((insight, i) => (
                  <p key={i} className="text-sm text-slate-400 leading-relaxed">{insight}</p>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Social Impact (compact) */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="card-interactive p-5 relative overflow-hidden group"
        >
          <div className="absolute top-[-30%] right-[-15%] w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-all duration-700 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Globe className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">{t('social_impact')}</h3>
              </div>
              <button
                onClick={() => setShowImpactTooltip(!showImpactTooltip)}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors btn-tactile"
                title="How is this calculated?"
              >
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400 transition-colors" />
              </button>
            </div>

            {showImpactTooltip && (
              <div className="mb-3 bg-[#0a0e1a] text-white text-xs rounded-xl p-3 border border-emerald-500/20">
                <p className="font-bold mb-1 text-emerald-400">📊 UNEP-Backed Methodology:</p>
                <p className="text-slate-400">• Electronics: 18 kg CO₂e/year • Appliances: 65 kg • Vehicles: 120 kg</p>
                <p className="text-slate-500 mt-1 text-[9px]">Source: UN Environment Programme 2024</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {/* Score */}
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] hover:border-emerald-500/20 transition-all">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125.66} strokeDashoffset={125.66 * (1 - impact.score / 100)} className="text-emerald-400 transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-slate-200">{fNum(impact.score)}</div>
                </div>
                <span className="text-[9px] font-bold text-slate-500 uppercase">Score</span>
              </div>

              {/* E-Waste */}
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] hover:border-emerald-500/20 transition-all">
                <p className="text-xl font-black text-emerald-400">{fNum(impact.eWaste)}</p>
                <span className="text-[9px] font-bold text-slate-500 uppercase">{t('e_waste')}</span>
              </div>

              {/* CO2 */}
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] hover:border-emerald-500/20 transition-all">
                <p className="text-xl font-black text-emerald-400">{fNum(impact.co2)}</p>
                <span className="text-[9px] font-bold text-slate-500 uppercase">{t('co2_reduced')}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== Missed Claims Modal ===== */}
      {showMissedClaims && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowMissedClaims(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#151c2e] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-indigo-500/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" /> {t('missed_claims') || 'Missed Claims'}
              </h3>
              <button onClick={() => setShowMissedClaims(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors btn-tactile">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            {missedValue > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-300 font-medium">
                  {t('potential_missed_claims') || 'Potential missed claims'}: <span className="font-bold text-lg text-red-400">₹{missedValue.toLocaleString('en-IN')}</span>
                </p>
              </div>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expiredProductsList.map(p => {
                const daysAgo = Math.abs(differenceInDays(parseISO(p.expiry_date), new Date()));
                return (
                  <Link key={p.id} to={`/product/${p.id}`} onClick={() => setShowMissedClaims(false)} className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/20 transition-all group btn-tactile">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{BRAND_LOGOS[p.brand] || '📦'} {p.product_name}</p>
                        <p className="text-xs text-slate-500">{t('expired') || 'Expired'} {fNum(daysAgo)} {t('days_ago') || 'days ago'}</p>
                      </div>
                      {p.purchase_price > 0 && (
                        <p className="text-sm font-bold text-red-400">₹{fNum(p.purchase_price.toLocaleString('en-IN'))}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== Search & Filter Bar ===== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">{t('dashboard')}</h1>
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              id="search"
              name="search"
              type="text"
              aria-label={t('search_placeholder')}
              placeholder={t('search_placeholder')}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 w-full sm:w-56 text-sm text-slate-200 placeholder-slate-600 transition-all hover:border-white/20 hover:bg-white/[0.07]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setExpiringSoon(!expiringSoon)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 btn-tactile ${expiringSoon ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}
          >
            <Clock className={`w-3.5 h-3.5 ${expiringSoon ? 'animate-pulse' : ''}`} />
            {t('expiring_soon')}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 btn-tactile ${showFilters || hasActiveFilters ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            {t('filters') || 'Filters'}
            {hasActiveFilters && <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[9px] rounded-full font-bold">!</span>}
          </motion.button>
        </div>
      </div>

      {/* Expanded Filters */}
      <motion.div
        initial={false}
        animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="bg-[#151c2e] rounded-xl border border-indigo-500/10 p-4 shadow-lg mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-300">{t('advanced_filters') || 'Advanced Filters'}</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all btn-tactile">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="category" className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-white/20"
              >
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#151c2e]">{c === 'all' ? 'All Categories' : c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="dateFrom" className="block text-xs font-semibold text-slate-500 mb-1">Purchased From</label>
              <input
                id="dateFrom"
                name="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-white/20"
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="block text-xs font-semibold text-slate-500 mb-1">Purchased To</label>
              <input
                id="dateTo"
                name="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-white/20"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== Product List ===== */}
      <div className="bg-[#151c2e]/60 backdrop-blur-xl border border-indigo-500/10 shadow-lg rounded-2xl overflow-visible">
        <ul className="divide-y divide-white/5">
          {products.length === 0 ? (
            <li className="px-6 py-16 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-slate-700 mb-4" />
              <p className="text-slate-500 mb-2">{t('no_products') || 'No products found.'}</p>
              <Link to="/add-product" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:underline transition-colors">
                + {t('add_first_product') || 'Add your first product'}
              </Link>
            </li>
          ) : (
            products.map((product, i) => {
              const status = getStatus(product.expiry_date);
              const risk = getRiskScore(product, t);
              return (
                <motion.li
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 300 }}
                  whileHover={{ scale: 1.005, zIndex: 10 }}
                  className="relative group"
                >
                  <Link to={`/product/${product.id}`} className="block hover:bg-white/[0.03] transition-all duration-200">
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Interactive icon — clicks to product page */}
                          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-500/10 group-hover:border-indigo-500/30 transition-all duration-300">
                            {CATEGORY_ICONS[product.category] || BRAND_LOGOS[product.brand] || '📦'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{product.product_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {product.brand} • {product.category}
                              {product.purchase_price > 0 && <span className="text-indigo-400 ml-1">• ₹{fNum(product.purchase_price.toLocaleString('en-IN'))}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          {risk && (
                            <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium uppercase tracking-wider ${risk.color}`}>
                              {React.createElement(risk.icon, { className: "w-3 h-3" })}
                              {risk.text}
                            </span>
                          )}
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${status.color} ${status.label.includes(t('days_left')) ? 'animate-pulse' : ''}`}>
                            {fNum(status.label)}
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center text-xs text-slate-600 pl-15">
                        <div className="flex gap-4 pl-15">
                          <span>{t('purchased') || 'Purchased'}: {fNum(format(parseISO(product.purchase_date), 'MMM d, yyyy'))}</span>
                          <span>{t('expires') || 'Expires'}: {fNum(format(parseISO(product.expiry_date), 'MMM d, yyyy'))}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.li>
              );
            })
          )}
        </ul>
      </div>
    </motion.div>
  );
}
