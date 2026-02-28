import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, AlertTriangle, CheckCircle, Clock, Filter, X, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

interface Product {
  id: number;
  product_name: string;
  brand: string;
  category: string;
  expiry_date: string;
  purchase_date: string;
}

const CATEGORIES = ["all", "Electronics", "Appliances", "Furniture", "Vehicle", "Accessories", "Other"];

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [category, setCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchProducts();
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

  const getStatus = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { label: t('expired'), color: 'text-red-700 bg-red-50 border border-red-200', icon: ShieldX, dotColor: 'bg-red-500' };
    if (days <= 30) return { label: `${days} ${t('days_left')}`, color: 'text-amber-700 bg-amber-50 border border-amber-200', icon: ShieldAlert, dotColor: 'bg-amber-500' };
    return { label: t('active'), color: 'text-emerald-700 bg-emerald-50 border border-emerald-200', icon: ShieldCheck, dotColor: 'bg-emerald-500' };
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
          <p className="text-xs text-gray-500 mt-1">Total Products</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{activeProducts}</p>
          <p className="text-xs text-gray-500 mt-1">Active</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{expiringProducts}</p>
          <p className="text-xs text-gray-500 mt-1">Expiring Soon</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
          <p className="text-2xl font-bold text-red-600">{expiredProducts}</p>
          <p className="text-xs text-gray-500 mt-1">Expired</p>
        </div>
      </div>

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
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${expiringSoon ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <Clock className="w-4 h-4 inline mr-1" />
            Expiring
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
              return (
                <li key={product.id}>
                  <Link to={`/product/${product.id}`} className="block hover:bg-gray-50 transition-colors">
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status.dotColor}`}></div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{product.product_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{product.brand} • {product.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-gray-400 pl-5">
                        <span>Purchased: {format(parseISO(product.purchase_date), 'MMM d, yyyy')}</span>
                        <span>Expires: {format(parseISO(product.expiry_date), 'MMM d, yyyy')}</span>
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
