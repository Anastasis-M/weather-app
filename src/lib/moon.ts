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

const HOUR_MS = 3_600_000;
const RAD = Math.PI / 180;
const OBLIQUITY = 23.4397 * RAD;
const J2000_FROM_EPOCH_DAYS = 10_957.5;
const HORIZON = 0.133 * RAD;

export function moonAltitude(utcMs: number, lat: number, lon: number): number {
  const d = utcMs / DAY_MS - J2000_FROM_EPOCH_DAYS;
  const meanLongitude = RAD * (218.316 + 13.176396 * d);
  const meanAnomaly = RAD * (134.963 + 13.064993 * d);
  const meanDistance = RAD * (93.272 + 13.22935 * d);
  const l = meanLongitude + RAD * 6.289 * Math.sin(meanAnomaly);
  const b = RAD * 5.128 * Math.sin(meanDistance);
  const ra = Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l));
  const hourAngle = RAD * (280.16 + 360.9856235 * d) + RAD * lon - ra;
  const phi = RAD * lat;
  const h = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle));
  return h + (RAD * 0.017) / Math.tan(h + (RAD * 10.26) / (h + RAD * 5.1));
}

export type MoonEvents = { rise: number[]; set: number[] };

export function moonEvents(fromUtcMs: number, hours: number, lat: number, lon: number): MoonEvents {
  const events: MoonEvents = { rise: [], set: [] };
  const alt = (i: number) => moonAltitude(fromUtcMs + i * HOUR_MS, lat, lon) - HORIZON;
  let h0 = alt(0);
  for (let i = 1; i < hours; i += 2) {
    const h1 = alt(i);
    const h2 = alt(i + 1);
    const a = (h0 + h2) / 2 - h1;
    const b = (h2 - h0) / 2;
    const vertex = -b / (2 * a);
    const peak = (a * vertex + b) * vertex + h1;
    const disc = b * b - 4 * a * h1;
    if (disc >= 0) {
      const dx = Math.sqrt(disc) / (Math.abs(a) * 2);
      const roots = [vertex - dx, vertex + dx].filter((x) => Math.abs(x) <= 1);
      const at = (x: number) => fromUtcMs + (i + x) * HOUR_MS;
      if (roots.length === 1) (h0 < 0 ? events.rise : events.set).push(at(roots[0]));
      if (roots.length === 2) {
        events.rise.push(at(peak < 0 ? roots[1] : roots[0]));
        events.set.push(at(peak < 0 ? roots[0] : roots[1]));
      }
    }
    h0 = h2;
  }
  return events;
}

export function daysUntilPhase(cycle: number, target: number): number {
  return (((target - cycle) % 1) + 1) % 1 * SYNODIC_MONTH_DAYS;
}
