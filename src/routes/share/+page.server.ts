import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { describe } from '#lib/wmo.js';

// English WMO labels (mirrors the en dict in i18n.svelte.ts, safe to use server-side)
const WMO_EN: Record<string, string> = {
  'wmo.clear': 'Clear',
  'wmo.mainly_clear': 'Mainly clear',
  'wmo.partly_cloudy': 'Partly cloudy',
  'wmo.overcast': 'Overcast',
  'wmo.fog': 'Fog',
  'wmo.light_drizzle': 'Light drizzle',
  'wmo.drizzle': 'Drizzle',
  'wmo.heavy_drizzle': 'Heavy drizzle',
  'wmo.freezing_drizzle': 'Freezing drizzle',
  'wmo.light_rain': 'Light rain',
  'wmo.rain': 'Rain',
  'wmo.heavy_rain': 'Heavy rain',
  'wmo.freezing_rain': 'Freezing rain',
  'wmo.light_snow': 'Light snow',
  'wmo.snow': 'Snow',
  'wmo.heavy_snow': 'Heavy snow',
  'wmo.snow_grains': 'Snow grains',
  'wmo.light_showers': 'Light showers',
  'wmo.showers': 'Showers',
  'wmo.heavy_showers': 'Heavy showers',
  'wmo.snow_showers': 'Snow showers',
  'wmo.thunderstorm': 'Thunderstorm',
  'wmo.thunderstorm_hail': 'Thunderstorm, hail',
  'wmo.unknown': 'Weather',
};

// Cap name length to bound rendering / OG tag size and reject obviously
// bogus inputs before they reach Open-Meteo.
const NAME_MAX = 100;
const UPSTREAM_TIMEOUT_MS = 10_000;

// Cache at Vercel's edge — prevents cost amplification if the endpoint is
// spammed, since each miss would otherwise fan out to Open-Meteo.
const CACHE_OK = 'public, max-age=300, s-maxage=300';
const CACHE_UPSTREAM_ERROR = 'public, max-age=60, s-maxage=60';

const coord = (n: number) => (Number(n.toFixed(2)) || 0).toFixed(2);

function canonicalParams(params: URLSearchParams) {
  const lat = parseFloat(params.get('lat') ?? '');
  const lon = parseFloat(params.get('lon') ?? '');
  const name = Array.from((params.get('name') ?? '').trim()).slice(0, NAME_MAX).join('').trim();
  if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && name)) return null;
  return { lat: coord(lat), lon: coord(lon), name };
}

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const params = canonicalParams(url.searchParams);
  if (!params) {
    setHeaders({ 'cache-control': CACHE_OK });
    return { valid: false as const, name: '', city: '', lat: '', lon: '', origin: url.origin };
  }
  const { lat, lon, name } = params;

  const canonical = new URL(`?${new URLSearchParams({ lat, lon, name })}`, url);
  if (canonical.search !== url.search) redirect(308, canonical.pathname + canonical.search);

  const city = name.split(',')[0].trim() || name;

  try {
    const apiUrl = new URL('https://api.open-meteo.com/v1/forecast');
    apiUrl.searchParams.set('latitude', lat);
    apiUrl.searchParams.set('longitude', lon);
    apiUrl.searchParams.set('current', 'temperature_2m,weather_code,precipitation');
    apiUrl.searchParams.set('timezone', 'auto');

    const r = await fetch(apiUrl, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!r.ok) throw new Error('weather fetch failed');
    const w = await r.json();
    if (!w?.current) throw new Error('unexpected weather shape');

    const temp = Math.round(w.current.temperature_2m);
    const code = w.current.weather_code;
    const precip: number = w.current.precipitation ?? 0;
    const condition = WMO_EN[describe(code, 1).labelKey] ?? 'Weather';

    setHeaders({ 'cache-control': CACHE_OK });
    return { valid: true as const, name, city, lat, lon, temp, condition, precip, origin: url.origin };
  } catch {
    setHeaders({ 'cache-control': CACHE_UPSTREAM_ERROR });
    return { valid: false as const, name, city, lat, lon, origin: url.origin };
  }
};
