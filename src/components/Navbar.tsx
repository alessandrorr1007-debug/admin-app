'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  GraduationCap,
  Calendar,
  ClipboardCheck,
  Calculator,
  Moon,
  Sun,
  LogIn,
  LogOut,
  User,
  Users,
  Bell,
  MessageSquare,
  CalendarDays,
  Menu,
  X,
} from 'lucide-react';

export type ActiveTab = 'notas' | 'horario' | 'asistencia' | 'calculadora';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenNotifications: () => void;
  onOpenSugerencias: () => void;
  unreadNotificationsCount: number;
  semanaEtiqueta?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenNotifications,
  onOpenSugerencias,
  unreadNotificationsCount,
  semanaEtiqueta,
}) => {
  const { user, isAuthenticated, logout, openLoginModal, openEligeCuenta } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const isDarkStored = localStorage.getItem('theme') === 'dark';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDarkStored || (!('theme' in localStorage) && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const navItems = [
    { id: 'notas' as ActiveTab, label: 'Mis Notas', icon: GraduationCap },
    { id: 'horario' as ActiveTab, label: 'Horario', icon: Calendar },
    { id: 'asistencia' as ActiveTab, label: 'Asistencia', icon: ClipboardCheck },
    { id: 'calculadora' as ActiveTab, label: 'Calculadora', icon: Calculator },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 dark:bg-[#12161f]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      {/* Banner de Semana Académica si está activa (idéntico a HomeScreen de Android) */}
      {semanaEtiqueta && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-[11px] font-semibold py-1 px-4 text-center flex items-center justify-center gap-1.5 shadow-inner">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{semanaEtiqueta}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Marca */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-md shadow-blue-600/20 font-black text-xl tracking-tight">
              U
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  UPAO <span className="text-blue-600 dark:text-blue-400">S</span>
                </span>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Web
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block font-medium">
                Campus Virtual · Banner SSB
              </p>
            </div>
          </div>

          {/* Menú de Navegación (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Acciones y Perfil */}
          <div className="flex items-center gap-1.5">
            {/* Buzón de Sugerencias */}
            {isAuthenticated && (
              <button
                onClick={onOpenSugerencias}
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Buzón de sugerencias"
                aria-label="Sugerencias"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            {/* Campana de Notificaciones con Badge */}
            {isAuthenticated && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Notificaciones"
                aria-label="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-600 text-white min-w-[16px] text-center shadow-sm">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Modo Oscuro */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Cambiar tema"
              title="Cambiar tema"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Estado de Sesión / Multi-cuenta */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 ml-1">
                {/* Cambiar de Cuenta */}
                <button
                  onClick={openEligeCuenta}
                  className="hidden sm:flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Cambiar de cuenta guardada"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{user.usuario}</span>
                </button>

                <button
                  onClick={logout}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Ingresar</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de pestañas móvil inferior */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[11px] font-medium transition cursor-pointer ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
