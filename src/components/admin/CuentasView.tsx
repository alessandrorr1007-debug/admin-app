'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { AdminCuenta } from '@/types/admin';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Shield,
  UserCheck,
} from 'lucide-react';

export function CuentasView() {
  const [cuentas, setCuentas] = useState<AdminCuenta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'todos' | 'estudiantes' | 'admins'>('todos');

  const fetchCuentas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getAdminCuentas();
      setCuentas(data.cuentas || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar cuentas';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, []);

  const filteredCuentas = useMemo(() => {
    return cuentas.filter((c) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        c.usuario_campus.toLowerCase().includes(query) ||
        (c.nombre && c.nombre.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (filterRole === 'admins') return c.is_admin;
      if (filterRole === 'estudiantes') return !c.is_admin;
      return true;
    });
  }, [cuentas, searchQuery, filterRole]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Directorio de Cuentas ({cuentas.length})</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Usuarios y estudiantes registrados en la base de datos de UPAOS
          </p>
        </div>

        <button
          onClick={fetchCuentas}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID o nombre..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterRole('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterRole === 'todos'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({cuentas.length})
          </button>
          <button
            onClick={() => setFilterRole('estudiantes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterRole === 'estudiantes'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Estudiantes ({cuentas.filter((c) => !c.is_admin).length})
          </button>
          <button
            onClick={() => setFilterRole('admins')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterRole === 'admins'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Admins ({cuentas.filter((c) => c.is_admin).length})
          </button>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">ID Campus</th>
                <th className="px-6 py-3.5">Nombre</th>
                <th className="px-6 py-3.5">Primer Login</th>
                <th className="px-6 py-3.5">Última Actividad</th>
                <th className="px-6 py-3.5 text-center">Auto-Check</th>
                <th className="px-6 py-3.5 text-center">Ranking PPS</th>
                <th className="px-6 py-3.5 text-center">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Cargando directorio...</span>
                  </td>
                </tr>
              ) : filteredCuentas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No se encontraron cuentas con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredCuentas.map((cuenta) => (
                  <tr key={cuenta.usuario_campus} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-white">
                      {cuenta.usuario_campus}
                    </td>
                    <td className="px-6 py-4">
                      {cuenta.nombre ? (
                        <span className="font-medium text-slate-200">{cuenta.nombre}</span>
                      ) : (
                        <span className="text-slate-400 italic">No registrado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {cuenta.fecha_primer_login
                        ? new Date(cuenta.fecha_primer_login).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {cuenta.ultimo_login
                        ? new Date(cuenta.ultimo_login).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {cuenta.auto_check_enabled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                          <XCircle className="w-3 h-3" />
                          <span>Inactivo</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {cuenta.ranking_optin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                          <UserCheck className="w-3 h-3" />
                          <span>Opt-in</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                          <span>Off</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {cuenta.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          <Shield className="w-3 h-3 text-purple-400" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                          Estudiante
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
