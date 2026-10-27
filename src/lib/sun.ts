import { skyOf, type Sky } from './wmo';

export type SunDay = { sunrise: string; sunset: string };

type Arc = { arcStart: number; arcEnd: number; sunrise: string; sunset: string };

export type SunState =
  | ({ phase: 'day'; progress: number; left: number; length: number } & Arc)
  | ({ phase: 'night'; progress: number; untilRise: number; length: number } & Arc);

export type SkySpan = { from: number; to: number; sky: Sky; code: number };

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const localMs = (iso: string) => Date.parse(`${iso}Z`);

export function localNowMs(utcOffsetSeconds: number, now = Date.now()): number {
  return now + utcOffsetSeconds * 1000;
}

export function sunState(nowMs: number, today: SunDay, tomorrow: SunDay | null): SunState | null {
  const rise = localMs(today.sunrise);
  const set = localMs(today.sunset);
  if (Number.isNaN(rise) || Number.isNaN(set) || set <= rise) return null;

  if (nowMs < rise) {
    const nightStart = set - DAY_MS;
    return {
      phase: 'night',
      progress: Math.max(0, (nowMs - nightStart) / (rise - nightStart)),
      untilRise: rise - nowMs,
      length: set - rise,
      arcStart: nightStart,
      arcEnd: rise,
      ...today,
    };
  }
  if (nowMs < set) {
    return {
      phase: 'day',
      progress: (nowMs - rise) / (set - rise),
      left: set - nowMs,
      length: set - rise,
      arcStart: rise,
      arcEnd: set,
      ...today,
    };
  }
  if (!tomorrow) return null;
  const nextRise = localMs(tomorrow.sunrise);
  const nextSet = localMs(tomorrow.sunset);
  if (Number.isNaN(nextRise) || Number.isNaN(nextSet) || nextSet <= nextRise) return null;
  return {
    phase: 'night',
    progress: Math.min(1, (nowMs - set) / (nextRise - set)),
    untilRise: nextRise - nowMs,
    length: nextSet - nextRise,
    arcStart: set,
    arcEnd: nextRise,
    ...tomorrow,
  };
}

export function skySpans(state: SunState, times: string[], codes: number[]): SkySpan[] {
  const span = state.arcEnd - state.arcStart;
  const spans: SkySpan[] = [];
  times.forEach((time, i) => {
    const start = localMs(time);
    const from = Math.max(0, (start - state.arcStart) / span);
    const to = Math.min(1, (start + HOUR_MS - state.arcStart) / span);
    if (to <= from || codes[i] == null) return;
    const sky = skyOf(codes[i]);
    const last = spans[spans.length - 1];
    if (last && last.sky === sky && Math.abs(last.to - from) < 1e-9) last.to = to;
    else spans.push({ from, to, sky, code: codes[i] });
  });
  return spans;
}
