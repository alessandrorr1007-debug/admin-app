'use client';

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from '@/components/Navbar';
import { LoginModal } from '@/components/LoginModal';
import { EligeCuentaModal } from '@/components/EligeCuentaModal';
import { NotificacionesModal } from '@/components/NotificacionesModal';
import { SugerenciasModal } from '@/components/SugerenciasModal';
import { GradesView } from '@/components/GradesView';
import { HorarioView } from '@/components/HorarioView';
import { AsistenciaView } from '@/components/AsistenciaView';
import { CalculadoraView } from '@/components/CalculadoraView';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('notas');
  const [calcInitialValues, setCalcInitialValues] = useState<{
    ep1?: number;
    parcial?: number;
    ep2?: number;
    final?: number;
  } | null>(null);

  // Modales
  const [isNotificacionesOpen, setIsNotificacionesOpen] = useState(false);
  const [isSugerenciasOpen, setIsSugerenciasOpen] = useState(false);

  // Datos globales
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [semanaEtiqueta, setSemanaEtiqueta] = useState<string | null>(null);

  // Cargar semana académica
  useEffect(() => {
    const fetchSemana = async () => {
      try {
        const res = await api.getSemana();
        if (res.configurada && !res.fuera_de_ciclo && res.etiqueta) {
          setSemanaEtiqueta(res.etiqueta);
        }
      } catch {
        // Silencioso
      }
    };
    fetchSemana();
  }, []);

  // Polling de notificaciones no leídas (cada 30s si está autenticado, como en Android)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUnreadNotifications(0);
      return;
    }

    const checkNotifs = async () => {
      try {
        const res = await api.getNotificaciones(user.usuario);
        setUnreadNotifications(res.no_leidas || 0);
      } catch {
        // Silencioso
      }
    };

    checkNotifs();
    const interval = setInterval(checkNotifs, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const handleOpenCalculadoraWith = (notas: {
    ep1?: number;
    parcial?: number;
    ep2?: number;
    final?: number;
  }) => {
    setCalcInitialValues(notas);
    setActiveTab('calculadora');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fc] dark:bg-[#0d1117] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Barra de navegación superior con semana y notificaciones */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNotifications={() => setIsNotificacionesOpen(true)}
        onOpenSugerencias={() => setIsSugerenciasOpen(true)}
        unreadNotificationsCount={unreadNotifications}
        semanaEtiqueta={semanaEtiqueta}
      />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'notas' && (
          <GradesView onOpenCalculadoraWith={handleOpenCalculadoraWith} />
        )}
        {activeTab === 'horario' && <HorarioView />}
        {activeTab === 'asistencia' && <AsistenciaView />}
        {activeTab === 'calculadora' && (
          <CalculadoraView initialValues={calcInitialValues} />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>UPAO S · Aplicación Web de Consultas Académicas</span>
          <span className="text-[11px] opacity-70">
            Conectado al backend de producción UPAO
          </span>
        </div>
      </footer>

      {/* Modales */}
      <LoginModal />
      <EligeCuentaModal />
      <NotificacionesModal
        isOpen={isNotificacionesOpen}
        onClose={() => setIsNotificacionesOpen(false)}
        onNotificationRead={() => {
          if (user) {
            api.getNotificaciones(user.usuario).then((r) => setUnreadNotifications(r.no_leidas || 0));
          }
        }}
      />
      <SugerenciasModal
        isOpen={isSugerenciasOpen}
        onClose={() => setIsSugerenciasOpen(false)}
      />
    </div>
  );
}
