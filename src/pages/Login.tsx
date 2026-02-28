import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ShieldCheck, Loader, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 mb-4 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow icon-bounce">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Warrify
          </h1>
          <p className="text-sm text-slate-500 mt-1">AI-Powered Warranty Management</p>
        </div>

        {/* Card */}
        <div className="bg-[#151c2e]/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 border border-indigo-500/10 p-8 card-interactive">
          <h2 className="text-xl font-bold text-slate-100 mb-6">Welcome back</h2>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
              <div className="relative group">
                <Mail className="absolute top-3 left-3 text-slate-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl placeholder-slate-600 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm transition-all hover:border-white/20 hover:bg-white/[0.07]"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative group">
                <Lock className="absolute top-3 left-3 text-slate-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl placeholder-slate-600 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm transition-all hover:border-white/20 hover:bg-white/[0.07]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 py-2.5 px-3 rounded-xl border border-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[#151c2e] disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-tactile shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in...' : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>

            <p className="text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
