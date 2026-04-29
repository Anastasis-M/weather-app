# Weather

A simple, fast weather app — current conditions, hourly forecast, 7-day with expandable hourly per day. Sunrise/sunset, humidity, wind in Beaufort, UV, precipitation. PWA-ready, mobile-first, dark-only.

No API keys. No backend. All data from [Open-Meteo](https://open-meteo.com).

## Stack

- SvelteKit 2 (Svelte 5 runes) + `adapter-static` → pure SPA, deployable as a folder of files.
- TypeScript (loosely typed).
- Tailwind 3.
- Open-Meteo Forecast API + Geocoding API (free, no key, attribution required).
- Custom service worker for offline shell + stale-while-revalidate API caching.

## Develop

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm check        # svelte-check (TypeScript + template)
pnpm build        # outputs to ./build
pnpm preview      # serve ./build locally
```

## Project layout

```
src/
  app.html, app.css
  routes/
    +layout.ts        # ssr: false (SPA mode)
    +layout.svelte    # registers service worker
    +page.svelte      # the only page
  lib/
    weather.ts          # Open-Meteo client + localStorage of last location
    wmo.ts              # WMO weather code → translation key + icon
    format.ts           # temperature, time, compass, Beaufort
    i18n.svelte.ts      # reactive language state, translations, t() helper
    components/
      Search.svelte     # debounced city search + locate button
      Current.svelte    # big temperature + condition + 4-tile detail grid
      Hourly.svelte     # next 24h horizontal scroll
      Daily.svelte      # 7 days, tap a row to expand its hourly
      Icon.svelte       # all SVGs
static/
  manifest.webmanifest, icon.svg, icon-192.png, icon-512.png, sw.js
```

## Features

- **Geolocation** on first load; falls back to a search box if denied.
- **Persists** the last location in `localStorage`.
- **Refresh** button re-fetches the current location without re-prompting permissions.
- **Language toggle** (EN / ΕΛ). Auto-detects Greek from `navigator.languages`; persists choice.
- **Wind in Beaufort** (with localized force name, e.g. `5 Bf · Fresh breeze` / `5 Bf · Μέτριος`).
- **PWA**: installable, custom service worker caches the app shell and revalidates Open-Meteo responses in the background.

## Deploy

The build output (`./build`) is a static site — drop it on any static host.

- **Vercel**: zero-config. Either push the repo and import it (Vercel auto-detects SvelteKit), or run `pnpm build` and deploy the `build/` directory. No environment variables needed.
- **Netlify / Cloudflare Pages / GitHub Pages / S3+CloudFront**: same — upload `build/` as static assets.

## Attribution

Forecast and geocoding data: [Open-Meteo](https://open-meteo.com) (CC BY 4.0).
