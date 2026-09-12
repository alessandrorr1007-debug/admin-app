'use client';

import React from 'react';
import {
  BarChart3,
  Users,
  MessageSquare,
  Calendar,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth-context';

export type AdminTab = 'metricas' | 'cuentas' | 'sugerencias' | 'semana';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  pendingSuggestionsCount?: number;
  totalCuentasCount?: number;
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  pendingSuggestionsCount = 0,
  totalCuentasCount = 0,
}: AdminSidebarProps) {
  const { adminUser, logout } = useAdminAuth();

  const navItems = [
    {
      id: 'metricas' as AdminTab,
      label: 'Métricas & DAU',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'cuentas' as AdminTab,
      label: 'Cuentas Registradas',
      icon: Users,
      badge: totalCuentasCount > 0 ? totalCuentasCount : null,
    },
    {
      id: 'sugerencias' as AdminTab,
      label: 'Buzón Sugerencias',
      icon: MessageSquare,
      badge: pendingSuggestionsCount > 0 ? pendingSuggestionsCount : null,
      badgeVariant: 'warning',
    },
    {
      id: 'semana' as AdminTab,
      label: 'Semana Académica',
      icon: Calendar,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">UPAOS ADMIN</h2>
          <p className="text-[11px] text-slate-400">Panel de Control</p>
        </div>
      </div>

      {/* Nav list */}
      <nav className="flex-1 px-3 py-5 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Módulos
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.badgeVariant === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin User info & logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-indigo-300 text-xs font-bold">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">Administrador</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">{adminUser?.usuario || '000000000'}</p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
