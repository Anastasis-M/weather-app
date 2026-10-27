export type SunDay = { sunrise: string; sunset: string };

export type SunState =
  | { phase: 'day'; progress: number; left: number; length: number; sunrise: string; sunset: string }
  | { phase: 'night'; progress: number; untilRise: number; length: number; sunrise: string; sunset: string };

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
      ...today,
    };
  }
  if (nowMs < set) {
    return { phase: 'day', progress: (nowMs - rise) / (set - rise), left: set - nowMs, length: set - rise, ...today };
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
    ...tomorrow,
  };
}
