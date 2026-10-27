import {
  fetchPlaceSummaries,
  getCurrentPosition,
  parseSummary,
  placeId,
  reverseGeocode,
  type Location,
  type PlaceSummary,
  type WeatherData,
} from "#lib/weather.js";

export type SavedPlace = Location & { id: string };

type Stored = { list: SavedPlace[]; homeId: string | null };

const PLACES_KEY = "weather:places:v1";
const LEGACY_LOCATION_KEY = "weather:location:v1";
const SUMMARIES_KEY = "weather:place-summaries:v1";

export { placeId };

export const places = $state<{
  ready: boolean;
  list: SavedPlace[];
  homeId: string | null;
  summaries: Record<string, PlaceSummary>;
  loading: boolean;
  stale: boolean;
  here: { location: Location; summary: PlaceSummary | null } | null;
}>({
  ready: false,
  list: [],
  homeId: null,
  summaries: {},
  loading: false,
  stale: false,
  here: null,
});

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function migrateLegacyLocation(): Stored {
  const legacy = read<Location>(LEGACY_LOCATION_KEY);
  const stored: Stored = legacy
    ? { list: [{ ...legacy, id: placeId(legacy) }], homeId: placeId(legacy) }
    : { list: [], homeId: null };
  write(PLACES_KEY, stored);
  try {
    localStorage.removeItem(LEGACY_LOCATION_KEY);
  } catch {}
  return stored;
}

export function initPlaces(): void {
  const stored = read<Stored>(PLACES_KEY) ?? migrateLegacyLocation();
  places.list = stored.list;
  places.homeId = stored.homeId;
  places.summaries = read<Record<string, PlaceSummary>>(SUMMARIES_KEY) ?? {};
  places.ready = true;
}

export function homePlace(): SavedPlace | null {
  return places.list.find((p) => p.id === places.homeId) ?? places.list[0] ?? null;
}

export const MAX_PLACES = 8;

export type Removal = { place: SavedPlace; index: number; wasHome: boolean };

function persist(): void {
  write(PLACES_KEY, { list: $state.snapshot(places.list), homeId: places.homeId } satisfies Stored);
}

export function isSaved(loc: { latitude: number; longitude: number }): boolean {
  const id = placeId(loc);
  return places.list.some((p) => p.id === id);
}

export function savePlace(loc: Location): "saved" | "exists" | "full" {
  const id = placeId(loc);
  if (places.list.some((p) => p.id === id)) return "exists";
  if (places.list.length >= MAX_PLACES) return "full";
  const { name, shortName, latitude, longitude, timezone } = loc;
  places.list = [...places.list, { name, shortName, latitude, longitude, timezone, id }];
  places.homeId ??= id;
  persist();
  refreshSaved();
  return "saved";
}

export function removePlace(id: string): Removal | null {
  const index = places.list.findIndex((p) => p.id === id);
  if (index < 0) return null;
  const removal = { place: places.list[index], index, wasHome: places.homeId === id };
  places.list = places.list.filter((p) => p.id !== id);
  if (removal.wasHome) places.homeId = places.list[0]?.id ?? null;
  persist();
  return removal;
}

export function undoRemove({ place, index, wasHome }: Removal): void {
  if (places.list.some((p) => p.id === place.id) || places.list.length >= MAX_PLACES) return;
  const list = [...places.list];
  list.splice(Math.min(index, list.length), 0, place);
  places.list = list;
  if (wasHome || !places.homeId) places.homeId = place.id;
  persist();
}

export function setHome(id: string): void {
  places.homeId = id;
  persist();
}

export function movePlace(from: number, to: number): void {
  if (from === to || to < 0 || to >= places.list.length) return;
  const list = [...places.list];
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  places.list = list;
  persist();
}

async function refreshSaved(): Promise<void> {
  if (!places.list.length) return;
  const list = places.list;
  try {
    const fresh = await fetchPlaceSummaries(list);
    const next = { ...places.summaries };
    list.forEach((p, i) => {
      const summary = fresh[i];
      if (summary) next[p.id] = summary;
    });
    places.summaries = next;
    places.stale = false;
    write(SUMMARIES_KEY, next);
  } catch {
    places.stale = true;
  }
}

async function geolocationGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" });
    return status?.state === "granted";
  } catch {
    return false;
  }
}

async function refreshHere(lang: string): Promise<void> {
  if (!(await geolocationGranted())) {
    places.here = null;
    return;
  }
  try {
    const pos = await getCurrentPosition();
    const [p, [summary]] = await Promise.all([
      reverseGeocode(pos, lang),
      fetchPlaceSummaries([pos]),
    ]);
    places.here = {
      location: {
        name: p ? [p.name, p.admin1, p.country_code].filter(Boolean).join(", ") : "",
        shortName: p?.name ?? "",
        latitude: pos.latitude,
        longitude: pos.longitude,
        timezone: p?.timezone,
      },
      summary,
    };
  } catch {}
}

export function updateSummaryFromForecast(loc: Location, data: WeatherData): void {
  const id = placeId(loc);
  const summary = parseSummary(data, Date.now());
  if (!summary || !places.list.some((p) => p.id === id)) return;
  places.summaries = { ...places.summaries, [id]: summary };
  write(SUMMARIES_KEY, $state.snapshot(places.summaries));
}

export async function refreshPlaces(lang: string): Promise<void> {
  places.loading = true;
  try {
    await Promise.all([refreshSaved(), refreshHere(lang)]);
  } finally {
    places.loading = false;
  }
}
