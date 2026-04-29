<script lang="ts">
  import Icon from './Icon.svelte';
  import { describe } from '$lib/wmo';
  import { fmtTemp, fmtTime, compassCode, uvLevel, kmhToBeaufort } from '$lib/format';
  import { t, locale } from '$lib/i18n.svelte';
  import type { Location, WeatherData } from '$lib/weather';

  type Props = { data: WeatherData; place: Location | null };
  let { data, place }: Props = $props();

  const c = $derived(data.current);
  const today = $derived(data.daily);
  const tz = $derived(data.timezone as string);
  const w = $derived(describe(c.weather_code, c.is_day));
  const uv = $derived(uvLevel(today.uv_index_max?.[0]));
  const bf = $derived(kmhToBeaufort(c.wind_speed_10m));
  const dir = $derived(compassCode(c.wind_direction_10m));
</script>

<section class="px-5 pt-2 pb-5">
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      <div class="text-sub text-sm flex items-center gap-1.5">
        <Icon name="pin" size={14} />
        <span class="truncate">{place?.name ?? '—'}</span>
      </div>
      <div class="mt-2 flex items-baseline gap-3">
        <span class="text-[88px] leading-none font-light nums tracking-tight">{fmtTemp(c.temperature_2m)}</span>
      </div>
      <div class="text-sub text-sm mt-1">
        {t('feels_like')} <span class="text-ink nums">{fmtTemp(c.apparent_temperature)}</span>
        · {t('high_short')} <span class="nums">{fmtTemp(today.temperature_2m_max?.[0])}</span>
        · {t('low_short')} <span class="nums">{fmtTemp(today.temperature_2m_min?.[0])}</span>
      </div>
    </div>
    <div class="flex flex-col items-center text-accent shrink-0">
      <Icon name={w.icon} size={84} class="text-accent" />
      <div class="text-xs text-sub mt-1">{t(w.labelKey)}</div>
    </div>
  </div>

  <div class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
    <div class="rounded-xl bg-panel hairline px-3 py-2.5">
      <div class="flex items-center gap-1.5 text-sub text-xs">
        <Icon name="drop" size={14} class="text-rain" /> {t('humidity')}
      </div>
      <div class="text-lg nums mt-0.5">{c.relative_humidity_2m ?? '—'}<span class="text-sub text-sm">%</span></div>
    </div>
    <div class="rounded-xl bg-panel hairline px-3 py-2.5">
      <div class="flex items-center gap-1.5 text-sub text-xs">
        <Icon name="wind" size={14} /> {t('wind')}
      </div>
      <div class="text-lg nums mt-0.5">
        {bf}<span class="text-sub text-sm"> Bf</span>
        {#if dir}<span class="text-sub text-xs ml-1">{t('c.' + dir)}</span>{/if}
      </div>
      <div class="text-[11px] text-mute leading-tight">{t('bf.' + bf)}</div>
    </div>
    <div class="rounded-xl bg-panel hairline px-3 py-2.5">
      <div class="flex items-center gap-1.5 text-sub text-xs">
        <Icon name="uv" size={14} class="text-warn" /> {t('uv_index')}
      </div>
      <div class="text-lg nums mt-0.5">
        {today.uv_index_max?.[0] != null ? Math.round(today.uv_index_max[0]) : '—'}
        {#if uv.key}<span class="text-xs ml-1 {uv.tone}">{t(uv.key)}</span>{/if}
      </div>
    </div>
    <div class="rounded-xl bg-panel hairline px-3 py-2.5">
      <div class="flex items-center gap-1.5 text-sub text-xs">
        <Icon name="drizzle" size={14} class="text-rain" /> {t('precip_today')}
      </div>
      <div class="text-lg nums mt-0.5">
        {(today.precipitation_sum?.[0] ?? 0).toFixed(1)}<span class="text-sub text-sm"> mm</span>
        <span class="text-sub text-xs ml-1">{today.precipitation_probability_max?.[0] ?? 0}%</span>
      </div>
    </div>
  </div>

  <div class="mt-2 grid grid-cols-2 gap-2">
    <div class="rounded-xl bg-panel hairline px-3 py-2.5 flex items-center gap-2">
      <Icon name="sunrise" size={18} class="text-accent" />
      <div>
        <div class="text-xs text-sub">{t('sunrise')}</div>
        <div class="nums text-base">{fmtTime(today.sunrise?.[0], tz, locale())}</div>
      </div>
    </div>
    <div class="rounded-xl bg-panel hairline px-3 py-2.5 flex items-center gap-2">
      <Icon name="sunset" size={18} class="text-accent" />
      <div>
        <div class="text-xs text-sub">{t('sunset')}</div>
        <div class="nums text-base">{fmtTime(today.sunset?.[0], tz, locale())}</div>
      </div>
    </div>
  </div>
</section>
