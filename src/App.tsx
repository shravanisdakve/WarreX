import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import ProductDetails from './pages/ProductDetails';
import Assistant from './pages/Assistant';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import './i18n';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const hasCachedUser = !!localStorage.getItem('user');

  if (isLoading && !hasCachedUser) return null;
  if (!isAuthenticated && !hasCachedUser && !isLoading) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Redirect to dashboard if logged in
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const hasCachedUser = !!localStorage.getItem('user');

  if (isLoading && !hasCachedUser) return null;
  if (isAuthenticated || hasCachedUser) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="add-product" element={<AddProduct />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="notifications" element={<Notifications />} />

            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
