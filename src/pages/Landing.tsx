import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// @ts-ignore
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, Bell, Brain, TrendingUp, ArrowRight, CheckCircle, Zap, Shield, Clock, BarChart3, Mail, Scale, FileWarning, Users, Gavel, Heart } from 'lucide-react';

const COMPETITOR_DATA = [
    { feature: 'AI Document Quality Classifier', warrify: true, samsung: false, jiosure: false },
    { feature: 'Multi-Brand Support', warrify: true, samsung: false, jiosure: true },
    { feature: 'OCR Invoice Scanning', warrify: true, samsung: false, jiosure: false },
    { feature: 'Preventive Claim Alerts', warrify: true, samsung: false, jiosure: false },
    { feature: 'Faded Receipt Protection', warrify: true, samsung: false, jiosure: false },
    { feature: 'UNEP-Backed Impact Tracking', warrify: true, samsung: false, jiosure: false },
    { feature: 'Multi-Language Support', warrify: true, samsung: true, jiosure: true },
    { feature: 'AI Claim Email Generation', warrify: true, samsung: false, jiosure: false },
];

const FEATURES = [
    {
        icon: Scale,
        title: 'Consumer Justice Engine',
        description: 'Empowers low-income consumers to fight for their legal rights. AI detects faded receipts, preserves proof, and drafts legal complaint emails.',
        gradient: 'from-purple-500 to-indigo-600'
    },
    {
        icon: FileWarning,
        title: 'Document Quality Classifier',
        description: 'Real ML that detects faded receipts vs. valid invoices. Alerts you before your thermal receipt becomes unreadable.',
        gradient: 'from-amber-500 to-orange-600'
    },
    {
        icon: Sparkles,
        title: 'AI-Powered OCR',
        description: 'Upload a photo of any invoice — even a crumpled local shop receipt. Our AI extracts product name, date, brand, and invoice number.',
        gradient: 'from-emerald-500 to-teal-600'
    },
    {
        icon: Brain,
        title: 'Claim Intelligence Engine',
        description: 'AI predicts when your product is likely to fail and suggests filing claims BEFORE warranty expires — so you never lose your rights.',
        gradient: 'from-blue-500 to-cyan-600'
    },
    {
        icon: Mail,
        title: 'AI Claim Drafting',
        description: 'Generate professional warranty claim emails in seconds. Written in proper legal language that brands take seriously.',
        gradient: 'from-rose-500 to-pink-600'
    },
    {
        icon: BarChart3,
        title: 'UNEP Environmental Impact',
        description: 'Every repaired device = less e-waste. Track CO₂e savings backed by UN Environment Programme data. Make your impact measurable.',
        gradient: 'from-green-500 to-emerald-600'
    },
];

const TESTIMONIALS = [
    { name: 'Meera D.', text: 'My mixer grinder receipt had completely faded. The shopkeeper refused to honour the warranty. Warrify had my digital copy — Samsung repaired it for free.', role: 'Homemaker, Dharavi' },
    { name: 'Rajesh P.', text: 'I\'m a rickshaw driver. I bought a phone worth ₹12,000 — my whole month\'s savings. When it broke, Warrify helped me file a proper claim in Hindi.', role: 'Auto Driver, Pune' },
    { name: 'Anita K.', text: 'The AI drafted a complaint email that sounded like a lawyer wrote it. LG approved my washing machine repair within 3 days.', role: 'School Teacher, Mumbai' },
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

            {/* Hero — Consumer Justice Framing */}
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
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-300 text-sm font-medium mb-8">
                        <Gavel className="w-4 h-4" />
                        50% of Indian consumers are denied rights due to missing receipts
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-tight mb-6">
                        Your warranty is your{' '}
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            legal right
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Every year, <span className="text-white font-semibold">millions of Indians</span> are denied warranty claims because their thermal receipts faded.
                        Warrify fights back — digitizing your proof, predicting failures, and drafting legal complaint emails so <span className="text-white font-semibold">no one is denied their consumer rights</span>.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            to="/signup"
                            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold rounded-2xl transition-all hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-105"
                        >
                            Protect Your Rights — Free
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <p className="text-sm text-slate-500">No credit card • 100% free • Hindi/Marathi supported</p>
                    </div>

                    {/* Stats bar — Consumer Justice data */}
                    <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
                        {[
                            { value: '₹8,000Cr', label: 'Lost annually to missed claims' },
                            { value: '50%', label: 'Denied due to faded receipts' },
                            { value: '18kg', label: 'CO₂e saved per device (UNEP)' },
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

            {/* Problem Statement */}
            <section className="py-16 px-6 bg-gradient-to-b from-transparent via-red-950/20 to-transparent">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl sm:text-4xl font-black mb-4">
                            The <span className="text-red-400">Broken System</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            India's warranty redressal system fails the people who need it most.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: FileWarning, stat: '83%', text: 'of thermal receipts become unreadable within 6 months', color: 'text-amber-400' },
                            { icon: Users, stat: '50%', text: 'of consumers can\'t claim warranties due to missing documentation', color: 'text-red-400' },
                            { icon: Heart, stat: '₹8,000Cr', text: 'lost annually by Indian consumers from expired/unclaimed warranties', color: 'text-pink-400' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all"
                            >
                                <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-3`} />
                                <p className={`text-3xl font-black ${item.color} mb-2`}>{item.stat}</p>
                                <p className="text-sm text-slate-400">{item.text}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
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
                            How <span className="text-indigo-400">Warrify</span> Fights Back
                        </h2>
                        <p className="text-slate-400 text-lg max-w-xl mx-auto">
                            Not a convenience tool. A consumer empowerment platform.
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
                        <p className="text-slate-400">No other platform addresses the documentation gap.</p>
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
                    <h2 className="text-3xl font-black mb-4">Real People, Real Justice</h2>
                    <p className="text-slate-400 mb-12 text-sm">Stories from consumers who fought back with Warrify.</p>
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
                        <p className="text-slate-400">Building the future of consumer rights protection.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="px-2 py-1 bg-indigo-500 rounded text-[10px] uppercase font-black">Phase 2</span>
                                Consumer Court Integration
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">File formal consumer complaints via the National Consumer Helpline (1915) directly through Warrify. Auto-populate complaint forms with digitized warranty data.</p>
                        </div>
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="px-2 py-1 bg-purple-500 rounded text-[10px] uppercase font-black">Phase 3</span>
                                Rural India Outreach
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">WhatsApp-based warranty registration for users without smartphones apps. Voice-based claim filing in 10+ Indian languages. Offline-first architecture.</p>
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
                    <Scale className="w-14 h-14 text-indigo-400 mx-auto mb-6" />
                    <h2 className="text-3xl sm:text-4xl font-black mb-4">
                        Every Consumer Deserves Justice
                    </h2>
                    <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
                        Don't let a faded receipt rob you of your rights. Join the movement for consumer empowerment.
                    </p>
                    <Link
                        to="/signup"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold rounded-2xl transition-all hover:shadow-2xl hover:shadow-indigo-500/30"
                    >
                        Start Protecting Your Rights
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
                            <span>React 19 • TypeScript • Node.js • SQLite • Gemini AI • Tesseract OCR • UNEP Data</span>
                        </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-slate-600">
                            Built with ❤️ for Smart India Hackathon 2025 • Environmental Impact: UNEP-backed CO₂e lifecycle methodology • Consumer data from NCDRC & LocalCircles surveys
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
