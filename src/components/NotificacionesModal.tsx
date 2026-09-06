'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NotificacionItem } from '@/types/features';
import { tiempoRelativo, toTitleCase } from '@/lib/format-utils';
import {
  X,
  Bell,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  Clock,
  BookOpen,
} from 'lucide-react';

interface NotificacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationRead?: () => void;
}

export const NotificacionesModal: React.FC<NotificacionesModalProps> = ({
  isOpen,
  onClose,
  onNotificationRead,
}) => {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotificaciones = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getNotificaciones(user.usuario);
      setNotificaciones(res.notificaciones || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchNotificaciones();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleMarcarLeida = async (notif: NotificacionItem) => {
    if (notif.leida || !user) return;
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
    );
    try {
      await api.marcarNotificacionLeida(notif.id, user.usuario);
      onNotificationRead?.();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    if (!user) return;
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    try {
      await api.marcarNotificacionesLeidas(user.usuario);
      onNotificationRead?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#232d3f] rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Notificaciones
              </h3>
              <p className="text-xs text-slate-400">Cambios de notas e inasistencias</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {notificaciones.some((n) => !n.leida) && (
              <button
                onClick={handleMarcarTodasLeidas}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl font-medium transition"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar leídas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">Consultando notificaciones...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2.5 p-3.5 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && notificaciones.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Bell className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No tienes notificaciones
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Te avisaremos cuando haya nuevas notas o cambios en tu asistencia.
              </p>
            </div>
          )}

          {!loading &&
            notificaciones.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarcarLeida(n)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                  n.leida
                    ? 'bg-white dark:bg-[#12161f] border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-400'
                    : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40 text-slate-900 dark:text-white'
                }`}
              >
                {!n.leida && (
                  <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-600 shrink-0" />
                )}

                <div className="flex-1">
                  {n.curso && (
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      <BookOpen className="w-3 h-3" />
                      <span>{toTitleCase(n.curso)}</span>
                      {n.componente && <span className="opacity-70">({n.componente})</span>}
                    </div>
                  )}

                  <p className="text-xs leading-relaxed">{n.mensaje}</p>

                  {n.fecha_creacion && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-slate-400 font-medium">
                      <Clock className="w-2.5 h-2.5" />
                      {tiempoRelativo(n.fecha_creacion)}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
