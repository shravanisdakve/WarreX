import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
// @ts-ignore
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import Navbar from './Navbar';

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area — transitions with sidebar on desktop */}
      <div
        className={`flex-1 flex flex-col min-h-screen w-full relative transition-[padding] duration-300 ease-in-out
          ${sidebarOpen ? 'lg:pl-[260px]' : 'lg:pl-0'}
        `}
      >
        {/* Top spacer for content (under fixed top bar) */}
        <div className="h-16 flex-shrink-0" />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          <AnimatePresence>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
