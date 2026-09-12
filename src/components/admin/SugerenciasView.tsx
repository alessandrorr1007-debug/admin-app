'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { AdminSugerencia, SugerenciaEstado } from '@/types/admin';
import {
  MessageSquare,
  RefreshCw,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
} from 'lucide-react';

interface SugerenciasViewProps {
  onPendingCountChange?: (count: number) => void;
}

export function SugerenciasView({ onPendingCountChange }: SugerenciasViewProps) {
  const [sugerencias, setSugerencias] = useState<AdminSugerencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('todas');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchSugerencias = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getAdminSugerencias();
      const list = data.sugerencias || [];
      setSugerencias(list);
      const pendingCount = list.filter((s) => s.estado === 'pendiente').length;
      if (onPendingCountChange) onPendingCountChange(pendingCount);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar sugerencias';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSugerencias();
  }, []);

  const handleCambiarEstado = async (id: number, nuevoEstado: SugerenciaEstado) => {
    setUpdatingId(id);
    try {
      await api.patchEstadoSugerencia(id, nuevoEstado);
      setSugerencias((prev) =>
        prev.map((s) => (s.id === id ? { ...s, estado: nuevoEstado } : s))
      );
      const pendingCount = sugerencias
        .map((s) => (s.id === id ? { ...s, estado: nuevoEstado } : s))
        .filter((s) => s.estado === 'pendiente').length;
      if (onPendingCountChange) onPendingCountChange(pendingCount);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar estado';
      alert(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (filterEstado === 'todas') return sugerencias;
    return sugerencias.filter((s) => s.estado === filterEstado);
  }, [sugerencias, filterEstado]);

  const pendientesCount = sugerencias.filter((s) => s.estado === 'pendiente').length;

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>Pendiente</span>
          </span>
        );
      case 'visto':
      case 'en_revision':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Eye className="w-3 h-3" />
            <span>En Revisión</span>
          </span>
        );
      case 'resuelto':
      case 'aprobada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            <span>Aprobada</span>
          </span>
        );
      case 'descartado':
      case 'rechazada':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3" />
            <span>{estado === 'rechazada' ? 'Rechazada' : 'Descartado'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
            <span>Buzón de Sugerencias ({sugerencias.length})</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Comentarios, reportes y sugerencias recibidas de los estudiantes
          </p>
        </div>

        <button
          onClick={fetchSugerencias}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Tabs de Filtro */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterEstado('todas')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            filterEstado === 'todas'
              ? 'bg-indigo-600 text-white shadow'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Todas ({sugerencias.length})
        </button>
        <button
          onClick={() => setFilterEstado('pendiente')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            filterEstado === 'pendiente'
              ? 'bg-amber-600 text-white shadow'
              : 'bg-slate-800 text-amber-400 hover:text-amber-300'
          }`}
        >
          <span>Pendientes</span>
          {pendientesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-200 text-[10px] font-bold">
              {pendientesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilterEstado('visto')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            filterEstado === 'visto'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-slate-800 text-blue-400 hover:text-blue-300'
          }`}
        >
          Vistas ({sugerencias.filter((s) => s.estado === 'visto').length})
        </button>
        <button
          onClick={() => setFilterEstado('resuelto')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            filterEstado === 'resuelto'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-slate-800 text-emerald-400 hover:text-emerald-300'
          }`}
        >
          Resueltas ({sugerencias.filter((s) => s.estado === 'resuelto').length})
        </button>
        <button
          onClick={() => setFilterEstado('descartado')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            filterEstado === 'descartado'
              ? 'bg-slate-700 text-white shadow'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Descartadas ({sugerencias.filter((s) => s.estado === 'descartado').length})
        </button>
      </div>

      {/* Lista de Sugerencias */}
      {isLoading ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
          <span>Cargando buzón de sugerencias...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-base font-semibold text-slate-300">No hay sugerencias en esta categoría</p>
          <p className="text-xs text-slate-400 mt-1">Los nuevos comentarios de los alumnos aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((sug) => {
            const isUpdating = updatingId === sug.id;

            return (
              <div
                key={sug.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-mono text-xs font-semibold text-white">
                        Estudiante: {sug.usuario_banner || sug.usuario || 'Anónimo'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {sug.fecha || sug.fecha_creacion
                          ? new Date(sug.fecha || sug.fecha_creacion!).toLocaleString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Fecha no disponible'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(sug.estado)}
                  </div>
                </div>

                <div className="py-4">
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {sug.texto}
                  </p>
                </div>

                {/* Acciones de estado */}
                <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 font-medium">Cambiar estado:</span>

                  <div className="flex items-center gap-2">
                    {sug.estado !== 'visto' && (
                      <button
                        onClick={() => handleCambiarEstado(sug.id, 'visto')}
                        disabled={isUpdating}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Marcar Visto
                      </button>
                    )}

                    {sug.estado !== 'resuelto' && (
                      <button
                        onClick={() => handleCambiarEstado(sug.id, 'resuelto')}
                        disabled={isUpdating}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Marcar Resuelto
                      </button>
                    )}

                    {sug.estado !== 'descartado' && (
                      <button
                        onClick={() => handleCambiarEstado(sug.id, 'descartado')}
                        disabled={isUpdating}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Descartar
                      </button>
                    )}

                    {sug.estado !== 'pendiente' && (
                      <button
                        onClick={() => handleCambiarEstado(sug.id, 'pendiente')}
                        disabled={isUpdating}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
