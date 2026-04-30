<script lang="ts">
  import Icon from './Icon.svelte';
  import { describe, iconColor } from '$lib/wmo';
  import { fmtHour, fmtTemp } from '$lib/format';
  import { t, locale } from '$lib/i18n.svelte';
  import type { WeatherData } from '$lib/weather';

  type Props = { data: WeatherData };
  let { data }: Props = $props();

  const tz = $derived(data.timezone as string);
  const hourly = $derived(data.hourly);

  function startIndex(): number {
    const now = Date.now();
    const t = hourly.time as string[];
    for (let i = 0; i < t.length; i++) {
      if (new Date(t[i]).getTime() >= now - 60 * 60 * 1000) return i;
    }
    return 0;
  }

  const slice = $derived.by(() => {
    const start = startIndex();
    const end = Math.min(start + 24, hourly.time.length);
    const out: any[] = [];
    for (let i = start; i < end; i++) {
      out.push({
        time: hourly.time[i],
        temp: hourly.temperature_2m[i],
        code: hourly.weather_code[i],
        isDay: hourly.is_day[i],
        pop: hourly.precipitation_probability?.[i] ?? 0,
        precip: hourly.precipitation?.[i] ?? 0
      });
    }
    return out;
  });
</script>

<section class="px-5 pb-5">
  <h2 class="text-xs uppercase tracking-wider text-sub mb-2 px-1">{t('next_24h')}</h2>
  <div class="rounded-2xl bg-panel hairline">
    <div class="overflow-x-auto no-scrollbar">
      <ul class="flex gap-1 px-2 py-3 min-w-max">
        {#each slice as h, i}
          {@const w = describe(h.code, h.isDay)}
          <li class="flex flex-col items-center gap-1 px-3 py-1 min-w-[64px]">
            <span class="text-xs text-sub nums">{i === 0 ? t('now') : fmtHour(h.time, tz, locale())}</span>
            <Icon name={w.icon} size={26} class={iconColor(w.icon)} />
            {#if h.pop >= 20}
              <span class="text-[10px] text-rain nums leading-none">{h.pop}%</span>
            {:else}
              <span class="text-[10px] leading-none">&nbsp;</span>
            {/if}
            <span class="text-sm nums mt-0.5">{fmtTemp(h.temp)}</span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</section>
