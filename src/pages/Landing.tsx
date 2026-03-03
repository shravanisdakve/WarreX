import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, Bell, Brain, TrendingUp, ArrowRight, CheckCircle, Zap, Shield, Clock, Mail, Scale, FileWarning, Users, Gavel, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
    const { t, i18n } = useTranslation();
    const { isAuthenticated } = useAuth();
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    const COMPETITOR_DATA = [
        { label: t('comp_feature_labels.classifier'), warrify: true, samsung: false, jiosure: false },
        { label: t('comp_feature_labels.brands'), warrify: true, samsung: false, jiosure: true },
        { label: t('comp_feature_labels.ocr'), warrify: true, samsung: false, jiosure: false },
        { label: t('comp_feature_labels.alerts'), warrify: true, samsung: false, jiosure: false },
        { label: t('comp_feature_labels.faded'), warrify: true, samsung: false, jiosure: false },
        { label: t('comp_feature_labels.lang'), warrify: true, samsung: true, jiosure: true },
        { label: t('comp_feature_labels.draft'), warrify: true, samsung: false, jiosure: false },
    ];

    const FEATURES = [
        {
            icon: Scale,
            title: t('feature_justice_title'),
            description: t('feature_justice_desc'),
            gradient: 'from-purple-500 to-indigo-600'
        },
        {
            icon: FileWarning,
            title: t('feature_classifier_title'),
            description: t('feature_classifier_desc'),
            gradient: 'from-amber-500 to-orange-600'
        },
        {
            icon: Sparkles,
            title: t('feature_ocr_title'),
            description: t('feature_ocr_desc'),
            gradient: 'from-emerald-500 to-teal-600'
        },
        {
            icon: Brain,
            title: t('feature_risk_title'),
            description: t('feature_risk_desc'),
            gradient: 'from-blue-500 to-cyan-600'
        },
        {
            icon: Mail,
            title: t('feature_draft_title'),
            description: t('feature_draft_desc'),
            gradient: 'from-rose-500 to-pink-600'
        },
    ];

    const TESTIMONIALS = [
        { name: 'Meera D.', text: t('testimonial_meera', 'My mixer grinder receipt had completely faded. The shopkeeper refused to honour the warranty. Warrify had my digital copy — Samsung repaired it for free.'), role: t('role_meera', 'Homemaker, Dharavi') },
        { name: 'Rajesh P.', text: t('testimonial_rajesh', 'I\'m a rickshaw driver. I bought a phone worth ₹12,000 — my whole month\'s savings. When it broke, Warrify helped me file a proper claim in Hindi.'), role: t('role_rajesh', 'Auto Driver, Pune') },
        { name: 'Anita K.', text: t('testimonial_anita', 'The AI drafted a complaint email that sounded like a lawyer wrote it. LG approved my washing machine repair within 3 days.'), role: t('role_anita', 'School Teacher, Mumbai') },
    ];

    const fNum = (num: string | number) => {
        if (i18n.language === 'en') return num;
        const digits: Record<string, string> = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };
        return num.toString().replace(/\d/g, d => digits[d]);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [TESTIMONIALS.length]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white overflow-x-hidden">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-indigo-400" />
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            WarreX
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex bg-white/5 rounded-lg border border-white/5 mr-2">
                            {['en', 'hi', 'mr'].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => {
                                        localStorage.setItem('appLanguage', lang);
                                        i18n.changeLanguage(lang);
                                    }}
                                    className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${i18n.language === lang
                                        ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                        }`}
                                >
                                    {lang === 'en' ? 'EN' : lang === 'hi' ? 'हि' : 'मर'}
                                </button>
                            ))}
                        </div>
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className="px-5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-sm font-semibold rounded-xl border border-indigo-500/20 transition-all"
                            >
                                {t('back_to_dashboard')}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-sm font-medium text-indigo-300 hover:text-white transition-colors"
                                >
                                    {t('sign_in')}
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                                >
                                    {t('get_started_free')}
                                </Link>
                            </>
                        )}
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
                        {t('landing_hero_tagline')}
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-tight mb-6">
                        {t('landing_hero_title')}
                    </h1>

                    <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        {t('landing_hero_subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            to={isAuthenticated ? "/dashboard" : "/signup"}
                            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold rounded-2xl transition-all hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-105"
                        >
                            {t('landing_cta_btn')}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <p className="text-sm text-slate-500">{t('landing_no_card')}</p>
                    </div>

                    {/* Stats bar — Consumer Justice data */}
                    <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
                        {[
                            { value: fNum('₹8,000Cr'), label: t('lost_annually') },
                            { value: fNum('50%'), label: t('denied_faded') },
                            { value: fNum('3+'), label: t('ai_models_claims') },
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
                            {t('broken_system_title')}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            {t('broken_system_subtitle')}
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: FileWarning, stat: fNum('83%'), text: t('faded_stat_desc'), color: 'text-amber-400' },
                            { icon: Users, stat: fNum('50%'), text: t('missing_doc_stat_desc'), color: 'text-red-400' },
                            { icon: Heart, stat: fNum('₹8,000Cr'), text: t('lost_annually_stat_desc'), color: 'text-pink-400' },
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
                            {t('how_warrify_fights')}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-xl mx-auto">
                            {t('empowerment_platform')}
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
                            {t('competitor_comparison_title')}
                        </h2>
                        <p className="text-slate-400">{t('documentation_gap_desc')}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
                    >
                        <div className="grid grid-cols-4 gap-0 text-sm">
                            <div className="p-4 font-semibold text-slate-400 border-b border-white/10">{t('feature_label', 'Feature')}</div>
                            <div className="p-4 font-bold text-indigo-400 text-center border-b border-white/10 bg-indigo-500/5">WarreX</div>
                            <div className="p-4 font-semibold text-slate-500 text-center border-b border-white/10">Samsung Members</div>
                            <div className="p-4 font-semibold text-slate-500 text-center border-b border-white/10">JioSure</div>

                            {COMPETITOR_DATA.map((row, i) => (
                                <React.Fragment key={i}>
                                    <div className={`p-4 text-slate-300 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} border-b border-white/5`}>
                                        {row.label}
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
                    <h2 className="text-3xl font-black mb-4">{t('real_justice_title')}</h2>
                    <p className="text-slate-400 mb-12 text-sm">{t('real_justice_subtitle')}</p>
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
                        <h2 className="text-3xl font-black mb-4">{t('roadmap_title')}</h2>
                        <p className="text-slate-400">{t('building_future_rights')}</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="px-2 py-1 bg-indigo-500 rounded text-[10px] uppercase font-black">{t('phase_2')}</span>
                                {t('roadmap_p2_title')}
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{t('roadmap_p2_desc')}</p>
                        </div>
                        <div className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="px-2 py-1 bg-purple-500 rounded text-[10px] uppercase font-black">{t('phase_3')}</span>
                                {t('roadmap_p3_title')}
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{t('roadmap_p3_desc')}</p>
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
                        {t('every_consumer_deserves')}
                    </h2>
                    <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
                        {t('justice_desc')}
                    </p>
                    <Link
                        to={isAuthenticated ? "/dashboard" : "/signup"}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold rounded-2xl transition-all hover:shadow-2xl hover:shadow-indigo-500/30"
                    >
                        {t('start_protecting')}
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </motion.div>
            </section>


        </div>
    );
}
