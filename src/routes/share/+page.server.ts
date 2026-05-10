import type { PageServerLoad } from './$types';
import { describe } from '$lib/wmo';

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

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lon = parseFloat(url.searchParams.get('lon') ?? '');
  const name = url.searchParams.get('name') ?? '';

  // City is the first segment before a comma — used in OG title
  const city = name.split(',')[0].trim() || name;

  // Cache at Vercel's edge for 5 min — prevents cost amplification if the
  // endpoint is spammed, since each miss would otherwise fan out to Open-Meteo.
  setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=300' });

  if (!lat || !lon || !name) {
    return { valid: false as const, name: '', city: '', lat: 0, lon: 0, origin: url.origin };
  }

  try {
    const apiUrl = new URL('https://api.open-meteo.com/v1/forecast');
    apiUrl.searchParams.set('latitude', String(lat));
    apiUrl.searchParams.set('longitude', String(lon));
    apiUrl.searchParams.set('current', 'temperature_2m,weather_code,precipitation');
    apiUrl.searchParams.set('timezone', 'auto');

    const r = await fetch(apiUrl);
    if (!r.ok) throw new Error('weather fetch failed');
    const w = await r.json();

    const temp = Math.round(w.current.temperature_2m);
    const code = w.current.weather_code;
    const precip: number = w.current.precipitation ?? 0;
    const condition = WMO_EN[describe(code, 1).labelKey] ?? 'Weather';

    return { valid: true as const, name, city, lat, lon, temp, condition, precip, origin: url.origin };
  } catch {
    return { valid: false as const, name, city, lat, lon, origin: url.origin };
  }
};
