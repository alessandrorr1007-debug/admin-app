'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AdminSemanaResponse } from '@/types/admin';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Info,
} from 'lucide-react';

export function SemanaView() {
  const [semanaInfo, setSemanaInfo] = useState<AdminSemanaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');

  const fetchSemana = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSemana();
      setSemanaInfo(data as AdminSemanaResponse);
      if (data.fecha_inicio) {
        setNuevaFecha(data.fecha_inicio);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar semana académica';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSemana();
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFecha) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.postAdminSemana(nuevaFecha);
      setSemanaInfo(res);
      setSuccessMessage('Fecha de inicio del ciclo actualizada correctamente');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al configurar semana';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-indigo-400" />
            <span>Configuración de Semana Académica</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Establece la fecha oficial de inicio del ciclo para calcular la semana universitaria
          </p>
        </div>

        <button
          onClick={fetchSemana}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Estado Actual del Ciclo */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>Estado Actual del Ciclo</span>
        </h2>

        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
            <span>Consultando estado...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Semana Actual
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {semanaInfo?.etiqueta || 'No configurada'}
                </span>
                {semanaInfo?.semana && (
                  <span className="text-xs text-slate-400">
                    de {semanaInfo.total_semanas || 16}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {semanaInfo?.fuera_de_ciclo ? 'Periodo intersemestral o vacaciones' : 'Ciclo en curso'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Fecha Inicio Configurada
              </span>
              <div className="mt-2">
                <span className="text-2xl font-bold text-white font-mono">
                  {semanaInfo?.fecha_inicio || 'Sin definir'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Lunes oficial de inicio de clases</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Días Transcurridos
              </span>
              <div className="mt-2">
                <span className="text-2xl font-bold text-white">
                  {semanaInfo?.dias_transcurridos ?? '—'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Días desde el inicio del semestre</p>
            </div>
          </div>
        )}
      </div>

      {/* Formulario de Configuración */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-white mb-2">Modificar Fecha de Inicio</h2>
        <p className="text-xs text-slate-400 mb-6">
          Ingresa la fecha de inicio del ciclo (generalmente el primer lunes del semestre). Todas las
          aplicaciones de los estudiantes sincronizarán automáticamente este cálculo.
        </p>

        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Fecha de Inicio del Ciclo (YYYY-MM-DD)
            </label>
            <input
              type="date"
              required
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="w-full sm:w-80 px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || !nuevaFecha}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Establecer Fecha Oficial'}</span>
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Ejemplo: Si el ciclo 2026-I inició el <strong>6 de abril de 2026</strong>, ingresa{' '}
            <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded font-mono">2026-04-06</code>.
            El sistema calculará automáticamente la semana del 1 al 16 para todos los estudiantes.
          </p>
        </div>
      </div>
    </div>
  );
}
