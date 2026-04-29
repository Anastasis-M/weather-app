export const round = (n: number) => Math.round(n);

export function fmtTemp(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${Math.round(n)}°`;
}

export function fmtTime(iso: string | null | undefined, tz?: string, locale?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString(locale ?? [], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
}

export const fmtHour = fmtTime;

export function fmtDayShort(iso: string, tz?: string, locale?: string): string {
  return new Date(iso).toLocaleDateString(locale ?? [], { weekday: 'short', timeZone: tz });
}

export function fmtDayLong(iso: string, tz?: string, locale?: string): string {
  return new Date(iso).toLocaleDateString(locale ?? [], { weekday: 'long', timeZone: tz });
}

export function fmtDate(iso: string, tz?: string, locale?: string): string {
  return new Date(iso).toLocaleDateString(locale ?? [], { day: '2-digit', month: '2-digit', timeZone: tz });
}

export function isSameYMD(aIso: string, bIso: string, tz?: string): boolean {
  const a = new Date(aIso).toLocaleDateString('en-CA', { timeZone: tz });
  const b = new Date(bIso).toLocaleDateString('en-CA', { timeZone: tz });
  return a === b;
}

const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

// Returns the *English/key* compass code; pass through t('c.' + code) for localization.
export function compassCode(deg: number | null | undefined): string {
  if (deg == null) return '';
  return COMPASS[Math.round(deg / 22.5) % 16];
}

// Beaufort scale from km/h. Returns the integer force (0–12).
export function kmhToBeaufort(kmh: number | null | undefined): number {
  if (kmh == null || Number.isNaN(kmh)) return 0;
  const v = Math.max(0, kmh);
  if (v < 1)    return 0;
  if (v <= 5)   return 1;
  if (v <= 11)  return 2;
  if (v <= 19)  return 3;
  if (v <= 28)  return 4;
  if (v <= 38)  return 5;
  if (v <= 49)  return 6;
  if (v <= 61)  return 7;
  if (v <= 74)  return 8;
  if (v <= 88)  return 9;
  if (v <= 102) return 10;
  if (v <= 117) return 11;
  return 12;
}

export type UvKey = 'uv.low' | 'uv.moderate' | 'uv.high' | 'uv.very_high' | 'uv.extreme' | '';

export function uvLevel(v: number | null | undefined): { key: UvKey; tone: string } {
  if (v == null) return { key: '', tone: 'text-sub' };
  if (v < 3)  return { key: 'uv.low',       tone: 'text-emerald-400' };
  if (v < 6)  return { key: 'uv.moderate',  tone: 'text-yellow-400' };
  if (v < 8)  return { key: 'uv.high',      tone: 'text-orange-400' };
  if (v < 11) return { key: 'uv.very_high', tone: 'text-red-400' };
  return { key: 'uv.extreme', tone: 'text-fuchsia-400' };
}
