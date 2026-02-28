import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    Users,
    Package,
    AlertCircle,
    TrendingUp,
    BarChart3,
    Search,
    Filter,
    Download,
    ExternalLink,
    ShieldCheck,
    Clock,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface B2BStats {
    totalIssued: number;
    activeClaims: number;
    avgResponseTime: string;
    customerSatisfaction: number;
}

interface IssuedWarranty {
    id: number;
    customerName: string;
    productName: string;
    issuedDate: string;
    expiryDate: string;
    status: 'active' | 'expiring' | 'expired';
    claimStatus: 'none' | 'pending' | 'resolved' | 'rejected';
}

export default function B2BDashboard() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<B2BStats>({
        totalIssued: 1248,
        activeClaims: 14,
        avgResponseTime: '1.2 days',
        customerSatisfaction: 4.8
    });
    const [warranties, setWarranties] = useState<IssuedWarranty[]>([
        { id: 1, customerName: 'Rahul Sharma', productName: 'Samsung Galaxy S24', issuedDate: '2024-01-15', expiryDate: '2025-01-15', status: 'expiring', claimStatus: 'pending' },
        { id: 2, customerName: 'Priya Mehta', productName: 'LG Front Load Washer', issuedDate: '2023-06-10', expiryDate: '2025-06-10', status: 'active', claimStatus: 'none' },
        { id: 3, customerName: 'Amit Patel', productName: 'Sony Bravia 55"', issuedDate: '2023-03-01', expiryDate: '2024-03-01', status: 'expired', claimStatus: 'none' },
        { id: 4, customerName: 'Suresh Iyer', productName: 'Whirlpool Refrigerator', issuedDate: '2024-02-20', expiryDate: '2026-02-20', status: 'active', claimStatus: 'resolved' },
    ]);

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">B2B Warranty Control Center</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage issued warranties, track claims, and monitor customer satisfaction.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
                        <TrendingUp className="w-4 h-4" /> Generate Report
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Warranties Issued', value: stats.totalIssued.toLocaleString(), icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Pending Claims', value: stats.activeClaims.toLocaleString(), icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Avg. Response Time', value: stats.avgResponseTime, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Cust. Satisfaction', value: `${stats.customerSatisfaction}/5`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-hover hover:shadow-md">
                        <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                        <p className="text-sm font-medium text-gray-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts / Insights Mock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-gray-900">Issuance Volume (Last 30 Days)</h3>
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="h-48 w-full bg-slate-50 rounded-2xl flex items-end justify-between p-6 gap-2">
                        {[40, 70, 45, 90, 65, 80, 50, 60, 85, 95, 75, 40].map((h, i) => (
                            <div key={i} style={{ height: `${h}%` }} className="w-full bg-indigo-500/20 rounded-t-md hover:bg-indigo-500 transition-colors group relative">
                                <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap">
                                    {Math.round(h * 1.5)} units
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <span>Mar 1</span>
                        <span>Mar 15</span>
                        <span>Mar 30</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-400" /> AI Insights for Brands
                    </h3>
                    <div className="space-y-4 relative z-10">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                            <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Risk Alert</p>
                            <p className="text-sm">Batch B-240 (LG Front Load) exhibits 15% higher claim rate than Batch B-239. Recommend proactive firmware update.</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                            <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest mb-1">Growth Opportunity</p>
                            <p className="text-sm">Extended warranty uptake is up 22% in Pune region. Cross-sell maintenance kits to this segment.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warranty Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-900">Warranty Management</h3>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search customers or products..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>
                        <button className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                            <Filter className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Expiry Date</th>
                                <th className="px-6 py-4">Claim Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {warranties.map((w) => (
                                <tr key={w.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                {w.customerName.charAt(0)}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">{w.customerName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{w.productName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${w.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                w.status === 'expiring' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                    'bg-red-50 text-red-700 border border-red-100'
                                            }`}>
                                            {w.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{w.expiryDate}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${w.claimStatus === 'pending' ? 'bg-amber-500 animate-pulse' :
                                                    w.claimStatus === 'resolved' ? 'bg-emerald-500' :
                                                        w.claimStatus === 'rejected' ? 'bg-red-500' :
                                                            'bg-gray-300'
                                                }`} />
                                            <span className="text-sm text-gray-700 capitalize">{w.claimStatus}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
