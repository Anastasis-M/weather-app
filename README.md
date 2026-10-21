# Weather

A weather forecast PWA with current conditions, today's tips, a sun and moon arc, a 7-day forecast with hourly charts, air quality, an animated precipitation map and saved places. Mobile-first, dark-only, in English and Greek.

All weather data comes from [Open-Meteo](https://open-meteo.com). No API keys are needed.

## Features

- **Current conditions.** Temperature, feels-like, wind in Beaufort with direction and name (`5 Bf · Fresh breeze` / `5 Bf · Μέτριος`), European AQI with PM2.5, UV index and humidity.
- **Today's tips.** An umbrella row with an hourly rain chart (chance and millimetres per hour) when rain is likely, plus up to three tips that only appear when the forecast triggers them: frost, heat, poor air, a temperature drop, sunscreen, best time to be outside, a good drying day and wind.
- **Sun and moon.** By day an arc from sunrise to sunset with the time left. At night the arc runs from sunset to sunrise and shows the moon in its current phase, computed locally.
- **7-day forecast.** Tap a day for its temperature and precipitation charts and an hourly strip.
- **Precipitation map.** An animated DWD ICON precipitation layer on OpenLayers. On desktop it sits under the forecast when some hour in the next 24 has a rain chance above 30%. The map button opens it full screen at any time.
- **Saved places.** Up to 8 places in a row of cards showing the current temperature and today's high and low. The Home place loads at startup. Save from the place card or with the star in search results, and reorder, set Home or remove from the manage sheet. Saving and removing show a toast with Undo.
- **Fast switching and offline.** The last forecast of each place is kept in the browser, so switching places shows it immediately while fresh data loads, and the app still works offline.
- **First visit.** The app opens on the visitor's approximate city from Vercel's IP geolocation headers and switches to the precise location if the browser allows it.
- **Sharing.** Share links render a preview card with the current conditions and a 7-day strip.
- **PWA.** Installable. A custom service worker caches the app shell and serves the last Open-Meteo responses when the network is down.

## Stack

- SvelteKit 2 with Svelte 5 runes and TypeScript, deployed with `adapter-vercel`. Pages render in the browser (`ssr = false`). A few server routes handle share pages, preview images and IP location.
- Tailwind CSS 4, shadcn-svelte (bits-ui, vaul) and lucide icons.
- Charts with layerchart through shadcn-svelte's chart components.
- OpenLayers with `@openmeteo/weather-map-layer` for the precipitation map, on an Esri dark gray basemap.
- `@vercel/og` for share images and `@vercel/analytics` for page views. Page views are recorded without the query string, so the viewed place's coordinates and name never reach analytics.

## Develop

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm check        # svelte-kit sync + svelte-check
pnpm build        # vite build, then stamps a new cache version into sw.js
pnpm preview      # serve the production build locally
```

`pnpm check && pnpm build` must both pass before a change is done. The service worker is disabled in dev.

## Project layout

```
src/
  routes/
    +page.svelte              # the app
    share/                    # share page with Open Graph tags, redirects to the app
    api/
      og/                     # share preview image
      ip-location/            # approximate location from Vercel IP headers
  lib/
    weather.ts                # Open-Meteo client, response parsing, forecast cache
    places.svelte.ts          # saved places, Home, card summaries
    placeToasts.ts            # save and remove with undo toasts
    tips.ts                   # today's tip rules
    sun.ts                    # sun position from sunrise and sunset
    moon.ts                   # moon phase and its drawing
    wmo.ts                    # WMO weather codes: labels, icons, code sets
    i18n.svelte.ts            # English and Greek strings, t() with {placeholders}
    format.ts                 # temperature, time, Beaufort, relative age
    tempScale.ts              # temperature colour scale
    mapLayers.ts              # map layers, models and credits
    mapPlayer.svelte.ts       # map animation timeline
    components/
      Current, Tips, RainStrip, SunArc, Daily, TempChart, PrecipChart,
      SavedPlaces, ManagePlaces, Search, Icon
      map/                    # map card, full-screen dialog, controls, legend
      ui/                     # shadcn-svelte components
static/                       # service worker, manifest, icons
scripts/inject-sw-version.js  # stamps the service worker cache version after build
vercel.json                   # security headers and Content-Security-Policy
```

## Deploy

The app targets Vercel. Import the repository and Vercel detects SvelteKit. No environment variables are needed.

IP location relies on Vercel's `x-vercel-ip-*` request headers. On other hosts, or in local dev, `/api/ip-location` returns `204` and a first visit falls back to asking for the browser's location.

## Data stored in the browser

Everything stays in the visitor's `localStorage`. Nothing is stored on a server.

| Key | Contents |
|---|---|
| `weather:places:v1` | Saved places and the Home place |
| `weather:place-summaries:v1` | Last temperature, icon and high/low per saved place |
| `weather:forecasts:v1` | Last full forecast of up to 10 places |
| `weather:lang:v1` | Language choice |

## Attribution

Weather, air quality, geocoding and map data: [Open-Meteo](https://open-meteo.com) (CC BY 4.0), using the DWD ICON models for the map. Basemap: Esri. Map data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
