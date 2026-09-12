'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { MetricasResponse } from '@/types/admin';
import {
  Users,
  TrendingUp,
  Award,
  RefreshCw,
  CalendarDays,
  Activity,
} from 'lucide-react';

export function MetricsView() {
  const [metricas, setMetricas] = useState<MetricasResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPunto, setHoveredPunto] = useState<{ fecha: string; activos: number } | null>(null);

  const fetchMetricas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getAdminMetricas();
      setMetricas(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar métricas';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricas();
  }, []);

  const maxDau = metricas?.dau_30_dias?.length
    ? Math.max(...metricas.dau_30_dias.map((d) => d.activos), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            <span>Métricas & Actividad (DAU)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Uso activo de estudiantes y picos de tráfico en los últimos 30 días
          </p>
        </div>

        <button
          onClick={fetchMetricas}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cuentas Activas Hoy
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white tracking-tight">
              {isLoading ? '...' : metricas?.cuentas_activas_hoy ?? 0}
            </span>
            <p className="text-xs text-slate-400 mt-1">Usuarios que interactuaron hoy</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pico de Tráfico Hoy
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white tracking-tight">
              {isLoading ? '...' : metricas?.pico_hoy ?? 0}
            </span>
            <p className="text-xs text-slate-400 mt-1">Máxima concurrencia del día</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pico Histórico
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white tracking-tight">
              {isLoading ? '...' : metricas?.pico_historico ?? 0}
            </span>
            <p className="text-xs text-slate-400 mt-1">Récord histórico registrado</p>
          </div>
        </div>
      </div>

      {/* DAU Chart Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-2">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              <span>Usuarios Activos Diarios (Últimos 30 días)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pasa el cursor sobre cada barra para ver los usuarios activos por fecha
            </p>
          </div>

          {hoveredPunto && (
            <div className="px-3 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-xs text-indigo-200">
              <span className="font-semibold text-white">{hoveredPunto.activos} usuarios</span> el{' '}
              {hoveredPunto.fecha}
            </div>
          )}
        </div>

        {/* Gráfico de barras interactivo */}
        <div className="mt-8 pt-4 pb-2">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
              <span>Cargando serie temporal...</span>
            </div>
          ) : !metricas?.dau_30_dias?.length ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Sin datos de actividad en este periodo.
            </div>
          ) : (
            <div className="h-64 flex items-end gap-1.5 sm:gap-2 px-2">
              {metricas.dau_30_dias.map((item, idx) => {
                const heightPercent = Math.max(
                  Math.round((item.activos / maxDau) * 100),
                  item.activos > 0 ? 8 : 2
                );
                const isHovered = hoveredPunto?.fecha === item.fecha;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredPunto(item)}
                    onMouseLeave={() => setHoveredPunto(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    <div className="w-full flex items-end justify-center h-52">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[20px] rounded-t-md transition-all duration-200 ${
                          isHovered
                            ? 'bg-indigo-400 shadow-lg shadow-indigo-500/50'
                            : item.activos > 0
                            ? 'bg-gradient-to-t from-indigo-700 to-indigo-500 group-hover:bg-indigo-400'
                            : 'bg-slate-800'
                        }`}
                      />
                    </div>
                    {/* Fecha reducida en eje X cada pocos días */}
                    <span className="text-[10px] text-slate-400 mt-2 rotate-45 sm:rotate-0 origin-left">
                      {idx % 5 === 0 ? item.fecha.slice(5) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
