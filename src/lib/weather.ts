const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://geocoding-api.open-meteo.com/v1/reverse';

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
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'relative_humidity_2m',
  'is_day',
  'uv_index'
].join(',');

const DAILY = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'uv_index_max'
].join(',');

const CURRENT = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'is_day',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m'
].join(',');

export async function fetchWeather({ latitude, longitude }: { latitude: number; longitude: number }): Promise<WeatherData> {
  const u = new URL(FORECAST_URL);
  u.searchParams.set('latitude', String(latitude));
  u.searchParams.set('longitude', String(longitude));
  u.searchParams.set('current', CURRENT);
  u.searchParams.set('hourly', HOURLY);
  u.searchParams.set('daily', DAILY);
  u.searchParams.set('timezone', 'auto');
  u.searchParams.set('forecast_days', '7');
  u.searchParams.set('wind_speed_unit', 'kmh');
  u.searchParams.set('temperature_unit', 'celsius');
  u.searchParams.set('precipitation_unit', 'mm');
  const r = await fetch(u);
  if (!r.ok) throw new Error('Weather request failed');
  return r.json();
}

export async function searchPlaces(query: string, language = 'en'): Promise<Place[]> {
  if (!query || query.trim().length < 2) return [];
  const u = new URL(GEOCODE_URL);
  u.searchParams.set('name', query.trim());
  u.searchParams.set('count', '8');
  u.searchParams.set('language', language);
  u.searchParams.set('format', 'json');
  const r = await fetch(u);
  if (!r.ok) return [];
  const data = await r.json();
  return data.results ?? [];
}

export async function reverseGeocode(
  { latitude, longitude }: { latitude: number; longitude: number },
  language = 'en'
): Promise<Place | null> {
  const u = new URL(REVERSE_URL);
  u.searchParams.set('latitude', String(latitude));
  u.searchParams.set('longitude', String(longitude));
  u.searchParams.set('count', '1');
  u.searchParams.set('language', language);
  u.searchParams.set('format', 'json');
  try {
    const r = await fetch(u);
    if (!r.ok) return null;
    const data = await r.json();
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

export function getCurrentPosition(opts: PositionOptions = {}): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000, ...opts }
    );
  });
}

const STORAGE_KEY = 'weather:location:v1';

export function saveLocation(loc: Location): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loc)); } catch {}
}
export function loadLocation(): Location | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Location : null;
  } catch { return null; }
}
