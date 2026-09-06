'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  X,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface SugerenciasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SugerenciasModal: React.FC<SugerenciasModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || !user) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.postSugerencia({
        usuario: user.usuario,
        texto: texto.trim(),
      });

      if (res.success) {
        setEnviado(true);
        setTexto('');
      } else {
        setError('No se pudo registrar la sugerencia.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar sugerencia');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setTexto('');
    setError(null);
    setEnviado(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#232d3f] rounded-3xl shadow-2xl overflow-hidden">
        <button
          onClick={resetModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-2 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Buzón de Sugerencias
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ayúdanos a mejorar reportando dudas, errores o proponiendo nuevas funciones.
          </p>
        </div>

        {enviado ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-green-50 dark:bg-green-950/40 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              ¡Sugerencia enviada con éxito!
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Muchas gracias por tu aporte. La revisaremos para seguir optimizando la plataforma.
            </p>
            <button
              type="button"
              onClick={resetModal}
              className="mt-3 px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Tu mensaje o sugerencia
              </label>
              <textarea
                required
                rows={4}
                maxLength={500}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escribe aquí tu comentario o reporte..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition resize-none"
              />
              <span className="text-[10px] text-slate-400 block text-right mt-1">
                {texto.length}/500
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !texto.trim()}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar sugerencia</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
