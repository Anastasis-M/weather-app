const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;

export type MoonPhaseKey =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

const PHASES: MoonPhaseKey[] = [
  'new',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
];

export type MoonPhase = { cycle: number; illumination: number; key: MoonPhaseKey };

export function moonPhase(utcMs: number): MoonPhase {
  const days = (utcMs - KNOWN_NEW_MOON_MS) / DAY_MS;
  const cycle = (((days / SYNODIC_MONTH_DAYS) % 1) + 1) % 1;
  const illumination = (1 - Math.cos(2 * Math.PI * cycle)) / 2;
  return { cycle, illumination, key: PHASES[Math.round(cycle * PHASES.length) % PHASES.length] };
}

export function moonLitPath(cycle: number, cx: number, cy: number, r: number): string {
  const terminator = Math.cos(2 * Math.PI * cycle);
  const rx = Math.abs(terminator) * r;
  const waxing = cycle < 0.5;
  const outerSweep = waxing ? 1 : 0;
  const crescent = terminator > 0;
  const innerSweep = waxing === crescent ? 0 : 1;
  return `M${cx},${cy - r} A${r},${r} 0 0 ${outerSweep} ${cx},${cy + r} A${rx},${r} 0 0 ${innerSweep} ${cx},${cy - r} Z`;
}
