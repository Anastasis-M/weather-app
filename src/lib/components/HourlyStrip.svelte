<script lang="ts">
  import SunriseIcon from '@lucide/svelte/icons/sunrise';
  import SunsetIcon from '@lucide/svelte/icons/sunset';
  import ThermometerIcon from '@lucide/svelte/icons/thermometer';
  import UmbrellaIcon from '@lucide/svelte/icons/umbrella';
  import WindIcon from '@lucide/svelte/icons/wind';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import Icon from './Icon.svelte';
  import * as Card from '#lib/components/ui/card/index.js';
  import * as Tabs from '#lib/components/ui/tabs/index.js';
  import { describe, iconColor } from '#lib/wmo.js';
  import { fmtHour, fmtMm, fmtTemp } from '#lib/format.js';
  import { t } from '#lib/i18n.svelte.js';
  import { hourlyItems } from '#lib/tiles.js';
  import type { WeatherData } from '#lib/weather.js';

  type Metric = 'temp' | 'rain' | 'wind';
  type Props = { data: WeatherData };
  let { data }: Props = $props();

  let metric = $state<Metric>('temp');

  const METRICS = [
    { value: 'temp', icon: ThermometerIcon, label: 'temp_trend', subtitle: 'hourly.temp' },
    { value: 'rain', icon: UmbrellaIcon, label: 'precip', subtitle: 'hourly.rain' },
    { value: 'wind', icon: WindIcon, label: 'wind', subtitle: 'hourly.wind' },
  ] as const;

  const items = $derived(hourlyItems(data));
  const subtitle = $derived(METRICS.find((m) => m.value === metric)!.subtitle);
</script>

{#if items.length}
  <section class="px-5 pb-3 lg:px-0 lg:pb-0">
    <Card.Root class="weather-card h-full gap-0 rounded-lg py-0">
      <Card.Header class="grid-cols-[minmax(0,1fr)] px-4 pt-4 pb-2 sm:px-5">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <Card.Title class="section-title">{t('next_24h')}</Card.Title>
            <p class="mt-0.5 text-xs text-muted-foreground">{t(subtitle)}</p>
          </div>
          <Tabs.Root bind:value={metric}>
            <Tabs.List class="shrink-0">
              {#each METRICS as m (m.value)}
                <Tabs.Trigger value={m.value} class="px-2.5" aria-label={t(m.label)} title={t(m.label)}>
                  <m.icon />
                </Tabs.Trigger>
              {/each}
            </Tabs.List>
          </Tabs.Root>
        </div>
      </Card.Header>
      <Card.Content class="flex flex-1 flex-col justify-center px-0 pb-3">
        <ol class="hourly-scroll no-scrollbar flex gap-1 overflow-x-auto px-3 after:w-1 after:shrink-0 after:content-[''] sm:px-4">
          {#each items as item (item.kind === 'hour' ? item.time : item.event + item.time)}
            {#if item.kind === 'hour'}
              {@const w = describe(item.code, item.isDay)}
              <li class="flex w-13 shrink-0 flex-col items-center gap-1.5 py-1">
                <span class="nums text-xs {item.isNow ? 'font-semibold text-foreground' : 'text-muted-foreground'}">
                  {item.isNow ? t('now') : fmtHour(item.time)}
                </span>
                {#if metric === 'wind'}
                  <span class="grid size-6.5 place-items-center">
                    {#if item.windFrom != null}
                      <ArrowUpIcon class="size-5 text-sub" style="transform: rotate({item.windFrom + 180}deg)" />
                    {/if}
                  </span>
                  <span class="nums text-[15px]">{item.wind ?? '—'}</span>
                  <span class="nums h-3.5 text-[11px] text-muted-foreground">{item.gusts != null ? t('hourly.gusts', { n: item.gusts }) : ''}</span>
                {:else}
                  <Icon name={w.icon} size={26} class={iconColor(w.icon)} />
                  {#if metric === 'rain'}
                    <span class="nums h-3.5 text-[11px] font-medium text-rain">{item.chance != null ? `${item.chance}%` : ''}</span>
                    <span class="nums text-[15px] {item.mm > 0 ? '' : 'text-muted-foreground'}">{item.mm > 0 ? fmtMm(item.mm) : '0'}</span>
                  {:else}
                    <span class="nums h-3.5 text-[11px] font-medium text-rain">{item.pop != null ? `${item.pop}%` : ''}</span>
                    <span class="nums text-[15px]">{fmtTemp(item.temp)}</span>
                  {/if}
                {/if}
              </li>
            {:else}
              <li class="flex w-16 shrink-0 flex-col items-center gap-1.5 py-1">
                <span class="nums text-xs text-muted-foreground">{fmtHour(item.time)}</span>
                {#if item.event === 'sunrise'}
                  <SunriseIcon class="size-6.5 text-warn" />
                {:else}
                  <SunsetIcon class="size-6.5 text-warn" />
                {/if}
                <span class="h-3.5"></span>
                <span class="text-[11px] leading-tight text-foreground">{t(item.event)}</span>
              </li>
            {/if}
          {/each}
        </ol>
      </Card.Content>
    </Card.Root>
  </section>
{/if}

<style>
  .hourly-scroll {
    mask-image: linear-gradient(to right, transparent, black 14px, black calc(100% - 22px), transparent);
  }
</style>
