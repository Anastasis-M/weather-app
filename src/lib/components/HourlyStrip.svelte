<script lang="ts">
  import SunriseIcon from '@lucide/svelte/icons/sunrise';
  import SunsetIcon from '@lucide/svelte/icons/sunset';
  import Icon from './Icon.svelte';
  import * as Card from '#lib/components/ui/card/index.js';
  import { describe, iconColor } from '#lib/wmo.js';
  import { fmtHour, fmtTemp } from '#lib/format.js';
  import { t } from '#lib/i18n.svelte.js';
  import { hourlyItems } from '#lib/tiles.js';
  import type { WeatherData } from '#lib/weather.js';

  type Props = { data: WeatherData };
  let { data }: Props = $props();

  const items = $derived(hourlyItems(data));
</script>

{#if items.length}
  <section class="px-5 pb-3 lg:px-0 lg:pb-0">
    <Card.Root class="weather-card gap-0 rounded-lg py-0">
      <Card.Header class="px-4 pt-4 pb-2 sm:px-5">
        <Card.Title class="section-title">{t('next_24h')}</Card.Title>
      </Card.Header>
      <Card.Content class="px-0 pb-3">
        <ol class="hourly-scroll no-scrollbar flex gap-1 overflow-x-auto px-3 after:w-1 after:shrink-0 after:content-[''] sm:px-4">
          {#each items as item (item.kind === 'hour' ? item.time : item.event + item.time)}
            {#if item.kind === 'hour'}
              {@const w = describe(item.code, item.isDay)}
              <li class="flex w-13 shrink-0 flex-col items-center gap-1.5 py-1">
                <span class="nums text-xs {item.isNow ? 'font-semibold text-foreground' : 'text-muted-foreground'}">
                  {item.isNow ? t('now') : fmtHour(item.time)}
                </span>
                <Icon name={w.icon} size={26} class={iconColor(w.icon)} />
                <span class="nums h-3.5 text-[11px] font-medium text-rain">{item.pop != null ? `${item.pop}%` : ''}</span>
                <span class="nums text-[15px]">{fmtTemp(item.temp)}</span>
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
