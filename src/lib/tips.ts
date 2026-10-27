import { kmhToBeaufort } from '#lib/format.js';
import { isPrecipitation, SUNNY_CODES } from '#lib/wmo.js';

export type TipHourly = {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  relative_humidity_2m: number[];
  is_day: number[];
  uv_index: number[];
};

export type TipInput = { now: string; hourly: TipHourly; aqi: number | null };

export type RainHour = { hour: string; pop: number; mm: number; wet: boolean; past: boolean };

export type Umbrella = { hours: RainHour[]; from: string; to: string; peak: number; total: number };

export type Tip =
  | { kind: 'frost'; temp: number; at: string }
  | { kind: 'heat'; temp: number; at: string }
  | { kind: 'air'; aqi: number }
  | { kind: 'layer'; now: number; low: number; at: string }
  | { kind: 'sunscreen'; uv: number; from: string; to: string }
  | { kind: 'outside'; from: string; to: string; temp: number }
  | { kind: 'laundry'; until: string }
  | { kind: 'wind'; bf: number; from: string };

export type TipKind = Tip['kind'];

const MAX_ROWS = 3;

const RAINY_POP = 50;
const DRY_POP = 30;
const DRYING_POP = 20;
const FROST_MAX = 0;
const HEAT_FEELS_LIKE = 33;
const POOR_AQI = 60;
const LAYER_DROP = 6;
const HIGH_UV = 6;
const COMFORT_MIN = 15;
const COMFORT_MAX = 27;
const WINDY_BF = 5;
const BREEZY_BF = 3;
const DRYING_HUMIDITY = 70;
const STRIP_FIRST_HOUR = 6;
const FROST_LAST_HOUR = 9;
const NIGHT_ENDS_HOUR = 6;

const hourOf = (iso: string) => Number(iso.slice(11, 13));
const clock = (iso: string) => iso.slice(11, 16);
const clockAfter = (iso: string) => `${String((hourOf(iso) + 1) % 24).padStart(2, '0')}:00`;

function firstRun(idx: number[], ok: (i: number) => boolean, minLength: number): number[] {
  let run: number[] = [];
  for (const i of idx) {
    if (ok(i)) run.push(i);
    else if (run.length >= minLength) return run;
    else run = [];
  }
  return run.length >= minLength ? run : [];
}

function argExtreme(idx: number[], values: number[], pick: (a: number, b: number) => boolean): number {
  return idx.reduce((best, i) => (pick(values[i], values[best]) ? i : best), idx[0]);
}

export function todayTips({ now, hourly: h, aqi }: TipInput): { umbrella: Umbrella | null; tips: Tip[] } {
  const today = now.slice(0, 10);
  const nowHour = now.slice(0, 13);
  const todayIdx = h.time.flatMap((t, i) => (t.startsWith(today) ? [i] : []));
  const start = todayIdx.find((i) => h.time[i].slice(0, 13) >= nowHour) ?? todayIdx[todayIdx.length - 1];
  const rest = todayIdx.filter((i) => i >= start);

  const hours = todayIdx
    .filter((i) => hourOf(h.time[i]) >= STRIP_FIRST_HOUR)
    .map((i) => {
      const pop = h.precipitation_probability[i] ?? 0;
      return { hour: clock(h.time[i]), pop, mm: h.precipitation[i] ?? 0, wet: pop >= RAINY_POP, past: i < start };
    });
  const pops = rest.map((i) => h.precipitation_probability[i] ?? 0);
  const peak = Math.round(Math.max(0, ...pops));
  const wetIdx = rest.filter((i) => (h.precipitation_probability[i] ?? 0) >= RAINY_POP);
  const umbrella: Umbrella | null = wetIdx.length
    ? {
        hours,
        peak,
        total: rest.reduce((sum, i) => sum + (h.precipitation[i] ?? 0), 0),
        from: clock(h.time[wetIdx[0]]),
        to: clockAfter(h.time[wetIdx[wetIdx.length - 1]]),
      }
    : null;

  const tips: Tip[] = [];

  const tonightIsTomorrowMorning = hourOf(now) >= NIGHT_ENDS_HOUR;
  const overnight: number[] = [];
  for (let i = start; i < h.time.length; i++) {
    const morningOver = hourOf(h.time[i]) > FROST_LAST_HOUR;
    if (morningOver && (!tonightIsTomorrowMorning || !h.time[i].startsWith(today))) break;
    overnight.push(i);
  }
  const coldest = argExtreme(overnight, h.temperature_2m, (a, b) => a < b);
  if (h.temperature_2m[coldest] <= FROST_MAX) {
    tips.push({ kind: 'frost', temp: Math.round(h.temperature_2m[coldest]), at: clock(h.time[coldest]) });
  }

  const hottest = argExtreme(rest, h.apparent_temperature, (a, b) => a > b);
  if (h.apparent_temperature[hottest] >= HEAT_FEELS_LIKE) {
    tips.push({ kind: 'heat', temp: Math.round(h.apparent_temperature[hottest]), at: clock(h.time[hottest]) });
  }

  if (aqi != null && aqi > POOR_AQI) tips.push({ kind: 'air', aqi: Math.round(aqi) });

  const lowest = argExtreme(rest, h.temperature_2m, (a, b) => a < b);
  if (h.temperature_2m[start] - h.temperature_2m[lowest] >= LAYER_DROP) {
    tips.push({
      kind: 'layer',
      now: Math.round(h.temperature_2m[start]),
      low: Math.round(h.temperature_2m[lowest]),
      at: clock(h.time[lowest]),
    });
  }

  const sunny = rest.filter((i) => h.uv_index[i] >= HIGH_UV);
  if (sunny.length) {
    tips.push({
      kind: 'sunscreen',
      uv: Math.round(Math.max(...sunny.map((i) => h.uv_index[i]))),
      from: clock(h.time[sunny[0]]),
      to: clockAfter(h.time[sunny[sunny.length - 1]]),
    });
  }

  const dry = (i: number, maxPop: number) =>
    h.is_day[i] === 1 && (h.precipitation_probability[i] ?? 0) < maxPop && !isPrecipitation(h.weather_code[i]);

  const pleasant = firstRun(
    rest,
    (i) =>
      dry(i, DRY_POP) &&
      h.temperature_2m[i] >= COMFORT_MIN &&
      h.temperature_2m[i] <= COMFORT_MAX &&
      h.uv_index[i] < HIGH_UV,
    2,
  );
  if (pleasant.length) {
    tips.push({
      kind: 'outside',
      from: clock(h.time[pleasant[0]]),
      to: clockAfter(h.time[pleasant[pleasant.length - 1]]),
      temp: Math.round(h.temperature_2m[pleasant[0]]),
    });
  }

  const drying = firstRun(
    rest,
    (i) =>
      dry(i, DRYING_POP) &&
      SUNNY_CODES.has(h.weather_code[i]) &&
      kmhToBeaufort(h.wind_speed_10m[i]) >= BREEZY_BF &&
      h.relative_humidity_2m[i] < DRYING_HUMIDITY,
    3,
  );
  if (drying.length) tips.push({ kind: 'laundry', until: clockAfter(h.time[drying[drying.length - 1]]) });

  const windy = rest.find((i) => kmhToBeaufort(h.wind_speed_10m[i]) >= WINDY_BF);
  if (windy != null) {
    tips.push({
      kind: 'wind',
      bf: Math.max(...rest.map((i) => kmhToBeaufort(h.wind_speed_10m[i]))),
      from: clock(h.time[windy]),
    });
  }

  return { umbrella, tips: tips.slice(0, umbrella ? MAX_ROWS - 1 : MAX_ROWS) };
}
