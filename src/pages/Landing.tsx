import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// @ts-ignore
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, Bell, Brain, TrendingUp, ArrowRight, CheckCircle, Zap, Shield, Clock, BarChart3, Mail } from 'lucide-react';

const COMPETITOR_DATA = [
    { feature: 'AI-Powered Claim Suggestions', warrify: true, samsung: false, jiosure: false },
    { feature: 'Multi-Brand Support', warrify: true, samsung: false, jiosure: true },
    { feature: 'OCR Invoice Scanning', warrify: true, samsung: false, jiosure: false },
    { feature: 'Preventive Claim Alerts', warrify: true, samsung: false, jiosure: false },
    { feature: 'Resale Value Estimator', warrify: true, samsung: false, jiosure: false },
    { feature: 'E-Waste Impact Tracking', warrify: true, samsung: false, jiosure: false },
    { feature: 'Multi-Language Support', warrify: true, samsung: true, jiosure: true },
    { feature: 'Claim Email Generation', warrify: true, samsung: false, jiosure: false },
];

const FEATURES = [
    {
        icon: Brain,
        title: 'Claim Intelligence Engine',
        description: 'AI predicts when your product is likely to fail and suggests filing claims BEFORE warranty expires.',
        gradient: 'from-purple-500 to-indigo-600'
    },
    {
        icon: Bell,
        title: 'Smart Reminders',
        description: 'Automated 30-day and 7-day email reminders. Never miss a warranty window again.',
        gradient: 'from-amber-500 to-orange-600'
    },
    {
        icon: Sparkles,
        title: 'AI-Powered OCR',
        description: 'Upload an invoice photo and our AI auto-extracts product name, date, brand, and invoice number.',
        gradient: 'from-emerald-500 to-teal-600'
    },
    {
        icon: TrendingUp,
        title: 'Resale Value Estimator',
        description: 'Know exactly how much your warranty adds to resale value. Sell at the right time.',
        gradient: 'from-blue-500 to-cyan-600'
    },
    {
        icon: Mail,
        title: 'AI Claim Drafting',
        description: 'Generate professional warranty claim emails in seconds with product-specific details.',
        gradient: 'from-rose-500 to-pink-600'
    },
    {
        icon: BarChart3,
        title: 'Environmental Impact',
        description: 'Track your e-waste reduction and CO₂ savings. Make sustainability measurable.',
        gradient: 'from-green-500 to-emerald-600'
    },
];

const TESTIMONIALS = [
    { name: 'Priya M.', text: 'Saved ₹15,000 on my laptop claim. Warrify reminded me just 5 days before expiry!', role: 'Software Developer' },
    { name: 'Rahul S.', text: 'The AI drafted a perfect claim email. Samsung approved my phone repair the same week.', role: 'Student' },
    { name: 'Anita K.', text: 'Managing warranties for 20+ office devices was a nightmare. Warrify made it effortless.', role: 'Office Manager' },
];

