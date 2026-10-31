<script lang="ts">
  import WindIcon from '@lucide/svelte/icons/wind';
  import ThermometerIcon from '@lucide/svelte/icons/thermometer';
  import DropletIcon from '@lucide/svelte/icons/droplets';
  import CloudRainIcon from '@lucide/svelte/icons/cloud-rain';
  import SunMediumIcon from '@lucide/svelte/icons/sun-medium';
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import EyeIcon from '@lucide/svelte/icons/eye';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import TileFrame from './TileFrame.svelte';
  import { fmtTemp } from '#lib/format.js';
  import { t } from '#lib/i18n.svelte.js';
  import { buildTiles } from '#lib/tiles.js';
  import type { WeatherData } from '#lib/weather.js';

  type Props = { data: WeatherData };
  let { data }: Props = $props();

  const tiles = $derived(buildTiles(data));

  const DIAL_LABELS = [
    { key: 'c.N', x: 28, y: 8 },
    { key: 'c.E', x: 48, y: 30.5 },
    { key: 'c.S', x: 28, y: 52 },
    { key: 'c.W', x: 8, y: 30.5 },
  ] as const;
  const GAUGE_RADIUS = 34;
  const GAUGE_CX = 40;
  const GAUGE_CY = 40;

  function gaugePoint(position: number): { x: number; y: number } {
    const angle = Math.PI * (1 - position);
    return { x: GAUGE_CX + GAUGE_RADIUS * Math.cos(angle), y: GAUGE_CY - GAUGE_RADIUS * Math.sin(angle) };
  }

  const num = (n: number | null, digits = 0) => (n == null ? '—' : n.toFixed(digits));
  const mm = (n: number) => (n >= 10 ? String(Math.round(n)) : n.toFixed(1));
  const km = (n: number | null) => (n == null ? '—' : n >= 10 ? String(Math.round(n)) : n.toFixed(1));
</script>

