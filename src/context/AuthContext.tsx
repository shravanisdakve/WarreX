import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import {
  auth,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from '../lib/firebase';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (firebaseUser: FirebaseUser) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

          // Sync user to Supabase backend
          const res = await axios.post('/api/auth/sync-user', {
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
          });

          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (e) {
          console.error('Failed to sync user:', e);
          setUser(null);
          setToken(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
      }
      setIsLoading(false);
    });

    // Setup axios interceptor to catch 401/403 and automatically logout
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Try to refresh the token
          const currentUser = auth.currentUser;
          if (currentUser) {
            try {
              const newToken = await currentUser.getIdToken(true);
              setToken(newToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              // Retry the failed request
              error.config.headers['Authorization'] = `Bearer ${newToken}`;
              return axios.request(error.config);
            } catch (refreshError) {
              // Token refresh failed, logout
              await firebaseSignOut(auth);
              setToken(null);
              setUser(null);
              localStorage.removeItem('user');
              delete axios.defaults.headers.common['Authorization'];
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }
          } else {
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      unsubscribe();
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const login = async (firebaseUser: FirebaseUser) => {
    const idToken = await firebaseUser.getIdToken();
    setToken(idToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

    // Sync user to Supabase backend
    const res = await axios.post('/api/auth/sync-user', {
      name: firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
    });

    setUser(res.data.user);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Firebase sign out error:', e);
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
