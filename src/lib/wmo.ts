export type IconName =
  | 'sun' | 'moon' | 'cloud' | 'cloud-sun' | 'cloud-moon'
  | 'rain' | 'drizzle' | 'snow' | 'sleet' | 'storm' | 'fog';

export type Description = { labelKey: string; icon: IconName };

export const RAIN_CODES: ReadonlySet<number> = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
export const SNOW_CODES: ReadonlySet<number> = new Set([71, 73, 75, 77, 85, 86]);
export const STORM_CODES: ReadonlySet<number> = new Set([95, 96, 99]);
export const SUNNY_CODES: ReadonlySet<number> = new Set([0, 1]);

export function isPrecipitation(code: number): boolean {
  return RAIN_CODES.has(code) || SNOW_CODES.has(code) || STORM_CODES.has(code);
}

export type Sky = { cover: number; rain: number; snow: number; fog: boolean; storm: boolean };

export function skyFor(code: number): Sky {
  const sky = (cover: number, rain = 0, snow = 0, fog = false, storm = false): Sky => ({ cover, rain, snow, fog, storm });
  switch (code) {
    case 0:  return sky(0);
    case 1:  return sky(0.2);
    case 2:  return sky(0.5);
    case 3:  return sky(0.9);
    case 45:
    case 48: return sky(0.6, 0, 0, true);
    case 51: return sky(0.85, 0.25);
    case 53: return sky(0.85, 0.35);
    case 55: return sky(0.9, 0.5);
    case 56:
    case 57: return sky(0.9, 0.35, 0.15);
    case 61: return sky(0.9, 0.45);
    case 63: return sky(0.95, 0.7);
    case 65: return sky(1, 1);
    case 66:
    case 67: return sky(0.95, 0.6, 0.2);
    case 71: return sky(0.9, 0, 0.35);
    case 73: return sky(0.95, 0, 0.6);
    case 75: return sky(1, 0, 1);
    case 77: return sky(0.9, 0, 0.3);
    case 80: return sky(0.75, 0.5);
    case 81: return sky(0.85, 0.75);
    case 82: return sky(0.95, 1);
    case 85: return sky(0.85, 0, 0.5);
    case 86: return sky(0.95, 0, 0.9);
    case 95: return sky(1, 0.8, 0, false, true);
    case 96:
    case 99: return sky(1, 1, 0, false, true);
    default: return sky(0.6);
  }
}

export function iconColor(icon: IconName): string {
  switch (icon) {
    case 'sun':        return 'text-accent';
    case 'cloud-sun':  return 'text-accent';
    case 'moon':       return 'text-sub';
    case 'cloud-moon': return 'text-sub';
    case 'cloud':      return 'text-sub';
    case 'fog':        return 'text-mute';
    case 'drizzle':    return 'text-rain';
    case 'rain':       return 'text-rain';
    case 'sleet':      return 'text-rain';
    case 'snow':       return 'text-snow';
    case 'storm':      return 'text-warn';
  }
}

export function describe(code: number, isDay: number | boolean = 1): Description {
  const day = isDay === 1 || isDay === true;
  switch (code) {
    case 0:  return { labelKey: 'wmo.clear',           icon: day ? 'sun' : 'moon' };
    case 1:  return { labelKey: 'wmo.mainly_clear',    icon: day ? 'sun' : 'moon' };
    case 2:  return { labelKey: 'wmo.partly_cloudy',   icon: day ? 'cloud-sun' : 'cloud-moon' };
    case 3:  return { labelKey: 'wmo.overcast',        icon: 'cloud' };
    case 45:
    case 48: return { labelKey: 'wmo.fog',             icon: 'fog' };
    case 51: return { labelKey: 'wmo.light_drizzle',   icon: 'drizzle' };
    case 53: return { labelKey: 'wmo.drizzle',         icon: 'drizzle' };
    case 55: return { labelKey: 'wmo.heavy_drizzle',   icon: 'drizzle' };
    case 56:
    case 57: return { labelKey: 'wmo.freezing_drizzle', icon: 'sleet' };
    case 61: return { labelKey: 'wmo.light_rain',      icon: 'rain' };
    case 63: return { labelKey: 'wmo.rain',            icon: 'rain' };
    case 65: return { labelKey: 'wmo.heavy_rain',      icon: 'rain' };
    case 66:
    case 67: return { labelKey: 'wmo.freezing_rain',   icon: 'sleet' };
    case 71: return { labelKey: 'wmo.light_snow',      icon: 'snow' };
    case 73: return { labelKey: 'wmo.snow',            icon: 'snow' };
    case 75: return { labelKey: 'wmo.heavy_snow',      icon: 'snow' };
    case 77: return { labelKey: 'wmo.snow_grains',     icon: 'snow' };
    case 80: return { labelKey: 'wmo.light_showers',   icon: 'rain' };
    case 81: return { labelKey: 'wmo.showers',         icon: 'rain' };
    case 82: return { labelKey: 'wmo.heavy_showers',   icon: 'rain' };
    case 85:
    case 86: return { labelKey: 'wmo.snow_showers',    icon: 'snow' };
    case 95: return { labelKey: 'wmo.thunderstorm',    icon: 'storm' };
    case 96:
    case 99: return { labelKey: 'wmo.thunderstorm_hail', icon: 'storm' };
    default: return { labelKey: 'wmo.unknown', icon: 'cloud' };
  }
}
