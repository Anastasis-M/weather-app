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
  clear:    { top: '#3a7cc4', bottom: '#1b4a80', cloud: '#a3b2c6' },
  overcast: { top: '#56657a', bottom: '#2c3644', cloud: '#7b8797' },
  wet:      { top: '#3f4c5e', bottom: '#1f2833', cloud: '#637083' },
  storm:    { top: '#3a3352', bottom: '#1a1626', cloud: '#554d70' },
  fog:      { top: '#687079', bottom: '#3a4049', cloud: '#8d949e' },
  snow:     { top: '#66748a', bottom: '#364152', cloud: '#a0aab8' },
};

const NIGHT: typeof DAY = {
  clear:    { top: '#0f1d3d', bottom: '#1d2f57', cloud: '#3a4762' },
  overcast: { top: '#1c2430', bottom: '#262f3d', cloud: '#3d4654' },
  wet:      { top: '#161d27', bottom: '#1e2632', cloud: '#363f4c' },
  storm:    { top: '#1f1a33', bottom: '#110f1c', cloud: '#3a3456' },
  fog:      { top: '#262c34', bottom: '#1a1e25', cloud: '#4a515c' },
  snow:     { top: '#222b3a', bottom: '#2c3546', cloud: '#4e5869' },
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
