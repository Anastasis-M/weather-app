import type { Sky } from './wmo.js';

export type Rgb = [number, number, number];

export type SkyLook = {
  top: Rgb;
  bottom: Rgb;
  cloud: Rgb;
  shade: Rgb;
  glow: Rgb;
  cover: number;
  rain: number;
  snow: number;
  fog: number;
  stars: number;
  sun: number;
  storm: number;
};

type Palette = { top: string; bottom: string; cloud: string; shade: string };

const DAY: Record<'clear' | 'overcast' | 'wet' | 'storm' | 'fog' | 'snow', Palette> = {
  clear:    { top: '#2363b3', bottom: '#5e97d2', cloud: '#f1f4f8', shade: '#7b8ca6' },
  overcast: { top: '#5f6a79', bottom: '#7d8896', cloud: '#b3bbc5', shade: '#646e7b' },
  wet:      { top: '#46505d', bottom: '#5c6672', cloud: '#8f99a5', shade: '#454e59' },
  storm:    { top: '#2e3140', bottom: '#41444f', cloud: '#6c7080', shade: '#2a2c36' },
  fog:      { top: '#6c737c', bottom: '#8c939b', cloud: '#a7adb5', shade: '#6a717a' },
  snow:     { top: '#6b7788', bottom: '#8f99a7', cloud: '#c3cad4', shade: '#76808e' },
};

const NIGHT: typeof DAY = {
  clear:    { top: '#0a1530', bottom: '#1b2d52', cloud: '#56627c', shade: '#1f2739' },
  overcast: { top: '#171d27', bottom: '#252e3b', cloud: '#454e5d', shade: '#1a2029' },
  wet:      { top: '#12171f', bottom: '#1e2530', cloud: '#3b4451', shade: '#141920' },
  storm:    { top: '#171922', bottom: '#252833', cloud: '#454959', shade: '#1a1c24' },
  fog:      { top: '#232930', bottom: '#2c323a', cloud: '#4c535e', shade: '#252a31' },
  snow:     { top: '#1e2633', bottom: '#2d3646', cloud: '#566071', shade: '#232a36' },
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

type Colors = { top: Rgb; bottom: Rgb; cloud: Rgb; shade: Rgb };

function palette(sky: Sky, day: boolean): Colors {
  const set = day ? DAY : NIGHT;
  const pick = (p: Palette): Colors => ({
    top: hexToRgb(p.top),
    bottom: hexToRgb(p.bottom),
    cloud: hexToRgb(p.cloud),
    shade: hexToRgb(p.shade),
  });
  if (sky.storm) return pick(set.storm);
  if (sky.snow >= 0.2) return pick(set.snow);
  if (sky.rain >= 0.2) return pick(set.wet);
  if (sky.fog) return pick(set.fog);
  const clear = pick(set.clear);
  const overcast = pick(set.overcast);
  const t = Math.min(1, Math.max(0, (sky.cover - 0.4) / 0.5));
  return {
    top: mix(clear.top, overcast.top, t),
    bottom: mix(clear.bottom, overcast.bottom, t),
    cloud: mix(clear.cloud, overcast.cloud, t),
    shade: mix(clear.shade, overcast.shade, t),
  };
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
    shade: mix(from.shade, to.shade, t),
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
