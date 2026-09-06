'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DetalleCursoResponse, ComponenteDetalle, SubComponente } from '@/types/grades';
import { toTitleCase, gradeColor, formatNota, isPendiente } from '@/lib/format-utils';
import {
  X,
  RefreshCw,
  AlertCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Calculator,
  Layers,
} from 'lucide-react';

interface GradeDetailModalProps {
  crn: string;
  cursoNombre: string;
  periodo: string;
  carrera?: string;
  onClose: () => void;
  onSendToCalculadora?: (notas: { ep1?: number; parcial?: number; ep2?: number; final?: number }) => void;
}

export const GradeDetailModal: React.FC<GradeDetailModalProps> = ({
  crn,
  cursoNombre,
  periodo,
  carrera = 'UG',
  onClose,
  onSendToCalculadora,
}) => {
  const [data, setData] = useState<DetalleCursoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchDetalle = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getDetalleCurso(crn, periodo, carrera);
        if (isMounted) {
          setData(res);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al obtener desglose de evaluaciones');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetalle();
    return () => {
      isMounted = false;
    };
  }, [crn, periodo, carrera]);

  const toggleExpand = (idx: number) => {
    setExpandedRows((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSendToCalc = () => {
    if (!onSendToCalculadora || !data) return;

    let ep1: number | undefined;
    let parcial: number | undefined;
    let ep2: number | undefined;
    let final: number | undefined;

    data.detalles.forEach((item) => {
      const nom = (item.nombre || item.componente || '').toUpperCase();
      const n = item.nota ?? item.score ?? item.grade ?? item.puntaje_obtenido;
      const num = typeof n === 'number' ? n : parseFloat(String(n));

      if (!isNaN(num)) {
        if (nom.includes('EP1')) ep1 = num;
        else if (nom.includes('PARCIAL')) parcial = num;
        else if (nom.includes('EP2')) ep2 = num;
        else if (nom.includes('FINAL')) final = num;
      }
    });

    onSendToCalculadora({ ep1, parcial, ep2, final });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#232d3f] rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                NRC {crn}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Periodo {periodo}</span>
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white line-clamp-1">
              {toTitleCase(cursoNombre)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">Consultando componentes de Banner...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2.5 p-3.5 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Tarjeta de Nota Proyectada */}
              {data.nota_proyectada !== undefined && data.nota_proyectada !== null && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Nota Proyectada: {formatNota(data.nota_proyectada)}
                      </h4>
                      {data.pesos_pendientes && data.pesos_pendientes.length > 0 && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Por evaluar: {data.pesos_pendientes.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {formatNota(data.nota_proyectada)}
                  </span>
                </div>
              )}

              {/* Lista de Componentes */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Componentes ({data.detalles.length})
                </span>

                {data.detalles.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">
                    No hay componentes de evaluación registrados para este curso.
                  </p>
                ) : (
                  data.detalles.map((comp: ComponenteDetalle, idx: number) => {
                    const nombre = toTitleCase(
                      comp.nombre || comp.description || comp.componente || `Componente ${idx + 1}`
                    );
                    const nota = comp.nota ?? comp.grade ?? comp.score ?? comp.puntaje_obtenido;
                    const peso = comp.peso ?? comp.weight;
                    const colorNota = gradeColor(nota);
                    const hasSub = comp.hasSubComponents && comp.subcomponentes && comp.subcomponentes.length > 0;
                    const isExpanded = !!expandedRows[idx];

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 overflow-hidden transition"
                      >
                        <div
                          onClick={() => hasSub && toggleExpand(idx)}
                          className={`p-3.5 flex items-center justify-between gap-3 ${
                            hasSub ? 'cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/50' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {nombre}
                              </span>
                              {peso !== undefined && peso !== null && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                                  {peso}%
                                </span>
                              )}
                            </div>
                            {comp.codigo && (
                              <span className="text-[10px] text-slate-400 mt-0.5 block">
                                Código: {comp.codigo}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-right">
                            <span
                              className="text-base font-black"
                              style={{ color: colorNota }}
                            >
                              {formatNota(nota)}
                            </span>
                            {hasSub && (
                              <button
                                type="button"
                                className="p-1 text-slate-400 hover:text-slate-600"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Subcomponentes expandibles */}
                        {hasSub && isExpanded && (
                          <div className="px-3.5 pb-3 pt-1 space-y-1.5 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/20">
                            {comp.subcomponentes!.map((sub: SubComponente, sIdx: number) => {
                              const sNom = toTitleCase(
                                sub.nombre || sub.description || sub.componente || `Sub ${sIdx + 1}`
                              );
                              const sNota = sub.nota ?? sub.grade ?? sub.score ?? sub.puntaje_obtenido;
                              return (
                                <div
                                  key={sIdx}
                                  className="flex items-center justify-between text-xs py-1 text-slate-600 dark:text-slate-400 pl-3 border-l-2 border-slate-300 dark:border-slate-700"
                                >
                                  <span>
                                    {sNom}{' '}
                                    {sub.peso && <span className="text-[10px] text-slate-400">({sub.peso}%)</span>}
                                  </span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {formatNota(sNota)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
          {onSendToCalculadora && data && (
            <button
              onClick={handleSendToCalc}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition"
            >
              <Calculator className="w-4 h-4" />
              <span>Simular en Calculadora</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
