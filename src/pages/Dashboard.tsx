import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, AlertTriangle, CheckCircle, Clock, Filter, X, ShieldCheck, ShieldAlert, ShieldX, Sparkles, Activity, Globe, IndianRupee, Brain, Info, TrendingDown, Package } from 'lucide-react';
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
  }, [search, expiringSoon, category, dateFrom, dateTo]);

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
      const res = await axios.get('/api/ai/insights');
      setAiInsights(res.data.insights || []);
    } catch (error) {
      console.error('Failed to fetch insights');
    }
  };

  const getStatus = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { label: t('expired'), color: 'text-red-700 bg-red-50 border border-red-200', icon: ShieldX, dotColor: 'bg-red-500' };
    if (days <= 30) return { label: `${days} ${t('days_left')}`, color: 'text-amber-700 bg-amber-50 border border-amber-200', icon: ShieldAlert, dotColor: 'bg-amber-500' };
    return { label: t('active'), color: 'text-emerald-700 bg-emerald-50 border border-emerald-200', icon: ShieldCheck, dotColor: 'bg-emerald-500' };
  };

  const getRiskScore = (product: Product, t: any) => {
    const days = differenceInDays(parseISO(product.expiry_date), new Date());
    if (days < 0) return null;

    const isHighValueCategory = ["Electronics", "Appliances", "Vehicle"].includes(product.category);

    if (isHighValueCategory) {
      if (days <= 15) {
        return { text: t('risk_claim_now'), color: "text-purple-700 bg-purple-50 border-purple-200 animate-pulse", icon: Sparkles };
      }
      if (days <= 30) {
        return { text: t('risk_high'), color: "text-red-700 bg-red-50 border-red-200 animate-pulse", icon: AlertTriangle };
      }
      if (days <= 90) {
        return { text: t('risk_moderate'), color: "text-amber-700 bg-amber-50 border-amber-200", icon: Activity };
      }
    } else {
      if (days <= 30) {
        return { text: t('expiring_soon'), color: "text-amber-700 bg-amber-50 border-amber-200 shadow-sm animate-pulse", icon: Clock };
      }
    }

    return { text: t('risk_low'), color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle };
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

  const calculateImpactStats = () => {
    let score = 70;
    let eWaste = 0;

    products.forEach(p => {
      // E-waste weight heuristics by category (industry-standard estimates):
      // Electronics: avg 8kg (phones, laptops, headphones)
      // Appliances: avg 24kg (washing machines, fridges, ACs)
      // Vehicle: avg 120kg (batteries, electronics)
      // Furniture: avg 15kg (metal/composite components)
      // Default: 0.5kg
      let weight = 0.5;
      if (p.category === 'Electronics') weight = 8;
      if (p.category === 'Appliances') weight = 24;
      if (p.category === 'Vehicle') weight = 120;
      if (p.category === 'Furniture') weight = 15;

      const isExpired = differenceInDays(parseISO(p.expiry_date), new Date()) < 0;

      if (!isExpired) {
        eWaste += weight;
        score += 2.5;
      } else {
        score -= 1;
      }
    });

    return {
      score: Math.min(Math.round(score), 100),
      eWaste: eWaste.toFixed(1),
      co2: (eWaste * 3.4).toFixed(1) // CO₂ = E-waste × 3.4 (standard lifecycle factor)
    };
  };

  const impact = calculateImpactStats();

  return (
    <div className="space-y-6">
      {/* AI Insights Card */}
      {aiInsights.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-5%] w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-200" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-200">AI Insights — Today</h3>
              </div>
              <Link to="/b2b" className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded border border-white/20 transition-colors flex items-center gap-1 font-bold">
                <Package className="w-3 h-3" /> Seller B2B Mode
              </Link>
            </div>
            <div className="space-y-2">
              {aiInsights.slice(0, 3).map((insight, i) => (
                <p key={i} className="text-sm text-indigo-100 leading-relaxed">{insight}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Social Impact Score Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl group-hover:bg-emerald-400/30 transition-all duration-700"></div>

        <div className="relative z-10">
          <div className="flex flex-wrap md:flex-nowrap justify-between items-start gap-y-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
                <Globe className="w-6 h-6 text-emerald-100 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">{t('social_impact')}</h2>
                <p className="text-emerald-100/70 text-xs font-medium italic">{t('impact_subtitle')}</p>
              </div>
            </div>

            {/* Language Toggle */}
            <div className="flex bg-white/10 backdrop-blur-md rounded-lg p-1 border border-white/20 shadow-sm ml-auto sm:ml-0">
              {['en', 'hi', 'mr'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  className={`px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all ${i18n.language === lang ? 'bg-white text-emerald-700 shadow-sm' : 'text-white hover:bg-white/10'}`}
                >
                  {lang === 'en' ? 'EN' : lang === 'hi' ? 'हि' : 'मर'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Score Ring */}
            <div className="flex items-center gap-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="relative flex-shrink-0">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={226.19} strokeDashoffset={226.19 * (1 - impact.score / 100)} className="text-emerald-300 transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-2xl">{impact.score}</div>
              </div>
              <div>
                <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest">{impact.score >= 90 ? t('impact_level_master') : t('impact_level_rising')}</p>
                <p className="font-bold text-lg leading-tight">{impact.score >= 80 ? t('impact_status_excellent') : t('impact_status_steady')}</p>
              </div>
            </div>

            {/* E-Waste */}
            <div className="relative flex flex-col gap-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
              <button
                onClick={() => setShowImpactTooltip(!showImpactTooltip)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                title="How is this calculated?"
              >
                <Info className="w-3.5 h-3.5 text-emerald-200" />
              </button>
              {showImpactTooltip && (
                <div className="absolute top-10 right-2 z-20 bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl border border-white/10 w-56">
                  <p className="font-bold mb-1">📊 Calculation Method:</p>
                  <p>• Electronics: 8 kg/product</p>
                  <p>• Appliances: 24 kg/product</p>
                  <p>• Vehicles: 120 kg/product</p>
                  <p>• Furniture: 15 kg/product</p>
                  <p className="mt-1 text-emerald-300">CO₂ = E-waste × 3.4</p>
                  <p className="text-slate-400 mt-1">(Standard lifecycle carbon factor)</p>
                </div>
              )}
              <span className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 line-clamp-1">
                <CheckCircle className="w-2.5 h-2.5" /> {t('e_waste')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">{impact.eWaste}</span>
                <span className="text-sm font-bold text-emerald-100">kg</span>
              </div>
              <p className="text-[10px] text-emerald-100/50 mt-1">{t('impact_e_waste_footer')}</p>
            </div>

            {/* CO2 */}
            <div className="flex flex-col gap-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
              <span className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 line-clamp-1">
                <ShieldCheck className="w-2.5 h-2.5" /> {t('co2_reduced')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">{impact.co2}</span>
                <span className="text-sm font-bold text-emerald-100">kg</span>
              </div>
              <p className="text-[10px] text-emerald-100/50 mt-1">{t('impact_co2_footer')}</p>
            </div>
          </div>
        </div>
        <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-48 h-48 text-white/5 -rotate-12 pointer-events-none group-hover:scale-110 group-hover:text-white/10 transition-all duration-700" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
          <p className="text-xs text-gray-500 mt-1">{t('total_products')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{activeProducts}</p>
          <p className="text-xs text-gray-500 mt-1">{t('stats_active')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{expiringProducts}</p>
          <p className="text-xs text-gray-500 mt-1">{t('expiring_soon')}</p>
        </div>
        <button
          onClick={() => expiredProducts > 0 && setShowMissedClaims(true)}
          className="bg-white rounded-xl p-4 border border-red-100 shadow-sm text-left hover:bg-red-50 transition-colors cursor-pointer"
        >
          <p className="text-2xl font-bold text-red-600">{expiredProducts}</p>
          <p className="text-xs text-gray-500 mt-1">{t('expired')}</p>
          {expiredProducts > 0 && <p className="text-[10px] text-red-400 mt-0.5">Click for details →</p>}
        </button>
        {/* ₹ Savings Tracker */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-1">
            <IndianRupee className="w-4 h-4 text-indigo-600" />
            <p className="text-2xl font-bold text-indigo-600">{protectedValue > 0 ? `${(protectedValue / 1000).toFixed(0)}K` : '0'}</p>
          </div>
          <p className="text-xs text-indigo-500 mt-1 font-medium">Protected Value</p>
        </div>
      </div>

      {/* Missed Claims Modal */}
      {showMissedClaims && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowMissedClaims(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" /> Missed Claims Report
              </h3>
              <button onClick={() => setShowMissedClaims(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {missedValue > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-700 font-medium">
                  You may have missed up to <span className="font-bold text-lg">₹{missedValue.toLocaleString('en-IN')}</span> in potential warranty claims.
                </p>
              </div>
            )}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {expiredProductsList.map(p => {
                const daysAgo = Math.abs(differenceInDays(parseISO(p.expiry_date), new Date()));
                return (
                  <Link key={p.id} to={`/product/${p.id}`} onClick={() => setShowMissedClaims(false)} className="block p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{BRAND_LOGOS[p.brand] || '📦'} {p.product_name}</p>
                        <p className="text-xs text-gray-500">Expired {daysAgo} days ago</p>
                      </div>
                      {p.purchase_price > 0 && (
                        <p className="text-sm font-bold text-red-600">₹{p.purchase_price.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              id="search"
              name="search"
              type="text"
              aria-label={t('search_placeholder')}
              placeholder={t('search_placeholder')}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-64 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setExpiringSoon(!expiringSoon)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${expiringSoon ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <Clock className="w-4 h-4 inline mr-1" />
            {t('expiring_soon')}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters || hasActiveFilters ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4 inline mr-1" />
            Filters
            {hasActiveFilters && <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-xs rounded-full">!</span>}
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Advanced Filters</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="category" className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="dateFrom" className="block text-xs text-gray-500 mb-1">Purchased From</label>
              <input
                id="dateFrom"
                name="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="block text-xs text-gray-500 mb-1">Purchased To</label>
              <input
                id="dateTo"
                name="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="bg-white shadow-sm overflow-hidden rounded-xl border border-gray-100">
        <ul className="divide-y divide-gray-100">
          {products.length === 0 ? (
            <li className="px-6 py-16 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">No products found.</p>
              <Link to="/add-product" className="text-indigo-600 hover:underline text-sm font-medium">
                + Add your first product
              </Link>
            </li>
          ) : (
            products.map((product) => {
              const status = getStatus(product.expiry_date);
              const risk = getRiskScore(product, t);
              return (
                <li key={product.id}>
                  <Link to={`/product/${product.id}`} className="block hover:bg-gray-50 transition-colors">
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-lg">
                            {BRAND_LOGOS[product.brand] || '📦'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{product.product_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {product.brand} • {product.category}
                              {product.purchase_price > 0 && <span className="text-indigo-500 ml-1">• ₹{product.purchase_price.toLocaleString('en-IN')}</span>}
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
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center text-xs text-gray-400 pl-12">
                        <div className="flex gap-4">
                          <span>Purchased: {format(parseISO(product.purchase_date), 'MMM d, yyyy')}</span>
                          <span>Expires: {format(parseISO(product.expiry_date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
