import { AsistenciaComponente, AsistenciaCurso } from '@/types/asistencia';

export function clasificarTipo(
  tipoApi?: string | null,
  seccion?: string | null,
  nombreCurso: string = '',
  index: number = 0,
  totalComponentes: number = 1
): string {
  if (tipoApi && tipoApi.trim().length > 0) {
    const t = tipoApi.trim().toLowerCase();
    if (t.includes('teor')) return 'Teoría';
    if (t.includes('lab')) return 'Laboratorio';
    if (t.includes('prac')) return 'Práctica';
    return tipoApi.trim().charAt(0).toUpperCase() + tipoApi.trim().slice(1);
  }

  if (seccion && seccion.trim().length > 0) {
    const sec = seccion.trim().toUpperCase();
    if (sec.includes('LAB') || sec.endsWith('L')) return 'Laboratorio';
    if (sec.includes('PRAC') || sec.endsWith('P')) return 'Práctica';
    if (sec.includes('TEOR') || sec.endsWith('T')) return 'Teoría';
  }

  if (totalComponentes <= 1) return 'Teoría';

  if (totalComponentes === 2) {
    const nombreMayus = nombreCurso.toUpperCase();
    const tieneLab =
      nombreMayus.includes('LAB') ||
      nombreMayus.includes('COMPUT') ||
      nombreMayus.includes('SISTEM') ||
      nombreMayus.includes('REDES') ||
      nombreMayus.includes('PROGRAM') ||
      nombreMayus.includes('DATOS') ||
      nombreMayus.includes('FISICA') ||
      nombreMayus.includes('QUIMICA') ||
      nombreMayus.includes('BIOLOG') ||
      nombreMayus.includes('ELECTR') ||
      nombreMayus.includes('DESARROLLO') ||
      nombreMayus.includes('INTELIG');

    if (index === 0) return 'Teoría';
    return tieneLab ? 'Laboratorio' : 'Práctica';
  }

  if (index === 0) return 'Teoría';
  if (index === 1) return 'Práctica';
  return 'Laboratorio';
}

export function contarDiasHorario(horario?: string | null): number {
  if (!horario || horario.trim().length === 0) return 1;
  const sinAcentos = horario
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const dias = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
  const encontrados = dias.filter((d) => sinAcentos.includes(d)).length;
  return encontrados > 0 ? encontrados : 1;
}

export function calcularVecesAsistidasComp(comp: AsistenciaComponente): number {
  if (comp.asistencias !== undefined && comp.asistencias !== null) return comp.asistencias;
  if (comp.veces_asistio !== undefined && comp.veces_asistio !== null) return comp.veces_asistio;

  const p = comp.porcentaje ?? null;
  const f = comp.faltas ?? 0;

  if (p === null) return 0;
  if (p <= 0.0) return 0;

  if (f > 0 && p < 100.0) {
    const calc = Math.round((p * f) / (100.0 - p));
    return Math.max(0, calc);
  }

  if (p >= 100.0 || f === 0) {
    if (comp.total_clases && comp.total_clases > 0) return Math.max(0, comp.total_clases - f);
    const dias = contarDiasHorario(comp.horario_dias);
    return Math.max(1, dias * 4);
  }

  return comp.total_clases ?? 0;
}

export function obtenerComponentesProcesados(curso: AsistenciaCurso): Array<{
  tipo: string;
  componente: AsistenciaComponente;
  vecesAsistio: number;
  faltas: number;
  totalClases: number;
  porcentaje: number;
}> {
  const nombre = curso.nombre_curso || curso.materia || 'Curso';
  const rawList = curso.componentes && curso.componentes.length > 0
    ? curso.componentes
    : [
        {
          crn: curso.crn,
          seccion: curso.seccion,
          tipo: curso.tipo || curso.tipo_componente,
          porcentaje: curso.porcentaje,
          faltas: curso.faltas,
          asistencias: curso.asistencias,
          veces_asistio: curso.veces_asistio,
          total_clases: curso.total_clases,
          horario_dias: curso.horario_dias,
          hora: curso.hora,
          hora_12h: curso.hora_12h,
          aula: curso.aula,
        } as AsistenciaComponente,
      ];

  return rawList.map((comp, idx) => {
    const tipo = comp.tipo?.trim() || clasificarTipo(
      comp.tipo || comp.tipo_componente,
      comp.seccion,
      nombre,
      idx,
      rawList.length
    );
    const faltas = comp.faltas ?? 0;
    const asist = calcularVecesAsistidasComp({ ...comp, tipo });
    const total = comp.total_clases && comp.total_clases > 0 ? comp.total_clases : asist + faltas;
    const porcentaje = total > 0 ? Math.round((asist / total) * 100) : (comp.porcentaje ? Math.round(comp.porcentaje) : 100);

    return {
      tipo,
      componente: { ...comp, tipo },
      vecesAsistio: asist,
      faltas,
      totalClases: total,
      porcentaje,
    };
  });
}
