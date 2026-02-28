import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Bell, CheckCircle, XCircle, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

interface Notification {
  id: number;
  product_name: string;
  type: string;
  status: string;
  sent_at: string;
  error_message?: string;
}

interface UpcomingProduct {
  id: number;
  product_name: string;
  brand: string;
  expiry_date: string;
}

export default function Notifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingProduct[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  useEffect(() => {
    fetchNotifications();
    fetchUpcoming();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const fetchUpcoming = async () => {
    try {
      const res = await axios.get('/api/products/upcoming/expiring');
      setUpcoming(res.data);
    } catch (error) {
      console.error('Failed to fetch upcoming expirations');
    }
  };

  const getIcon = (status: string) => {
    if (status === 'SENT') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    if (status === 'FAILED') return <XCircle className="w-5 h-5 text-red-500" />;
    return <Clock className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">{t('notifications')}</h1>

      {/* Tab Switcher */}
      <div className="flex bg-white/5 rounded-xl p-1 w-fit border border-white/5">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all btn-tactile ${activeTab === 'upcoming' ? 'bg-indigo-500/15 shadow-sm text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
        >
          <ShieldAlert className="w-4 h-4 inline mr-1.5" />
          Upcoming Expirations
          {upcoming.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">{upcoming.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all btn-tactile ${activeTab === 'history' ? 'bg-indigo-500/15 shadow-sm text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
        >
          <Bell className="w-4 h-4 inline mr-1.5" />
          Notification History
        </button>
      </div>

      {/* Upcoming Expirations Tab */}
      {activeTab === 'upcoming' && (
        <div className="bg-[#151c2e] shadow-sm rounded-xl border border-indigo-500/10 overflow-hidden">
          {upcoming.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500/30 mb-4" />
              <p className="text-slate-300 font-medium">All clear! 🎉</p>
              <p className="text-sm text-slate-500 mt-1">No warranties expiring in the next 30 days.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {upcoming.map((product) => {
                const daysLeft = differenceInDays(parseISO(product.expiry_date), new Date());
                const urgency = daysLeft <= 7 ? 'border-l-red-500 bg-red-500/5' : daysLeft <= 14 ? 'border-l-amber-500 bg-amber-500/5' : 'border-l-yellow-400 bg-yellow-500/5';
                return (
                  <li key={product.id} className={`border-l-4 ${urgency}`}>
                    <Link to={`/product/${product.id}`} className="block px-5 py-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${daysLeft <= 7 ? 'text-red-500 animate-pulse' : 'text-amber-500 animate-pulse'}`} />
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{product.product_name}</p>
                            <p className="text-xs text-slate-500">{product.brand}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${daysLeft <= 7 ? 'text-red-600' : 'text-amber-600'} animate-pulse`}>
                            {daysLeft} {t('days_left')}
                          </p>
                          <p className="text-xs text-slate-500">
                            Expires {format(parseISO(product.expiry_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Notification History Tab */}
      {activeTab === 'history' && (
        <div className="bg-[#151c2e] shadow-sm rounded-xl border border-indigo-500/10 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Bell className="w-12 h-12 mx-auto text-slate-700 mb-4" />
              <p className="text-slate-400">No notifications sent yet.</p>
              <p className="text-sm text-slate-500 mt-1">Reminders will appear here once sent.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {notifications.map((notif) => (
                <li key={notif.id} className="px-5 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getIcon(notif.status)}
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {notif.type === 'TEST' ? 'Test Reminder' : `${notif.type.replace('_', ' ')} Reminder`}
                        </p>
                        <p className="text-xs text-slate-500">
                          Product: {notif.product_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">
                        {notif.sent_at ? format(parseISO(notif.sent_at), 'PP p') : 'Pending'}
                      </p>
                      {notif.status === 'FAILED' && (
                        <p className="text-xs text-red-500 mt-1">{notif.error_message}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
