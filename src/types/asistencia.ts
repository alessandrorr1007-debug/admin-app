export interface AsistenciaComponente {
  crn?: string | null;
  seccion?: string | null;
  tipo?: string | null;
  tipo_componente?: string | null;
  porcentaje?: number | null;
  faltas?: number | null;
  asistencias?: number | null;
  veces_asistio?: number | null;
  total_clases?: number | null;
  horario_dias?: string | null;
  hora?: string | null;
  hora_12h?: string | null;
  aula?: string | null;
  sectionMeetingId?: number | null;
}

export interface AsistenciaCurso {
  crn?: string | null;
  materia?: string | null;
  codigo_materia?: string | null;
  nombre_curso?: string | null;
  seccion?: string | null;
  periodo?: string | null;
  faltas?: number | null;
  asistencias?: number | null;
  veces_asistio?: number | null;
  total_clases?: number | null;
  porcentaje?: number | null;
  horario_dias?: string | null;
  hora?: string | null;
  hora_12h?: string | null;
  aula?: string | null;
  tipo?: string | null;
  tipo_componente?: string | null;
  componentes?: AsistenciaComponente[];
  total_secciones?: number | null;
}

export interface AsistenciaResponse {
  success: boolean;
  totalCount: number;
  total_secciones?: number | null;
  asistencia: AsistenciaCurso[];
}
