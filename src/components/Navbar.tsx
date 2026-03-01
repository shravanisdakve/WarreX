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
    LogOut,
    ChevronDown,
    Globe,
    ChevronLeft,
    Sparkles
} from 'lucide-react';

interface NavbarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export default function Navbar({ sidebarOpen, setSidebarOpen }: NavbarProps) {
    const { logout, user } = useAuth();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
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
        logout();
        navigate('/login');
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const navItems = [
        { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { path: '/add-product', label: t('add_product'), icon: PlusCircle },
        { path: '/assistant', label: t('assistant'), icon: Brain },
        { path: '/notifications', label: t('notifications'), icon: Bell },
        { path: '/profile', label: t('profile'), icon: User },
    ];

    return (
        <>
            {/* ===== Top Bar (Always visible) ===== */}
            <div className="fixed top-0 left-0 w-full h-16 z-[60] bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-indigo-500/10 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-expanded={sidebarOpen}
                        aria-label="Toggle navigation menu"
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-[#1a2340] transition-all duration-300 btn-tactile group"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={sidebarOpen ? "close" : "open"}
                                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                            >
                                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                            </motion.div>
                        </AnimatePresence>
                    </button>

                    <Link to="/dashboard" className="flex items-center gap-2 group ml-2" onClick={() => setSidebarOpen(false)}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                            <ShieldCheck className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent leading-none">
                                Warrify
                            </span>
                        </div>
                    </Link>
                </div>

                <div className="flex items-center gap-3" ref={dropdownRef}>
                    {/* Language Toggle */}
                    <div className="hidden sm:flex bg-white/5 rounded-lg border border-white/5 mr-2">
                        {['en', 'hi', 'mr'].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => changeLanguage(lang)}
                                className={`px-2 py-1 text-xs font-bold rounded-md transition-all btn-tactile ${i18n.language === lang
                                    ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                    }`}
                            >
                                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हि' : 'मर'}
                            </button>
                        ))}
                    </div>

                    {/* Profile Dropdown Toggle */}
                    <button
                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        aria-expanded={showProfileDropdown}
                        aria-haspopup="true"
                        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/5 transition-all group btn-tactile border border-transparent hover:border-white/10"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                            <span className="text-sm font-bold text-white">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block mx-1" />
                    </button>

                    {/* Desktop Dropdown Content */}
                    <AnimatePresence>
                        {showProfileDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute top-14 right-4 w-48 bg-[#1a2340] rounded-xl shadow-2xl shadow-black/50 border border-indigo-500/20 py-1.5 z-[100] origin-top-right overflow-hidden"
                            >
                                <div className="px-4 py-3 border-b border-white/5">
                                    <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                                </div>
                                <div className="sm:hidden px-4 py-2 border-b border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Language</p>
                                    <div className="flex gap-1 bg-[#0a0e1a] rounded p-0.5 border border-white/5">
                                        {['en', 'hi', 'mr'].map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => changeLanguage(lang)}
                                                className={`flex-1 px-2 py-1 text-[10px] font-bold rounded flex justify-center ${i18n.language === lang
                                                    ? 'bg-indigo-500/20 text-indigo-300'
                                                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                                    }`}
                                            >
                                                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हि' : 'मर'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Link
                                    to="/profile"
                                    onClick={() => { setShowProfileDropdown(false); }}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    <User className="w-4 h-4 text-slate-500" /> View Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center w-full gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                                >
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ===== BACKDROP (mobile overlay) ===== */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* ===== SIDEBAR ===== */}
            <aside
                className={`fixed top-16 left-0 h-[calc(100vh-4rem)] z-[50] bg-[#0d1117]/95 backdrop-blur-2xl border-r border-indigo-500/10 flex flex-col sidebar-transition
                    ${sidebarOpen ? 'w-[260px] translate-x-0' : 'w-[260px] -translate-x-full'}
                `}
            >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/5 via-transparent to-purple-600/5 pointer-events-none" />

                {/* Navigation Items */}
                <nav className="relative flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                    <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        Navigation
                    </p>
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative
                                    ${isActive
                                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shadow-sm shadow-indigo-500/10 nav-active-indicator'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                                    }`}
                            >
                                <div className={`p-1.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-indigo-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                    <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-indigo-400' : ''}`} />
                                </div>
                                <span>{item.label}</span>
                                {isActive && (
                                    <Sparkles className="w-3 h-3 text-indigo-400 ml-auto animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}
