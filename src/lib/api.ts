import {
  LoginRequest,
  LoginResponse,
  ManualCaptchaRequest,
} from '@/types/auth';
import {
  CarrerasResponse,
  DetalleCursoResponse,
  GradesResponse,
  PeriodosResponse,
  PromedioPeriodoResponse,
} from '@/types/grades';
import { HorarioResponse } from '@/types/horario';
import { AsistenciaResponse } from '@/types/asistencia';
import {
  CuentaInfo,
  NotificacionesResponse,
  SemanaInfo,
  SugerenciaRequest,
  SugerenciaResponse,
} from '@/types/features';

const BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : 'https://upaos.onrender.com';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('upao_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    const url = `${BASE_URL}/${endpoint.replace(/^\//, '')}`;
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errMsg = `Error ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.message) errMsg = errorJson.message;
        if (errorJson.detail) errMsg = errorJson.detail;
      } catch {
        // use default error message
      }
      throw new Error(errMsg);
    }

    return res.json() as Promise<T>;
  }

  // --- AUTH ---
  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async loginConfirmarCaptcha(data: ManualCaptchaRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('login/confirmar-captcha', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- NOTAS ---
  async getPeriodos(): Promise<PeriodosResponse> {
    return this.request<PeriodosResponse>('notas/periodos');
  }

  async getCarreras(term?: string): Promise<CarrerasResponse> {
    const query = term ? `?term=${encodeURIComponent(term)}` : '';
    return this.request<CarrerasResponse>(`notas/carreras${query}`);
  }

  async buscarNotas(periodo: string, carrera: string): Promise<GradesResponse> {
    return this.request<GradesResponse>('notas/buscar', {
      method: 'POST',
      body: JSON.stringify({ periodo, carrera }),
    });
  }

  async getDetalleCurso(crn: string, periodo: string, carrera: string = 'UG'): Promise<DetalleCursoResponse> {
    return this.request<DetalleCursoResponse>('notas/detalle', {
      method: 'POST',
      body: JSON.stringify({ periodo, carrera, crn }),
    });
  }

  async getPromedioPeriodo(periodo: string): Promise<PromedioPeriodoResponse> {
    return this.request<PromedioPeriodoResponse>(`api/promedio/${encodeURIComponent(periodo)}`);
  }

  async actualizarNotasAhora(usuario: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`notas/actualizar-ahora?usuario=${encodeURIComponent(usuario)}`, {
      method: 'POST',
    });
  }

  // --- HORARIO ---
  async getHorario(term: string): Promise<HorarioResponse> {
    return this.request<HorarioResponse>(`horario?term=${encodeURIComponent(term)}`);
  }

  // --- ASISTENCIA ---
  async getAsistencia(): Promise<AsistenciaResponse> {
    return this.request<AsistenciaResponse>('asistencia');
  }

  // --- SEMANA & NOTIFICACIONES ---
  async getSemana(): Promise<SemanaInfo> {
    return this.request<SemanaInfo>('semana');
  }

  async getNotificaciones(usuario: string): Promise<NotificacionesResponse> {
    return this.request<NotificacionesResponse>(`notificaciones?usuario=${encodeURIComponent(usuario)}`);
  }

  async marcarNotificacionesLeidas(usuario: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`notificaciones/marcar-leidas?usuario=${encodeURIComponent(usuario)}`, {
      method: 'PATCH',
    });
  }

  async marcarNotificacionLeida(id: number, usuario: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`notificaciones/${id}/marcar-leida?usuario=${encodeURIComponent(usuario)}`, {
      method: 'PATCH',
    });
  }

  async getCuenta(usuario: string): Promise<CuentaInfo> {
    return this.request<CuentaInfo>(`cuenta?usuario=${encodeURIComponent(usuario)}`);
  }

  async postSugerencia(data: SugerenciaRequest): Promise<SugerenciaResponse> {
    return this.request<SugerenciaResponse>('sugerencias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
