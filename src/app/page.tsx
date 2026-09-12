'use client';

import React, { useState } from 'react';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { AdminLoginView } from '@/components/admin/AdminLoginView';
import { AdminSidebar, AdminTab } from '@/components/admin/AdminSidebar';
import { CuentasView } from '@/components/admin/CuentasView';
import { SugerenciasView } from '@/components/admin/SugerenciasView';
import { Loader2, Menu, X, Shield, Sparkles, Activity } from 'lucide-react';

export default function AdminPage() {
  const { isAuthenticated, isLoading, adminUser } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('cuentas');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingSuggestionsCount, setPendingSuggestionsCount] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Iniciando panel administrativo...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginView />;
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30">
      {/* Sidebar para desktop */}
      <div className="hidden lg:flex">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingSuggestionsCount={pendingSuggestionsCount}
        />
      </div>

      {/* Drawer móvil para pantallas pequeñas */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-50 flex flex-col w-64 bg-slate-900 h-full shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <span className="text-sm font-bold text-white">Menú Admin</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AdminSidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setIsMobileMenuOpen(false);
                }}
                pendingSuggestionsCount={pendingSuggestionsCount}
              />
            </div>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra superior móvil */}
        <header className="lg:hidden h-16 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between backdrop-blur-md">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl text-slate-300 hover:bg-slate-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-sm font-bold text-white tracking-wide">UPAOS ADMIN</span>
          <div className="w-8" />
        </header>

        {/* Topbar para desktop con status */}
        <header className="hidden lg:flex h-14 border-b border-slate-800/80 bg-slate-950/80 px-8 items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-400">
              Sistema Operativo • Conectado a Servidor UPAOS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sesión: {adminUser?.usuario || '000000000'}</span>
            </div>
            <span className="text-xs text-slate-500">
              {new Date().toLocaleDateString('es-PE', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'cuentas' && <CuentasView />}
          {activeTab === 'sugerencias' && (
            <SugerenciasView onPendingCountChange={setPendingSuggestionsCount} />
          )}
        </main>
      </div>
    </div>
  );
}
