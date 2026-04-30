export type IconName =
  | 'sun' | 'moon' | 'cloud' | 'cloud-sun' | 'cloud-moon'
  | 'rain' | 'drizzle' | 'snow' | 'sleet' | 'storm' | 'fog';

export type Description = { labelKey: string; icon: IconName };

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

// WMO weather code → translation key + icon. Components run the key through t().
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
