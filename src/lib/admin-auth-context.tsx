'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AdminLoginResponse } from '@/types/admin';

interface AdminAuthContextType {
  adminUser: { usuario: string; token: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usuario: string, password: string) => Promise<AdminLoginResponse>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_TOKEN_KEY = 'upao_admin_token';
const ADMIN_USER_KEY = 'upao_admin_user';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<{ usuario: string; token: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
      const storedUser = localStorage.getItem(ADMIN_USER_KEY);
      if (storedToken && storedUser) {
        setAdminUser({ usuario: storedUser, token: storedToken });
        // También sincronizar con upao_token para el api client
        localStorage.setItem('upao_token', storedToken);
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (usuario: string, password: string): Promise<AdminLoginResponse> => {
    const res = await api.adminLogin(usuario, password);
    if (res.success && res.token) {
      setAdminUser({ usuario: res.admin_usuario, token: res.token });
      localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
      localStorage.setItem(ADMIN_USER_KEY, res.admin_usuario);
      localStorage.setItem('upao_token', res.token);
    }
    return res;
  };

  const logout = () => {
    setAdminUser(null);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem('upao_token');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isAuthenticated: !!adminUser,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth debe ser usado dentro de AdminAuthProvider');
  }
  return context;
}
