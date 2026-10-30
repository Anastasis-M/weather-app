import type { Sky } from './wmo.js';

export type Rgb = [number, number, number];

export type SkyLook = {
  top: Rgb;
  bottom: Rgb;
  cloud: Rgb;
  glow: Rgb;
  cover: number;
  rain: number;
  snow: number;
  fog: number;
  stars: number;
  sun: number;
  storm: number;
};

type Palette = { top: string; bottom: string; cloud: string };

const DAY: Record<'clear' | 'overcast' | 'wet' | 'storm' | 'fog' | 'snow', Palette> = {
  clear:    { top: '#1f5a9e', bottom: '#0f2c52', cloud: '#8796ab' },
  overcast: { top: '#3a4656', bottom: '#1a212b', cloud: '#5d6878' },
  wet:      { top: '#2a3340', bottom: '#121820', cloud: '#4a5463' },
  storm:    { top: '#241f36', bottom: '#0d0b16', cloud: '#3b3550' },
  fog:      { top: '#4a5059', bottom: '#252a31', cloud: '#6c737d' },
  snow:     { top: '#46505f', bottom: '#222833', cloud: '#7d8796' },
};

const NIGHT: typeof DAY = {
  clear:    { top: '#060b1c', bottom: '#0f1a35', cloud: '#2a3448' },
  overcast: { top: '#0f141c', bottom: '#171d27', cloud: '#2b323d' },
  wet:      { top: '#0b0f15', bottom: '#121820', cloud: '#262d38' },
  storm:    { top: '#120f1e', bottom: '#08070e', cloud: '#2a2540' },
  fog:      { top: '#171b21', bottom: '#0f1217', cloud: '#343a43' },
  snow:     { top: '#141a25', bottom: '#1c2330', cloud: '#3a4352' },
};

const SUN_GLOW = '#ffd27a';
const MOON_GLOW = '#9fb3d9';

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToCss([r, g, b]: Rgb): string {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function palette(sky: Sky, day: boolean): { top: Rgb; bottom: Rgb; cloud: Rgb } {
  const set = day ? DAY : NIGHT;
  const pick = (p: Palette) => ({ top: hexToRgb(p.top), bottom: hexToRgb(p.bottom), cloud: hexToRgb(p.cloud) });
  if (sky.storm) return pick(set.storm);
  if (sky.snow >= 0.2) return pick(set.snow);
  if (sky.rain >= 0.2) return pick(set.wet);
  if (sky.fog) return pick(set.fog);
  const clear = pick(set.clear);
  const overcast = pick(set.overcast);
  const t = Math.min(1, Math.max(0, (sky.cover - 0.3) / 0.6));
  return { top: mix(clear.top, overcast.top, t), bottom: mix(clear.bottom, overcast.bottom, t), cloud: mix(clear.cloud, overcast.cloud, t) };
}

export function skyLook(sky: Sky, day: boolean): SkyLook {
  return {
    ...palette(sky, day),
    glow: hexToRgb(day ? SUN_GLOW : MOON_GLOW),
    cover: sky.cover,
    rain: sky.rain,
    snow: sky.snow,
    fog: sky.fog ? 1 : 0,
    stars: day ? 0 : Math.max(0, 1 - sky.cover * 1.4),
    sun: day ? 1 : 0.45,
    storm: sky.storm ? 1 : 0,
  };
}

export function lerpLook(from: SkyLook, to: SkyLook, t: number): SkyLook {
  const n = (a: number, b: number) => a + (b - a) * t;
  return {
    top: mix(from.top, to.top, t),
    bottom: mix(from.bottom, to.bottom, t),
    cloud: mix(from.cloud, to.cloud, t),
    glow: mix(from.glow, to.glow, t),
    cover: n(from.cover, to.cover),
    rain: n(from.rain, to.rain),
    snow: n(from.snow, to.snow),
    fog: n(from.fog, to.fog),
    stars: n(from.stars, to.stars),
    sun: n(from.sun, to.sun),
    storm: n(from.storm, to.storm),
  };
}
