import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import ProductDetails from './pages/ProductDetails';
import Assistant from './pages/Assistant';
import Notifications from './pages/Notifications';
import './i18n';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="add-product" element={<AddProduct />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
