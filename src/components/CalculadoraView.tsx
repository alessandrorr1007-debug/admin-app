'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator as CalcIcon,
  CheckCircle2,
  AlertTriangle,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const NOTA_MINIMA = 10.5;

const COMPONENTES = [
  { id: 'ep1', nombre: 'EP1', peso: 20 },
  { id: 'parcial', nombre: 'Parcial', peso: 30 },
  { id: 'ep2', nombre: 'EP2', peso: 20 },
  { id: 'final', nombre: 'Final', peso: 30 },
];

function formatNota(v: number): string {
  const r = Math.round(v * 100) / 100;
  return r % 1 === 0 ? r.toString() : r.toFixed(2);
}

interface CalculadoraViewProps {
  initialValues?: {
    ep1?: number;
    parcial?: number;
    ep2?: number;
    final?: number;
  } | null;
}

export const CalculadoraView: React.FC<CalculadoraViewProps> = ({ initialValues }) => {
  const [valores, setValores] = useState<string[]>(['', '', '', '']);

  // Pre-cargar valores si vienen desde otra pantalla
  useEffect(() => {
    if (initialValues) {
      setValores([
        initialValues.ep1 !== undefined ? String(initialValues.ep1) : '',
        initialValues.parcial !== undefined ? String(initialValues.parcial) : '',
        initialValues.ep2 !== undefined ? String(initialValues.ep2) : '',
        initialValues.final !== undefined ? String(initialValues.final) : '',
      ]);
    }
  }, [initialValues]);

  const handleValueChange = (index: number, val: string) => {
    // Permitir dígitos y un punto decimal
    const sanitized = val.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) return;

    const num = parseFloat(sanitized);
    if (!isNaN(num) && (num < 0 || num > 20)) return;

    const nuevos = [...valores];
    nuevos[index] = sanitized;
    setValores(nuevos);
  };

  const resultado = useMemo(() => {
    const notas = valores.map((v) => {
      const num = parseFloat(v);
      return !isNaN(num) && num >= 0 && num <= 20 ? num : null;
    });

    const llenas = notas.filter((n) => n !== null).length;
    const sumaPonderada = notas.reduce<number>((acc, n, i) => {
      return acc + (n !== null ? (n * COMPONENTES[i].peso) / 100 : 0);
    }, 0);

    // 1. Todas llenas
    if (llenas === 4) {
      const promedio = sumaPonderada;
      const aprobado = promedio >= NOTA_MINIMA;
      return {
        label: 'Promedio final',
        texto: `${formatNota(promedio)} / 20 — ${aprobado ? 'Aprobado 🎉' : `Por debajo de ${formatNota(NOTA_MINIMA)}`}`,
        estado: aprobado ? 'bien' : 'mal',
        promedio,
      };
    }

    // 2. Faltan exactamente 1 nota
    if (llenas === 3) {
      const missingIndex = notas.findIndex((n) => n === null);
      const missingComp = COMPONENTES[missingIndex];
      const pesoFaltante = missingComp.peso / 100;
      const necesaria = (NOTA_MINIMA - sumaPonderada) / pesoFaltante;

      if (necesaria <= 0) {
        return {
          label: 'Nota necesaria',
          texto: `¡Ya tienes aprobado el curso! No necesitas puntos en ${missingComp.nombre}`,
          estado: 'bien',
        };
      }
      if (necesaria > 20) {
        return {
          label: 'Nota necesaria',
          texto: `Necesitarías ${formatNota(necesaria)} en ${missingComp.nombre} (máximo 20). No es posible alcanzar ${formatNota(NOTA_MINIMA)}`,
          estado: 'mal',
        };
      }
      return {
        label: 'Nota necesaria para aprobar',
        texto: `Necesitas ${formatNota(necesaria)} en ${missingComp.nombre} para alcanzar ${formatNota(NOTA_MINIMA)}`,
        estado: 'bien',
      };
    }

    // 3. Faltan 2 o 3 notas
    if (llenas >= 1 && llenas <= 2) {
      const sumaPesos = notas.reduce<number>((acc, n, i) => (n !== null ? acc + COMPONENTES[i].peso : acc), 0);
      const parcial = sumaPonderada / (sumaPesos / 100);
      return {
        label: 'Promedio acumulado parcial',
        texto: `${formatNota(parcial)} / 20 — faltan ${4 - llenas} evaluaciones`,
        estado: 'parcial',
        promedio: parcial,
      };
    }

    // 4. Vacío
    return {
      label: 'Calculadora predictiva',
      texto: 'Ingresa tus notas actuales para simular tu promedio o lo que necesitas en el final',
      estado: 'neutro',
    };
  }, [valores]);

  const resetAll = () => {
    setValores(['', '', '', '']);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Tarjeta de Resultado Dinámica */}
      <div
        className={`p-6 rounded-3xl border transition-all ${
          resultado.estado === 'bien'
            ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
            : resultado.estado === 'mal'
            ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
            : resultado.estado === 'parcial'
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
            : 'bg-white dark:bg-[#161b26] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              resultado.estado === 'bien'
                ? 'bg-green-500/20 text-green-600'
                : resultado.estado === 'mal'
                ? 'bg-red-500/20 text-red-600'
                : resultado.estado === 'parcial'
                ? 'bg-blue-500/20 text-blue-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {resultado.estado === 'bien' ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : resultado.estado === 'mal' ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <Info className="w-8 h-8" />
            )}
          </div>

          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
              {resultado.label}
            </span>
            <h3 className="text-lg sm:text-xl font-black mt-1 leading-snug">
              {resultado.texto}
            </h3>
          </div>
        </div>
      </div>

      {/* Inputs de Notas */}
      <div className="p-6 bg-white dark:bg-[#161b26] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalcIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Notas de Evaluación</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fórmula oficial UPAO: EP1 (20%) + Parcial (30%) + EP2 (20%) + Final (30%)
            </p>
          </div>

          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
            title="Limpiar todas las notas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {COMPONENTES.map((comp, idx) => {
            const val = valores[idx];
            const num = parseFloat(val);
            const isValid = val === '' || (!isNaN(num) && num >= 0 && num <= 20);

            return (
              <div
                key={comp.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 focus-within:border-blue-500 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {comp.nombre}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                    {comp.peso}%
                  </span>
                </div>

                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={5}
                  placeholder="0 - 20"
                  value={val}
                  onChange={(e) => handleValueChange(idx, e.target.value)}
                  className={`w-full text-center text-3xl font-black bg-white dark:bg-slate-800 py-3 rounded-xl border outline-none transition ${
                    !isValid
                      ? 'border-red-500 text-red-600 focus:ring-2 focus:ring-red-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500'
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-center text-xs text-slate-400">
          Nota mínima aprobatoria: <strong>10.50</strong>. Cualquier nota mayor o igual a 10.50 aprueba la asignatura.
        </div>
      </div>
    </div>
  );
};
