'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { AdminCuenta } from '@/types/admin';
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Shield,
  CheckCircle2,
  XCircle,
  UserCheck,
  Calendar,
  Clock,
  Key,
  X,
  Copy,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';

export function CuentasView() {
  const [cuentas, setCuentas] = useState<AdminCuenta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros y orden
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'todos' | 'estudiantes' | 'admins'>('todos');
  const [filterAutocheck, setFilterAutocheck] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [sortBy, setSortBy] = useState<'recientes' | 'primer_login' | 'id'>('recientes');

  // Modal de detalle y copia
  const [selectedCuenta, setSelectedCuenta] = useState<AdminCuenta | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const getUsuarioId = (c: AdminCuenta): string => {
    return c.usuario_campus || c.usuario || '';
  };

  const getUltimaActividad = (c: AdminCuenta): string | null => {
    return c.ultimo_login || c.ultima_revision || null;
  };

  const handleCopy = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getAvatarInfo = (c: AdminCuenta) => {
    const id = getUsuarioId(c);
    const nombre = c.nombre?.trim();
    let initials = 'U';
    if (nombre) {
      const parts = nombre.split(' ');
      initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2);
    } else if (id) {
      initials = id.slice(-2);
    }

    const gradients = [
      'from-blue-600 to-indigo-600',
      'from-violet-600 to-purple-600',
      'from-emerald-600 to-teal-600',
      'from-amber-600 to-orange-600',
      'from-rose-600 to-pink-600',
      'from-cyan-600 to-blue-600',
    ];
    const index = Math.abs(id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % gradients.length;
    return { initials: initials.toUpperCase(), gradient: gradients[index] };
  };

  const filteredCuentas = useMemo(() => {
    return cuentas
      .filter((c) => {
        const query = searchQuery.toLowerCase().trim();
        const userId = getUsuarioId(c).toLowerCase();
        const nombre = (c.nombre || '').toLowerCase();

        const matchesSearch = !query || userId.includes(query) || nombre.includes(query);
        if (!matchesSearch) return false;

        if (filterRole === 'admins' && !c.is_admin) return false;
        if (filterRole === 'estudiantes' && c.is_admin) return false;

        if (filterAutocheck === 'activos' && !c.auto_check_enabled) return false;
        if (filterAutocheck === 'inactivos' && c.auto_check_enabled) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recientes') {
          const tA = getUltimaActividad(a) ? new Date(getUltimaActividad(a)!).getTime() : 0;
          const tB = getUltimaActividad(b) ? new Date(getUltimaActividad(b)!).getTime() : 0;
          return tB - tA;
        }
        if (sortBy === 'primer_login') {
          const tA = a.fecha_primer_login ? new Date(a.fecha_primer_login).getTime() : 0;
          const tB = b.fecha_primer_login ? new Date(b.fecha_primer_login).getTime() : 0;
          return tB - tA;
        }
        if (sortBy === 'id') {
          return getUsuarioId(a).localeCompare(getUsuarioId(b));
        }
        return 0;
      });
  }, [cuentas, searchQuery, filterRole, filterAutocheck, sortBy]);

  const exportToCSV = () => {
    if (!filteredCuentas.length) return;
    const headers = [
      'ID_Campus',
      'Nombre',
      'Rol',
      'Primer_Login',
      'Ultima_Actividad',
      'Auto_Check',
      'Ranking_PPS',
      'Password_Guardada',
    ];
    const rows = filteredCuentas.map((c) => [
      `"${getUsuarioId(c)}"`,
      `"${c.nombre || 'No registrado'}"`,
      c.is_admin ? 'Admin' : 'Estudiante',
      `"${c.fecha_primer_login || ''}"`,
      `"${getUltimaActividad(c) || ''}"`,
      c.auto_check_enabled ? 'Activo' : 'Inactivo',
      c.ranking_optin ? 'Opt-in' : 'Off',
      c.tiene_password_guardada ? 'Si' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `upaos_cuentas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const total = cuentas.length;
    const autocheckActivos = cuentas.filter((c) => c.auto_check_enabled).length;
    const rankingActivos = cuentas.filter((c) => c.ranking_optin).length;
    const admins = cuentas.filter((c) => c.is_admin).length;
    return { total, autocheckActivos, rankingActivos, admins };
  }, [cuentas]);

  return (
    <div className="space-y-6">
      {/* Header con botón de acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Directorio & Historial de Cuentas</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {stats.total} registradas
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Auditoría completa de estudiantes, administradores e interacciones
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToCSV}
            disabled={isLoading || !filteredCuentas.length}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:border-slate-600 disabled:opacity-50"
            title="Descargar lista en CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={fetchCuentas}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchCuentas} className="underline text-xs font-medium cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Cuentas</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">
            {isLoading ? '...' : stats.total}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">En base de datos UPAOS</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Auto-Check Activo</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 tracking-tight">
            {isLoading ? '...' : stats.autocheckActivos}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Alertas automáticas ON</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Ranking PPS</span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400 mt-2 tracking-tight">
            {isLoading ? '...' : stats.rankingActivos}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Estudiantes en tabla pública</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Administradores</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400 mt-2 tracking-tight">
            {isLoading ? '...' : stats.admins}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Con permisos de gestión</p>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros Avanzados */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 space-y-3.5 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código de campus (ej. 000123456) o nombre de alumno..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Ordenar por */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="recientes">Última actividad</option>
              <option value="primer_login">Fecha de registro</option>
              <option value="id">ID de Campus</option>
            </select>
          </div>
        </div>

        {/* Chips de filtro */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Rol:
            </span>
            {(['todos', 'estudiantes', 'admins'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  filterRole === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {r === 'todos' ? 'Todos' : r === 'estudiantes' ? 'Estudiantes' : 'Admins'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Auto-Check:</span>
            {(['todos', 'activos', 'inactivos'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setFilterAutocheck(a)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  filterAutocheck === a
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {a === 'todos' ? 'Todos' : a === 'activos' ? 'Activo' : 'Inactivo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Usuario / Estudiante</th>
                <th className="px-6 py-4">ID Campus</th>
                <th className="px-6 py-4">Registro Inicial</th>
                <th className="px-6 py-4">Última Conexión</th>
                <th className="px-6 py-4 text-center">Auto-Check</th>
                <th className="px-6 py-4 text-center">Ranking</th>
                <th className="px-6 py-4 text-center">Rol</th>
                <th className="px-4 py-4 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-400" />
                    <span className="text-sm font-medium">Cargando directorio de cuentas...</span>
                  </td>
                </tr>
              ) : filteredCuentas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-base font-semibold text-slate-300">No se encontraron cuentas</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery
                        ? `No hay resultados que coincidan con "${searchQuery}"`
                        : 'No hay cuentas registradas con los filtros seleccionados'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCuentas.map((cuenta, idx) => {
                  const uid = getUsuarioId(cuenta);
                  const lastAct = getUltimaActividad(cuenta);
                  const { initials, gradient } = getAvatarInfo(cuenta);

                  return (
                    <tr
                      key={uid || idx}
                      onClick={() => setSelectedCuenta(cuenta)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Avatar y Nombre */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors block truncate">
                              {cuenta.nombre || 'Estudiante UPAO'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {cuenta.is_admin ? 'Administrador del sistema' : 'Alumno registrado'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ID Campus */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
                          <span>{uid || '—'}</span>
                          {uid && (
                            <button
                              onClick={(e) => handleCopy(uid, e)}
                              className="text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Copiar código"
                            >
                              {copiedId === uid ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Fecha de Registro Inicial */}
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {cuenta.fecha_primer_login ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {new Date(cuenta.fecha_primer_login).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Última Actividad */}
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {lastAct ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>
                              {new Date(lastAct).toLocaleString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Sin actividad</span>
                        )}
                      </td>

                      {/* Auto-check */}
                      <td className="px-6 py-4 text-center">
                        {cuenta.auto_check_enabled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ON</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950 text-slate-500 border border-slate-800">
                            <XCircle className="w-3 h-3" />
                            <span>OFF</span>
                          </span>
                        )}
                      </td>

                      {/* Ranking */}
                      <td className="px-6 py-4 text-center">
                        {cuenta.ranking_optin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                            <UserCheck className="w-3 h-3" />
                            <span>Visible</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950 text-slate-500 border border-slate-800">
                            Privado
                          </span>
                        )}
                      </td>

                      {/* Rol */}
                      <td className="px-6 py-4 text-center">
                        {cuenta.is_admin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <Shield className="w-3 h-3 text-purple-400" />
                            <span>ADMIN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                            Alumno
                          </span>
                        )}
                      </td>

                      {/* Botón Ver Ficha */}
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCuenta(cuenta);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer"
                          title="Ver ficha completa"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Ficha de Cuenta */}
      {selectedCuenta && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedCuenta(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-indigo-950/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                    getAvatarInfo(selectedCuenta).gradient
                  } flex items-center justify-center text-white font-bold text-base shadow-lg`}
                >
                  {getAvatarInfo(selectedCuenta).initials}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {selectedCuenta.nombre || 'Estudiante UPAO'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-indigo-400">
                      ID: {getUsuarioId(selectedCuenta)}
                    </span>
                    <button
                      onClick={() => handleCopy(getUsuarioId(selectedCuenta))}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      title="Copiar ID"
                    >
                      {copiedId === getUsuarioId(selectedCuenta) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCuenta(null)}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido de la Ficha */}
            <div className="p-6 space-y-5">
              {/* Resumen de Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 block font-medium">Rol en UPAOS</span>
                  <div className="mt-1 flex items-center gap-1.5 font-semibold text-sm">
                    {selectedCuenta.is_admin ? (
                      <span className="text-purple-400 flex items-center gap-1">
                        <Shield className="w-4 h-4" /> Administrador
                      </span>
                    ) : (
                      <span className="text-slate-200 flex items-center gap-1">
                        <Users className="w-4 h-4" /> Estudiante
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 block font-medium">Credencial en DB</span>
                  <div className="mt-1 flex items-center gap-1.5 font-semibold text-sm">
                    {selectedCuenta.tiene_password_guardada ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Key className="w-4 h-4" /> Guardada (cifrada)
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Key className="w-4 h-4" /> No almacenada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tiempos e Interacciones */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Historial de Conexiones
                </h4>

                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Primer inicio de sesión:
                  </span>
                  <span className="font-medium text-white">
                    {selectedCuenta.fecha_primer_login
                      ? new Date(selectedCuenta.fecha_primer_login).toLocaleString('es-PE', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Sin registro'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Última actividad registrada:
                  </span>
                  <span className="font-medium text-white">
                    {getUltimaActividad(selectedCuenta)
                      ? new Date(getUltimaActividad(selectedCuenta)!).toLocaleString('es-PE', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Sin actividad'}
                  </span>
                </div>
              </div>

              {/* Preferencias y Módulos Activos */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Configuraciones del Usuario
                </h4>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
                  <div>
                    <span className="font-medium text-white block">Auto-Check de Notas</span>
                    <span className="text-[11px] text-slate-400">
                      Revisión automática periódica en segundo plano
                    </span>
                  </div>
                  {selectedCuenta.auto_check_enabled ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      Habilitado
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                      Desactivado
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs py-1.5">
                  <div>
                    <span className="font-medium text-white block">Participación en Ranking PPS</span>
                    <span className="text-[11px] text-slate-400">
                      Visibilidad en la tabla general de promedios
                    </span>
                  </div>
                  {selectedCuenta.ranking_optin ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                      Opt-in Activo
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                      Anónimo / No
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCuenta(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
