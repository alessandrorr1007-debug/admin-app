// Palabras cortas que no se capitalizan en títulos
const palabrasCortas = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u',
  'en', 'a', 'para', 'por', 'con', 'al', 'un', 'una',
]);

export function toTitleCase(texto?: string | null): string {
  const t = (texto ?? '').trim();
  if (!t) return '';
  return t
    .toLowerCase()
    .split(' ')
    .map((palabra) => {
      if (!palabra) return '';
      if (palabrasCortas.has(palabra)) return palabra;
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(' ');
}

// Paleta de colores para cursos idéntica a la app móvil
const cursoPalette = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#0D9488', // Teal
  '#D97706', // Amber
  '#EF4444', // Red
  '#16A34A', // Green
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Cyan
  '#F97316', // Orange
];

export function cursoColor(nombre?: string | null): string {
  const base = (nombre || 'curso').toLowerCase();
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) % 100000;
  }
  return cursoPalette[Math.abs(hash) % cursoPalette.length];
}

export function isPendiente(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  return s === '' || s === 'null' || s === '--' || s === '-';
}

export function gradeValue(value: unknown): number | null {
  if (isPendiente(value)) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim());
  return isNaN(n) ? null : n;
}

export function gradeColor(value: unknown): string {
  if (isPendiente(value)) return '#8E95A2'; // UpaoGray
  const v = gradeValue(value);
  if (v !== null) {
    return v >= 10.5 ? '#16A34A' : '#DC2626'; // Green vs Red
  }
  return '#8E95A2';
}

export function formatNota(value: unknown): string {
  if (isPendiente(value)) return '--';
  const v = gradeValue(value);
  if (v === null) return String(value);
  const r = Math.round(v * 100) / 100;
  return r % 1 === 0 ? r.toString() : r.toFixed(2);
}

export function formatPromedio(value: unknown): string {
  if (isPendiente(value)) return '--';
  const v = gradeValue(value);
  if (v === null) return '--';
  return (Math.round(v * 100) / 100).toFixed(2);
}

function esPeriodoRegular(code: string): boolean {
  const s = code.trim();
  return s.endsWith('10') || s.endsWith('20');
}

export function detectarPeriodoActual(periodos: string[], periodoActual?: string | null): string {
  const regulares = periodos.filter(esPeriodoRegular);
  if (regulares.length > 0) {
    const ordenados = [...regulares].sort().reverse();
    return ordenados[0];
  }
  if (periodoActual && esPeriodoRegular(periodoActual)) {
    return periodoActual;
  }
  return periodos[0] || '202610';
}

export function tiempoRelativo(fechaStr?: string | null): string {
  if (!fechaStr) return '';
  try {
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMins / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMins < 1) return 'Hace unos momentos';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    return `Hace ${diffDias} d`;
  } catch {
    return fechaStr;
  }
}
