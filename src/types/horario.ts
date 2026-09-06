export interface HorarioBloque {
  dia?: number | null;
  dia_nombre?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  hora_inicio_12h?: string | null;
  hora_fin_12h?: string | null;
  aula?: string | null;
}

export interface HorarioCurso {
  crn?: string | null;
  codigo_materia?: string | null;
  numero_curso?: string | null;
  nombre?: string | null;
  bloques: HorarioBloque[];
}

export interface HorarioResponse {
  success: boolean;
  periodo?: string | null;
  total_cursos: number;
  total_bloques: number;
  cursos: HorarioCurso[];
}
