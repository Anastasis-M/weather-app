<script lang="ts">
  import MoonStarIcon from '@lucide/svelte/icons/moon-star';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import ArrowDownRightIcon from '@lucide/svelte/icons/arrow-down-right';
  import * as Card from '#lib/components/ui/card/index.js';
  import { fmtDayShort } from '#lib/format.js';
  import { locale, t } from '#lib/i18n.svelte.js';
  import { daysUntilPhase, moonEvents, moonPhase } from '#lib/moon.js';
  import MoonCanvas from './moon/MoonCanvas.svelte';
  import type { WeatherData } from '#lib/weather.js';

  type Props = { data: WeatherData };
  let { data }: Props = $props();

  const DAY_MS = 86_400_000;
  const offsetMs = $derived((data.utc_offset_seconds ?? 0) * 1000);
  const now = $derived(Date.parse(`${data.current.time}Z`) - offsetMs);
  const today = $derived((data.current.time as string).slice(0, 10));
  const southern = $derived((data.latitude ?? 0) < 0);
  const phase = $derived(moonPhase(now));
  const pass = $derived.by(() => {
    const { rise, set } = moonEvents(now - DAY_MS, 72, data.latitude, data.longitude);
    const nextSet = set.find((ms) => ms > now);
    return { set: nextSet, rise: rise.findLast((ms) => nextSet == null || ms < nextSet) };
  });

  const localIso = (utcMs: number) => new Date(utcMs + offsetMs).toISOString();
  const when = (utcMs: number | undefined) => {
    if (utcMs == null) return { time: '—', day: '' };
    const iso = localIso(utcMs);
    const day = iso.slice(0, 10);
    return { time: iso.slice(11, 16), day: day === today ? '' : fmtDayShort(day, undefined, locale()) };
  };
  const rise = $derived(when(pass.rise));
  const set = $derived(when(pass.set));

  const countdown = (days: number) => {
    const n = Math.round(days);
    if (n === 0) return t('moon.today');
    if (n === 1) return t('moon.tomorrow');
    return t('moon.in_days', { n });
  };

  const nights = $derived(
    ((data.daily?.time ?? []) as string[]).slice(0, 7).map((day) => ({
      day,
      cycle: moonPhase(Date.parse(`${day}T21:00Z`) - offsetMs).cycle,
    })),
  );
</script>

<section class="h-full">
  <Card.Root class="weather-card h-full gap-0 rounded-lg py-0">
    <Card.Content class="@container px-4 pt-4 pb-4 sm:px-5">
      <div class="flex items-center gap-1.5 font-medium">
        <MoonStarIcon class="size-4 text-snow" aria-hidden="true" />
        {t('moon.title')}
      </div>

      <div class="@lg:mt-3 @lg:grid @lg:grid-cols-[minmax(0,1fr)_auto] @lg:items-center @lg:gap-x-6 @2xl:grid-cols-[auto_auto_minmax(0,1fr)]">
      <div class="relative mt-3 flex items-center gap-5 @lg:mt-0">
        <div class="relative size-28 shrink-0" role="img" aria-label={t('moon.position', { phase: t(`moon.${phase.key}`), lit: Math.round(phase.illumination * 100) })}>
          <div class="moon-halo pointer-events-none absolute -inset-5 rounded-full" aria-hidden="true"></div>
          <MoonCanvas cycle={phase.cycle} {southern} interactive class="relative w-full" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="text-lg leading-tight font-medium text-balance">{t(`moon.${phase.key}`)}</div>
          <div class="nums mt-0.5 text-sm text-muted-foreground">
            {t('moon.lit', { lit: Math.round(phase.illumination * 100) })}
          </div>
          <dl class="nums mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-sm">
            <dt class="flex items-center gap-1 text-muted-foreground">
              <ArrowUpRightIcon class="size-3.5" aria-hidden="true" />{t('moon.rise')}
            </dt>
            <dd class="whitespace-nowrap">{rise.time} <span class="text-xs text-muted-foreground">{rise.day}</span></dd>
            <dt class="flex items-center gap-1 text-muted-foreground">
              <ArrowDownRightIcon class="size-3.5" aria-hidden="true" />{t('moon.set')}
            </dt>
            <dd class="whitespace-nowrap">{set.time} <span class="text-xs text-muted-foreground">{set.day}</span></dd>
          </dl>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2 @lg:mt-0 @lg:grid-cols-1">
        <div class="rounded-md bg-secondary px-3 py-2">
          <div class="text-xs text-muted-foreground">{t('moon.next_new')}</div>
          <div class="nums text-sm font-medium">{countdown(daysUntilPhase(phase.cycle, 1))}</div>
        </div>
        <div class="rounded-md bg-secondary px-3 py-2">
          <div class="text-xs text-muted-foreground">{t('moon.next_full')}</div>
          <div class="nums text-sm font-medium">{countdown(daysUntilPhase(phase.cycle, 0.5))}</div>
        </div>
      </div>

      <ul class="mt-4 grid grid-cols-7 gap-1 border-t border-border pt-3 @lg:col-span-2 @2xl:col-span-1 @2xl:mt-0 @2xl:border-t-0 @2xl:border-l @2xl:pt-0 @2xl:pl-6">
        {#each nights as night (night.day)}
          <li class="flex flex-col items-center gap-1">
            <MoonCanvas cycle={night.cycle} {southern} class="w-6" />
            <span class="text-[11px] text-muted-foreground">{fmtDayShort(night.day, undefined, locale())}</span>
          </li>
        {/each}
      </ul>
      </div>
    </Card.Content>
  </Card.Root>
</section>

<style>
  .moon-halo {
    background: radial-gradient(circle, rgb(190 215 255 / 0.22) 30%, rgb(190 215 255 / 0) 70%);
    animation: breathe 7s ease-in-out infinite;
  }
  @keyframes breathe {
    0%, 100% { opacity: 0.7; transform: scale(0.94); }
    50% { opacity: 1; transform: scale(1.06); }
  }
  @media (prefers-reduced-motion: reduce) {
    .moon-halo { animation: none; }
  }
</style>
