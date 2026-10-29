import { kmhToBeaufort } from '#lib/format.js';

export type DayHour = {
  time: string;
  temp: number;
  precip: number;
  precipHigh: number;
  pop: number;
  wind: number;
};

export type DayTotals = { max: number; min: number; sum: number; wettestModelSum: number | null; gusts: number };

export type SummaryLine =
  | { kind: 'rain'; from: string; to: string; mm: number }
  | { kind: 'rain_possible'; mm: number }
  | { kind: 'chance'; pop: number }
  | { kind: 'dry' }
  | { kind: 'temp'; max: number; at: string; min: number }
  | { kind: 'wind'; bf: number; gusts: number };

const WET_MM = 0.1;
const CHANCE_POP = 30;
const WINDY_BF = 4;

const clock = (time: string) => time.slice(11, 16);

function rainLine(hours: DayHour[], { sum, wettestModelSum }: DayTotals): SummaryLine {
  const wet = hours.filter((h) => h.precip >= WET_MM);
  if (wet.length) return { kind: 'rain', from: clock(wet[0].time), to: clock(wet[wet.length - 1].time), mm: sum };
  if (hours.some((h) => h.precipHigh >= WET_MM)) {
    return { kind: 'rain_possible', mm: wettestModelSum ?? Math.max(...hours.map((h) => h.precipHigh)) };
  }
  const pop = Math.max(0, ...hours.map((h) => h.pop));
  return pop >= CHANCE_POP ? { kind: 'chance', pop } : { kind: 'dry' };
}

export function daySummary(hours: DayHour[], totals: DayTotals): SummaryLine[] {
  if (!hours.length) return [];
  const warmest = hours.reduce((a, b) => (b.temp > a.temp ? b : a));
  const lines: SummaryLine[] = [
    { kind: 'temp', max: totals.max, at: clock(warmest.time), min: totals.min },
    rainLine(hours, totals),
  ];
  const bf = kmhToBeaufort(Math.max(...hours.map((h) => h.wind)));
  if (bf >= WINDY_BF) lines.push({ kind: 'wind', bf, gusts: totals.gusts });
  return lines;
}
