import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
// @ts-ignore
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, PlusCircle, MessageSquare, LogOut, Globe, Bell, ShieldCheck, Menu, X } from 'lucide-react';

export default function Layout() {
  const { logout, user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const navItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/add-product', label: t('add_product'), icon: PlusCircle },
    { path: '/assistant', label: t('assistant'), icon: MessageSquare },
    { path: '/notifications', label: t('notifications'), icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-indigo-600" />
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Warrify
                </span>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-gray-400" />
                <select
                  id="languageSelect"
                  name="languageSelect"
                  aria-label="Select Language"
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="text-sm border-none bg-transparent focus:ring-0 text-gray-600 cursor-pointer pr-6"
                  value={i18n.language}
                >
                  <option value="en">EN</option>
                  <option value="hi">हि</option>
                  <option value="mr">मर</option>
                </select>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-indigo-600">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm text-gray-700 font-medium">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
        Warrify © {new Date().getFullYear()} • AI-Powered Warranty Management
      </footer>
    </div>
  );
}
