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
  LayoutGrid,
  List,
  Code2,
  FileText,
  Sparkles,
} from 'lucide-react';

export function CuentasView() {
  const [cuentas, setCuentas] = useState<AdminCuenta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modo de visualización: grid interactivo o tabla compacta
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filtros y ordenación
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'todos' | 'estudiantes' | 'admins'>('todos');
  const [filterAutocheck, setFilterAutocheck] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [sortBy, setSortBy] = useState<'recientes' | 'primer_login' | 'id' | 'nombre'>('recientes');

  // Slide-over drawer y tabs internas
  const [selectedCuenta, setSelectedCuenta] = useState<AdminCuenta | null>(null);
  const [drawerTab, setDrawerTab] = useState<'resumen' | 'raw'>('resumen');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

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

  const handleCopyReport = (c: AdminCuenta) => {
    const report = `[REPORTE DE USUARIO UPAOS]\nID Campus: ${getUsuarioId(c)}\nNombre: ${c.nombre || 'No registrado'}\nRol: ${c.is_admin ? 'Admin' : 'Estudiante'}\nPrimer Login: ${c.fecha_primer_login || 'N/A'}\nÚltima Actividad: ${getUltimaActividad(c) || 'N/A'}\nAuto-Check: ${c.auto_check_enabled ? 'Activado' : 'Desactivado'}\nRanking PPS: ${c.ranking_optin ? 'Visible' : 'Privado'}\nCredencial Almacenada: ${c.tiene_password_guardada ? 'Sí (Cifrada)' : 'No'}`;
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const getAvatarInfo = (c: AdminCuenta) => {
    const id = getUsuarioId(c);
    const nombre = c.nombre?.trim();
    let initials = 'UP';
    if (nombre) {
      const parts = nombre.split(' ');
      initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2);
    } else if (id) {
      initials = id.slice(-2);
    }

    const palettes = [
      { gradient: 'from-indigo-600 via-indigo-500 to-blue-500', text: 'text-white', glow: 'shadow-indigo-500/25' },
      { gradient: 'from-purple-600 via-fuchsia-500 to-pink-500', text: 'text-white', glow: 'shadow-purple-500/25' },
      { gradient: 'from-emerald-600 via-teal-500 to-cyan-500', text: 'text-white', glow: 'shadow-emerald-500/25' },
      { gradient: 'from-amber-600 via-orange-500 to-rose-500', text: 'text-white', glow: 'shadow-amber-500/25' },
      { gradient: 'from-cyan-600 via-blue-500 to-indigo-500', text: 'text-white', glow: 'shadow-cyan-500/25' },
      { gradient: 'from-rose-600 via-pink-500 to-purple-500', text: 'text-white', glow: 'shadow-rose-500/25' },
    ];
    const index = Math.abs(id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % palettes.length;
    return { initials: initials.toUpperCase(), ...palettes[index] };
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
        if (sortBy === 'nombre') {
          return (a.nombre || '').localeCompare(b.nombre || '');
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
      {/* Header con botón de exportar y switch de vista */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 border border-white/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Directorio & Historial de Cuentas
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  {stats.total} registradas
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Auditoría completa de estudiantes, administradores y parámetros de sincronización
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          {/* Toggle Vista Grid / Tabla */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-white/[0.08] shadow-inner">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista de Fichas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Fichas</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista de Tabla"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
          </div>

          <button
            onClick={exportToCSV}
            disabled={isLoading || !filteredCuentas.length}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass-panel-interactive text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Exportar archivo CSV para Excel"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={fetchCuentas}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-indigo-600/25 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchCuentas} className="underline text-xs font-medium cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-panel rounded-2xl p-4.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Cuentas
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 tracking-tight">
            {isLoading ? '...' : stats.total}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>Registros en PostgreSQL</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Auto-Check Activo
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 mt-3 tracking-tight">
            {isLoading ? '...' : stats.autocheckActivos}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Alertas de notas en segundo plano</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ranking PPS
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-cyan-400 mt-3 tracking-tight">
            {isLoading ? '...' : stats.rankingActivos}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Visibles en tabla de puestos</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Administradores
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-400 mt-3 tracking-tight">
            {isLoading ? '...' : stats.admins}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Acceso al panel de control</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Buscador */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código (ej. 000279330) o por nombre..."
              className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all"
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

          {/* Selector de ordenación */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="recientes">Última actividad</option>
              <option value="primer_login">Fecha de registro</option>
              <option value="nombre">Nombre A-Z</option>
              <option value="id">ID de Campus</option>
            </select>
          </div>
        </div>

        {/* Chips de filtro */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-white/[0.06]">
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
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-black/30 text-slate-400 hover:text-white hover:bg-slate-800/60'
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
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-black/30 text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {a === 'todos' ? 'Todos' : a === 'activos' ? 'Activo' : 'Inactivo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenedor Principal: Grid de Fichas o Tabla */}
      {isLoading ? (
        <div className="glass-panel rounded-3xl p-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
          <span className="text-sm font-medium">Cargando directorio de estudiantes...</span>
        </div>
      ) : filteredCuentas.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="text-base font-semibold text-slate-300">No se encontraron cuentas</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery
              ? `No hay registros que coincidan con "${searchQuery}"`
              : 'No hay cuentas registradas con los filtros seleccionados.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISTA GRID DE FICHAS */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCuentas.map((cuenta, idx) => {
            const uid = getUsuarioId(cuenta);
            const lastAct = getUltimaActividad(cuenta);
            const { initials, gradient, glow } = getAvatarInfo(cuenta);

            return (
              <div
                key={uid || idx}
                onClick={() => {
                  setSelectedCuenta(cuenta);
                  setDrawerTab('resumen');
                }}
                className="glass-panel-interactive rounded-2xl p-5 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Indicador de rol en esquina */}
                <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none overflow-hidden">
                  {cuenta.is_admin && (
                    <div className="absolute top-3 right-[-32px] transform rotate-45 bg-purple-600 text-white text-[9px] font-extrabold uppercase py-0.5 px-8 text-center shadow-lg">
                      ADMIN
                    </div>
                  )}
                </div>

                <div>
                  {/* Avatar + Nombre + ID */}
                  <div className="flex items-start gap-3.5 pr-8">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-extrabold text-sm shadow-lg ${glow} shrink-0 border border-white/20`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {cuenta.nombre || 'Estudiante UPAO'}
                      </h3>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-black/40 border border-white/[0.08] text-slate-300">
                          {uid}
                        </span>
                        <button
                          onClick={(e) => handleCopy(uid, e)}
                          className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                          title="Copiar ID"
                        >
                          {copiedId === uid ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Badges de Flags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-white/[0.06]">
                    {cuenta.auto_check_enabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Auto-Check
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/30 text-slate-500 border border-white/[0.05]">
                        <XCircle className="w-3 h-3" /> Sin Auto-Check
                      </span>
                    )}

                    {cuenta.ranking_optin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <UserCheck className="w-3 h-3" /> Ranking PPS
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/30 text-slate-500 border border-white/[0.05]">
                        Ranking Privado
                      </span>
                    )}

                    {cuenta.tiene_password_guardada && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <Key className="w-3 h-3" /> Cifrado
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer de la tarjeta con fechas y botón abrir */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">
                      {lastAct
                        ? `Activo: ${new Date(lastAct).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                          })}`
                        : 'Sin actividad'}
                    </span>
                  </div>

                  <span className="text-indigo-400 font-semibold text-xs group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                    Ficha <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA TABLA COMPACTA ENTERPRISE */
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-black/50 border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Usuario / Estudiante</th>
                  <th className="px-6 py-4">ID Campus</th>
                  <th className="px-6 py-4">Primer Acceso</th>
                  <th className="px-6 py-4">Última Actividad</th>
                  <th className="px-6 py-4 text-center">Auto-Check</th>
                  <th className="px-6 py-4 text-center">Ranking</th>
                  <th className="px-6 py-4 text-center">Rol</th>
                  <th className="px-4 py-4 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredCuentas.map((cuenta, idx) => {
                  const uid = getUsuarioId(cuenta);
                  const lastAct = getUltimaActividad(cuenta);
                  const { initials, gradient } = getAvatarInfo(cuenta);

                  return (
                    <tr
                      key={uid || idx}
                      onClick={() => {
                        setSelectedCuenta(cuenta);
                        setDrawerTab('resumen');
                      }}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-xs shadow shrink-0 border border-white/20`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors block truncate">
                              {cuenta.nombre || 'Estudiante UPAO'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {cuenta.is_admin ? 'Administrador' : 'Estudiante'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-slate-200">
                          <span>{uid}</span>
                          <button
                            onClick={(e) => handleCopy(uid, e)}
                            className="text-slate-500 hover:text-white cursor-pointer"
                          >
                            {copiedId === uid ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
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

                      <td className="px-6 py-4 text-xs text-slate-300">
                        {lastAct
                          ? new Date(lastAct).toLocaleString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {cuenta.auto_check_enabled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> ON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-black/30 text-slate-500 border border-white/[0.05]">
                            <XCircle className="w-3 h-3" /> OFF
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {cuenta.ranking_optin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <UserCheck className="w-3 h-3" /> Sí
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs text-slate-500">
                            No
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {cuenta.is_admin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <Shield className="w-3 h-3 text-purple-400" /> ADMIN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs text-slate-400">
                            Alumno
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCuenta(cuenta);
                            setDrawerTab('resumen');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER MODERNO (Panel lateral deslizante de alta fidelidad) */}
      {selectedCuenta && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex justify-end"
          onClick={() => setSelectedCuenta(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0c1017] border-l border-white/[0.08] h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div>
              <div className="p-6 border-b border-white/[0.08] bg-black/30 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${
                      getAvatarInfo(selectedCuenta).gradient
                    } flex items-center justify-center text-white font-extrabold text-lg shadow-xl ${
                      getAvatarInfo(selectedCuenta).glow
                    } border border-white/20`}
                  >
                    {getAvatarInfo(selectedCuenta).initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {selectedCuenta.nombre || 'Estudiante UPAO'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] text-indigo-300">
                        {getUsuarioId(selectedCuenta)}
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
                  className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs dentro del Drawer */}
              <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/[0.06]">
                <button
                  onClick={() => setDrawerTab('resumen')}
                  className={`flex items-center gap-1.5 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    drawerTab === 'resumen'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Resumen de Ficha</span>
                </button>
                <button
                  onClick={() => setDrawerTab('raw')}
                  className={`flex items-center gap-1.5 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    drawerTab === 'raw'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Datos Técnicos (JSON)</span>
                </button>
              </div>

              {/* Contenido según tab */}
              <div className="p-6 space-y-5">
                {drawerTab === 'resumen' ? (
                  <>
                    {/* Status Pills Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-panel rounded-xl p-3.5">
                        <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">
                          Rol UPAOS
                        </span>
                        <div className="mt-1.5 font-bold text-sm">
                          {selectedCuenta.is_admin ? (
                            <span className="text-purple-400 flex items-center gap-1.5">
                              <Shield className="w-4 h-4" /> Administrador
                            </span>
                          ) : (
                            <span className="text-slate-200 flex items-center gap-1.5">
                              <Users className="w-4 h-4" /> Alumno Regular
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="glass-panel rounded-xl p-3.5">
                        <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">
                          Credencial Cifrada
                        </span>
                        <div className="mt-1.5 font-bold text-sm">
                          {selectedCuenta.tiene_password_guardada ? (
                            <span className="text-emerald-400 flex items-center gap-1.5">
                              <Key className="w-4 h-4" /> Almacenada
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <Key className="w-4 h-4" /> No guardada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline de Acceso */}
                    <div className="glass-panel rounded-2xl p-4.5 space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Línea Temporal de Actividad</span>
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-start justify-between py-1 border-b border-white/[0.05]">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Primer Login Registrado:
                          </span>
                          <span className="font-semibold text-white">
                            {selectedCuenta.fecha_primer_login
                              ? new Date(selectedCuenta.fecha_primer_login).toLocaleString('es-PE', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'No registrado'}
                          </span>
                        </div>

                        <div className="flex items-start justify-between py-1">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" /> Última Interacción:
                          </span>
                          <span className="font-semibold text-emerald-400">
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
                    </div>

                    {/* Configuraciones de Usuario */}
                    <div className="glass-panel rounded-2xl p-4.5 space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Módulos y Permisos</span>
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                          <div>
                            <span className="font-semibold text-white block">Auto-Check de Notas</span>
                            <span className="text-[11px] text-slate-400">
                              Sondeo de Banner en segundo plano
                            </span>
                          </div>
                          {selectedCuenta.auto_check_enabled ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Activo
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                              Inactivo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1.5">
                          <div>
                            <span className="font-semibold text-white block">Ranking PPS</span>
                            <span className="text-[11px] text-slate-400">
                              Visibilidad en leaderboard de promedios
                            </span>
                          </div>
                          {selectedCuenta.ranking_optin ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                              Opt-in Activo
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                              Privado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* TAB JSON TÉCNICO */
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Registro crudo extraído directamente desde la tabla <code className="text-indigo-400 font-mono">usersettings</code>:
                    </p>
                    <pre className="p-4 rounded-xl bg-black/60 border border-white/[0.08] text-indigo-300 font-mono text-xs overflow-x-auto leading-relaxed">
                      {JSON.stringify(selectedCuenta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer con Acciones */}
            <div className="p-6 border-t border-white/[0.08] bg-black/40 flex items-center justify-between gap-3">
              <button
                onClick={() => handleCopyReport(selectedCuenta)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass-panel text-xs font-semibold text-white hover:border-indigo-500/50 transition-all cursor-pointer"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Reporte Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Copiar Ficha Resumen</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedCuenta(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

