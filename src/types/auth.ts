export interface LoginRequest {
  usuario: string;
  password: string;
}

export interface ManualCaptchaRequest {
  usuario: string;
  password: string;
  codigo_manual: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string | null;
  necesita_captcha: boolean;
  imagen_base64?: string | null;
  message?: string | null;
}

export interface UserSession {
  usuario: string;
  token: string;
  nombre?: string;
}

export interface CuentaGuardada {
  usuario: string;
  password?: string;
  nombre?: string;
}
