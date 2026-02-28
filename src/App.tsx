import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Suspense, lazy } from 'react';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AddProduct = lazy(() => import('./pages/AddProduct'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Assistant = lazy(() => import('./pages/Assistant'));
const Notifications = lazy(() => import('./pages/Notifications'));
const B2BDashboard = lazy(() => import('./pages/B2BDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
import './i18n';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-100">
        {/* Loading skeleton */}
        <div className="space-y-4 w-full max-w-md px-6">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-200 rounded-xl" />
            <div className="h-5 bg-indigo-100 rounded w-24" />
          </div>
          <div className="animate-pulse space-y-3">
            <div className="h-32 bg-gray-200 rounded-2xl" />
            <div className="grid grid-cols-4 gap-3">
              <div className="h-16 bg-gray-200 rounded-xl" />
              <div className="h-16 bg-gray-200 rounded-xl" />
              <div className="h-16 bg-gray-200 rounded-xl" />
              <div className="h-16 bg-gray-200 rounded-xl" />
            </div>
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="space-y-2">
              <div className="h-16 bg-gray-100 rounded-xl" />
              <div className="h-16 bg-gray-100 rounded-xl" />
              <div className="h-16 bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Redirect to dashboard if logged in
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-100">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="add-product" element={<AddProduct />} />
              <Route path="product/:id" element={<ProductDetails />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="b2b" element={<B2BDashboard />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
