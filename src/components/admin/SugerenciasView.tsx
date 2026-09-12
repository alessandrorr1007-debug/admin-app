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
  Search,
  X,
  Copy,
  Check,
  Filter,
} from 'lucide-react';

interface SugerenciasViewProps {
  onPendingCountChange?: (count: number) => void;
}

export function SugerenciasView({ onPendingCountChange }: SugerenciasViewProps) {
  const [sugerencias, setSugerencias] = useState<AdminSugerencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todas');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopy = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

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
    return sugerencias.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      const user = (s.usuario_banner || s.usuario || '').toLowerCase();
      const texto = (s.texto || '').toLowerCase();

      const matchesSearch = !query || user.includes(query) || texto.includes(query);
      if (!matchesSearch) return false;

      if (filterEstado === 'todas') return true;
      if (filterEstado === 'pendiente') return s.estado === 'pendiente';
      if (filterEstado === 'revision') return s.estado === 'en_revision' || s.estado === 'visto';
      if (filterEstado === 'aprobada') return s.estado === 'aprobada' || s.estado === 'resuelto';
      if (filterEstado === 'rechazada') return s.estado === 'rechazada' || s.estado === 'descartado';
      return true;
    });
  }, [sugerencias, filterEstado, searchQuery]);

  const pendientesCount = sugerencias.filter((s) => s.estado === 'pendiente').length;

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10">
            <Clock className="w-3.5 h-3.5" />
            <span>Pendiente</span>
          </span>
        );
      case 'visto':
      case 'en_revision':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 shadow-sm shadow-blue-500/10">
            <Eye className="w-3.5 h-3.5" />
            <span>En Revisión</span>
          </span>
        );
      case 'resuelto':
      case 'aprobada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Aprobada</span>
          </span>
        );
      case 'descartado':
      case 'rechazada':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/90 text-slate-400 border border-slate-700">
            <XCircle className="w-3.5 h-3.5" />
            <span>{estado === 'rechazada' ? 'Rechazada' : 'Descartada'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Buzón de Sugerencias</span>
              {pendientesCount > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                  {pendientesCount} por revisar
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Comentarios, feedback y reportes directos de los estudiantes en la app
            </p>
          </div>
        </div>

        <button
          onClick={fetchSugerencias}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchSugerencias} className="underline text-xs font-medium cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 space-y-3.5 backdrop-blur-sm">
        {/* Buscador */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código de alumno o palabra clave en el mensaje..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Chips de Estado */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Estado:
          </span>
          <button
            onClick={() => setFilterEstado('todas')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              filterEstado === 'todas'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todas ({sugerencias.length})
          </button>
          <button
            onClick={() => setFilterEstado('pendiente')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              filterEstado === 'pendiente'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-amber-400 hover:text-amber-300 hover:bg-slate-800'
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
            onClick={() => setFilterEstado('revision')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              filterEstado === 'revision'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-blue-400 hover:text-blue-300 hover:bg-slate-800'
            }`}
          >
            En Revisión ({sugerencias.filter((s) => s.estado === 'en_revision' || s.estado === 'visto').length})
          </button>
          <button
            onClick={() => setFilterEstado('aprobada')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              filterEstado === 'aprobada'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
            }`}
          >
            Aprobadas ({sugerencias.filter((s) => s.estado === 'aprobada' || s.estado === 'resuelto').length})
          </button>
          <button
            onClick={() => setFilterEstado('rechazada')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              filterEstado === 'rechazada'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Rechazadas ({sugerencias.filter((s) => s.estado === 'rechazada' || s.estado === 'descartado').length})
          </button>
        </div>
      </div>

      {/* Lista de Sugerencias */}
      {isLoading ? (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-16 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-amber-400" />
          <span className="text-sm font-medium">Cargando buzón de sugerencias...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-16 text-center text-slate-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-base font-semibold text-slate-300">No hay sugerencias en esta vista</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery
              ? `No hay coincidencias con "${searchQuery}"`
              : 'Los nuevos comentarios de los estudiantes aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((sug) => {
            const isUpdating = updatingId === sug.id;
            const studentId = sug.usuario_banner || sug.usuario || 'Anónimo';
            const dateVal = sug.fecha || sug.fecha_creacion;

            return (
              <div
                key={sug.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 shadow-sm transition-all backdrop-blur-sm"
              >
                {/* Header del Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-indigo-300 font-semibold text-xs border border-slate-700/60 shadow-inner shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {studentId}
                        </span>
                        {studentId !== 'Anónimo' && (
                          <button
                            onClick={(e) => handleCopy(studentId, e)}
                            className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                            title="Copiar ID"
                          >
                            {copiedId === studentId ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>
                          {dateVal
                            ? new Date(dateVal).toLocaleString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Fecha no disponible'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(sug.estado)}
                  </div>
                </div>

                {/* Mensaje del Alumno */}
                <div className="py-4">
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {sug.texto}
                  </div>
                </div>

                {/* Acciones de estado */}
                <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2.5">
                  <span className="text-xs text-slate-400 font-medium">Gestionar estado:</span>

                  <div className="flex items-center gap-2">
                    {sug.estado !== 'aprobada' && sug.estado !== 'resuelto' && (
                      <button
                        onClick={() => handleCambiarEstado(sug.id, 'aprobada')}
                        disabled={isUpdating}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    )}

                    {sug.estado !== 'en_revision' && sug.estado !== 'visto' && (
                      <button
                        onClick={() => handleCambiarEstado(sug.id, 'en_revision')}
                        disabled={isUpdating}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        En Revisión
                      </button>
                    )}

                    {sug.estado !== 'rechazada' && sug.estado !== 'descartado' && (
                      <button
                        onClick={() => handleCambiarEstado(sug.id, 'rechazada')}
                        disabled={isUpdating}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    )}

                    {sug.estado !== 'pendiente' && (
                      <button
                        onClick={() => handleCambiarEstado(sug.id, 'pendiente')}
                        disabled={isUpdating}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Reabrir a Pendiente
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
