import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// @ts-ignore
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    PlusCircle,
    Brain,
    Bell,
    ShieldCheck,
    Menu,
    X,
    User,
    Settings,
    LogOut,
    ChevronDown,
    Globe
} from 'lucide-react';

export default function Navbar() {
    const { logout, user } = useAuth();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowProfileDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        setShowProfileDropdown(false);
        setMobileMenuOpen(false);
        logout();
        navigate('/login');
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const navItems = [
        { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { path: '/add-product', label: t('add_product'), icon: PlusCircle },
        { path: '/assistant', label: 'Assistant', icon: Brain },
        { path: '/notifications', label: t('notifications'), icon: Bell },
    ];

    return (
        <nav className="bg-white/70 backdrop-blur-md shadow-sm border-b border-white/20 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/dashboard" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1">
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
                                        className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 hover:-translate-y-0.5 active:scale-95 ${isActive
                                            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
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
                        <div className="hidden sm:flex items-center gap-1.5 mr-2">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <select
                                id="languageSelect"
                                name="languageSelect"
                                aria-label="Select Language"
                                onChange={(e) => changeLanguage(e.target.value)}
                                className="text-sm border-none bg-transparent focus:ring-0 text-gray-600 cursor-pointer pr-6 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                                value={i18n.language}
                            >
                                <option value="en">EN</option>
                                <option value="hi">हि</option>
                                <option value="mr">मर</option>
                            </select>
                        </div>

                        {/* Profile Dropdown */}
                        <div className="relative hidden sm:block" ref={dropdownRef}>
                            <button
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                aria-expanded={showProfileDropdown}
                                aria-haspopup="true"
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-indigo-600">
                                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <span className="text-sm text-gray-700 font-medium max-w-24 truncate">{user?.name}</span>
                                <motion.div
                                    animate={{ rotate: showProfileDropdown ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {showProfileDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 origin-top-right overflow-hidden"
                                    >
                                        <Link
                                            to="/profile"
                                            onClick={() => setShowProfileDropdown(false)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors outline-none focus-visible:bg-gray-50"
                                        >
                                            <User className="w-4 h-4 text-gray-400" /> Profile
                                        </Link>
                                        <Link
                                            to="/settings"
                                            onClick={() => setShowProfileDropdown(false)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors outline-none focus-visible:bg-gray-50"
                                        >
                                            <Settings className="w-4 h-4 text-gray-400" /> Settings
                                        </Link>
                                        <hr className="my-1 border-gray-100" />
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center w-full gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors outline-none focus-visible:bg-red-50 text-left"
                                        >
                                            <LogOut className="w-4 h-4" /> Logout
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-expanded={mobileMenuOpen}
                            aria-label="Toggle navigation menu"
                            className="sm:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={mobileMenuOpen ? "close" : "open"}
                                    initial={{ opacity: 0, rotate: -90 }}
                                    animate={{ opacity: 1, rotate: 0 }}
                                    exit={{ opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                </motion.div>
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Nav */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="sm:hidden border-t border-gray-200 bg-white overflow-hidden origin-top"
                    >
                        <div className="px-4 py-3 space-y-1">
                            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-indigo-600">
                                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">{user?.email}</span>
                                </div>
                            </div>

                            {navItems.map(item => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isActive
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                            <div className="h-px bg-gray-100 my-2" />
                            <Link
                                to="/profile"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                <User className="w-4 h-4 mr-2" /> Profile
                            </Link>
                            <Link
                                to="/settings"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                <Settings className="w-4 h-4 mr-2" /> Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 outline-none focus-visible:ring-2 focus-visible:ring-red-500 text-left"
                            >
                                <LogOut className="w-4 h-4 mr-2" /> Logout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
