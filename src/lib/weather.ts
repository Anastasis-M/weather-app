const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_URL = "https://geocoding-api.open-meteo.com/v1/reverse";

export const placeId = (loc: { latitude: number; longitude: number }) =>
  `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`;

export type Location = {
  name: string;
  shortName: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

// Loose API types — Open-Meteo returns arrays parallel to the `time` array.
export type WeatherData = any;
export type Place = any;

const HOURLY = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "relative_humidity_2m",
  "is_day",
  "uv_index",
].join(",");

const DAILY = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "sunrise",
  "sunset",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
].join(",");

const CURRENT = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "is_day",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
].join(",");

const AIR_QUALITY_CURRENT = [
  "european_aqi",
  "us_aqi",
  "pm10",
  "pm2_5",
].join(",");

const WEATHER_ERROR = "weather_unavailable";
const WEATHER_TIMEOUT_MS = 10_000;

async function fetchWeatherResponse(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    throw new Error(WEATHER_ERROR);
  } finally {
    clearTimeout(timeout);
  }
}

async function readWeatherJson(response: Response): Promise<WeatherData> {
  if (!response.ok) throw new Error(WEATHER_ERROR);

  try {
    return await response.json();
  } catch {
    throw new Error(WEATHER_ERROR);
  }
}

async function fetchAirQuality({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}): Promise<WeatherData | null> {
  const u = new URL(AIR_QUALITY_URL);
  u.searchParams.set("latitude", String(latitude));
  u.searchParams.set("longitude", String(longitude));
  u.searchParams.set("current", AIR_QUALITY_CURRENT);
  u.searchParams.set("timezone", "auto");
  u.searchParams.set("forecast_days", "1");
  try {
    return await readWeatherJson(await fetchWeatherResponse(u));
  } catch {
    return null;
  }
}

export async function fetchWeather({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}): Promise<WeatherData> {
  const u = new URL(FORECAST_URL);
  u.searchParams.set("latitude", String(latitude));
  u.searchParams.set("longitude", String(longitude));
  u.searchParams.set("current", CURRENT);
  u.searchParams.set("hourly", HOURLY);
  u.searchParams.set("daily", DAILY);
  u.searchParams.set("timezone", "auto");
  u.searchParams.set("forecast_days", "7");
  u.searchParams.set("wind_speed_unit", "kmh");
  u.searchParams.set("temperature_unit", "celsius");
  u.searchParams.set("precipitation_unit", "mm");
  const [r, airQuality] = await Promise.all([
    fetchWeatherResponse(u),
    fetchAirQuality({ latitude, longitude }).catch(() => null),
  ]);
  const weather = await readWeatherJson(r);
  return { ...weather, airQuality };
}

export type PlaceSummary = {
  temp: number;
  code: number;
  isDay: boolean;
  high: number;
  low: number;
  fetchedAt: number;
};

function parseSummary(raw: any, fetchedAt: number): PlaceSummary | null {
  const temp = Number(raw?.current?.temperature_2m);
  const code = Number(raw?.current?.weather_code);
  const high = Number(raw?.daily?.temperature_2m_max?.[0]);
  const low = Number(raw?.daily?.temperature_2m_min?.[0]);
  if ([temp, code, high, low].some(Number.isNaN)) return null;
  return { temp, code, isDay: raw.current.is_day === 1, high, low, fetchedAt };
}

export async function fetchPlaceSummaries(
  coords: { latitude: number; longitude: number }[],
): Promise<(PlaceSummary | null)[]> {
  if (!coords.length) return [];
  const u = new URL(FORECAST_URL);
  u.searchParams.set("latitude", coords.map((c) => c.latitude).join(","));
  u.searchParams.set("longitude", coords.map((c) => c.longitude).join(","));
  u.searchParams.set("current", "temperature_2m,weather_code,is_day");
  u.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  u.searchParams.set("forecast_days", "1");
  u.searchParams.set("timezone", "auto");
  const json = await readWeatherJson(await fetchWeatherResponse(u));
  const list = Array.isArray(json) ? json : [json];
  const now = Date.now();
  return coords.map((_, i) => parseSummary(list[i], now));
}

