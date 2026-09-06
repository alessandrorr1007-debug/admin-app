'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { HorarioResponse, HorarioCurso, HorarioBloque } from '@/types/horario';
import {
  toTitleCase,
  cursoColor,
  detectarPeriodoActual,
} from '@/lib/format-utils';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  RefreshCw,
  AlertCircle,
  Grid,
  List,
  WifiOff,
  Sparkles,
  BookOpen,
} from 'lucide-react';

const NOMBRES_DIAS = [
  { index: 0, nombre: 'Lunes', short: 'LUN' },
  { index: 1, nombre: 'Martes', short: 'MAR' },
  { index: 2, nombre: 'Miércoles', short: 'MIÉ' },
  { index: 3, nombre: 'Jueves', short: 'JUE' },
  { index: 4, nombre: 'Viernes', short: 'VIE' },
  { index: 5, nombre: 'Sábado', short: 'SÁB' },
];

function diaHoy(): number {
  const d = new Date().getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
  return (d + 6) % 7; // 0: Lun, 1: Mar, ..., 5: Sab, 6: Dom
}

function minutosAhora(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function minutosDe(hhmm?: string | null): number | null {
  if (!hhmm || !hhmm.includes(':')) return null;
  const parts = hhmm.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

interface ProximaClaseInfo {
  curso: HorarioCurso;
  bloque: HorarioBloque;
  diasRestantes: number;
  esAhora: boolean;
  inicio: number;
}

function calcularProximaClase(cursos: HorarioCurso[]): ProximaClaseInfo | null {
  const hoy = diaHoy();
  const ahora = minutosAhora();
  let mejor: ProximaClaseInfo | null = null;

  for (const curso of cursos) {
    for (const bloque of curso.bloques || []) {
      // Normalizar día (1-indexed en backend o 0-indexed)
      const diaRaw = bloque.dia ?? 1;
      const dia = diaRaw > 0 && diaRaw <= 7 ? diaRaw - 1 : diaRaw;

      const inicio = minutosDe(bloque.hora_inicio);
      if (inicio === null) continue;
      const fin = minutosDe(bloque.hora_fin) ?? inicio;

      const restantes = (dia - hoy + 7) % 7;
      const esAhora = restantes === 0 && inicio <= ahora && ahora < fin;

      if (esAhora) {
        return { curso, bloque, diasRestantes: restantes, esAhora: true, inicio };
      }

      if (restantes === 0 && inicio <= ahora) continue;

      const candidato: ProximaClaseInfo = {
        curso,
        bloque,
        diasRestantes: restantes,
        esAhora: false,
        inicio,
      };

      if (
        !mejor ||
        restantes < mejor.diasRestantes ||
        (restantes === mejor.diasRestantes && inicio < mejor.inicio)
      ) {
        mejor = candidato;
      }
    }
  }

  return mejor;
}

export const HorarioView: React.FC = () => {
  const { user, isAuthenticated, openLoginModal } = useAuth();

  const [periodos, setPeriodos] = useState<string[]>(['202610']);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('202610');
  const [cursos, setCursos] = useState<HorarioCurso[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoyIndex = useMemo(() => diaHoy(), []);
  const [selectedDia, setSelectedDia] = useState<number>(hoyIndex < 6 ? hoyIndex : 0);
  const [viewMode, setViewMode] = useState<'dia' | 'semana'>('dia');

  const claveCache = useMemo(
    () => `horario_${user?.usuario || 'anonimo'}_${selectedPeriodo}`,
    [user?.usuario, selectedPeriodo]
  );

  // Aplicar caché local inmediato
  const aplicarCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem(claveCache);
      if (cached) {
        const body: HorarioResponse = JSON.parse(cached);
        if (body.cursos && body.cursos.length > 0) {
          setCursos(body.cursos);
        }
      }
    } catch (e) {
      console.error('Error al leer caché de horario:', e);
    }
  }, [claveCache]);

  const loadHorario = useCallback(
    async (term: string) => {
      setLoading(true);
      setError(null);
      setIsOfflineData(false);

      try {
        const res = await api.getHorario(term);
        setCursos(res.cursos || []);

        try {
          localStorage.setItem(`horario_${user?.usuario || 'anonimo'}_${term}`, JSON.stringify(res));
        } catch (e) {
          console.error(e);
        }
      } catch (err: unknown) {
        if (cursos.length > 0) {
          setIsOfflineData(true);
        } else {
          setError(err instanceof Error ? err.message : 'Error al consultar horario');
        }
      } finally {
        setLoading(false);
      }
    },
    [user?.usuario, cursos.length]
  );

  // Inicialización
  useEffect(() => {
    if (!isAuthenticated) return;
    aplicarCache();

    const init = async () => {
      try {
        const pRes = await api.getPeriodos();
        if (pRes.periodos && pRes.periodos.length > 0) {
          setPeriodos(pRes.periodos);
          const mejor = detectarPeriodoActual(pRes.periodos, pRes.periodo_actual);
          setSelectedPeriodo(mejor);
          loadHorario(mejor);
        } else {
          loadHorario(selectedPeriodo);
        }
      } catch {
        loadHorario(selectedPeriodo);
      }
    };

    init();
  }, [isAuthenticated, aplicarCache, loadHorario, selectedPeriodo]);

  const handlePeriodoChange = (term: string) => {
    setSelectedPeriodo(term);
    loadHorario(term);
  };

  // Próxima clase calculada en vivo
  const proximaClase = useMemo(() => calcularProximaClase(cursos), [cursos]);

  // Agrupación de bloques por día (0 = Lun, ..., 5 = Sáb)
  const clasesPorDia = useMemo(() => {
    const mapa: Record<number, Array<{ curso: HorarioCurso; bloque: HorarioBloque }>> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    cursos.forEach((curso) => {
      (curso.bloques || []).forEach((bloque) => {
        const dRaw = bloque.dia ?? 1;
        const d = dRaw > 0 && dRaw <= 7 ? dRaw - 1 : dRaw;
        if (d in mapa) {
          mapa[d].push({ curso, bloque });
        }
      });
    });

    // Ordenar cada día por hora de inicio
    Object.keys(mapa).forEach((key) => {
      const idx = Number(key);
      mapa[idx].sort((a, b) => {
        const minA = minutosDe(a.bloque.hora_inicio) || 0;
        const minB = minutosDe(b.bloque.hora_inicio) || 0;
        return minA - minB;
      });
    });

    return mapa;
  }, [cursos]);

  const clasesDelDiaSeleccionado = clasesPorDia[selectedDia] || [];

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="w-16 h-16 mb-4 rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
          <CalendarIcon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Horario Semanal UPAO
        </h3>
        <p className="max-w-md text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Inicia sesión para sincronizar tus bloques de clases, aulas asignadas y consultar cuál es tu próxima clase en tiempo real.
        </p>
        <button
          onClick={openLoginModal}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
        >
          Iniciar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Controles de Vista y Periodo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#161b26] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <select
              value={selectedPeriodo}
              onChange={(e) => handlePeriodoChange(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              {periodos.map((p) => (
                <option key={p} value={p} className="bg-white dark:bg-slate-900">
                  Periodo: {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle Por Día vs Semana Completa */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <button
            onClick={() => setViewMode('dia')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'dia'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Por Día</span>
          </button>
          <button
            onClick={() => setViewMode('semana')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'semana'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Semana Completa</span>
          </button>
        </div>
      </div>

      {/* Banner Sin Conexión */}
      {isOfflineData && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Sin conexión · Mostrando horario guardado</span>
        </div>
      )}

      {/* Tarjeta Próxima Clase (idéntica a ProximaClaseCard de Android) */}
      {proximaClase && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/5 border border-blue-500/20 text-slate-900 dark:text-white flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: cursoColor(proximaClase.curso.nombre) }}
            />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {proximaClase.esAhora ? '• EN CURSO AHORA' : proximaClase.diasRestantes === 0 ? '• HOY' : `• ${proximaClase.bloque.dia_nombre || ''}`}
              </span>
              <span className="text-xs font-bold truncate">
                {toTitleCase(proximaClase.curso.nombre)}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {proximaClase.bloque.hora_inicio_12h || proximaClase.bloque.hora_inicio}
            </span>
          </div>
        </div>
      )}

      {/* Selector de Días (cuando está en modo 'dia') */}
      {viewMode === 'dia' && (
        <div className="grid grid-cols-6 gap-2">
          {NOMBRES_DIAS.map((d) => {
            const isSelected = selectedDia === d.index;
            const isToday = d.index === hoyIndex;
            const cant = clasesPorDia[d.index]?.length || 0;

            return (
              <button
                key={d.index}
                type="button"
                onClick={() => setSelectedDia(d.index)}
                className={`py-2.5 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-[#161b26] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold">{d.short}</span>
                  {isToday && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-300' : 'bg-blue-600'
                      }`}
                      title="Hoy"
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {cant}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Estados de Carga y Error */}
      {loading && cursos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-xs">Consultando horario desde Banner UPAO...</p>
        </div>
      )}

      {error && cursos.length === 0 && (
        <div className="flex items-center gap-3 p-4 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Contenido: Modo Día */}
      {!loading && viewMode === 'dia' && (
        <div className="space-y-3">
          {clasesDelDiaSeleccionado.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#161b26] border border-slate-200 dark:border-slate-800 rounded-3xl">
              <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Sin clases programadas
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                No tienes asignaturas registradas para este día de la semana.
              </p>
            </div>
          ) : (
            clasesDelDiaSeleccionado.map((item, idx) => {
              const cursoColorCode = cursoColor(item.curso.nombre);
              const codMateria = [item.curso.codigo_materia, item.curso.numero_curso].filter(Boolean).join(' ');
              const hora = [
                item.bloque.hora_inicio_12h || item.bloque.hora_inicio,
                item.bloque.hora_fin_12h || item.bloque.hora_fin,
              ].filter(Boolean).join(' - ');

              return (
                <div
                  key={idx}
                  className="flex rounded-2xl bg-white dark:bg-[#161b26] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-200 dark:hover:border-blue-900/50 transition overflow-hidden"
                >
                  {/* Barra lateral de color del curso */}
                  <div
                    className="w-1.5 shrink-0"
                    style={{ backgroundColor: cursoColorCode }}
                  />

                  <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {item.curso.crn && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            NRC {item.curso.crn}
                          </span>
                        )}
                        {codMateria && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {codMateria}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {toTitleCase(item.curso.nombre)}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{hora}</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        <span>{item.bloque.aula || 'Aula por asignar'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Contenido: Modo Semana Completa (Semana Grid) */}
      {!loading && viewMode === 'semana' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {NOMBRES_DIAS.map((dia) => {
            const clases = clasesPorDia[dia.index] || [];
            const esHoy = dia.index === hoyIndex;

            return (
              <div
                key={dia.index}
                className="flex flex-col p-4 bg-white dark:bg-[#161b26] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {dia.nombre}
                    </h4>
                    {esHoy && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" title="Hoy" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    {clases.length} {clases.length === 1 ? 'clase' : 'clases'}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {clases.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-6 text-center">
                      Sin clases este día
                    </p>
                  ) : (
                    clases.map((c, cIdx) => {
                      const color = cursoColor(c.curso.nombre);
                      const hora = [
                        c.bloque.hora_inicio_12h || c.bloque.hora_inicio,
                        c.bloque.hora_fin_12h || c.bloque.hora_fin,
                      ].filter(Boolean).join(' - ');

                      return (
                        <div
                          key={cIdx}
                          className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 text-xs flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {toTitleCase(c.curso.nombre)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pl-3.5">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {hora}
                            </span>
                            <span>{c.bloque.aula || 'Aula —'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
