<script lang="ts">
  import UmbrellaIcon from '@lucide/svelte/icons/umbrella';
  import ShirtIcon from '@lucide/svelte/icons/shirt';
  import FootprintsIcon from '@lucide/svelte/icons/footprints';
  import SunMediumIcon from '@lucide/svelte/icons/sun-medium';
  import WindIcon from '@lucide/svelte/icons/wind';
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import WashingMachineIcon from '@lucide/svelte/icons/washing-machine';
  import ThermometerSunIcon from '@lucide/svelte/icons/thermometer-sun';
  import SnowflakeIcon from '@lucide/svelte/icons/snowflake';
  import * as Card from '#lib/components/ui/card/index.js';
  import { Separator } from '#lib/components/ui/separator/index.js';
  import RainStrip from './RainStrip.svelte';
  import { fmtMm } from '#lib/format.js';
  import { t } from '#lib/i18n.svelte.js';
  import { todayTips, type TipKind } from '#lib/tips.js';
  import type { WeatherData } from '#lib/weather.js';

  type Props = { data: WeatherData };
  let { data }: Props = $props();

  const LOOK: Record<TipKind, { icon: typeof UmbrellaIcon; tone: string; bg: string }> = {
    frost: { icon: SnowflakeIcon, tone: 'text-snow', bg: 'bg-snow/10' },
    heat: { icon: ThermometerSunIcon, tone: 'text-poor', bg: 'bg-poor/10' },
    air: { icon: GaugeIcon, tone: 'text-bad', bg: 'bg-bad/10' },
    layer: { icon: ShirtIcon, tone: 'text-snow', bg: 'bg-snow/10' },
    sunscreen: { icon: SunMediumIcon, tone: 'text-warn', bg: 'bg-warn/10' },
    outside: { icon: FootprintsIcon, tone: 'text-ok', bg: 'bg-ok/10' },
    laundry: { icon: WashingMachineIcon, tone: 'text-fair', bg: 'bg-fair/10' },
    wind: { icon: WindIcon, tone: 'text-sub', bg: 'bg-sub/10' },
  };

  const result = $derived(
    todayTips({
      now: data.current.time,
      hourly: data.hourly,
      aqi: data.airQuality?.current?.european_aqi ?? null,
    }),
  );
  const umbrella = $derived(result.umbrella);
</script>

{#if umbrella || result.tips.length}
  <section class="px-5 pb-4 lg:px-0 lg:pb-0 lg:pt-3">
    <Card.Root class="weather-card gap-0 rounded-lg py-0">
      <Card.Header class="px-4 pt-3.5 pb-3 sm:px-5">
        <Card.Title class="section-title">{t('tips.title')}</Card.Title>
      </Card.Header>
      <Card.Content class="px-4 pb-3.5 sm:px-5">
        {#if umbrella}
          <div class="flex items-start gap-3">
            <div class="grid size-8 shrink-0 place-items-center rounded-md bg-rain/10">
              <UmbrellaIcon class="size-4.5 text-rain" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold leading-tight text-rain">{t('tips.umbrella')}</div>
              <div class="mt-0.5 text-sm text-muted-foreground">
                {t('tips.umbrella.detail', {
                  from: umbrella.from,
                  to: umbrella.to,
                  peak: umbrella.peak,
                  total: fmtMm(umbrella.total),
                })}
              </div>
            </div>
          </div>

          <RainStrip hours={umbrella.hours} />
        {/if}

        {#if umbrella && result.tips.length}
          <Separator class="my-3" />
        {/if}
        {#if result.tips.length}
          <ul class="flex flex-col gap-3">
            {#each result.tips as tip (tip.kind)}
              {@const look = LOOK[tip.kind]}
              <li class="flex items-start gap-3">
                <div class="grid size-8 shrink-0 place-items-center rounded-md {look.bg}">
                  <look.icon class="size-4.5 {look.tone}" />
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-medium leading-tight">{t(`tips.${tip.kind}`)}</div>
                  <div class="mt-0.5 text-[13px] text-muted-foreground">{t(`tips.${tip.kind}.detail`, tip)}</div>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </Card.Content>
    </Card.Root>
  </section>
{/if}