export async function searchPlaces(
  query: string,
  language = "en",
): Promise<Place[]> {
  if (!query || query.trim().length < 2) return [];
  const u = new URL(GEOCODE_URL);
  u.searchParams.set("name", query.trim());
  u.searchParams.set("count", "8");
  u.searchParams.set("language", language);
  u.searchParams.set("format", "json");
  const r = await fetch(u);
  if (!r.ok) return [];
  const data = await r.json();
  return data.results ?? [];
}

export async function reverseGeocode(
  { latitude, longitude }: { latitude: number; longitude: number },
  language = "en",
): Promise<Place | null> {
  const u = new URL(REVERSE_URL);
  u.searchParams.set("latitude", String(latitude));
  u.searchParams.set("longitude", String(longitude));
  u.searchParams.set("count", "1");
  u.searchParams.set("language", language);
  u.searchParams.set("format", "json");
  try {
    const r = await fetch(u);
    if (!r.ok) return null;
    const data = await r.json();
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchIpLocation(): Promise<Location | null> {
  try {
    const r = await fetch("/api/ip-location", { cache: "no-store" });
    if (r.status !== 200) return null;
    const loc = await r.json();
    const valid =
      typeof loc?.shortName === "string" &&
      loc.shortName !== "" &&
      Number.isFinite(loc.latitude) &&
      Number.isFinite(loc.longitude);
    return valid ? (loc as Location) : null;
  } catch {
    return null;
  }
}

export function getCurrentPosition(
  opts: PositionOptions = {},
): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (e) => reject(e),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
        ...opts,
      },
    );
  });
}

const AUTOFETCH_KEY = "weather:autofetch:v1";

export function saveAutofetch(v: boolean): void {
  try {
    localStorage.setItem(AUTOFETCH_KEY, v ? "1" : "0");
  } catch {}
}
export function loadAutofetch(): boolean {
  try {
    const raw = localStorage.getItem(AUTOFETCH_KEY);
    return raw === null ? true : raw === "1"; // default: on
  } catch {
    return true;
  }
}

// ── Offline cache ────────────────────────────────────────────────
// The service worker's runtime cache already keeps the last Open-Meteo
// response, but persisting it here too means the UI can rehydrate even
// before the SW takes control (first hit on a new device, private mode,
// iOS edge cases) — and we keep the original fetch time around so the
// "Updated" footer stays honest.
const FORECASTS_KEY = "weather:forecasts:v1";
const LEGACY_FORECAST_KEY = "weather:last:v1";
const MAX_CACHED_FORECASTS = 10;

export type CachedWeather = {
  location: Location;
  data: WeatherData;
  fetchedAt: number;
};

type ForecastCache = Record<string, CachedWeather>;

function readForecasts(): ForecastCache {
  try {
    const raw = localStorage.getItem(FORECASTS_KEY);
    const cache: ForecastCache = raw ? JSON.parse(raw) : {};
    const legacy = localStorage.getItem(LEGACY_FORECAST_KEY);
    if (legacy) {
      const entry = JSON.parse(legacy) as CachedWeather;
      cache[placeId(entry.location)] ??= entry;
      localStorage.setItem(FORECASTS_KEY, JSON.stringify(cache));
      localStorage.removeItem(LEGACY_FORECAST_KEY);
    }
    return cache;
  } catch {
    return {};
  }
}

export function saveWeather(location: Location, data: WeatherData): void {
  const cache = readForecasts();
  cache[placeId(location)] = { location, data, fetchedAt: Date.now() };
  const newest = Object.entries(cache)
    .sort(([, a], [, b]) => b.fetchedAt - a.fetchedAt)
    .slice(0, MAX_CACHED_FORECASTS);
  try {
    localStorage.setItem(FORECASTS_KEY, JSON.stringify(Object.fromEntries(newest)));
  } catch {}
}

export function loadWeather(location: Location): CachedWeather | null {
  return readForecasts()[placeId(location)] ?? null;
}

export function latestWeather(): CachedWeather | null {
  const entries = Object.values(readForecasts());
  return entries.reduce<CachedWeather | null>(
    (newest, entry) => (!newest || entry.fetchedAt > newest.fetchedAt ? entry : newest),
    null,
  );
}
