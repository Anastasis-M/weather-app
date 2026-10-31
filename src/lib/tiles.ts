import { compassCode, kmhToBeaufort, uvLevel, type UvKey } from './format.js';
import type { WeatherData } from './weather.js';

const FEELS_THRESHOLD = 2;
const WIND_CHILL_KMH = 15;
const HUMID_PERCENT = 60;
const PRESSURE_TREND_HPA = 1;
const PRESSURE_TREND_HOURS = 3;
const UV_SCALE_MAX = 11;
export const PRESSURE_MIN = 960;
export const PRESSURE_MAX = 1060;

export type HourlyItem =
  | { kind: 'hour'; time: string; isNow: boolean; code: number; isDay: number; pop: number | null; temp: number }
  | { kind: 'sun'; event: 'sunrise' | 'sunset'; time: string };

export type FeelsReason = 'wind' | 'humidity' | 'cooler' | 'warmer' | 'similar';
export type HumidityLevel = 'dry' | 'comfortable' | 'humid' | 'oppressive';
export type VisibilityLevel = 'clear' | 'moderate' | 'poor' | 'very_poor';
export type PressureTrend = 'rising' | 'falling' | 'steady';

export type AirQuality = { value: number | null; key: string; tone: string; pm25: number | null };

export type Tile =
  | { kind: 'wind'; speed: number | null; gusts: number | null; beaufort: number; compass: string; degrees: number | null }
  | { kind: 'feels'; value: number | null; reason: FeelsReason }
  | { kind: 'humidity'; value: number | null; dewPoint: number | null; level: HumidityLevel }
  | { kind: 'rain'; soFar: number; next24h: number }
  | { kind: 'uv'; value: number | null; peak: number | null; levelKey: UvKey; tone: string; position: number }
  | { kind: 'air'; air: AirQuality }
  | { kind: 'visibility'; km: number | null; level: VisibilityLevel }
  | { kind: 'pressure'; hpa: number | null; trend: PressureTrend | null; position: number };

export type TileKind = Tile['kind'];

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const hourPrefix = (iso: unknown) => String(iso ?? '').slice(0, 13);

function nowIndex(data: WeatherData): number {
  const times: string[] = data?.hourly?.time ?? [];
  const now = hourPrefix(data?.current?.time);
  return times.findIndex((time) => hourPrefix(time) >= now);
}

function hourlyAt(data: WeatherData, key: string, index: number): number | null {
  return index < 0 ? null : num(data?.hourly?.[key]?.[index]);
}

export function hourlyItems(data: WeatherData, hours = 24): HourlyItem[] {
  const times: string[] = data?.hourly?.time ?? [];
  const start = nowIndex(data);
  if (start < 0) return [];
  const sunTimes: { event: 'sunrise' | 'sunset'; time: string }[] = [
    ...(data?.daily?.sunrise ?? []).map((time: string) => ({ event: 'sunrise' as const, time })),
    ...(data?.daily?.sunset ?? []).map((time: string) => ({ event: 'sunset' as const, time })),
  ];
  const items: HourlyItem[] = [];
  for (let i = start; i < Math.min(times.length, start + hours); i++) {
    const pop = hourlyAt(data, 'precipitation_probability', i);
    items.push({
      kind: 'hour',
      time: times[i],
      isNow: i === start,
      code: hourlyAt(data, 'weather_code', i) ?? 0,
      isDay: hourlyAt(data, 'is_day', i) ?? 1,
      pop: pop != null && pop >= 10 ? Math.round(pop) : null,
      temp: hourlyAt(data, 'temperature_2m', i) ?? NaN,
    });
    const hour = hourPrefix(times[i]);
    const markers = sunTimes
      .filter((s) => hourPrefix(s.time) === hour && s.time.slice(0, 16) >= String(data?.current?.time).slice(0, 16))
      .sort((a, b) => a.time.localeCompare(b.time));
    for (const m of markers) items.push({ kind: 'sun', ...m });
  }
  return items;
}

function airQuality(data: WeatherData): AirQuality {
  const current = data?.airQuality?.current;
  const raw = num(current?.european_aqi);
  const value = raw == null ? null : Math.round(raw);
  const pm25 = num(current?.pm2_5);
  if (value == null) return { value: null, key: '—', tone: 'text-muted-foreground', pm25 };
  if (value <= 20) return { value, key: 'air_good', tone: 'text-ok', pm25 };
  if (value <= 40) return { value, key: 'air_fair', tone: 'text-fair', pm25 };
  if (value <= 60) return { value, key: 'air_moderate', tone: 'text-caution', pm25 };
  if (value <= 80) return { value, key: 'air_poor', tone: 'text-poor', pm25 };
  if (value <= 100) return { value, key: 'air_very_poor', tone: 'text-bad', pm25 };
  return { value, key: 'air_extreme', tone: 'text-severe', pm25 };
}

