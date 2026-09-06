'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AsistenciaResponse, AsistenciaCurso, AsistenciaComponente } from '@/types/asistencia';
import { HorarioCurso, HorarioResponse } from '@/types/horario';
import {
  toTitleCase,
  cursoColor,
  detectarPeriodoActual,
} from '@/lib/format-utils';
import { clasificarTipo, contarDiasHorario } from '@/lib/attendance-utils';
import {
  ClipboardCheck,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Flame,
  ShieldCheck,
  WifiOff,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';

const DAY_NAMES = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S'];

function sinAcentos(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function diasActivos(horario?: string | null): Set<number> {
  if (!horario) return new Set();
  const h = sinAcentos(horario);
  const set = new Set<number>();
  DAY_NAMES.forEach((day, index) => {
    if (h.includes(day)) set.add(index);
  });
  return set;
}

function normalizarNombre(nombre: string): string {
  return sinAcentos(nombre)
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function limpiarNombreCurso(nombre: string): string {
  return sinAcentos(nombre)
    .replace(/^[A-Z]{2,6}[-\s]?\d{0,4}\s*/i, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cursoCoincideConHorario(reg: AsistenciaCurso, cursoH: HorarioCurso): boolean {
  const crnR = reg.crn?.trim() || '';
  const crnH = cursoH.crn?.trim() || '';

  // 1. Coincidencia directa por CRN
  if (crnR && crnH && crnR === crnH) return true;

  // 2. Coincidencia por código de materia COMPLETO con número (ej: ISIA 109 vs ISIA 109 ó ISIA-109)
  const numH = cursoH.numero_curso?.trim() || '';
  const codH = (cursoH.codigo_materia || '').trim().toUpperCase();
  const codCompletoH = (codH + numH).replace(/[^A-Z0-9]/g, '');

  const codR = (reg.codigo_materia || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tieneDigitoH = /\d/.test(codCompletoH);
  const tieneDigitoR = /\d/.test(codR);
  if (tieneDigitoH && tieneDigitoR && codCompletoH === codR) {
    return true;
  }

  // 3. Coincidencia por Nombre de Curso
  const nomR = normalizarNombre(reg.nombre_curso || reg.materia || '');
  const nomH = normalizarNombre(cursoH.nombre || '');
  if (!nomR || !nomH) return false;

  if (nomR === nomH) return true;

  const limpioR = limpiarNombreCurso(nomR);
  const limpioH = limpiarNombreCurso(nomH);

  if (limpioR && limpioH) {
    if (limpioR === limpioH) return true;
    if (limpioR.length >= 6 && limpioH.length >= 6) {
      if (limpioR.includes(limpioH) || limpioH.includes(limpioR)) return true;
    }
  }

  if (limpioH.length >= 6 && nomR.includes(limpioH)) return true;
  if (limpioR.length >= 6 && nomH.includes(limpioR)) return true;

  return false;
}

function formatPct(pct: number): string {
  const r = Math.round(pct * 10) / 10;
  return r % 1 === 0 ? r.toString() : r.toFixed(1);
}

function estadoAsistencia(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: 'Óptimo', color: '#16A34A' };
  if (pct >= 70) return { label: 'Aceptable', color: '#D97706' };
  return { label: 'En riesgo', color: '#DC2626' };
}

// Algoritmo procesarCursosAsistencia basado exactamente en el Horario del ciclo matriculado
function procesarCursosAsistencia(
  registros: AsistenciaCurso[],
  horario: HorarioCurso[] = [],
  semanaActual?: number | null
): AsistenciaCurso[] {
  if (registros.length === 0 && horario.length === 0) return [];

  // 1. Estimar semanas transcurridas
  const semanasDetectadas: number[] = [];
  for (const r of registros) {
    const f = r.faltas ?? 0;
    const p = r.porcentaje ?? 0;
    if (f > 0 && p > 0 && p < 100) {
      const a = Math.round((p * f) / (100 - p));
      const total = a + f;
      const dias = Math.max(1, contarDiasHorario(r.horario_dias));
      const sem = Math.round(total / dias);
      if (sem >= 1 && sem <= 18) semanasDetectadas.push(sem);
    }
  }

  const semanasValidas =
    semanasDetectadas.length > 0
      ? semanasDetectadas.sort((a, b) => a - b)[Math.floor(semanasDetectadas.length / 2)]
      : (semanaActual && semanaActual >= 1 && semanaActual <= 18 ? semanaActual : 4);

  // 2. Si hay horario cargado, la lista de cursos a mostrar proviene DIRECTAMENTE de los cursos que el alumno tiene matriculados en su Horario
  if (horario.length > 0) {
    const registrosRestantes = [...registros];
    const resultado: AsistenciaCurso[] = [];

    for (const cursoH of horario) {
      // Buscar todos los registros de asistencia que coincidan con este curso del horario (Teoría + Laboratorio)
      const regsCoincidentes: AsistenciaCurso[] = [];
      for (let i = registrosRestantes.length - 1; i >= 0; i--) {
        const reg = registrosRestantes[i];
        if (cursoCoincideConHorario(reg, cursoH)) {
          regsCoincidentes.unshift(registrosRestantes.splice(i, 1)[0]);
        }
      }

      // Días y horarios obtenidos de los bloques del horario de este curso
      const diasDelHorario = cursoH.bloques
        ?.map((b) => b.dia_nombre)
        .filter(Boolean)
        .filter((d, idx, arr) => arr.indexOf(d) === idx)
        .join(', ');

      const horasDelHorario = cursoH.bloques
        ?.map((b) => b.hora_inicio_12h || b.hora_inicio)
        .filter(Boolean)
        .join(' / ');

      const aulasDelHorario = cursoH.bloques
        ?.map((b) => b.aula)
        .filter(Boolean)
        .filter((a, idx, arr) => arr.indexOf(a) === idx)
        .join(' / ');

      const nombreCursoFinal = cursoH.nombre || 'Curso';

      if (regsCoincidentes.length > 0) {
        // Ordenar componentes para que Teoría aparezca primero, luego Práctica, luego Laboratorio
        regsCoincidentes.sort((a, b) => {
          const tipoA = (a.tipo || a.tipo_componente || '').toUpperCase();
          const tipoB = (b.tipo || b.tipo_componente || '').toUpperCase();
          const rank = (t: string) => (t.includes('TEOR') ? 1 : t.includes('PRAC') ? 2 : 3);
          return rank(tipoA) - rank(tipoB);
        });

        // Mapear cada componente de asistencia (Teoría, Lab, Práctica)
        const componentes: AsistenciaComponente[] = regsCoincidentes.map((reg, index) => {
          const dias = reg.horario_dias || diasDelHorario;
          const diasCount = Math.max(1, contarDiasHorario(dias));
          const clasesEstimadas = semanasValidas * diasCount;

          const tipoClasificado = clasificarTipo(
            reg.tipo || reg.tipo_componente,
            reg.seccion,
            nombreCursoFinal,
            index,
            regsCoincidentes.length
          );

          const f = reg.faltas ?? 0;
          let asistenciasCalculadas = reg.asistencias ?? reg.veces_asistio;
          if (asistenciasCalculadas === undefined || asistenciasCalculadas === null) {
            const p = reg.porcentaje;
            if (p !== undefined && p !== null) {
              if (p <= 0) {
                asistenciasCalculadas = 0;
              } else if (f > 0 && p < 100) {
                asistenciasCalculadas = Math.max(0, Math.round((p * f) / (100 - p)));
              } else {
                asistenciasCalculadas = Math.max(1, (reg.total_clases && reg.total_clases > 0 ? reg.total_clases : clasesEstimadas) - f);
              }
            } else {
              asistenciasCalculadas = Math.max(1, clasesEstimadas - f);
            }
          }

          const totalClasesComp =
            reg.total_clases && reg.total_clases > 0
              ? reg.total_clases
              : asistenciasCalculadas + f > 0
              ? asistenciasCalculadas + f
              : clasesEstimadas;

          const compPorcentaje =
            reg.porcentaje !== undefined && reg.porcentaje !== null
              ? reg.porcentaje
              : totalClasesComp > 0
              ? Math.round((asistenciasCalculadas / totalClasesComp) * 100)
              : 100;

          const bloqueCorrespondiente = cursoH.bloques && cursoH.bloques[index];
          const horaComp = reg.hora_12h || reg.hora || (bloqueCorrespondiente ? (bloqueCorrespondiente.hora_inicio_12h || bloqueCorrespondiente.hora_inicio) : horasDelHorario);
          const aulaComp = reg.aula || bloqueCorrespondiente?.aula || aulasDelHorario;

          return {
            crn: reg.crn || cursoH.crn,
            seccion: reg.seccion,
            tipo: tipoClasificado,
            tipo_componente: tipoClasificado,
            porcentaje: compPorcentaje,
            faltas: f,
            asistencias: asistenciasCalculadas,
            veces_asistio: asistenciasCalculadas,
            total_clases: totalClasesComp,
            horario_dias: dias,
            hora: horaComp,
            hora_12h: horaComp,
            aula: aulaComp,
          };
        });

        const totalFaltasCurso = componentes.reduce((acc, c) => acc + (c.faltas ?? 0), 0);
        const totalAsistenciasCurso = componentes.reduce(
          (acc, c) => acc + (c.asistencias ?? c.veces_asistio ?? 0),
          0
        );
        const totalClasesCurso = componentes.reduce((acc, c) => acc + (c.total_clases ?? 0), 0);

        const porcentajeGlobal =
          totalClasesCurso > 0
            ? Math.round(((totalAsistenciasCurso / totalClasesCurso) * 100) * 10) / 10
            : componentes.length > 0
            ? Math.round((componentes.reduce((acc, c) => acc + (c.porcentaje ?? 100), 0) / componentes.length) * 10) / 10
            : 100;

        const todosLosDias = componentes
          .map((c) => c.horario_dias)
          .filter((d): d is string => !!d)
          .flatMap((d) => d.split(/[,·]/).map((s) => s.trim()))
          .filter((d, i, arr) => d.length > 0 && arr.indexOf(d) === i)
          .join(', ');

        const crnConsolidado = componentes
          .map((c) => c.crn)
          .filter(Boolean)
          .filter((c, i, arr) => arr.indexOf(c) === i)
          .join(' / ');

        const seccionConsolidada = componentes
          .map((c) => c.seccion)
          .filter(Boolean)
          .filter((s, i, arr) => arr.indexOf(s) === i)
          .join(' / ');

        resultado.push({
          crn: crnConsolidado || cursoH.crn,
          materia: nombreCursoFinal,
          codigo_materia: cursoH.codigo_materia,
          nombre_curso: nombreCursoFinal,
          seccion: seccionConsolidada || regsCoincidentes[0].seccion,
          periodo: regsCoincidentes.find((r) => r.periodo)?.periodo,
          faltas: totalFaltasCurso,
          asistencias: totalAsistenciasCurso,
          veces_asistio: totalAsistenciasCurso,
          total_clases: totalClasesCurso,
          porcentaje: porcentajeGlobal,
          horario_dias: todosLosDias || diasDelHorario,
          hora: horasDelHorario || regsCoincidentes[0].hora,
          hora_12h: horasDelHorario || regsCoincidentes[0].hora_12h,
          aula: aulasDelHorario || regsCoincidentes[0].aula,
          componentes,
          total_secciones: componentes.length,
        });
      } else {
        // El curso está en tu horario pero la API de Banner aún no registra inasistencias (100% de asistencia limpia)
        const diasCount = Math.max(1, contarDiasHorario(diasDelHorario));
        const clasesEstimadas = semanasValidas * diasCount;
        resultado.push({
          crn: cursoH.crn,
          materia: nombreCursoFinal,
          codigo_materia: cursoH.codigo_materia,
          nombre_curso: nombreCursoFinal,
          seccion: null,
          periodo: undefined,
          faltas: 0,
          asistencias: clasesEstimadas,
          veces_asistio: clasesEstimadas,
          total_clases: clasesEstimadas,
          porcentaje: 100,
          horario_dias: diasDelHorario,
          hora: horasDelHorario,
          hora_12h: horasDelHorario,
          aula: aulasDelHorario,
          componentes: [
            {
              crn: cursoH.crn,
              seccion: null,
              tipo: 'Teoría / General',
              porcentaje: 100,
              faltas: 0,
              asistencias: clasesEstimadas,
              veces_asistio: clasesEstimadas,
              total_clases: clasesEstimadas,
              horario_dias: diasDelHorario,
              hora: horasDelHorario,
              hora_12h: horasDelHorario,
              aula: aulasDelHorario,
            },
          ],
          total_secciones: 1,
        });
      }
    }

    // 3. Si quedaron registros en Banner que no coincidieron con el horario, agregarlos para no perder información
    if (registrosRestantes.length > 0) {
      const gruposSobran = new Map<string, AsistenciaCurso[]>();
      for (const r of registrosRestantes) {
        const nom = normalizarNombre(r.nombre_curso || r.materia || 'Curso');
        const nomLimpio = limpiarNombreCurso(nom) || nom;
        const clave = nomLimpio.length >= 4 ? nomLimpio : (r.crn || nom);
        if (!gruposSobran.has(clave)) gruposSobran.set(clave, []);
        gruposSobran.get(clave)!.push(r);
      }

      gruposSobran.forEach((listaRegs) => {
        const nombreFinal = listaRegs[0].nombre_curso || listaRegs[0].materia || 'Curso';
        const comps: AsistenciaComponente[] = listaRegs.map((reg, index) => {
          const dias = reg.horario_dias || '';
          const diasCount = Math.max(1, contarDiasHorario(dias));
          const clasesEstimadas = semanasValidas * diasCount;
          const tipoClasificado = clasificarTipo(
            reg.tipo || reg.tipo_componente,
            reg.seccion,
            nombreFinal,
            index,
            listaRegs.length
          );
          const f = reg.faltas ?? 0;
          let asist = reg.asistencias ?? reg.veces_asistio;
          if (asist === undefined || asist === null) {
            const p = reg.porcentaje;
            if (p !== undefined && p !== null) {
              if (p <= 0) asist = 0;
              else if (f > 0 && p < 100) asist = Math.max(0, Math.round((p * f) / (100 - p)));
              else asist = Math.max(1, clasesEstimadas - f);
            } else {
              asist = Math.max(1, clasesEstimadas - f);
            }
          }
          const tot = reg.total_clases && reg.total_clases > 0 ? reg.total_clases : asist + f;
          return {
            crn: reg.crn,
            seccion: reg.seccion,
            tipo: tipoClasificado,
            tipo_componente: tipoClasificado,
            porcentaje: reg.porcentaje ?? (tot > 0 ? Math.round((asist / tot) * 100) : 100),
            faltas: f,
            asistencias: asist,
            veces_asistio: asist,
            total_clases: tot,
            horario_dias: dias,
            hora: reg.hora,
            hora_12h: reg.hora_12h,
            aula: reg.aula,
          };
        });

        const totF = comps.reduce((acc, c) => acc + (c.faltas ?? 0), 0);
        const totA = comps.reduce((acc, c) => acc + (c.asistencias ?? 0), 0);
        const totC = comps.reduce((acc, c) => acc + (c.total_clases ?? 0), 0);

        resultado.push({
          crn: comps.map((c) => c.crn).filter(Boolean).filter((c, i, a) => a.indexOf(c) === i).join(' / ') || listaRegs[0].crn,
          materia: nombreFinal,
          codigo_materia: listaRegs[0].codigo_materia,
          nombre_curso: nombreFinal,
          seccion: comps.map((c) => c.seccion).filter(Boolean).filter((s, i, a) => a.indexOf(s) === i).join(' / ') || listaRegs[0].seccion,
          periodo: listaRegs.find((r) => r.periodo)?.periodo,
          faltas: totF,
          asistencias: totA,
          veces_asistio: totA,
          total_clases: totC,
          porcentaje: totC > 0 ? Math.round((totA / totC) * 100) : 100,
          horario_dias: listaRegs[0].horario_dias,
          hora: listaRegs[0].hora,
          hora_12h: listaRegs[0].hora_12h,
          aula: listaRegs[0].aula,
          componentes: comps,
          total_secciones: comps.length,
        });
      });
    }

    return resultado;
  }

  // Fallback si por alguna razón el horario viene vacío: procesar los registros agrupando
  const grupos = new Map<string, AsistenciaCurso[]>();
  for (const r of registros) {
    const nom = normalizarNombre(r.nombre_curso || r.materia || 'Curso');
    const nomLimpio = limpiarNombreCurso(nom) || nom;
    const clave = nomLimpio.length >= 4 ? nomLimpio : (r.crn || nom);

    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(r);
  }

  const resultadoFallback: AsistenciaCurso[] = [];
  grupos.forEach((listaRegs) => {
    const nombreFinal = listaRegs[0].nombre_curso || listaRegs[0].materia || 'Curso';
    const componentes: AsistenciaComponente[] = listaRegs.map((reg, index) => {
      const dias = reg.horario_dias || '';
      const diasCount = Math.max(1, contarDiasHorario(dias));
      const clasesEstimadas = semanasValidas * diasCount;

      const tipoClasificado = clasificarTipo(
        reg.tipo || reg.tipo_componente,
        reg.seccion,
        nombreFinal,
        index,
        listaRegs.length
      );

      const f = reg.faltas ?? 0;
      let asistenciasCalculadas = reg.asistencias ?? reg.veces_asistio;
      if (asistenciasCalculadas === undefined || asistenciasCalculadas === null) {
        const p = reg.porcentaje;
        if (p !== undefined && p !== null) {
          if (p <= 0) asistenciasCalculadas = 0;
          else if (f > 0 && p < 100) asistenciasCalculadas = Math.max(0, Math.round((p * f) / (100 - p)));
          else asistenciasCalculadas = Math.max(1, clasesEstimadas - f);
        } else {
          asistenciasCalculadas = Math.max(1, clasesEstimadas - f);
        }
      }

      const tot = reg.total_clases && reg.total_clases > 0 ? reg.total_clases : asistenciasCalculadas + f;

      return {
        crn: reg.crn,
        seccion: reg.seccion,
        tipo: tipoClasificado,
        tipo_componente: tipoClasificado,
        porcentaje: reg.porcentaje ?? (tot > 0 ? Math.round((asistenciasCalculadas / tot) * 100) : 100),
        faltas: f,
        asistencias: asistenciasCalculadas,
        veces_asistio: asistenciasCalculadas,
        total_clases: tot,
        horario_dias: dias,
        hora: reg.hora,
        hora_12h: reg.hora_12h,
        aula: reg.aula,
      };
    });

    const totalFaltas = componentes.reduce((acc, c) => acc + (c.faltas ?? 0), 0);
    const totalAsist = componentes.reduce((acc, c) => acc + (c.asistencias ?? 0), 0);
    const totalClases = componentes.reduce((acc, c) => acc + (c.total_clases ?? 0), 0);

    resultadoFallback.push({
      crn: listaRegs[0].crn,
      materia: nombreFinal,
      codigo_materia: listaRegs[0].codigo_materia,
      nombre_curso: nombreFinal,
      seccion: listaRegs[0].seccion,
      periodo: listaRegs.find((r) => r.periodo)?.periodo,
      faltas: totalFaltas,
      asistencias: totalAsist,
      veces_asistio: totalAsist,
      total_clases: totalClases,
      porcentaje: totalClases > 0 ? Math.round((totalAsist / totalClases) * 100) : 100,
      horario_dias: listaRegs[0].horario_dias,
      hora: listaRegs[0].hora,
      hora_12h: listaRegs[0].hora_12h,
      aula: listaRegs[0].aula,
      componentes,
      total_secciones: componentes.length,
    });
  });

  return resultadoFallback;
}

export const AsistenciaView: React.FC = () => {
  const { user, isAuthenticated, openLoginModal } = useAuth();

  const [rawAsistencia, setRawAsistencia] = useState<AsistenciaCurso[]>([]);
  const [horarioCursos, setHorarioCursos] = useState<HorarioCurso[]>([]);
  const [periodosDisponibles, setPeriodosDisponibles] = useState<string[]>(['202610']);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('202610');
  const [cursoSeleccionado, setCursoSeleccionado] = useState<AsistenciaCurso | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claveCache = useMemo(() => `asistencia_${user?.usuario || 'anonimo'}`, [user?.usuario]);

  // Aplicar caché local inmediato
  const aplicarCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem(claveCache);
      if (cached) {
        const body: AsistenciaResponse = JSON.parse(cached);
        if (body.asistencia && body.asistencia.length > 0) {
          setRawAsistencia(body.asistencia);
        }
      }
    } catch (e) {
      console.error('Error al leer caché de asistencia:', e);
    }
  }, [claveCache]);

  const loadData = useCallback(async (periodoTarget: string) => {
    setLoading(true);
    setError(null);
    setIsOfflineData(false);

    try {
      const [asistRes, horRes] = await Promise.allSettled([
        api.getAsistencia(),
        api.getHorario(periodoTarget),
      ]);

      if (asistRes.status === 'fulfilled') {
        setRawAsistencia(asistRes.value.asistencia || []);
        try {
          localStorage.setItem(claveCache, JSON.stringify(asistRes.value));
        } catch (e) {
          console.error(e);
        }
      } else {
        if (rawAsistencia.length > 0) {
          setIsOfflineData(true);
        } else {
          setError(asistRes.reason?.message || 'Error al consultar asistencias');
        }
      }

      if (horRes.status === 'fulfilled') {
        setHorarioCursos(horRes.value.cursos || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [claveCache, rawAsistencia.length]);

  useEffect(() => {
    if (!isAuthenticated) return;
    aplicarCache();

    // Obtener los periodos para detectar el ciclo actual
    const init = async () => {
      let periodoActual = '202610';
      try {
        const pRes = await api.getPeriodos();
        if (pRes.periodos && pRes.periodos.length > 0) {
          setPeriodosDisponibles(pRes.periodos);
          periodoActual = detectarPeriodoActual(pRes.periodos, pRes.periodo_actual);
          setSelectedPeriodo(periodoActual);
        }
      } catch (e) {
        console.warn('Error obteniendo periodos en asistencia, usando fallback 202610:', e);
      }
      loadData(periodoActual);
    };

    init();

    // Auto-actualización cuando el usuario regresa a la pestaña o ventana del navegador (focus)
    const onFocus = () => {
      loadData(selectedPeriodo);
    };
    window.addEventListener('focus', onFocus);

    // Auto-actualización periódica de fondo (cada 60 segundos)
    const interval = setInterval(() => {
      loadData(selectedPeriodo);
    }, 60000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [isAuthenticated, aplicarCache, loadData, selectedPeriodo]);

  const handlePeriodoChange = (nuevoPeriodo: string) => {
    setSelectedPeriodo(nuevoPeriodo);
    loadData(nuevoPeriodo);
  };

  // Filtrar y consolidar cursos: Solo cursos que pertenezcan al periodo seleccionado (o Todos si se elige)
  const cursosProcesados = useMemo(() => {
    if (rawAsistencia.length === 0 && horarioCursos.length === 0) return [];

    let registrosFiltrados = rawAsistencia;

    if (selectedPeriodo !== 'TODOS') {
      registrosFiltrados = rawAsistencia.filter((r) => {
        if (r.periodo) {
          return r.periodo.trim() === selectedPeriodo.trim();
        }
        // Fallback si la API de Banner omite el campo periodo: coincide con algún curso del horario del ciclo actual
        return horarioCursos.some((h) => cursoCoincideConHorario(r, h));
      });

      // Si todos los registros de Banner venían sin periodo y el filtro quedó vacío, mostrar rawAsistencia
      // para no dejar la pantalla en blanco
      if (registrosFiltrados.length === 0 && rawAsistencia.length > 0 && !rawAsistencia.some((r) => !!r.periodo)) {
        registrosFiltrados = rawAsistencia;
      }
    }

    return procesarCursosAsistencia(registrosFiltrados, horarioCursos);
  }, [rawAsistencia, horarioCursos, selectedPeriodo]);

  // KPIs globales
  const stats = useMemo(() => {
    if (cursosProcesados.length === 0) return { faltas: 0, promedio: 100, enRiesgo: 0 };
    const faltas = cursosProcesados.reduce((acc, c) => acc + (c.faltas ?? 0), 0);
    const sumaPcts = cursosProcesados.reduce((acc, c) => acc + (c.porcentaje ?? 100), 0);
    const promedio = Math.round(sumaPcts / cursosProcesados.length);
    const enRiesgo = cursosProcesados.filter((c) => (c.porcentaje ?? 100) < 70).length;

    return { faltas, promedio, enRiesgo };
  }, [cursosProcesados]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="w-16 h-16 mb-4 rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
          <ClipboardCheck className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Control de Asistencia UPAO
        </h3>
        <p className="max-w-md text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Inicia sesión para monitorear tus inasistencias por Teoría y Laboratorio, tus días de clase y alertas de inhabilitación (límite del 30%).
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
      {/* Selector de Periodo y Filtro de Ciclo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#161b26] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <select
              value={selectedPeriodo}
              onChange={(e) => handlePeriodoChange(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              {periodosDisponibles.map((p) => (
                <option key={p} value={p} className="bg-white dark:bg-slate-900">
                  {p === '202610' ? `Ciclo Actual (${p})` : `Periodo ${p}`}
                </option>
              ))}
              <option value="TODOS" className="bg-white dark:bg-slate-900">
                Ver Historial Completo (Todos los Ciclos)
              </option>
            </select>
          </div>
          <span className="text-[11px] text-slate-400">
            {cursosProcesados.length} {cursosProcesados.length === 1 ? 'curso' : 'cursos'}
          </span>
        </div>

        <button
          onClick={() => loadData(selectedPeriodo)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
          title="Actualizar asistencias"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Resumen KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white dark:bg-[#161b26] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Asistencia General
            </span>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {stats.promedio}%
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-[#161b26] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Faltas Acumuladas
            </span>
            <div
              className={`text-2xl sm:text-3xl font-black mt-0.5 ${
                stats.faltas > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}
            >
              {stats.faltas}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-[#161b26] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cursos en Riesgo
            </span>
            <div
              className={`text-2xl sm:text-3xl font-black mt-0.5 ${
                stats.enRiesgo > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {stats.enRiesgo}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Banner Sin Conexión */}
      {isOfflineData && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Sin conexión · Mostrando datos de asistencia guardados</span>
        </div>
      )}

      {/* Estados de Carga y Error */}
      {loading && cursosProcesados.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-xs">Consultando registro de asistencias desde Banner...</p>
        </div>
      )}

      {error && cursosProcesados.length === 0 && (
        <div className="flex items-center gap-3 p-4 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Listado de Cursos con Fusión Teoría / Laboratorio */}
      {cursosProcesados.length > 0 && (
        <div className="space-y-4">
          {cursosProcesados.map((curso, idx) => {
            const nombre = toTitleCase(curso.nombre_curso || curso.materia || 'Curso');
            const colorCurso = cursoColor(nombre);
            const pct = curso.porcentaje ?? 100;
            const estado = estadoAsistencia(pct);
            const diasAct = diasActivos(curso.horario_dias);

            return (
              <div
                key={curso.crn || idx}
                onClick={() => setCursoSeleccionado(curso)}
                className="p-5 rounded-3xl bg-white dark:bg-[#161b26] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-800 transition cursor-pointer group"
              >
                {/* Cabecera del Curso */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {curso.crn && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          NRC {curso.crn}
                        </span>
                      )}
                      {curso.codigo_materia && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {curso.codigo_materia}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {nombre}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                    </div>
                  </div>

                  {/* Estado y Porcentaje */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Indicador Días Activos (L M M J V S) */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-100 dark:border-slate-800">
                      {DAY_INITIALS.map((init, dIdx) => {
                        const activo = diasAct.has(dIdx);
                        return (
                          <span
                            key={dIdx}
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                              activo
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          >
                            {init}
                          </span>
                        );
                      })}
                    </div>

                    {/* Badge Estado */}
                    <div
                      className="px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${estado.color}15`,
                        color: estado.color,
                        borderColor: `${estado.color}30`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: estado.color }}
                      />
                      <span>{formatPct(pct)}% · {estado.label}</span>
                    </div>
                  </div>
                </div>

                {/* Estado de Inhabilitación y Métricas Principales */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                        pct < 70
                          ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                          : 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50'
                      }`}
                    >
                      {pct < 70 ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Inhabilitado</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>No inhabilitado</span>
                        </>
                      )}
                    </span>

                    {/* Porcentaje de Faltas */}
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <strong className={curso.faltas && curso.faltas > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}>
                        {formatPct(100 - pct)}%
                      </strong>{' '}
                      Faltas
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-medium">
                    {curso.total_clases || 0} sesiones registradas
                  </div>
                </div>

                {/* Componentes (Teoría / Laboratorio / Práctica) con tabla de sesiones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {(curso.componentes || []).map((comp, kIdx) => {
                    const compPct = comp.porcentaje ?? 100;
                    const compFaltas = comp.faltas ?? 0;
                    const compAsist = comp.asistencias ?? comp.veces_asistio ?? 0;
                    const compTotal = comp.total_clases ?? compAsist + compFaltas;
                    const isDanger = compPct < 70;
                    const isWarning = compPct >= 70 && compPct < 85;

                    return (
                      <div
                        key={kIdx}
                        className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                              {comp.tipo}
                            </span>
                            {comp.crn && (
                              <span className="text-[11px] text-slate-400 font-medium">
                                NRC {comp.crn}
                              </span>
                            )}
                            {comp.seccion && (
                              <span className="text-[11px] text-slate-400 font-medium">
                                Sec {comp.seccion}
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {formatPct(compPct)}%
                          </span>
                        </div>

                        {/* Horario y Aula */}
                        {(comp.hora_12h || comp.aula) && (
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            {comp.hora_12h && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{comp.hora_12h}</span>
                              </span>
                            )}
                            {comp.aula && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{comp.aula}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Barra de progreso */}
                        <div className="space-y-1">
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0, compPct))}%`,
                                backgroundColor: isDanger ? '#DC2626' : isWarning ? '#D97706' : '#16A34A',
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span>Asistidas: <strong className="text-slate-700 dark:text-slate-300">{compAsist}</strong></span>
                            <span>Faltas: <strong className={compFaltas > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}>{compFaltas}</strong></span>
                            <span>Total: <strong className="text-slate-700 dark:text-slate-300">{compTotal}</strong></span>
                          </div>
                        </div>

                        {isDanger && (
                          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-red-100/60 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[10px] font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Inhabilitado (asistencia menor al 70%)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Desglose Completo del Curso (Idéntico a AsistenciaDetalleModal en Android) */}
      {cursoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white dark:bg-[#161b26] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {cursoSeleccionado.crn && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      NRC {cursoSeleccionado.crn}
                    </span>
                  )}
                  {cursoSeleccionado.seccion && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                      Sección {cursoSeleccionado.seccion}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {toTitleCase(cursoSeleccionado.nombre_curso || cursoSeleccionado.materia || 'Curso')}
                </h3>
              </div>
              <button
                onClick={() => setCursoSeleccionado(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Tarjeta de Resumen Consolidado */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Total del Curso
                  </span>
                  <span className="text-xs text-slate-500">
                    {cursoSeleccionado.total_clases || 0} clases estimadas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span>{cursoSeleccionado.asistencias ?? cursoSeleccionado.veces_asistio ?? 0} Asistí</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>{cursoSeleccionado.faltas ?? 0} Falté</span>
                  </div>
                </div>
              </div>

              {/* Desglose por Componente (Teoría, Lab, Práctica) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Desglose por Componente
                </h4>
                {(cursoSeleccionado.componentes || []).map((comp, i) => {
                  const compPct = comp.porcentaje ?? 100;
                  const cAsist = comp.asistencias ?? comp.veces_asistio ?? 0;
                  const cFalt = comp.faltas ?? 0;
                  const cTotal = comp.total_clases ?? cAsist + cFalt;
                  const st = estadoAsistencia(compPct);

                  return (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            {comp.tipo}
                          </span>
                          {comp.crn && (
                            <span className="text-xs font-semibold text-slate-500">
                              NRC {comp.crn}
                            </span>
                          )}
                          {comp.seccion && (
                            <span className="text-xs font-medium text-slate-400">
                              Sec. {comp.seccion}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-black" style={{ color: st.color }}>
                          {formatPct(compPct)}%
                        </div>
                      </div>

                      {/* Progreso */}
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(0, compPct))}%`,
                            backgroundColor: st.color,
                          }}
                        />
                      </div>

                      {/* Info clases */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Asistidas: <strong className="text-slate-800 dark:text-slate-200">{cAsist}</strong></span>
                        <span>Inasistencias: <strong className={cFalt > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}>{cFalt}</strong></span>
                        <span>Total: <strong className="text-slate-800 dark:text-slate-200">{cTotal}</strong></span>
                      </div>

                      {/* Horario y aula */}
                      {(comp.hora_12h || comp.aula) && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          {comp.hora_12h && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{comp.hora_12h}</span>
                            </span>
                          )}
                          {comp.aula && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{comp.aula}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Registro de Sesiones Oficiales (NRC, Tipo, Fecha, Asistencia A / F) */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Registro de Sesiones Dictadas
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5">NRC</th>
                        <th className="px-3.5 py-2.5">Tipo</th>
                        <th className="px-3.5 py-2.5">Días / Horario</th>
                        <th className="px-3.5 py-2.5 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#161b26]">
                      {(cursoSeleccionado.componentes || []).map((comp, sIdx) => {
                        const esInhabilitado = (comp.porcentaje ?? 100) < 70;
                        const faltas = comp.faltas ?? 0;
                        return (
                          <tr key={sIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                            <td className="px-3.5 py-3 font-semibold text-slate-700 dark:text-slate-300">
                              {comp.crn || cursoSeleccionado.crn || '-'}
                            </td>
                            <td className="px-3.5 py-3">
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {comp.tipo?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-slate-500">
                              {comp.horario_dias || cursoSeleccionado.horario_dias || '-'}
                              {comp.hora_12h ? ` (${comp.hora_12h})` : ''}
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <span
                                className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                                  faltas > 0
                                    ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                                    : 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                                }`}
                              >
                                {faltas > 0 ? `${faltas} Falta(s)` : 'A (Asistió)'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setCursoSeleccionado(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
