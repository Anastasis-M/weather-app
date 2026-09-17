import {
  GridFactory,
  defaultOmProtocolSettings,
  domainOptions,
  getColorScale,
  omProtocol,
  updateCurrentBounds,
  type OmProtocolSettings,
  type RenderableColorScale,
} from "@openmeteo/weather-map-layer";
import ImageTileSource, {
  type Loader as ImageTileLoader,
} from "ol/source/ImageTile.js";
import XYZ from "ol/source/XYZ.js";

const SPATIAL_CDN = "https://map-tiles.open-meteo.com/data_spatial";

export type MapLayerKind = "precipitation";

const VARIABLES: Record<MapLayerKind, string> = {
  precipitation: "precipitation",
};

export type Bounds = [west: number, south: number, east: number, north: number];

export type MapFrame = {
  time: Date;
  validTimeIndex: number;
};

export type FrameSet = {
  domain: string;
  frames: MapFrame[];
  nowIndex: number;
};

// ── Domain selection ────────────────────────────────────────────

const GLOBAL_DOMAIN = "dwd_icon";
const REGIONAL_DOMAIN = "dwd_icon_eu";
const REGIONAL_MARGIN_DEG = 0.5;

const REGIONAL_BOUNDS: Bounds | null = (() => {
  const domain = domainOptions.find((d) => d.value === REGIONAL_DOMAIN);
  if (!domain) return null;
  try {
    return GridFactory.create(domain.grid, null).getBounds() as Bounds;
  } catch {
    return null;
  }
})();

export function pickDomain(view: Bounds, current?: string): string {
  if (!REGIONAL_BOUNDS) return GLOBAL_DOMAIN;
  const [w, s, e, n] = view;
  const [rw, rs, re, rn] = REGIONAL_BOUNDS;
  const margin = current === REGIONAL_DOMAIN ? 0 : REGIONAL_MARGIN_DEG;
  const covered =
    w >= rw + margin &&
    s >= rs + margin &&
    e <= re - margin &&
    n <= rn - margin;
  return covered ? REGIONAL_DOMAIN : GLOBAL_DOMAIN;
}

export function viewportAround(latitude: number, longitude: number): Bounds {
  return [longitude - 3, latitude - 2, longitude + 3, latitude + 2];
}

// ── Visible-area data reads ─────────────────────────────────────

const BOUNDS_PAD = 0.25;

function padded([w, s, e, n]: Bounds): Bounds {
  const dx = (e - w) * BOUNDS_PAD;
  const dy = (n - s) * BOUNDS_PAD;
  const west = w - dx;
  const east = e + dx;
  if (east - west >= 360)
    return [-180, Math.max(s - dy, -90), 180, Math.min(n + dy, 90)];
  return [west, Math.max(s - dy, -90), east, Math.min(n + dy, 90)];
}

export function syncDataBounds(view: Bounds): void {
  updateCurrentBounds(padded(view));
}

// ── Colour scale ────────────────────────────────────────────────

export const PRECIP_SCALE: RenderableColorScale = (() => {
  const stock = getColorScale(VARIABLES.precipitation, true);
  if (stock.type !== "breakpoint") return stock;
  const lowAlpha: Record<number, number> = { 1: 0.1, 2: 0.28 };
  return {
    ...stock,
    colors: stock.colors.map((c, i) =>
      i in lowAlpha ? ([c[0], c[1], c[2], lowAlpha[i]] as const) : c,
    ),
  } as RenderableColorScale;
})();

const OM_PROTOCOL_SETTINGS: OmProtocolSettings = {
  ...defaultOmProtocolSettings,
  colorScales: {
    ...defaultOmProtocolSettings.colorScales,
    [VARIABLES.precipitation]: PRECIP_SCALE,
  },
};

// ── Frames ──────────────────────────────────────────────────────

const FRAME_WINDOW_PAST_MS = 2 * 60 * 60 * 1000;
const FRAME_WINDOW_MAX = 48;

export async function fetchFrames(
  kind: MapLayerKind,
  domain: string,
): Promise<FrameSet> {
  const r = await fetch(
    `${SPATIAL_CDN}/${domain}/latest.json?variable=${VARIABLES[kind]}`,
  );
  if (!r.ok) throw new Error("map_unavailable");
  const meta = (await r.json()) as { valid_times: string[] };

  const cutoff = Date.now() - FRAME_WINDOW_PAST_MS;
  const frames: MapFrame[] = meta.valid_times
    .map((iso, validTimeIndex) => ({ time: new Date(iso), validTimeIndex }))
    .filter((f) => f.time.getTime() >= cutoff)
    .slice(0, FRAME_WINDOW_MAX);
  if (!frames.length) throw new Error("map_unavailable");

  return { domain, frames, nowIndex: nearestFrame(frames, Date.now()) };
}

export function nearestFrame(frames: MapFrame[], epochMs: number): number {
  let best = 0;
  for (let i = 1; i < frames.length; i++) {
    if (
      Math.abs(frames[i].time.getTime() - epochMs) <
      Math.abs(frames[best].time.getTime() - epochMs)
    ) {
      best = i;
    }
  }
  return best;
}

// ── Tiles ───────────────────────────────────────────────────────

const MAX_DATA_ZOOM = 12;

function tileUrl(
  kind: MapLayerKind,
  domain: string,
  frame: MapFrame,
  z: number,
  x: number,
  y: number,
): string {
  return (
    `om://${SPATIAL_CDN}/${domain}/latest.json` +
    `?variable=${VARIABLES[kind]}` +
    `&time_step=valid_times_${frame.validTimeIndex}` +
    `&interpolation=monotone` +
    `&color_blend=true` +
    `&dark=true/${z}/${x}/${y}`
  );
}

let emptyTile: HTMLCanvasElement | undefined;
function emptyTileImage(): HTMLCanvasElement {
  if (!emptyTile) {
    emptyTile = document.createElement("canvas");
    emptyTile.width = emptyTile.height = 1;
  }
  return emptyTile;
}

export function weatherSource(): ImageTileSource {
  return new ImageTileSource({
    transition: 0,
    tileSize: 512,
    maxZoom: MAX_DATA_ZOOM,
    loader: async () => emptyTileImage(),
  });
}

type Repointable = {
  setLoader(loader: ImageTileLoader): void;
  setKey(key: string): void;
};

export function showFrame(
  source: ImageTileSource,
  kind: MapLayerKind,
  domain: string,
  frame: MapFrame,
): void {
  const target = source as unknown as Repointable;
  target.setLoader(async (z, x, y, { signal }) => {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", onAbort, { once: true });

    try {
      const res = await omProtocol(
        { url: tileUrl(kind, domain, frame, z, x, y), type: "image" },
        ctrl,
        OM_PROTOCOL_SETTINGS,
      );
      const data = res?.data;
      if (data instanceof ImageBitmap) return data;
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
      return emptyTileImage();
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  });
  target.setKey(frameKey(domain, frame));
}

export function frameKey(domain: string, frame: MapFrame): string {
  return `${domain}:${frame.validTimeIndex}`;
}

// ── Basemap ─────────────────────────────────────────────────────

export function basemapSource(): XYZ {
  return new XYZ({
    url: "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    crossOrigin: "anonymous",
    transition: 0,
    maxZoom: 20,
  });
}

export const MAP_ATTRIBUTION = [
  { label: "CARTO", href: "https://carto.com/attributions" },
  { label: "OpenStreetMap", href: "https://www.openstreetmap.org/copyright" },
  { label: "Open-Meteo", href: "https://open-meteo.com/" },
];
