import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
// @ts-ignore
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import Navbar from './Navbar';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-100 flex flex-col">
      <Navbar />

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

      {/* Footer with tech stack */}
      <footer className="border-t border-gray-100 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-gray-600">Warrify</span>
              <span className="text-xs text-gray-400">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {['React 19', 'TypeScript', 'Node.js', 'SQLite', 'Gemini AI', 'Tesseract OCR', 'JWT', 'Nodemailer'].map(tech => (
                <span key={tech} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full border border-gray-200">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
