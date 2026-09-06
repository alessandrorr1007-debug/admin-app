'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  X,
  Lock,
  User,
  AlertCircle,
  RefreshCw,
  LogIn,
  ShieldCheck,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, login, cuentas, openEligeCuenta } = useAuth();

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [guardarPassword, setGuardarPassword] = useState(true);

  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [necesitaCaptcha, setNecesitaCaptcha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoginModalOpen) return null;

  const isUserValid = usuario.length === 9 && /^\d+$/.test(usuario);

  const handleUsuarioChange = (val: string) => {
    const onlyDigits = val.replace(/\D/g, '');
    if (onlyDigits.length <= 9) {
      setUsuario(onlyDigits);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserValid) {
      setError('El ID de usuario debe tener exactamente 9 dígitos numéricos.');
      return;
    }
    if (!password) {
      setError('Por favor ingresa tu contraseña.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (necesitaCaptcha) {
        // Enviar captcha resuelto manualmente
        const res = await api.loginConfirmarCaptcha({
          usuario: usuario.trim(),
          password: password,
          codigo_manual: captchaCode.trim(),
        });

        if (res.success && res.token) {
          login(res.token, usuario.trim(), password, undefined, guardarPassword);
          resetForm();
        } else if (res.necesita_captcha) {
          setCaptchaImage(res.imagen_base64 || null);
          setCaptchaCode('');
          setError(res.message || 'Código captcha incorrecto. Por favor inténtalo de nuevo.');
        } else {
          setError(res.message || 'No se pudo iniciar sesión.');
        }
      } else {
        // Login normal
        const res = await api.login({
          usuario: usuario.trim(),
          password: password,
        });

        if (res.success && res.token) {
          login(res.token, usuario.trim(), password, undefined, guardarPassword);
          resetForm();
        } else if (res.necesita_captcha) {
          setNecesitaCaptcha(true);
          setCaptchaImage(res.imagen_base64 || null);
          setError('El sistema Banner requiere resolver un Captcha de seguridad.');
        } else {
          setError(res.message || 'Credenciales inválidas o error en el sistema.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor de UPAO';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsuario('');
    setPassword('');
    setCaptchaCode('');
    setCaptchaImage(null);
    setNecesitaCaptcha(false);
    setError(null);
    closeLoginModal();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#232d3f] rounded-3xl shadow-2xl transition-all">
        {/* Botón cerrar */}
        <button
          onClick={resetForm}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 id="login-modal-title" className="text-2xl font-bold text-slate-900 dark:text-white">
            Campus Virtual UPAO
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Ingresa tu ID de 9 dígitos y contraseña de Banner
          </p>
        </div>

        {/* Si hay cuentas guardadas, botón rápido para seleccionarlas */}
        {cuentas.length > 0 && !necesitaCaptcha && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => {
                closeLoginModal();
                openEligeCuenta();
              }}
              className="w-full py-2 px-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 hover:bg-blue-100/70 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Users className="w-4 h-4" />
              <span>Ver mis cuentas guardadas ({cuentas.length})</span>
            </button>
          </div>
        )}

        {/* Alerta de Error */}
        {error && (
          <div className="flex items-start gap-3 p-3.5 mb-4 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Usuario */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                ID de usuario (9 dígitos)
              </label>
              {usuario.length > 0 && (
                <span className={`text-[11px] font-medium ${isUserValid ? 'text-green-600' : 'text-amber-500'}`}>
                  {usuario.length}/9
                </span>
              )}
            </div>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                required
                disabled={loading || necesitaCaptcha}
                value={usuario}
                onChange={(e) => handleUsuarioChange(e.target.value)}
                placeholder="Ej. 000279330"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition disabled:opacity-60 text-sm ${
                  usuario.length > 0 && !isUserValid
                    ? 'border-amber-400 focus:ring-amber-400'
                    : 'border-slate-200 dark:border-slate-800 focus:ring-blue-500'
                }`}
              />
            </div>
            {usuario.length > 0 && !isUserValid && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Debe tener exactamente 9 dígitos numéricos
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading || necesitaCaptcha}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-60 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Opciones de guardado */}
          {!necesitaCaptcha && (
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={guardarPassword}
                  onChange={(e) => setGuardarPassword(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Guardar contraseña en este equipo
                </span>
              </label>
            </div>
          )}

          {/* Bloque de Captcha si es requerido */}
          {necesitaCaptcha && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verificación de Captcha Banner</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNecesitaCaptcha(false);
                    setCaptchaCode('');
                    setCaptchaImage(null);
                  }}
                  className="text-xs text-amber-700 dark:text-amber-300 hover:underline font-normal cursor-pointer"
                >
                  Cambiar credenciales
                </button>
              </div>

              {captchaImage && (
                <div className="flex justify-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${captchaImage}`}
                    alt="Captcha de seguridad"
                    className="h-14 object-contain"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ingresa el texto de la imagen (6 caracteres):
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={captchaCode}
                  onChange={(e) => setCaptchaCode(e.target.value.toUpperCase())}
                  placeholder="Código captcha"
                  className="w-full text-center font-mono text-lg font-bold tracking-widest uppercase py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={loading || !isUserValid || !password}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Conectando con Banner UPAO...</span>
              </>
            ) : necesitaCaptcha ? (
              <span>Confirmar Captcha y Entrar</span>
            ) : (
              <span>Acceder al Sistema</span>
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-slate-400 dark:text-slate-500">
          App independiente · Campus Virtual UPAO
        </p>
      </div>
    </div>
  );
};
