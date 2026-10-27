# Weather App agent context

Single-package SvelteKit app. No monorepo, no backend beyond route handlers.

## What This Is

A weather forecast PWA: current conditions, today's tips, a sun and moon arc,
a 7-day forecast with hourly charts, air quality, an animated precipitation
map and saved places. Deployed on Vercel. Data from Open-Meteo.

## Stack

- SvelteKit 3 + Svelte 5 (runes) + TypeScript 6 + Vite 8, `adapter-vercel`, `ssr = false`. Config lives in the `sveltekit()` plugin in `vite.config.js`; there is no `svelte.config.js`.
- Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no PostCSS config, no tailwind.config content pipeline)
- shadcn-svelte (bits-ui / formsnap / vaul / paneforge), lucide icons
- OpenLayers (`ol`) + `@openmeteo/weather-map-layer` for the precipitation map
- layerchart (through shadcn-svelte chart components) for charts
- Package manager: pnpm

## Commands

```sh
pnpm dev          # vite dev server
pnpm build        # vite build + scripts/inject-sw-version.js (service worker bump)
pnpm check        # svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
pnpm preview      # serve the production build
```

Verification = `pnpm check && pnpm build`. Both must pass before declaring work done.

## Repo Map

```
src/
  routes/
    +page.svelte        # main view: loading, refresh, layout
    share/              # shareable snapshot view (+page.server.ts)
    api/
      og/               # OG image generation (@vercel/og)
      ip-location/      # approximate location from Vercel x-vercel-ip-* headers
  lib/
    weather.ts          # Open-Meteo client, parsing, per-place forecast cache
    places.svelte.ts    # saved places, Home, card summaries (runes)
    placeToasts.ts      # save/remove with undo toasts
    tips.ts             # today's tip rules (pure)
    sun.ts              # sun position from sunrise/sunset (pure)
    moon.ts             # moon phase and lit-shape path (pure)
    wmo.ts              # WMO code -> condition metadata and code sets
    tempScale.ts        # temperature color scale
    mapLayers.ts        # map layer config
    mapPlayer.svelte.ts # animation timeline state (runes)
    i18n.svelte.ts      # locale/translation state (runes), t(key, vars)
    format.ts           # formatting helpers
    components/         # UI components (map/ for the map, ui/ for shadcn-svelte)
static/                 # service worker, icons, manifest
scripts/inject-sw-version.js
vercel.json             # security headers and CSP
```

The client calls Open-Meteo directly. There are no forecast or air-quality
proxy routes.

## Conventions

- Svelte 5 runes everywhere (`$state`, `$derived`, `.svelte.ts` for shared reactive state); no legacy stores.
- Import from `src/lib` through the `#lib/...` subpath import with an explicit extension (`#lib/weather.js`, `#lib/components/ui/button/index.js`). `$lib` is gone in SvelteKit 3.
- Weather data crosses the API boundary untrusted: parse/normalize in `lib/weather.ts` and the `src/routes/api/*` handlers; internal types stay trusted.
- WMO condition logic lives only in `lib/wmo.ts`, never inline condition codes in components.
- Every user-facing string goes through `i18n.svelte.ts` in English and Greek. Use `{name}` placeholders with `t(key, vars)`, never string concatenation. Greek uses the formal plural.
- Open-Meteo hourly and daily times are location-local strings. Compare and slice them as strings; don't parse them with `new Date()` in the browser's zone.
- Day panels in `Daily.svelte` render their charts only while open. Keep it that way: mounting layerchart charts is the app's main rendering cost.
- Commits follow conventional commits scoped by area: `feat(map):`, `fix(charts):`, `fix(ui):`.
- No comments unless the code cannot explain itself; prefer renaming over commenting.

## Browser storage

All state lives in `localStorage`: `weather:places:v1` (saved places, Home),
`weather:place-summaries:v1` (card summaries), `weather:forecasts:v1` (last
forecast of up to 10 places) and `weather:lang:v1`. The legacy keys
`weather:location:v1` and `weather:last:v1` are migrated once and removed.
