'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CuentaGuardada, UserSession } from '@/types/auth';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  cuentas: CuentaGuardada[];
  login: (token: string, usuario: string, password?: string, nombre?: string, guardarPassword?: boolean) => void;
  logout: () => void;
  removeCuenta: (usuario: string) => void;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isEligeCuentaOpen: boolean;
  openEligeCuenta: () => void;
  closeEligeCuenta: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cuentas, setCuentas] = useState<CuentaGuardada[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isEligeCuentaOpen, setIsEligeCuentaOpen] = useState(false);

  // Cargar sesión y lista de cuentas guardadas al montar
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('upao_token');
      const storedUser = localStorage.getItem('upao_usuario');
      const storedName = localStorage.getItem('upao_nombre');

      if (storedToken && storedUser) {
        setUser({
          token: storedToken,
          usuario: storedUser,
          nombre: storedName || undefined,
        });
      }

      const storedCuentas = localStorage.getItem('upao_cuentas');
      if (storedCuentas) {
        setCuentas(JSON.parse(storedCuentas));
      }
    } catch (e) {
      console.error('Error al recuperar sesión de UPAO:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (
    token: string,
    usuario: string,
    password?: string,
    nombre?: string,
    guardarPassword: boolean = true
  ) => {
    localStorage.setItem('upao_token', token);
    localStorage.setItem('upao_usuario', usuario);
    if (nombre) localStorage.setItem('upao_nombre', nombre);

    // Guardar en la lista multi-cuenta
    const updatedCuentas = [...cuentas.filter((c) => c.usuario !== usuario)];
    updatedCuentas.unshift({
      usuario,
      password: guardarPassword ? password : '',
      nombre: nombre || undefined,
    });

    setCuentas(updatedCuentas);
    localStorage.setItem('upao_cuentas', JSON.stringify(updatedCuentas));

    setUser({ token, usuario, nombre });
    setIsLoginModalOpen(false);
    setIsEligeCuentaOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('upao_token');
    localStorage.removeItem('upao_usuario');
    localStorage.removeItem('upao_nombre');
    setUser(null);
  };

  const removeCuenta = (targetUsuario: string) => {
    const updated = cuentas.filter((c) => c.usuario !== targetUsuario);
    setCuentas(updated);
    localStorage.setItem('upao_cuentas', JSON.stringify(updated));

    if (user?.usuario === targetUsuario) {
      logout();
    }
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const openEligeCuenta = () => setIsEligeCuentaOpen(true);
  const closeEligeCuenta = () => setIsEligeCuentaOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        cuentas,
        login,
        logout,
        removeCuenta,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        isEligeCuentaOpen,
        openEligeCuenta,
        closeEligeCuenta,
      }}
    >
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