<section class="grid grid-cols-2 gap-3 px-5 pb-3 sm:grid-cols-4 lg:grid-cols-2 lg:px-0 lg:pb-0 lg:pt-3">
  {#each tiles as tile (tile.kind)}
    {#if tile.kind === 'wind'}
      <TileFrame icon={WindIcon} title={t('wind')}>
        <div class="flex items-center justify-between gap-2">
          <div class="nums text-3xl font-light leading-none">
            {tile.beaufort}<span class="ml-1 text-sm text-muted-foreground">Bf</span>
          </div>
          <svg viewBox="0 0 56 56" class="size-14 shrink-0" role="img" aria-label={tile.compass ? t('tiles.wind_from', { dir: t('c.' + tile.compass) }) : t('wind')}>
            <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" class="text-border" stroke-width="1.5" />
            {#each DIAL_LABELS as label (label.key)}
              <text x={label.x} y={label.y} text-anchor="middle" dominant-baseline="central" class="fill-muted-foreground text-[7px]">{t(label.key)}</text>
            {/each}
            {#if tile.degrees != null}
              <g transform="rotate({tile.degrees + 180} 28 28)" class="fill-foreground">
                <path d="M28 15 L32 28 L28 25.5 L24 28 Z" />
                <rect x="27.2" y="28" width="1.6" height="9" rx="0.8" class="fill-foreground/50" />
              </g>
            {/if}
          </svg>
        </div>
        <div class="mt-auto text-xs leading-snug text-muted-foreground">
          <div class="text-foreground">{t(`bf.${tile.beaufort}`)}</div>
          {#if tile.compass}<div>{t('tiles.wind_from', { dir: t('c.' + tile.compass) })}</div>{/if}
          {#if tile.gusts != null}<div class="nums">{t('tiles.gusts', { speed: Math.round(tile.gusts) })}</div>{/if}
        </div>
      </TileFrame>
    {:else if tile.kind === 'feels'}
      <TileFrame icon={ThermometerIcon} title={t('feels_like')}>
        <div class="nums text-4xl font-light leading-none">{fmtTemp(tile.value)}</div>
        <p class="mt-auto text-xs leading-snug text-muted-foreground">{t(`feels.${tile.reason}`)}</p>
      </TileFrame>
    {:else if tile.kind === 'humidity'}
      <TileFrame icon={DropletIcon} title={t('humidity')} iconClass="text-rain">
        <div class="nums text-4xl font-light leading-none">{num(tile.value)}<span class="text-lg text-muted-foreground">%</span></div>
        <p class="mt-auto text-xs leading-snug text-muted-foreground">{t(`humidity.${tile.level}`, { dew: fmtTemp(tile.dewPoint) })}</p>
      </TileFrame>
    {:else if tile.kind === 'rain'}
      <TileFrame icon={CloudRainIcon} title={t('rain.title')} iconClass="text-rain">
        <div>
          <div class="nums text-4xl font-light leading-none">{mm(tile.soFar)}<span class="ml-1 text-lg text-muted-foreground">mm</span></div>
          <div class="mt-1 text-xs text-foreground">{t('rain.today')}</div>
        </div>
        <p class="nums mt-auto text-xs leading-snug text-muted-foreground">{t('rain.next24', { mm: mm(tile.next24h) })}</p>
      </TileFrame>
    {:else if tile.kind === 'uv'}
      <TileFrame icon={SunMediumIcon} title={t('uv_index')} iconClass="text-warn">
        <div>
          <div class="nums text-4xl font-light leading-none">{tile.value != null ? Math.round(tile.value) : '—'}</div>
          {#if tile.levelKey}<div class="mt-1 text-sm font-medium {tile.tone}">{t(tile.levelKey)}</div>{/if}
        </div>
        <div class="mt-auto">
          <div class="relative h-1.5 rounded-full" style="background:linear-gradient(90deg,#6ee7b7,#fde047 35%,#fdba74 60%,#fca5a5 80%,#f0abfc)">
            <span class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground" style="left:{tile.position * 100}%"></span>
          </div>
          {#if tile.peak != null}<p class="nums mt-2 text-xs text-muted-foreground">{t('uv.peak', { value: Math.round(tile.peak) })}</p>{/if}
        </div>
      </TileFrame>
    {:else if tile.kind === 'air'}
      <TileFrame icon={GaugeIcon} title={t('air_quality')} iconClass={tile.air.tone}>
        {#if tile.air.value != null}
          <div>
            <div class="nums text-4xl font-light leading-none">{tile.air.value}</div>
            <div class="mt-1 text-sm font-medium {tile.air.tone}">{t(tile.air.key)}</div>
          </div>
          {#if tile.air.pm25 != null}<p class="nums mt-auto text-xs text-muted-foreground">PM2.5 {tile.air.pm25.toFixed(1)}</p>{/if}
        {:else}
          <div class="text-4xl font-light leading-none text-muted-foreground">—</div>
        {/if}
      </TileFrame>
    {:else if tile.kind === 'visibility'}
      <TileFrame icon={EyeIcon} title={t('vis.title')}>
        <div class="nums text-4xl font-light leading-none">{km(tile.km)}<span class="ml-1 text-lg text-muted-foreground">km</span></div>
        <p class="mt-auto text-xs leading-snug text-muted-foreground">{t(`vis.${tile.level}`)}</p>
      </TileFrame>
    {:else if tile.kind === 'pressure'}
      {@const marker = gaugePoint(tile.position)}
      <TileFrame icon={GaugeIcon} title={t('pressure.title')}>
        <svg viewBox="0 0 80 46" class="mx-auto w-full max-w-28" aria-hidden="true">
          <path d="M6 40 A34 34 0 0 1 74 40" fill="none" stroke="currentColor" class="text-border" stroke-width="5" stroke-linecap="round" />
          <circle cx={marker.x} cy={marker.y} r="4.5" class="fill-foreground stroke-background" stroke-width="2" />
        </svg>
        <div>
          <div class="nums text-2xl font-light leading-none">{num(tile.hpa)}<span class="ml-1 text-sm text-muted-foreground">hPa</span></div>
          {#if tile.trend}
            <div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {#if tile.trend === 'rising'}<ArrowUpIcon class="size-3.5" />{:else if tile.trend === 'falling'}<ArrowDownIcon class="size-3.5" />{:else}<MinusIcon class="size-3.5" />{/if}
              {t(`pressure.${tile.trend}`)}
            </div>
          {/if}
        </div>
      </TileFrame>
    {/if}
  {/each}
</section>
