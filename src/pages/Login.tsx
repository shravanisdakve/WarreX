import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, signInWithEmailAndPassword, sendPasswordResetEmail } from '../lib/firebase';
import { Lock, Mail, ShieldCheck, Loader, ArrowRight } from 'lucide-react';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await login(userCredential.user);
      navigate('/dashboard');
    } catch (err: any) {
      const code = err.code;
      if (code === 'auth/user-not-found') setError('No account found with this email.');
      else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError('Invalid email or password.');
      else if (code === 'auth/too-many-requests') setError('Too many attempts. Please try again later.');
      else setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSent(false);
    setResetError('');
    if (!resetEmail) {
      setResetError('Please enter your email.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
      setTimeout(() => setShowForgot(false), 3000);
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset email.');
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
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-400">Password</label>
                <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</button>
              </div>
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

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#151c2e] p-6 rounded-2xl max-w-sm w-full border border-indigo-500/20 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reset Password</h3>
            <p className="text-sm text-slate-400 mb-4">Enter your email and we'll send you a link to reset your password.</p>

            {resetSent ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-lg text-center mb-4">
                Reset link sent! Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="Your email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
                />
                {resetError && <p className="text-xs text-red-400">{resetError}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForgot(false)} className="flex-1 py-2 text-sm text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">Send Link</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
