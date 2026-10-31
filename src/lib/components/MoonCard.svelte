<script lang="ts">
  import MoonStarIcon from '@lucide/svelte/icons/moon-star';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import ArrowDownRightIcon from '@lucide/svelte/icons/arrow-down-right';
  import * as Card from '#lib/components/ui/card/index.js';
  import { fmtDayShort } from '#lib/format.js';
  import { locale, t } from '#lib/i18n.svelte.js';
  import { daysUntilPhase, moonEvents, moonLitPath, moonPhase } from '#lib/moon.js';
  import type { WeatherData } from '#lib/weather.js';
  import { hasWebgl } from '#lib/webgl.js';

  type Props = { data: WeatherData };
  let { data }: Props = $props();

  const DAY_MS = 86_400_000;
  const webgl = hasWebgl();
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

<section class="px-5 pb-3 lg:px-0 lg:pb-0 lg:pt-3">
  <Card.Root class="weather-card gap-0 rounded-lg py-0">
    <Card.Content class="px-4 pt-4 pb-4 sm:px-5">
      <div class="flex items-center gap-1.5 font-medium">
        <MoonStarIcon class="size-4 text-snow" aria-hidden="true" />
        {t('moon.title')}
      </div>

      <div class="mt-3 flex items-center gap-5">
        <div class="relative size-28 shrink-0" role="img" aria-label={t('moon.position', { phase: t(`moon.${phase.key}`), lit: Math.round(phase.illumination * 100) })}>
          {#if webgl}
            {#await import('./moon/MoonGlobe.svelte') then { default: MoonGlobe }}
              <MoonGlobe cycle={phase.cycle} {southern} />
            {/await}
          {:else}
            <svg viewBox="0 0 100 100" class="size-full">
              <circle cx="50" cy="50" r="48" fill="var(--color-line)" />
              <path
                d={moonLitPath(phase.cycle, 50, 50, 48)}
                fill="var(--color-snow)"
                transform={southern ? 'matrix(-1 0 0 1 100 0)' : undefined}
              />
            </svg>
          {/if}
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
            <dd>{rise.time} <span class="text-xs text-muted-foreground">{rise.day}</span></dd>
            <dt class="flex items-center gap-1 text-muted-foreground">
              <ArrowDownRightIcon class="size-3.5" aria-hidden="true" />{t('moon.set')}
            </dt>
            <dd>{set.time} <span class="text-xs text-muted-foreground">{set.day}</span></dd>
          </dl>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <div class="rounded-md bg-secondary px-3 py-2">
          <div class="text-xs text-muted-foreground">{t('moon.next_new')}</div>
          <div class="nums text-sm font-medium">{countdown(daysUntilPhase(phase.cycle, 1))}</div>
        </div>
        <div class="rounded-md bg-secondary px-3 py-2">
          <div class="text-xs text-muted-foreground">{t('moon.next_full')}</div>
          <div class="nums text-sm font-medium">{countdown(daysUntilPhase(phase.cycle, 0.5))}</div>
        </div>
      </div>

      <ul class="mt-4 grid grid-cols-7 gap-1 border-t border-border pt-3">
        {#each nights as night (night.day)}
          <li class="flex flex-col items-center gap-1">
            <svg viewBox="0 0 24 24" class="size-6" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="var(--color-line)" />
              <path
                d={moonLitPath(night.cycle, 12, 12, 10)}
                fill="var(--color-snow)"
                transform={southern ? 'matrix(-1 0 0 1 24 0)' : undefined}
              />
            </svg>
            <span class="text-[11px] text-muted-foreground">{fmtDayShort(night.day, undefined, locale())}</span>
          </li>
        {/each}
      </ul>
    </Card.Content>
  </Card.Root>
</section>
