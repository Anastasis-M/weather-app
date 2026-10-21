<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import SunriseIcon from '@lucide/svelte/icons/sunrise';
  import SunsetIcon from '@lucide/svelte/icons/sunset';
  import MoonIcon from '@lucide/svelte/icons/moon';
  import { t } from '$lib/i18n.svelte';
  import { localNowMs, sunState } from '$lib/sun';
  import type { WeatherData } from '$lib/weather';

  type Props = { data: WeatherData };
  let { data }: Props = $props();

  const W = 300;
  const H = 120;
  const PAD = 22;
  const BASE = 104;
  const RX = W / 2 - PAD;
  const RY = 82;
  const CX = W / 2;
  const MINUTE = 60_000;

  let clock = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (clock = Date.now()), MINUTE);
    return () => clearInterval(id);
  });

  const day = (i: number) =>
    data.daily?.sunrise?.[i] && data.daily?.sunset?.[i]
      ? { sunrise: data.daily.sunrise[i] as string, sunset: data.daily.sunset[i] as string }
      : null;

  const sun = $derived.by(() => {
    const today = day(0);
    return today ? sunState(localNowMs(data.utc_offset_seconds ?? 0, clock), today, day(1)) : null;
  });

  const point = (p: number) => ({ x: CX - RX * Math.cos(Math.PI * p), y: BASE - RY * Math.sin(Math.PI * p) });
  const arc = (to: number) =>
    Array.from({ length: 49 }, (_, i) => point((i / 48) * to))
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

  const progress = $derived(sun?.phase === 'day' ? sun.progress : 0);
  const dot = $derived(point(progress));
  const travelled = $derived(arc(progress));
  const fill = $derived(`${travelled} L${dot.x.toFixed(1)},${BASE} L${PAD},${BASE} Z`);

  const duration = (ms: number) => {
    const minutes = Math.round(ms / MINUTE);
    if (minutes < 60) return t('sun.minutes', { m: minutes });
    return t('sun.duration', { h: Math.floor(minutes / 60), m: String(minutes % 60).padStart(2, '0') });
  };
  const hhmm = (iso: string) => iso.slice(11, 16);
</script>

{#if sun}
  <section class="px-5 pb-4 lg:px-0 lg:pb-0 lg:pt-3">
    <Card.Root class="weather-card gap-0 rounded-lg py-0">
      <Card.Content class="px-4 pt-3.5 pb-3 sm:px-5">
        <div class="flex items-baseline justify-between gap-2">
          <span class="font-medium">
            {#if sun.phase === 'day'}
              {t('sun.left', { left: duration(sun.left) })}
            {:else}
              {t('sun.rises_in', { in: duration(sun.untilRise) })}
            {/if}
          </span>
          <span class="nums text-xs text-muted-foreground">{t('sun.length', { length: duration(sun.length) })}</span>
        </div>

        <div class="relative">
          <svg
            viewBox="0 0 {W} {H}"
            class="mt-1 w-full overflow-visible {sun.phase === 'night' ? 'opacity-60' : ''}"
            role="img"
            aria-label={t('sun.position')}
          >
            <defs>
              <linearGradient id="sun-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--color-warn)" stop-opacity="0.32" />
                <stop offset="100%" stop-color="var(--color-warn)" stop-opacity="0" />
              </linearGradient>
              <radialGradient id="sun-glow">
                <stop offset="0%" stop-color="var(--color-warn)" stop-opacity="0.55" />
                <stop offset="100%" stop-color="var(--color-warn)" stop-opacity="0" />
              </radialGradient>
            </defs>
            <path
              d={arc(1)}
              fill="none"
              stroke={sun.phase === 'day' ? 'var(--color-line)' : 'var(--color-mute)'}
              stroke-width="1.5"
              stroke-dasharray="3 5"
              stroke-linecap="round"
            />
            <line x1="6" x2={W - 6} y1={BASE} y2={BASE} stroke="var(--color-line)" stroke-width="1" />
            {#if sun.phase === 'day'}
              <path d={fill} fill="url(#sun-sky)" />
              <path d={travelled} fill="none" stroke="var(--color-warn)" stroke-width="2.5" stroke-linecap="round" />
              <circle cx={dot.x} cy={dot.y} r="18" fill="url(#sun-glow)" />
              <circle cx={dot.x} cy={dot.y} r="6.5" fill="var(--color-warn)" />
              <circle cx={PAD} cy={BASE} r="2.5" fill="var(--color-warn)" />
            {:else}
              <circle cx={PAD} cy={BASE} r="2.5" fill="var(--color-mute)" />
            {/if}
            <circle cx={W - PAD} cy={BASE} r="2.5" fill="var(--color-mute)" />
          </svg>
          {#if sun.phase === 'night'}
            <MoonIcon class="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 text-sub" aria-hidden="true" />
          {/if}
        </div>

        <div class="nums -mt-0.5 flex justify-between text-xs text-muted-foreground">
          <span class="flex items-center gap-1">
            <SunriseIcon class="size-3.5 text-warn" aria-label={t('sunrise')} />
            {hhmm(sun.sunrise)}
          </span>
          <span class="flex items-center gap-1">
            {hhmm(sun.sunset)}
            <SunsetIcon class="size-3.5 text-warn" aria-label={t('sunset')} />
          </span>
        </div>
      </Card.Content>
    </Card.Root>
  </section>
{/if}
