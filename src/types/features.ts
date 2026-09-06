export interface NotificacionItem {
  id: number;
  mensaje: string;
  curso?: string | null;
  componente?: string | null;
  fecha_creacion?: string | null;
  leida: boolean;
}

export interface NotificacionesResponse {
  no_leidas: number;
  total: number;
  notificaciones: NotificacionItem[];
}

export interface SemanaInfo {
  configurada: boolean;
  semana?: number | null;
  total_semanas: number;
  etiqueta?: string | null;
  fuera_de_ciclo?: boolean | null;
  fecha_inicio?: string | null;
  dias_transcurridos?: number | null;
}

export interface SugerenciaRequest {
  usuario: string;
  texto: string;
}

export interface SugerenciaResponse {
  success: boolean;
  sugerencia_id?: number | null;
  estado?: string | null;
}

export interface CuentaInfo {
  usuario?: string | null;
  nombre?: string | null;
  is_admin?: boolean;
  rol?: string | null;
  ranking_optin?: boolean;
  auto_check_enabled?: boolean;
  tiene_password_guardada?: boolean;
  fecha_primer_login?: string | null;
}
