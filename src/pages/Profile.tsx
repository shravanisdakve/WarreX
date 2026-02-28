import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { User, Mail, MapPin, Package, Bell, Save, ArrowLeft, Shield, Calendar, Loader } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Profile {
    id: number;
    name: string;
    email: string;
    city: string;
    created_at: string;
    productCount: number;
    notificationCount: number;
}

export default function ProfilePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editCity, setEditCity] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/user/profile');
            setProfile(res.data);
            setEditName(res.data.name);
            setEditCity(res.data.city || 'Mumbai');
        } catch (error) {
            console.error('Failed to fetch profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/user/profile', { name: editName, city: editCity });
            await fetchProfile();
            setEditing(false);
        } catch (error) {
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Skeleton loader */}
            <div className="animate-pulse space-y-4">
                <div className="h-6 bg-slate-800/50 rounded w-32" />
                <div className="bg-[#151c2e] rounded-2xl p-8 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <div className="h-5 bg-slate-800 rounded w-48" />
                            <div className="h-4 bg-slate-800 rounded w-36" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="h-16 bg-slate-800/50 rounded-xl" />
                        <div className="h-16 bg-slate-800/50 rounded-xl" />
                        <div className="h-16 bg-slate-800/50 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );

    if (!profile) return null;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center text-sm text-slate-500 hover:text-slate-300 transition-colors btn-tactile"
            >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </button>

            <h1 className="text-2xl font-bold text-slate-100">Profile & Settings</h1>

            {/* Profile Card */}
            <div className="bg-[#151c2e] shadow-sm rounded-2xl border border-indigo-500/10 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                            <span className="text-3xl font-black text-white">
                                {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="text-white">
                            {editing ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1.5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 text-lg font-bold"
                                />
                            ) : (
                                <h2 className="text-xl font-bold">{profile.name}</h2>
                            )}
                            <p className="text-indigo-200 text-sm flex items-center gap-1 mt-1">
                                <Mail className="w-3.5 h-3.5" /> {profile.email}
                            </p>
                            <p className="text-indigo-200 text-sm flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3.5 h-3.5" /> Member since {profile.created_at ? format(parseISO(profile.created_at), 'MMM yyyy') : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
                    <div className="p-4 text-center">
                        <Package className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-slate-100">{profile.productCount}</p>
                        <p className="text-xs text-slate-500">Products</p>
                    </div>
                    <div className="p-4 text-center">
                        <Bell className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-slate-100">{profile.notificationCount}</p>
                        <p className="text-xs text-slate-500">Notifications</p>
                    </div>
                    <div className="p-4 text-center">
                        <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-slate-100">Pro</p>
                        <p className="text-xs text-slate-500">Plan</p>
                    </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">City</label>
                        {editing ? (
                            <input
                                type="text"
                                value={editCity}
                                onChange={e => setEditCity(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:border-white/20"
                            />
                        ) : (
                            <p className="text-sm text-slate-200 flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-slate-500" /> {profile.city || 'Mumbai'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Notification Preferences</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-slate-300">
                                <input type="checkbox" defaultChecked className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500" />
                                Email reminders (30 days before expiry)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-300">
                                <input type="checkbox" defaultChecked className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500" />
                                Email reminders (7 days before expiry)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-300">
                                <input type="checkbox" defaultChecked className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500" />
                                AI claim suggestions
                            </label>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex gap-3">
                    {editing ? (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 btn-tactile"
                            >
                                {saving ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Save
                            </button>
                            <button
                                onClick={() => { setEditing(false); setEditName(profile.name); setEditCity(profile.city || 'Mumbai'); }}
                                className="px-4 py-2 bg-white/5 border border-white/10 text-sm font-medium rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-all btn-tactile"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setEditing(true)}
                            className="inline-flex items-center px-4 py-2 bg-white/5 border border-white/10 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/10 transition-all btn-tactile"
                        >
                            <User className="w-4 h-4 mr-2 text-indigo-500" /> Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