export default function Landing() {
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white overflow-x-hidden">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-indigo-400" />
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            Warrify
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="px-4 py-2 text-sm font-medium text-indigo-300 hover:text-white transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/signup"
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                        >
                            Get Started Free
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6">
                {/* Animated gradient orbs */}
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto text-center relative z-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-sm font-medium mb-8">
                        <Zap className="w-4 h-4" />
                        The only warranty manager that tells you WHEN to claim
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-tight mb-6">
                        Stop losing money on{' '}
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            expired warranties
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Indians lose <span className="text-white font-semibold">over ₹8,000 crore annually</span> from missed warranty claims.
                        Warrify's AI predicts failures, drafts claims, and sends smart reminders — so you never miss a rupee.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            to="/signup"
                            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold rounded-2xl transition-all hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-105"
                        >
                            Start Protecting Free
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <p className="text-sm text-slate-500">No credit card • 100% free</p>
                    </div>

                    {/* Stats bar */}
                    <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
                        {[
                            { value: '₹4.5L+', label: 'Claims Protected' },
                            { value: '98%', label: 'Reminder Accuracy' },
                            { value: '32kg', label: 'Avg E-Waste Saved' },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + i * 0.2 }}
                                className="text-center"
                            >
                                <p className="text-2xl sm:text-3xl font-black text-white">{stat.value}</p>
                                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* Why Warrify? */}
            <section className="py-20 px-6 relative">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl font-black mb-4">
                            Why <span className="text-indigo-400">Warrify</span>?
                        </h2>
                        <p className="text-slate-400 text-lg max-w-xl mx-auto">
                            Not just another reminder app. An intelligent warranty management platform.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Competitor Comparison */}
            <section className="py-20 px-6 bg-gradient-to-b from-transparent via-indigo-950/50 to-transparent">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl sm:text-4xl font-black mb-4">
                            Warrify vs <span className="text-slate-400">The Rest</span>
                        </h2>
                        <p className="text-slate-400">We did the research. Here's why Warrify leads.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
                    >
                        <div className="grid grid-cols-4 gap-0 text-sm">
                            <div className="p-4 font-semibold text-slate-400 border-b border-white/10">Feature</div>
                            <div className="p-4 font-bold text-indigo-400 text-center border-b border-white/10 bg-indigo-500/5">Warrify</div>
                            <div className="p-4 font-semibold text-slate-500 text-center border-b border-white/10">Samsung Members</div>
                            <div className="p-4 font-semibold text-slate-500 text-center border-b border-white/10">JioSure</div>

                            {COMPETITOR_DATA.map((row, i) => (
                                <React.Fragment key={i}>
                                    <div className={`p-4 text-slate-300 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} border-b border-white/5`}>
                                        {row.feature}
                                    </div>
                                    <div className={`p-4 text-center ${i % 2 === 0 ? 'bg-indigo-500/[0.03]' : 'bg-indigo-500/[0.01]'} border-b border-white/5`}>
                                        {row.warrify ? <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-slate-600">—</span>}
                                    </div>
                                    <div className={`p-4 text-center ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} border-b border-white/5`}>
                                        {row.samsung ? <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-slate-600">—</span>}
                                    </div>
                                    <div className={`p-4 text-center ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} border-b border-white/5`}>
                                        {row.jiosure ? <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-slate-600">—</span>}
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 px-6">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-black mb-12">What Users Say</h2>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTestimonial}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
                        >
                            <p className="text-lg text-slate-300 italic leading-relaxed mb-6">
                                "{TESTIMONIALS[activeTestimonial].text}"
                            </p>
                            <p className="font-bold text-white">{TESTIMONIALS[activeTestimonial].name}</p>
                            <p className="text-sm text-slate-500">{TESTIMONIALS[activeTestimonial].role}</p>
                        </motion.div>
                    </AnimatePresence>
                    <div className="flex justify-center gap-2 mt-6">
                        {TESTIMONIALS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveTestimonial(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === activeTestimonial ? 'bg-indigo-400 w-6' : 'bg-slate-600'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Roadmap */}
            <section className="py-20 px-6 bg-slate-900/50">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl font-black mb-4">The Warrify <span className="text-purple-400">Roadmap</span></h2>
                        <p className="text-slate-400">Our vision for the future of warranty management.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="px-2 py-1 bg-indigo-500 rounded text-[10px] uppercase font-black">Q2 2025</span>
                                B2B Warranty Dashboard
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Allow manufacturers and sellers to issue and verify warranties directly through the blockchain, reducing fraud and claim processing overhead.</p>
                        </div>
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="px-2 py-1 bg-purple-500 rounded text-[10px] uppercase font-black">Q3 2025</span>
                                Browser Extension
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Auto-capture invoices from Amazon, Flipkart, and Apple directly during checkout. One-click warranty registration across any site.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="max-w-3xl mx-auto text-center bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-3xl p-12"
                >
                    <Shield className="w-14 h-14 text-indigo-400 mx-auto mb-6" />
                    <h2 className="text-3xl sm:text-4xl font-black mb-4">
                        Start Protecting Your Warranties Today
                    </h2>
                    <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
                        Join thousands who never miss a warranty claim. Free forever for personal use.
                    </p>
                    <Link
                        to="/signup"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold rounded-2xl transition-all hover:shadow-2xl hover:shadow-indigo-500/30"
                    >
                        Create Free Account
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                            <span className="font-bold text-slate-300">Warrify</span>
                            <span className="text-slate-600 text-sm ml-2">© {new Date().getFullYear()}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                All Systems Operational
                            </span>
                            <span>React 19 • TypeScript • Node.js • SQLite • Gemini AI • Tesseract OCR</span>
                        </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-slate-600">
                            Built with ❤️ for Smart India Hackathon 2025 • E-Waste Formula: Average electronics = category-specific weight × 3.4 CO₂ lifecycle factor
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
