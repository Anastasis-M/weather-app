export type Lang = "en" | "el";

const STORAGE_KEY = "weather:lang:v1";

const dict = {
  en: {
    // header / shell
    search_placeholder: "Search city…",
    searching: "Searching…",
    loading: "Loading weather…",
    try_again: "Try again",
    use_location: "Use my location",
    refresh: "Refresh",
    autofetch: "Auto-refresh every hour",
    language: "Language",
    updated: "Updated",
    powered_by: "Powered by",
    permission_denied: "Location permission denied. Use search instead.",
    fetch_failed: "Failed to fetch weather",
    refresh_failed: "Failed to refresh",
    could_not_get_location: "Could not get location",
    current_location: "Current location",
    // current
    feels_like: "Feels like",
    high_short: "H",
    low_short: "L",
    humidity: "Humidity",
    wind: "Wind",
    uv_index: "UV index",
    precip_today: "Precip today",
    sunrise: "Sunrise",
    sunset: "Sunset",
    // hourly / daily
    next_24h: "Next 24 hours",
    now: "Now",
    forecast_7d: "7-day forecast",
    today: "Today",
    precip: "Precip",
    max_wind: "Max wind",
    // wmo
    "wmo.clear": "Clear",
    "wmo.mainly_clear": "Mainly clear",
    "wmo.partly_cloudy": "Partly cloudy",
    "wmo.overcast": "Overcast",
    "wmo.fog": "Fog",
    "wmo.light_drizzle": "Light drizzle",
    "wmo.drizzle": "Drizzle",
    "wmo.heavy_drizzle": "Heavy drizzle",
    "wmo.freezing_drizzle": "Freezing drizzle",
    "wmo.light_rain": "Light rain",
    "wmo.rain": "Rain",
    "wmo.heavy_rain": "Heavy rain",
    "wmo.freezing_rain": "Freezing rain",
    "wmo.light_snow": "Light snow",
    "wmo.snow": "Snow",
    "wmo.heavy_snow": "Heavy snow",
    "wmo.snow_grains": "Snow grains",
    "wmo.light_showers": "Light showers",
    "wmo.showers": "Showers",
    "wmo.heavy_showers": "Heavy showers",
    "wmo.snow_showers": "Snow showers",
    "wmo.thunderstorm": "Thunderstorm",
    "wmo.thunderstorm_hail": "Thunderstorm, hail",
    "wmo.unknown": "—",
    // uv
    "uv.low": "Low",
    "uv.moderate": "Moderate",
    "uv.high": "High",
    "uv.very_high": "Very high",
    "uv.extreme": "Extreme",
    // beaufort
    "bf.0": "Calm",
    "bf.1": "Light air",
    "bf.2": "Light breeze",
    "bf.3": "Gentle breeze",
    "bf.4": "Moderate breeze",
    "bf.5": "Fresh breeze",
    "bf.6": "Strong breeze",
    "bf.7": "Near gale",
    "bf.8": "Gale",
    "bf.9": "Strong gale",
    "bf.10": "Storm",
    "bf.11": "Violent storm",
    "bf.12": "Hurricane",
    // compass
    "c.N": "N",
    "c.NNE": "NNE",
    "c.NE": "NE",
    "c.ENE": "ENE",
    "c.E": "E",
    "c.ESE": "ESE",
    "c.SE": "SE",
    "c.SSE": "SSE",
    "c.S": "S",
    "c.SSW": "SSW",
    "c.SW": "SW",
    "c.WSW": "WSW",
    "c.W": "W",
    "c.WNW": "WNW",
    "c.NW": "NW",
    "c.NNW": "NNW",
  },
  el: {
    search_placeholder: "Αναζήτηση πόλης…",
    searching: "Αναζήτηση…",
    loading: "Φόρτωση καιρού…",
    try_again: "Δοκιμή ξανά",
    use_location: "Η τοποθεσία μου",
    refresh: "Ανανέωση",
    autofetch: "Αυτόματη ανανέωση κάθε ώρα",
    language: "Γλώσσα",
    updated: "Ενημερώθηκε",
    powered_by: "Με",
    permission_denied:
      "Δεν επιτράπηκε η τοποθεσία. Χρησιμοποιήστε την αναζήτηση.",
    fetch_failed: "Αποτυχία λήψης καιρού",
    refresh_failed: "Αποτυχία ανανέωσης",
    could_not_get_location: "Αδυναμία λήψης τοποθεσίας",
    current_location: "Τρέχουσα τοποθεσία",
    feels_like: "Αίσθηση",
    high_short: "Υ",
    low_short: "Χ",
    humidity: "Υγρασία",
    wind: "Άνεμος",
    uv_index: "Δείκτης UV",
    precip_today: "Βροχή σήμερα",
    sunrise: "Ανατολή",
    sunset: "Δύση",
    next_24h: "Επόμενες 24 ώρες",
    now: "Τώρα",
    forecast_7d: "Πρόγνωση 7 ημερών",
    today: "Σήμερα",
    precip: "Βροχή",
    max_wind: "Μέγ. άνεμος",
    "wmo.clear": "Αίθριος",
    "wmo.mainly_clear": "Κυρίως αίθριος",
    "wmo.partly_cloudy": "Μερική συννεφιά",
    "wmo.overcast": "Συννεφιά",
    "wmo.fog": "Ομίχλη",
    "wmo.light_drizzle": "Ελαφρύ ψιλόβροχο",
    "wmo.drizzle": "Ψιλόβροχο",
    "wmo.heavy_drizzle": "Έντονο ψιλόβροχο",
    "wmo.freezing_drizzle": "Παγωμένο ψιλόβροχο",
    "wmo.light_rain": "Ελαφριά βροχή",
    "wmo.rain": "Βροχή",
    "wmo.heavy_rain": "Έντονη βροχή",
    "wmo.freezing_rain": "Παγωμένη βροχή",
    "wmo.light_snow": "Ελαφρύ χιόνι",
    "wmo.snow": "Χιόνι",
    "wmo.heavy_snow": "Έντονο χιόνι",
    "wmo.snow_grains": "Χιονόκοκκοι",
    "wmo.light_showers": "Ελαφριές μπόρες",
    "wmo.showers": "Μπόρες",
    "wmo.heavy_showers": "Έντονες μπόρες",
    "wmo.snow_showers": "Χιονομπόρες",
    "wmo.thunderstorm": "Καταιγίδα",
    "wmo.thunderstorm_hail": "Καταιγίδα με χαλάζι",
    "wmo.unknown": "—",
    "uv.low": "Χαμηλός",
    "uv.moderate": "Μέτριος",
    "uv.high": "Υψηλός",
    "uv.very_high": "Πολύ υψηλός",
    "uv.extreme": "Ακραίος",
    "bf.0": "Νηνεμία",
    "bf.1": "Σχεδόν νηνεμία",
    "bf.2": "Πολύ ασθενής",
    "bf.3": "Ασθενής",
    "bf.4": "Σχεδόν μέτριος",
    "bf.5": "Μέτριος",
    "bf.6": "Ισχυρός",
    "bf.7": "Σχεδόν θυελλώδης",
    "bf.8": "Θυελλώδης",
    "bf.9": "Πολύ θυελλώδης",
    "bf.10": "Θύελλα",
    "bf.11": "Σφοδρή θύελλα",
    "bf.12": "Τυφώνας",
    "c.N": "Β",
    "c.NNE": "ΒΒΑ",
    "c.NE": "ΒΑ",
    "c.ENE": "ΑΒΑ",
    "c.E": "Α",
    "c.ESE": "ΑΝΑ",
    "c.SE": "ΝΑ",
    "c.SSE": "ΝΝΑ",
    "c.S": "Ν",
    "c.SSW": "ΝΝΔ",
    "c.SW": "ΝΔ",
    "c.WSW": "ΔΝΔ",
    "c.W": "Δ",
    "c.WNW": "ΔΒΔ",
    "c.NW": "ΒΔ",
    "c.NNW": "ΒΒΔ",
  },
} as const satisfies Record<Lang, Record<string, string>>;

type Key = keyof (typeof dict)["en"];

export const i18n = $state<{ lang: Lang }>({ lang: "en" });

export function t(key: Key | string): string {
  const table = dict[i18n.lang] as Record<string, string>;
  return (
    table[key as string] ??
    (dict.en as Record<string, string>)[key as string] ??
    String(key)
  );
}

export function locale(): string {
  return i18n.lang === "el" ? "el-GR" : "en-US";
}

export function detectLang(): Lang {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "el" || stored === "en") return stored;
  }
  if (typeof navigator !== "undefined") {
    const candidates = [navigator.language, ...(navigator.languages ?? [])];
    for (const c of candidates) {
      if (c?.toLowerCase().startsWith("el")) return "el";
    }
  }
  return "en";
}

export function setLang(v: Lang): void {
  i18n.lang = v;
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {}
}

export function toggleLang(): void {
  setLang(i18n.lang === "en" ? "el" : "en");
}

export function initLang(): void {
  setLang(detectLang());
}
