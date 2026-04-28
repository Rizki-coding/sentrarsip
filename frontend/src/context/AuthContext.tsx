import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import api from '../api/axios';
import { User } from '../types';

type PermMap = Record<string, Record<string, boolean>>;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  permissions: PermMap;
  hasPermission: (menuId: string, action: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<PermMap>({});
  const [loading, setLoading] = useState(true);

  const parsePermissions = (permStr?: string): PermMap => {
    if (!permStr) return {};
    try { return JSON.parse(permStr); } catch { return {}; }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          setPermissions(parsePermissions(res.data.permissions));
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          setUser(null);
          setPermissions({});
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('access_token', res.data.access_token);
    // Fetch full user with permissions
    const meRes = await api.get('/auth/me');
    setUser(meRes.data);
    setPermissions(parsePermissions(meRes.data.permissions));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    setUser(null);
    setPermissions({});
  };

  const hasPermission = useCallback((menuId: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    return !!permissions[menuId]?.[action];
  }, [user, permissions]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, permissions, hasPermission, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
