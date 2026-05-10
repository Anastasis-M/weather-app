import { ImageResponse } from '@vercel/og';
import { describe } from '$lib/wmo';
import type { RequestHandler } from './$types';

// English WMO labels — duplicated from /share to keep this endpoint
// self-contained. Update both if the WMO mapping ever changes.
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

// Theme tokens mirroring tailwind.config.js so the card matches the app.
const C = {
  bg: '#0a0a0b',
  panel: '#111114',
  line: '#22222a',
  ink: '#f5f5f7',
  sub: '#a0a0aa',
  mute: '#6b6b75',
  rain: '#60a5fa',
};

// Module-scope font cache — warm function invocations skip re-fetch.
let fontCache: {
  latin400: ArrayBuffer;
  latin600: ArrayBuffer;
  greek400: ArrayBuffer;
  greek600: ArrayBuffer;
} | null = null;

async function loadFonts(origin: string) {
  if (fontCache) return fontCache;
  const [latin400, latin600, greek400, greek600] = await Promise.all([
    fetch(`${origin}/fonts/Inter-400-latin.woff`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/Inter-600-latin.woff`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/Inter-400-greek.woff`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/Inter-600-greek.woff`).then((r) => r.arrayBuffer()),
  ]);
  fontCache = { latin400, latin600, greek400, greek600 };
  return fontCache;
}

// Satori element helper — avoids the React/JSX dependency. Multi-child
// containers need display:flex explicitly (Satori limitation).
type El = { type: string; props: { style: Record<string, any>; children?: any } };
const el = (style: Record<string, any>, children: any = null): El => ({
  type: 'div',
  props: { style, children },
});

// Cap to keep rendering bounded and reject obviously-bogus inputs before
// they reach Open-Meteo or Satori.
const NAME_MAX = 100;

function validParams(lat: number, lon: number, name: string) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    name.length > 0 &&
    name.length <= NAME_MAX
  );
}

export const GET: RequestHandler = async ({ url, fetch }) => {
  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lon = parseFloat(url.searchParams.get('lon') ?? '');
  const name = (url.searchParams.get('name') ?? '').slice(0, NAME_MAX);
  const city = (name.split(',')[0] || name).trim();

  if (!validParams(lat, lon, name) || !city) {
    return new Response('Invalid lat/lon/name', { status: 400 });
  }

  const api = new URL('https://api.open-meteo.com/v1/forecast');
  api.searchParams.set('latitude', String(lat));
  api.searchParams.set('longitude', String(lon));
  api.searchParams.set('current', 'temperature_2m,weather_code,precipitation');
  api.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
  );
  api.searchParams.set('timezone', 'auto');
  api.searchParams.set('forecast_days', '7');

  let w: any;
  try {
    const r = await fetch(api);
    if (!r.ok) throw new Error('weather fetch failed');
    w = await r.json();
  } catch {
    return new Response('Upstream weather error', { status: 502 });
  }

  const temp = Math.round(w.current.temperature_2m);
  const condition = WMO_EN[describe(w.current.weather_code, 1).labelKey] ?? 'Weather';
  const precip: number = w.current.precipitation ?? 0;

  const days = (w.daily.time as string[]).slice(0, 7).map((day, i) => ({
    label: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
    max: Math.round(w.daily.temperature_2m_max[i]),
    min: Math.round(w.daily.temperature_2m_min[i]),
    cond: WMO_EN[describe(w.daily.weather_code[i], 1).labelKey] ?? '',
    precip: (w.daily.precipitation_sum[i] ?? 0) as number,
  }));

  const fonts = await loadFonts(url.origin);

  // Card composition. 1200×630 is the standard OG/Twitter large image
  // and lands well on iMessage, WhatsApp, Slack, Discord, Twitter, FB.
  const card = el(
    {
      width: '1200px',
      height: '630px',
      background: C.bg,
      display: 'flex',
      padding: '40px',
      fontFamily: 'Inter',
    },
    [
      el(
        {
          width: '100%',
          height: '100%',
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: '32px',
          display: 'flex',
          padding: '52px',
        },
        [
          // Left column — city, temperature, condition, precip today.
          el(
            {
              width: '440px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            },
            [
              el(
                {
                  display: 'flex',
                  fontSize: '22px',
                  color: C.sub,
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                },
                city,
              ),
              el(
                { display: 'flex', flexDirection: 'column' },
                [
                  el(
                    {
                      fontSize: '180px',
                      color: C.ink,
                      lineHeight: 1,
                      fontWeight: 400,
                      letterSpacing: '-6px',
                    },
                    `${temp}°`,
                  ),
                  el(
                    {
                      fontSize: '34px',
                      color: C.ink,
                      marginTop: '8px',
                      fontWeight: 600,
                    },
                    condition,
                  ),
                ],
              ),
              el(
                { display: 'flex', fontSize: '22px', color: C.sub },
                `Rain: ${precip}mm`,
              ),
            ],
          ),

          // Right column — 7-day forecast list.
          el(
            {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              marginLeft: '52px',
              paddingLeft: '52px',
              borderLeft: `1px solid ${C.line}`,
            },
            [
              el(
                {
                  display: 'flex',
                  fontSize: '16px',
                  color: C.sub,
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  fontWeight: 600,
                },
                '7-day forecast',
              ),
              ...days.map((d) =>
                el(
                  {
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 0',
                    borderTop: `1px solid ${C.line}`,
                    fontSize: '22px',
                  },
                  [
                    el({ display: 'flex', width: '70px', color: C.ink, fontWeight: 600 }, d.label),
                    el({ display: 'flex', flex: 1, color: C.sub }, d.cond),
                    el(
                      {
                        display: 'flex',
                        width: '110px',
                        justifyContent: 'flex-end',
                        color: C.ink,
                      },
                      `${d.max}°/${d.min}°`,
                    ),
                    el(
                      {
                        display: 'flex',
                        width: '90px',
                        justifyContent: 'flex-end',
                        color: d.precip > 0 ? C.rain : C.mute,
                      },
                      d.precip > 0 ? `${d.precip}mm` : '—',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );

  return new ImageResponse(card as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: fonts.latin400, style: 'normal', weight: 400 },
      { name: 'Inter', data: fonts.latin600, style: 'normal', weight: 600 },
      { name: 'Inter', data: fonts.greek400, style: 'normal', weight: 400 },
      { name: 'Inter', data: fonts.greek600, style: 'normal', weight: 600 },
    ],
    headers: {
      // Match /share — 5-min edge cache absorbs repeated crawler hits.
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  });
};
