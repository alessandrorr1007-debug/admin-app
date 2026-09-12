'use client';

import React, { useState } from 'react';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { AdminLoginView } from '@/components/admin/AdminLoginView';
import { AdminSidebar, AdminTab } from '@/components/admin/AdminSidebar';
import { MetricsView } from '@/components/admin/MetricsView';
import { CuentasView } from '@/components/admin/CuentasView';
import { SugerenciasView } from '@/components/admin/SugerenciasView';
import { SemanaView } from '@/components/admin/SemanaView';
import { Loader2, Menu, X } from 'lucide-react';

export default function AdminPage() {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('metricas');
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
    <div className="min-h-screen flex bg-slate-950 text-slate-100 antialiased">
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-50 flex flex-col w-64 bg-slate-900 h-full">
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
        <header className="lg:hidden h-16 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl text-slate-300 hover:bg-slate-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-sm font-bold text-white tracking-wide">UPAOS ADMIN</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'metricas' && <MetricsView />}
          {activeTab === 'cuentas' && <CuentasView />}
          {activeTab === 'sugerencias' && (
            <SugerenciasView onPendingCountChange={setPendingSuggestionsCount} />
          )}
          {activeTab === 'semana' && <SemanaView />}
        </main>
      </div>
    </div>
  );
}
