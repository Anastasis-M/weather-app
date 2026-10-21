<script lang="ts">
  import Icon from './Icon.svelte';
  import MapPinIcon from '@lucide/svelte/icons/map-pin';
  import DropletIcon from '@lucide/svelte/icons/droplets';
  import WindIcon from '@lucide/svelte/icons/wind';
  import SunMediumIcon from '@lucide/svelte/icons/sun-medium';
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import StarIcon from '@lucide/svelte/icons/star';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { describe, iconColor } from '$lib/wmo';
  import { fmtTemp, compassCode, uvLevel, kmhToBeaufort } from '$lib/format';
  import { t } from '$lib/i18n.svelte';
  import type { Location, WeatherData } from '$lib/weather';

  type Props = { data: WeatherData; place: Location | null; saved?: boolean; onToggleSave?: () => void };
  let { data, place, saved = false, onToggleSave }: Props = $props();

  const c = $derived(data.current);
  const today = $derived(data.daily);
  const w = $derived(describe(c.weather_code, c.is_day));
  const uv = $derived(uvLevel(today.uv_index_max?.[0]));
  const bf = $derived(kmhToBeaufort(c.wind_speed_10m));
  const dir = $derived(compassCode(c.wind_direction_10m));
  const placeTitle = $derived(place?.shortName || place?.name || '—');
  const placeDetail = $derived(place?.name && place?.shortName && place.name !== place.shortName ? place.name : '');
  const air = $derived.by(() => airQuality());

  function airQuality(): { value: number | null; key: string; tone: string; pm25: number | null } {
    const current = data.airQuality?.current;
    const value = current?.european_aqi == null ? null : Math.round(Number(current.european_aqi));
    const pm25 = current?.pm2_5 == null ? null : Number(current.pm2_5);
    if (value == null || Number.isNaN(value)) {
      return { value: null, key: '—', tone: 'text-muted-foreground', pm25 };
    }
    if (value <= 20) return { value, key: 'air_good', tone: 'text-ok', pm25 };
    if (value <= 40) return { value, key: 'air_fair', tone: 'text-fair', pm25 };
    if (value <= 60) return { value, key: 'air_moderate', tone: 'text-caution', pm25 };
    if (value <= 80) return { value, key: 'air_poor', tone: 'text-poor', pm25 };
    if (value <= 100) return { value, key: 'air_very_poor', tone: 'text-bad', pm25 };
    return { value, key: 'air_extreme', tone: 'text-severe', pm25 };
  }
</script>

<section class="px-5 pb-4 lg:px-0 lg:pb-0">
  <Card.Root size="sm" class="weather-card rounded-lg py-0">
    <Card.Header class="px-4 pt-3.5 pb-0 sm:px-5">
      <div class="flex flex-wrap items-start justify-between gap-2.5">
        <div class="min-w-0 flex-1">
          <div class="flex items-start gap-2">
            <MapPinIcon class="mt-1 size-5 shrink-0 text-accent sm:mt-1.5" />
            <Card.Title class="min-w-0 text-balance text-2xl! font-bold leading-tight tracking-tight text-foreground sm:text-3xl!">
              {placeTitle}
            </Card.Title>
          </div>
          <Card.Description class="mt-1 truncate text-sm">
            {placeDetail || t(w.labelKey)}
          </Card.Description>
        </div>
        {#if place && onToggleSave}
          <Button
            variant="outline"
            size="sm"
            onclick={onToggleSave}
            aria-pressed={saved}
            class="pressable h-9 shrink-0 gap-1.5 {saved ? 'border-accent/30 bg-accent/15 text-accent hover:bg-accent/20 hover:text-accent' : 'text-muted-foreground'}"
          >
            <StarIcon class="size-4 {saved ? 'fill-accent' : ''}" />
            {t(saved ? 'places.saved' : 'places.save')}
          </Button>
        {/if}
      </div>
    </Card.Header>

    <Card.Content class="px-4 pb-3.5 pt-2 sm:px-5">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="nums text-[62px] font-light leading-none tracking-tight sm:text-[70px] lg:text-[72px]">
            {fmtTemp(c.temperature_2m)}
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{t(w.labelKey)}</span>
            <span class="text-muted-foreground/60">·</span>
            <span>{t('feels_like')} <span class="nums text-foreground">{fmtTemp(c.apparent_temperature)}</span></span>
            <span class="text-muted-foreground/60">·</span>
            <span>{t('high_short')} <span class="nums">{fmtTemp(today.temperature_2m_max?.[0])}</span></span>
            <span>{t('low_short')} <span class="nums">{fmtTemp(today.temperature_2m_min?.[0])}</span></span>
          </div>
        </div>
        <div class="shrink-0">
          <Icon name={w.icon} size={60} class={iconColor(w.icon)} />
        </div>
      </div>

      <div class="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/70 pt-2.5 sm:grid-cols-4 lg:grid-cols-2">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <WindIcon class="size-3.5" /> {t('wind')}
          </div>
          <div class="nums mt-0.5 truncate text-[15px]">
            {bf}<span class="text-sm text-muted-foreground"> Bf</span>
            {#if dir}<span class="ml-1 text-xs text-muted-foreground">{t('c.' + dir)}</span>{/if}
            <span class="ml-1 text-xs text-muted-foreground">{t('bf.' + bf)}</span>
          </div>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GaugeIcon class="size-3.5 {air.tone}" /> {t('air_quality')}
          </div>
          <div class="mt-0.5 flex items-center gap-1.5 truncate">
            {#if air.value != null}
              <span class="nums text-[15px]">{air.value}</span>
              <span class="truncate text-xs {air.tone}">{t(air.key)}</span>
              {#if air.pm25 != null}<span class="nums text-xs text-muted-foreground">PM2.5 {air.pm25.toFixed(1)}</span>{/if}
            {:else}
              <span class="text-base text-muted-foreground">—</span>
            {/if}
          </div>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SunMediumIcon class="size-3.5 text-warn" /> {t('uv_index')}
          </div>
          <div class="mt-0.5 flex items-center gap-1.5">
            <span class="nums text-[15px]">{today.uv_index_max?.[0] != null ? Math.round(today.uv_index_max[0]) : '—'}</span>
            {#if uv.key}<span class="truncate text-xs {uv.tone}">{t(uv.key)}</span>{/if}
          </div>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DropletIcon class="size-3.5 text-rain" /> {t('humidity')}
          </div>
          <div class="nums mt-0.5 text-[15px]">{c.relative_humidity_2m ?? '—'}<span class="text-sm text-muted-foreground">%</span></div>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
</section>
