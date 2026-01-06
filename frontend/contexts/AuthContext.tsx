import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage on mount
    const storedUser = sessionStorage.getItem('extrator_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
        sessionStorage.removeItem('extrator_user');
      }
    } else {
      // --- BYPASS LOGIN (TEMPORARY) ---
      // Auto-login as Admin if no session exists
      const mockUser: User = {
        id: 1,
        username: "ADMIN",
        name: "Admin Provisório",
        role: "SUPERADMIN",
        token: "bypass-token-dev"
      };
      setUser(mockUser);
      // Optional: don't save to session so logout still "works" until refresh
    }
    setLoading(false);
  }, []);

  const login = async (u: string, p: string): Promise<boolean> => {
    const userData = await dataService.login(u, p);
    if (userData) {
      setUser(userData);
      sessionStorage.setItem('extrator_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('extrator_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
