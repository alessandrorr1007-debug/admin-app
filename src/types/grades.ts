export interface GradeDetail {
  componente?: string;
  nota?: string | number | null;
}

export interface SubComponente {
  nombre?: string;
  description?: string;
  componente?: string;
  codigo?: string;
  peso?: number | string | null;
  weight?: number | string | null;
  percentage?: number | string | null;
  porcentaje_logrado?: number | string | null;
  puntaje_obtenido?: number | string | null;
  puntaje_sobre?: number | string | null;
  grade?: number | string | null;
  nota?: number | string | null;
  score?: number | string | null;
}

export interface ComponenteDetalle {
  nombre?: string;
  description?: string;
  componente?: string;
  codigo?: string;
  peso?: number | string | null;
  weight?: number | string | null;
  porcentaje_logrado?: number | string | null;
  puntaje_obtenido?: number | string | null;
  puntaje_sobre?: number | string | null;
  grade?: number | string | null;
  nota?: number | string | null;
  score?: number | string | null;
  grade_oficial?: number | string | null;
  componentId?: number | null;
  hasSubComponents?: boolean;
  subcomponentes?: SubComponente[];
}

export interface DetalleCursoResponse {
  success: boolean;
  totalCount: number;
  detalles: ComponenteDetalle[];
  nota_proyectada?: number | string | null;
  pesos_pendientes?: string[];
}

export interface GradeSection {
  nota?: string | number | null;
  detalles?: GradeDetail[];
}

export interface CourseGrade {
  nombre?: string;
  courseTitle?: string;
  subjectDescription?: string;
  ep1?: GradeSection;
  ep2?: GradeSection;
  nota_actual?: string | number | null;
  crn?: string;
  courseReferenceNumber?: string;
  raw_banner?: Record<string, unknown> | null;
}

export interface GradesResponse {
  periodo?: string;
  carrera?: string;
  ultima_actualizacion?: string;
  cursos: CourseGrade[];
  promedio_general?: string | number | null;
  promedio_basado_en?: string | null;
}

export interface PeriodosResponse {
  periodo_actual?: string;
  periodos: string[];
}

export interface CarrerasResponse {
  carreras: string[];
}

export interface PromedioCursoItem {
  crn: string;
  nombre: string;
  nota?: number | null;
  creditos?: number | null;
}

export interface PromedioPeriodoResponse {
  periodo: string;
  pps_oficial?: number | null;
  pps_calculado?: number | null;
  fuente?: string;
  total_creditos?: number | null;
  cursos?: PromedioCursoItem[];
  promedio?: number | string | null;
  success?: boolean;
}