function feelsReason(actual: number | null, feels: number | null, wind: number | null, humidity: number | null): FeelsReason {
  if (actual == null || feels == null) return 'similar';
  const delta = feels - actual;
  if (delta <= -FEELS_THRESHOLD) return (wind ?? 0) >= WIND_CHILL_KMH ? 'wind' : 'cooler';
  if (delta >= FEELS_THRESHOLD) return (humidity ?? 0) >= HUMID_PERCENT ? 'humidity' : 'warmer';
  return 'similar';
}

function humidityLevel(dewPoint: number | null): HumidityLevel {
  if (dewPoint == null || dewPoint < 10) return 'dry';
  if (dewPoint < 16) return 'comfortable';
  if (dewPoint < 20) return 'humid';
  return 'oppressive';
}

function visibilityLevel(km: number | null): VisibilityLevel {
  if (km == null || km >= 10) return 'clear';
  if (km >= 4) return 'moderate';
  if (km >= 1) return 'poor';
  return 'very_poor';
}

function rainTotals(data: WeatherData, start: number): { soFar: number; next24h: number } {
  const times: string[] = data?.hourly?.time ?? [];
  const day = String(data?.current?.time ?? '').slice(0, 10);
  let soFar = 0;
  let next24h = 0;
  times.forEach((time, i) => {
    const mm = hourlyAt(data, 'precipitation', i) ?? 0;
    if (time.slice(0, 10) === day && i <= start) soFar += mm;
    if (i > start && i <= start + 24) next24h += mm;
  });
  return { soFar, next24h };
}

function pressureTrend(data: WeatherData, start: number): PressureTrend | null {
  const now = num(data?.current?.pressure_msl);
  const before = hourlyAt(data, 'pressure_msl', start - PRESSURE_TREND_HOURS);
  if (now == null || before == null) return null;
  const delta = now - before;
  if (delta >= PRESSURE_TREND_HPA) return 'rising';
  if (delta <= -PRESSURE_TREND_HPA) return 'falling';
  return 'steady';
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function buildTiles(data: WeatherData): Tile[] {
  const current = data?.current;
  const start = nowIndex(data);
  const speed = num(current?.wind_speed_10m);
  const degrees = num(current?.wind_direction_10m);
  const humidity = num(current?.relative_humidity_2m);
  const dewPoint = num(current?.dew_point_2m);
  const uvNow = hourlyAt(data, 'uv_index', start);
  const uvPeak = num(data?.daily?.uv_index_max?.[0]);
  const uvShown = uvNow ?? uvPeak;
  const uv = uvLevel(uvShown);
  const visibilityM = num(current?.visibility);
  const km = visibilityM == null ? null : visibilityM / 1000;
  const hpa = num(current?.pressure_msl);

  return [
    {
      kind: 'wind',
      speed,
      gusts: num(current?.wind_gusts_10m),
      beaufort: kmhToBeaufort(speed),
      compass: compassCode(degrees),
      degrees,
    },
    {
      kind: 'feels',
      value: num(current?.apparent_temperature),
      reason: feelsReason(num(current?.temperature_2m), num(current?.apparent_temperature), speed, humidity),
    },
    { kind: 'humidity', value: humidity, dewPoint, level: humidityLevel(dewPoint) },
    { kind: 'rain', ...rainTotals(data, start) },
    {
      kind: 'uv',
      value: uvShown,
      peak: uvPeak,
      levelKey: uv.key,
      tone: uv.tone,
      position: clamp01((uvShown ?? 0) / UV_SCALE_MAX),
    },
    { kind: 'air', air: airQuality(data) },
    { kind: 'visibility', km, level: visibilityLevel(km) },
    {
      kind: 'pressure',
      hpa,
      trend: pressureTrend(data, start),
      position: clamp01(((hpa ?? (PRESSURE_MIN + PRESSURE_MAX) / 2) - PRESSURE_MIN) / (PRESSURE_MAX - PRESSURE_MIN)),
    },
  ];
}
