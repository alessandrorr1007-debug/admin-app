export interface AdminLoginResponse {
  success: boolean;
  admin_usuario: string;
  token: string;
}

export interface DauPunto {
  fecha: string;
  activos: number;
}

export interface PicoMetrica {
  fecha_hora?: string;
  usuarios_simultaneos: number;
}

export interface MetricasResponse {
  dau_30_dias: DauPunto[];
  cuentas_activas_hoy: number;
  pico_hoy: number | PicoMetrica | null;
  pico_historico: number | PicoMetrica | null;
}

export interface AdminCuenta {
  usuario?: string;
  usuario_campus?: string;
  nombre: string | null;
  fecha_primer_login: string | null;
  ultimo_login?: string | null;
  ultima_revision?: string | null;
  auto_check_enabled: boolean;
  ranking_optin: boolean;
  is_admin: boolean;
  tiene_password_guardada?: boolean;
}

export interface AdminCuentasResponse {
  cuentas: AdminCuenta[];
}

export type SugerenciaEstado =
  | 'pendiente'
  | 'visto'
  | 'resuelto'
  | 'descartado'
  | 'en_revision'
  | 'aprobada'
  | 'rechazada';

export interface AdminSugerencia {
  id: number;
  usuario_banner?: string;
  usuario?: string;
  texto: string;
  fecha?: string;
  fecha_creacion?: string;
  estado: SugerenciaEstado;
}

export interface AdminSugerenciasResponse {
  sugerencias: AdminSugerencia[];
}

export interface AdminSemanaResponse {
  configurada: boolean;
  semana: number | null;
  total_semanas: number;
  etiqueta: string | null;
  fuera_de_ciclo: boolean | null;
  fecha_inicio: string | null;
  dias_transcurridos: number | null;
}
