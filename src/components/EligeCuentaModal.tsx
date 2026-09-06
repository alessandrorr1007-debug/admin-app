'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { CuentaGuardada } from '@/types/auth';
import { cursoColor } from '@/lib/format-utils';
import {
  X,
  UserPlus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Users,
  ChevronRight,
} from 'lucide-react';

export const EligeCuentaModal: React.FC = () => {
  const {
    cuentas,
    isEligeCuentaOpen,
    closeEligeCuenta,
    login,
    removeCuenta,
    openLoginModal,
  } = useAuth();

  const [autenticando, setAutenticando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cuentaAEliminar, setCuentaAEliminar] = useState<CuentaGuardada | null>(null);

  if (!isEligeCuentaOpen) return null;

  const handleIniciarCon = async (cuenta: CuentaGuardada) => {
    if (autenticando) return;
    if (!cuenta.password) {
      // Si no tenía contraseña guardada, abrir login normal con ese usuario
      closeEligeCuenta();
      openLoginModal();
      return;
    }

    setAutenticando(cuenta.usuario);
    setError(null);

    try {
      const res = await api.login({
        usuario: cuenta.usuario,
        password: cuenta.password,
      });

      if (res.success && res.token) {
        login(res.token, cuenta.usuario, cuenta.password, cuenta.nombre, true);
        closeEligeCuenta();
      } else {
        setError(
          res.message || 'La sesión de la cuenta guardada expiró. Vuelve a ingresar tu contraseña.'
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar con UPAO');
    } finally {
      setAutenticando(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#232d3f] rounded-3xl shadow-2xl overflow-hidden transition-all">
        {/* Botón cerrar */}
        <button
          onClick={closeEligeCuenta}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Elige una Cuenta
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cuentas guardadas en este dispositivo
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 mb-4 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Lista de Cuentas */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {cuentas.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No tienes cuentas guardadas aún.
            </p>
          ) : (
            cuentas.map((cuenta) => {
              const inicial = (cuenta.nombre?.trim() || cuenta.usuario).charAt(0).toUpperCase();
              const bgAvatar = cursoColor(cuenta.nombre || cuenta.usuario);
              const isLoggingIn = autenticando === cuenta.usuario;

              return (
                <div
                  key={cuenta.usuario}
                  onClick={() => handleIniciarCon(cuenta)}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-blue-300 dark:hover:border-blue-900/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: bgAvatar }}
                    >
                      {inicial}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {cuenta.nombre || 'Estudiante UPAO'}
                      </h4>
                      <p className="text-xs text-slate-400">ID: {cuenta.usuario}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isLoggingIn ? (
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCuentaAEliminar(cuenta);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                          title="Eliminar de cuentas guardadas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Botón Agregar Otra Cuenta */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              closeEligeCuenta();
              openLoginModal();
            }}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar otra cuenta</span>
          </button>
        </div>

        {/* Diálogo de Confirmación de Eliminación */}
        {cuentaAEliminar && (
          <div className="absolute inset-0 bg-white/95 dark:bg-[#161b26]/95 backdrop-blur-sm p-6 flex flex-col justify-center items-center text-center animate-in fade-in">
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              ¿Eliminar cuenta guardada?
            </h4>
            <p className="text-xs text-slate-500 mb-5 max-w-xs">
              Se quitará el usuario <strong>{cuentaAEliminar.usuario}</strong> de este dispositivo.
            </p>
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => setCuentaAEliminar(null)}
                className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  removeCuenta(cuentaAEliminar.usuario);
                  setCuentaAEliminar(null);
                }}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
