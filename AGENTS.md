# Weather App agent context

Single-package SvelteKit app. No monorepo, no backend beyond route handlers.

## What This Is

A weather forecast PWA: current conditions, hourly/daily forecast charts, air
quality, and an animated precipitation map. Deployed on Vercel. Data from
Open-Meteo.

## Stack

- SvelteKit 2 + Svelte 5 (runes) + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/postcss`, no tailwind.config content pipeline)
- shadcn-svelte (bits-ui / formsnap / vaul / paneforge), lucide icons
- OpenLayers (`ol`) + `@openmeteo/weather-map-layer` for the precipitation map
- layerchart for forecast charts
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
    +page.svelte        # main view
    share/              # shareable snapshot view (+page.server.ts)
    api/
      forecast/         # Open-Meteo forecast proxy
      air-quality/      # Open-Meteo air quality proxy
      og/               # OG image generation (@vercel/og)
  lib/
    weather.ts          # forecast fetching/normalization
    wmo.ts              # WMO code -> condition metadata
    tempScale.ts        # temperature color scale
    mapLayers.ts        # map layer config
    mapPlayer.svelte.ts # animation timeline state (runes)
    i18n.svelte.ts      # locale/translation state (runes)
    format.ts           # formatting helpers
    components/         # UI components
static/                 # service worker, icons, manifest
scripts/inject-sw-version.js
```

## Conventions

- Svelte 5 runes everywhere (`$state`, `$derived`, `.svelte.ts` for shared reactive state); no legacy stores.
- Weather data crosses the API boundary untrusted: parse/normalize in `src/routes/api/*` and `lib/weather.ts`; internal types stay trusted.
- WMO condition logic lives only in `lib/wmo.ts`, never inline condition codes in components.
- Commits follow conventional commits scoped by area: `feat(map):`, `fix(charts):`, `fix(ui):`.
- No comments unless the code cannot explain itself; prefer renaming over commenting.
