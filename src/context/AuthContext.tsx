import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  demoLogin: (role: Role) => Promise<void>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  canAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const savedUserStr = localStorage.getItem('spp_user') || sessionStorage.getItem('spp_user');
      if (!savedUserStr) return;
      const parsed = JSON.parse(savedUserStr);
      if (!parsed?.id) return;

      const res = await fetch(`/api/auth/me?userId=${encodeURIComponent(parsed.id)}`);
      if (res.ok) {
        const latestUser: User = await res.json();
        setUser(latestUser);
        if (localStorage.getItem('spp_user')) {
          localStorage.setItem('spp_user', JSON.stringify(latestUser));
        }
        if (sessionStorage.getItem('spp_user')) {
          sessionStorage.setItem('spp_user', JSON.stringify(latestUser));
        }
      }
    } catch (e) {
      console.warn('Failed to refresh user profile from server:', e);
    }
  };

  const updateUser = (updatedData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedData };
      try {
        if (localStorage.getItem('spp_user')) {
          localStorage.setItem('spp_user', JSON.stringify(updated));
        }
        if (sessionStorage.getItem('spp_user')) {
          sessionStorage.setItem('spp_user', JSON.stringify(updated));
        }
      } catch (e) {
        console.error('Failed to sync updated user to storage:', e);
      }
      return updated;
    });
  };

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('spp_user') || sessionStorage.getItem('spp_user');
      const savedToken = localStorage.getItem('spp_token') || sessionStorage.getItem('spp_token');
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } catch (e) {
      console.error('Failed to parse saved user:', e);
    } finally {
      setIsLoading(false);
      refreshUser();
    }
  }, []);

  const login = async (username: string, password: string, remember = true): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login gagal' };
      }

      setUser(data.user);
      setToken(data.token);

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('spp_user', JSON.stringify(data.user));
      storage.setItem('spp_token', data.token);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Koneksi ke server gagal' };
    }
  };

  const demoLogin = async (role: Role) => {
    const creds: Record<Role, { u: string; p: string }> = {
      super_admin: { u: 'admin', p: 'admin123' },
      bendahara: { u: 'bendahara', p: 'bendahara123' },
      admin: { u: 'admin', p: 'admin123' },
      staff: { u: 'tu', p: 'tu123' },
      viewer: { u: 'viewer', p: 'viewer123' }
    };
    const c = creds[role] || creds.super_admin;
    await login(c.u, c.p, true);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('spp_user');
    localStorage.removeItem('spp_token');
    sessionStorage.removeItem('spp_user');
    sessionStorage.removeItem('spp_token');
  };

  // Role permissions check
  const canAccess = (module: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;

    if (user.role === 'bendahara') {
      // Bendahara can access dashboard, master bills, transactions, reports, WA, and receipts
      const allowed = ['dashboard', 'master_spp', 'master_eskul', 'master_annual', 'transaksi', 'laporan', 'whatsapp', 'kwitansi'];
      return allowed.includes(module);
    }

    if (user.role === 'admin' || user.role === 'staff') {
      // Staf TU can access students, master data, transactions, reports, whatsapp, and kwitansi
      const allowed = ['dashboard', 'master_sekolah', 'master_santri', 'master_spp', 'master_eskul', 'master_annual', 'transaksi', 'laporan', 'whatsapp', 'kwitansi'];
      return allowed.includes(module);
    }

    if (user.role === 'viewer') {
      // Viewer can only read dashboard and reports
      return ['dashboard', 'laporan', 'kwitansi'].includes(module);
    }

    return false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      demoLogin,
      logout,
      updateUser,
      refreshUser,
      canAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
