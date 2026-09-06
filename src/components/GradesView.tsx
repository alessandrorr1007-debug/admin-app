'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CourseGrade, GradesResponse, PromedioPeriodoResponse } from '@/types/grades';
import { GradeDetailModal } from './GradeDetailModal';
import {
  toTitleCase,
  gradeColor,
  formatNota,
  formatPromedio,
  isPendiente,
  detectarPeriodoActual,
  tiempoRelativo,
} from '@/lib/format-utils';
import {
  GraduationCap,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Layers,
  ChevronRight,
  Calculator,
  Calendar,
  WifiOff,
  Clock,
  Sparkles,
} from 'lucide-react';

interface GradesViewProps {
  onOpenCalculadoraWith?: (notas: { ep1?: number; parcial?: number; ep2?: number; final?: number }) => void;
}

export const GradesView: React.FC<GradesViewProps> = ({ onOpenCalculadoraWith }) => {
  const { user, isAuthenticated, openLoginModal } = useAuth();

  const [periodos, setPeriodos] = useState<string[]>(['202610']);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('202610');
  const [carreras, setCarreras] = useState<string[]>(['UG']);
  const [selectedCarrera, setSelectedCarrera] = useState<string>('UG');

  const [cursos, setCursos] = useState<CourseGrade[]>([]);
  const [promedioGeneral, setPromedioGeneral] = useState<unknown>(null);
  const [promedioPeriodoRes, setPromedioPeriodoRes] = useState<PromedioPeriodoResponse | null>(null);
  const [notasProyectadas, setNotasProyectadas] = useState<Record<string, unknown>>({});
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal de detalle
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<{
    crn: string;
    nombre: string;
  } | null>(null);

  const claveCache = useMemo(() => `notas_${user?.usuario || 'anonimo'}`, [user?.usuario]);

  // Aplicar caché local de inmediato
  const aplicarCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const cachedStr = localStorage.getItem(claveCache);
      if (cachedStr) {
        const data: GradesResponse = JSON.parse(cachedStr);
        if (data.cursos && data.cursos.length > 0) {
          setCursos(data.cursos);
          setPromedioGeneral(data.promedio_general);
          setUltimaActualizacion(data.ultima_actualizacion || null);
          if (data.periodo) setSelectedPeriodo(data.periodo);
          if (data.carrera) setSelectedCarrera(data.carrera);
        }
      }
    } catch (e) {
      console.error('Error al leer caché local de notas:', e);
    }
  }, [claveCache]);

  // Cargar notas proyectadas en segundo plano para cursos con nota pendiente
  const cargarNotasProyectadas = useCallback(
    (cursosList: CourseGrade[], periodo: string, carrera: string) => {
      const pendientes = cursosList.filter((c) => isPendiente(c.nota_actual));
      if (pendientes.length === 0) return;

      pendientes.forEach(async (course) => {
        const crn = course.crn || course.courseReferenceNumber;
        if (!crn) return;

        try {
          const res = await api.getDetalleCurso(crn, periodo, carrera);
          if (res.success && res.nota_proyectada !== undefined && res.nota_proyectada !== null) {
            setNotasProyectadas((prev) => ({
              ...prev,
              [crn]: res.nota_proyectada,
            }));
          }
        } catch {
          // Mantener silencioso si no hay conexión
        }
      });
    },
    []
  );

  // Cargar PPS Oficial o Calculado
  const loadPromedioPPS = useCallback(async (periodo: string) => {
    try {
      const res = await api.getPromedioPeriodo(periodo);
      setPromedioPeriodoRes(res);
    } catch (e) {
      console.warn('No se pudo obtener PPS, usando promedio local como fallback:', e);
    }
  }, []);

  // Consultar notas principales
  const loadGrades = useCallback(
    async (periodo: string, carrera: string) => {
      setLoading(true);
      setError(null);
      setIsOfflineData(false);

      try {
        const res = await api.buscarNotas(periodo, carrera);
        setCursos(res.cursos || []);
        setPromedioGeneral(res.promedio_general);
        setUltimaActualizacion(res.ultima_actualizacion || null);

        // Guardar en caché
        try {
          localStorage.setItem(claveCache, JSON.stringify(res));
        } catch (e) {
          console.error(e);
        }

        // Cargar notas proyectadas para pendientes
        cargarNotasProyectadas(res.cursos || [], periodo, carrera);
      } catch (err: unknown) {
        if (cursos.length > 0) {
          setIsOfflineData(true);
        } else {
          setError(err instanceof Error ? err.message : 'Error al conectar con Banner');
        }
      } finally {
        setLoading(false);
      }

      loadPromedioPPS(periodo);
    },
    [claveCache, cargarNotasProyectadas, loadPromedioPPS, cursos.length]
  );

  // 1. Inicialización
  useEffect(() => {
    if (!isAuthenticated) return;
    aplicarCache();

    const init = async () => {
      try {
        const pRes = await api.getPeriodos();
        if (pRes.periodos && pRes.periodos.length > 0) {
          setPeriodos(pRes.periodos);
          const mejorPeriodo = detectarPeriodoActual(pRes.periodos, pRes.periodo_actual);
          setSelectedPeriodo(mejorPeriodo);

          const cRes = await api.getCarreras(mejorPeriodo);
          let defaultCarrera = 'UG';
          if (cRes.carreras && cRes.carreras.length > 0) {
            setCarreras(cRes.carreras);
            defaultCarrera = cRes.carreras[0];
            setSelectedCarrera(defaultCarrera);
          }

          loadGrades(mejorPeriodo, defaultCarrera);
        }
      } catch {
        loadGrades(selectedPeriodo, selectedCarrera);
      }
    };

    init();
  }, [isAuthenticated, aplicarCache, loadGrades, selectedPeriodo, selectedCarrera]);

  const handlePeriodoChange = async (p: string) => {
    setSelectedPeriodo(p);
    try {
      const cRes = await api.getCarreras(p);
      let carreraTarget = selectedCarrera;
      if (cRes.carreras && cRes.carreras.length > 0) {
        setCarreras(cRes.carreras);
        carreraTarget = cRes.carreras[0];
        setSelectedCarrera(carreraTarget);
      }
      loadGrades(p, carreraTarget);
    } catch {
      loadGrades(p, selectedCarrera);
    }
  };

  const handleSyncNow = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await api.actualizarNotasAhora(user.usuario);
      await loadGrades(selectedPeriodo, selectedCarrera);
    } catch (err: unknown) {
      console.error('Error al sincronizar:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Cálculo del Promedio Final PPS (igual que en PromedioCard de Android)
  const promedioData = useMemo(() => {
    const ppsOficial = promedioPeriodoRes?.pps_oficial;
    const ppsCalculado = promedioPeriodoRes?.pps_calculado;

    // Promedio local basado en notas actuales o proyectadas
    const notasValidas = cursos.map((c) => {
      const crn = c.crn || c.courseReferenceNumber || '';
      const nota = isPendiente(c.nota_actual) && notasProyectadas[crn] !== undefined
        ? notasProyectadas[crn]
        : c.nota_actual;
      const num = typeof nota === 'number' ? nota : parseFloat(String(nota).trim());
      return isNaN(num) ? null : num;
    }).filter((n): n is number => n !== null);

    const promedioLocal = notasValidas.length > 0
      ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length
      : null;

    let pFinal: number | null = null;
    let fuente = 'Sin notas registradas';

    if (ppsOficial !== undefined && ppsOficial !== null) {
      pFinal = ppsOficial;
      fuente = 'Oficial (Cuadro de Mérito)';
    } else if (ppsCalculado !== undefined && ppsCalculado !== null) {
      pFinal = ppsCalculado;
      fuente = 'Estimado (Notas × Créditos)';
    } else if (promedioGeneral !== null && !isPendiente(promedioGeneral)) {
      const g = typeof promedioGeneral === 'number' ? promedioGeneral : parseFloat(String(promedioGeneral));
      if (!isNaN(g)) {
        pFinal = g;
        fuente = 'Promedio del ciclo';
      }
    } else if (promedioLocal !== null) {
      pFinal = promedioLocal;
      fuente = 'Promedio del ciclo (estimado)';
    }

    return {
      valor: pFinal,
      texto: formatPromedio(pFinal),
      fuente,
      color: gradeColor(pFinal),
    };
  }, [promedioPeriodoRes, cursos, notasProyectadas, promedioGeneral]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="w-16 h-16 mb-4 rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Consulta de Notas UPAO
        </h3>
        <p className="max-w-md text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Inicia sesión con tu ID de estudiante y contraseña para consultar tus cursos matriculados, promedio acumulado y desglose de evaluaciones.
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
      {/* Barra de Filtros y Sincronización */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#161b26] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Periodo */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
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

          {/* Selector de Carrera */}
          {carreras.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <select
                value={selectedCarrera}
                onChange={(e) => {
                  setSelectedCarrera(e.target.value);
                  loadGrades(selectedPeriodo, e.target.value);
                }}
                className="bg-transparent text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                {carreras.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900">
                    Carrera: {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Botón sincronizar */}
        <button
          onClick={handleSyncNow}
          disabled={syncing || loading}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition border border-blue-200/60 dark:border-blue-900/40 disabled:opacity-50 cursor-pointer"
          title="Forzar actualización en vivo desde Banner"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Sincronizando...' : 'Actualizar Notas'}</span>
        </button>
      </div>

      {/* Banner de datos en caché / sin conexión */}
      {isOfflineData && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Sin conexión activa · Mostrando información guardada localmente</span>
        </div>
      )}

      {/* Tarjeta de Promedio PPS (igual a PromedioCard de Android) */}
      {(promedioData.valor !== null || cursos.length > 0) && (
        <div className="p-5 rounded-3xl bg-white dark:bg-[#161b26] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-slate-900 dark:text-white">
              Ponderado
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {promedioData.fuente}
            </p>
          </div>

          <div className="text-right">
            <span
              className="text-2xl sm:text-3xl font-black"
              style={{ color: promedioData.texto !== '--' ? promedioData.color : undefined }}
            >
              {promedioData.texto}
            </span>
            {promedioData.texto !== '--' && (
              <span className="text-xs text-slate-400 ml-1 font-semibold">/ 20</span>
            )}
          </div>
        </div>
      )}

      {/* Timestamp última actualización */}
      {ultimaActualizacion && !error && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
          <Clock className="w-3 h-3" />
          <span>Última sincronización: {tiempoRelativo(ultimaActualizacion)}</span>
        </div>
      )}

      {/* Estados de Carga y Error */}
      {loading && cursos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-xs">Consultando notas desde Banner UPAO...</p>
        </div>
      )}

      {error && cursos.length === 0 && (
        <div className="flex items-center gap-3 p-4 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Listado de Cursos */}
      {cursos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {cursos.map((curso: CourseGrade, idx: number) => {
            const nombre = toTitleCase(
              curso.nombre || curso.courseTitle || curso.subjectDescription || 'Curso'
            );
            const crn = curso.crn || curso.courseReferenceNumber || '';
            const notaProy = notasProyectadas[crn];
            const notaMostrar = isPendiente(curso.nota_actual) && notaProy !== undefined
              ? notaProy
              : curso.nota_actual;

            const colorNota = gradeColor(notaMostrar);
            const notaFormatted = formatNota(notaMostrar);

            const ep1Nota = curso.ep1?.nota;
            const ep2Nota = curso.ep2?.nota;

            return (
              <div
                key={crn || idx}
                onClick={() => setSelectedCourseForDetail({ crn, nombre })}
                className="flex rounded-2xl bg-white dark:bg-[#161b26] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-900/50 cursor-pointer transition overflow-hidden group"
              >
                {/* Banda vertical de color a la izquierda (idéntica a CourseGradeCard de Android) */}
                <div
                  className="w-1.5 shrink-0 transition-colors"
                  style={{ backgroundColor: colorNota }}
                />

                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {nombre}
                        </h4>
                        {crn && (
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                            NRC {crn}
                          </span>
                        )}
                      </div>

                      {/* Calificación */}
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          {isPendiente(curso.nota_actual) && notaProy !== undefined ? 'PROYECTADA' : 'NOTA'}
                        </span>
                        <span
                          className="text-lg font-black"
                          style={{ color: colorNota }}
                        >
                          {notaFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Evaluaciones parciales EP1 y EP2 */}
                    {(ep1Nota !== undefined || ep2Nota !== undefined) && (
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        <div className="flex items-center justify-between text-slate-500 px-1">
                          <span className="text-[10px]">EP1:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatNota(ep1Nota)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 px-1">
                          <span className="text-[10px]">EP2:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatNota(ep2Nota)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                      <span>Ver evaluaciones</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>

                    {onOpenCalculadoraWith && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const ep1Num = ep1Nota ? parseFloat(String(ep1Nota)) : undefined;
                          const ep2Num = ep2Nota ? parseFloat(String(ep2Nota)) : undefined;
                          onOpenCalculadoraWith({
                            ep1: isNaN(ep1Num!) ? undefined : ep1Num,
                            ep2: isNaN(ep2Num!) ? undefined : ep2Num,
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                        title="Simular en Calculadora"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle */}
      {selectedCourseForDetail && (
        <GradeDetailModal
          crn={selectedCourseForDetail.crn}
          cursoNombre={selectedCourseForDetail.nombre}
          periodo={selectedPeriodo}
          carrera={selectedCarrera}
          onClose={() => setSelectedCourseForDetail(null)}
          onSendToCalculadora={onOpenCalculadoraWith}
        />
      )}
    </div>
  );
};
