<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import SunriseIcon from '@lucide/svelte/icons/sunrise';
  import SunsetIcon from '@lucide/svelte/icons/sunset';
  import { t } from '$lib/i18n.svelte';
  import { localNowMs, skySpans, sunState } from '$lib/sun';
  import { describe, type Sky } from '$lib/wmo';
  import { moonLitPath, moonPhase } from '$lib/moon';
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
  const arc = (to: number, from = 0) =>
    Array.from({ length: 49 }, (_, i) => point(from + (i / 48) * (to - from)))
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

  const progress = $derived(sun?.progress ?? 0);
  const night = $derived(sun?.phase === 'night');
  const moon = $derived(moonPhase(clock));
  const MOON_R = 7;
  const southern = $derived((data.latitude ?? 0) < 0);
  const dot = $derived(point(progress));
  const travelled = $derived(arc(progress));
  const fill = $derived(`${travelled} L${dot.x.toFixed(1)},${BASE} L${PAD},${BASE} Z`);

  const PAST_OPACITY = 0.35;
  const skyStroke = (sky: Sky) =>
    sky === 'wet' ? 'var(--color-rain)' : sky === 'cloudy' ? 'var(--color-sub)' : night ? 'var(--color-snow)' : 'var(--color-warn)';
  const skyOpacity = (sky: Sky) => (sky === 'partly' ? 0.55 : 1);
  const skyFill = (sky: Sky) =>
    sky === 'wet' ? 'url(#rain-sky)' : sky === 'cloudy' ? 'url(#cloud-sky)' : night ? 'url(#moon-sky)' : 'url(#sun-sky)';
  const slice = (from: number, to: number) =>
    `${arc(to, from)} L${point(to).x.toFixed(1)},${BASE} L${point(from).x.toFixed(1)},${BASE} Z`;

  const spans = $derived(sun ? skySpans(sun, data.hourly?.time ?? [], data.hourly?.weather_code ?? []) : []);
  const strokes = $derived(
    spans.flatMap((s) => {
      const label = t('sun.sky_span', { from: hhmmAt(s.from), to: hhmmAt(s.to), sky: t(describe(s.code, night ? 0 : 1).labelKey) });
      const pieces = [];
      if (s.from < progress) pieces.push({ d: arc(Math.min(s.to, progress), s.from), opacity: skyOpacity(s.sky) * PAST_OPACITY });
      if (s.to > progress) pieces.push({ d: arc(s.to, Math.max(s.from, progress)), opacity: skyOpacity(s.sky) });
      return pieces.map((p) => ({ ...p, color: skyStroke(s.sky), label }));
    }),
  );
  const fills = $derived(
    spans
      .filter((s) => s.from < progress)
      .map((s) => ({ d: slice(s.from, Math.min(s.to, progress)), fill: skyFill(s.sky), opacity: skyOpacity(s.sky) })),
  );
  const skyNow = $derived(spans.find((s) => s.from <= progress && progress < s.to)?.sky ?? 'clear');
  const dimmed = $derived(skyNow === 'cloudy' || skyNow === 'wet');

  const duration = (ms: number) => {
    const minutes = Math.round(ms / MINUTE);
    if (minutes < 60) return t('sun.minutes', { m: minutes });
    return t('sun.duration', { h: Math.floor(minutes / 60), m: String(minutes % 60).padStart(2, '0') });
  };
  const hhmm = (iso: string) => iso.slice(11, 16);
  const hhmmAt = (p: number) => {
    if (!sun) return '';
    const d = new Date(sun.arcStart + p * (sun.arcEnd - sun.arcStart));
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  };
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
          <span class="nums text-xs text-muted-foreground">
            {#if night}
              {t(`moon.${moon.key}`)} · {Math.round(moon.illumination * 100)}%
            {:else}
              {t('sun.length', { length: duration(sun.length) })}
            {/if}
          </span>
        </div>

        <svg
          viewBox="0 0 {W} {H}"
          class="mt-1 w-full overflow-visible"
          role="img"
          aria-label={night
            ? t('moon.position', { phase: t(`moon.${moon.key}`), lit: Math.round(moon.illumination * 100) })
            : t('sun.position')}
        >
          <defs>
            <linearGradient id="sun-sky" gradientUnits="userSpaceOnUse" x1="0" y1={BASE - RY} x2="0" y2={BASE}>
              <stop offset="0%" stop-color="var(--color-warn)" stop-opacity="0.32" />
              <stop offset="100%" stop-color="var(--color-warn)" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="cloud-sky" gradientUnits="userSpaceOnUse" x1="0" y1={BASE - RY} x2="0" y2={BASE}>
              <stop offset="0%" stop-color="var(--color-sub)" stop-opacity="0.24" />
              <stop offset="100%" stop-color="var(--color-sub)" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="rain-sky" gradientUnits="userSpaceOnUse" x1="0" y1={BASE - RY} x2="0" y2={BASE}>
              <stop offset="0%" stop-color="var(--color-rain)" stop-opacity="0.3" />
              <stop offset="100%" stop-color="var(--color-rain)" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="moon-sky" gradientUnits="userSpaceOnUse" x1="0" y1={BASE - RY} x2="0" y2={BASE}>
              <stop offset="0%" stop-color="var(--color-snow)" stop-opacity="0.16" />
              <stop offset="100%" stop-color="var(--color-snow)" stop-opacity="0" />
            </linearGradient>
            <radialGradient id="sun-glow">
              <stop offset="0%" stop-color="var(--color-warn)" stop-opacity="0.55" />
              <stop offset="100%" stop-color="var(--color-warn)" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="moon-glow">
              <stop offset="0%" stop-color="var(--color-snow)" stop-opacity="0.35" />
              <stop offset="100%" stop-color="var(--color-snow)" stop-opacity="0" />
            </radialGradient>
          </defs>
          <path d={arc(1)} fill="none" stroke="var(--color-line)" stroke-width="1.5" stroke-dasharray="3 5" stroke-linecap="round" />
          <line x1="6" x2={W - 6} y1={BASE} y2={BASE} stroke="var(--color-line)" stroke-width="1" />
          {#each fills as f}
            <path d={f.d} fill={f.fill} fill-opacity={f.opacity} />
          {:else}
            <path d={fill} fill={night ? 'url(#moon-sky)' : 'url(#sun-sky)'} />
          {/each}
          {#each strokes as s}
            <path d={s.d} fill="none" stroke={s.color} stroke-opacity={s.opacity} stroke-width="2.5">
              <title>{s.label}</title>
            </path>
          {:else}
            <path
              d={travelled}
              fill="none"
              stroke={night ? 'var(--color-snow)' : 'var(--color-warn)'}
              stroke-opacity={night ? 0.55 : 1}
              stroke-width="2.5"
              stroke-linecap="round"
            />
          {/each}
          <circle cx={PAD} cy={BASE} r="2.5" fill={night ? 'var(--color-snow)' : 'var(--color-warn)'} />
          <circle cx={W - PAD} cy={BASE} r="2.5" fill="var(--color-mute)" />
          {#if night}
            <circle cx={dot.x} cy={dot.y} r="18" fill="url(#moon-glow)" />
            <circle cx={dot.x} cy={dot.y} r={MOON_R} fill="var(--color-line)" stroke="var(--color-mute)" stroke-width="0.75" />
            <path
              d={moonLitPath(moon.cycle, dot.x, dot.y, MOON_R)}
              fill="var(--color-snow)"
              transform={southern ? `matrix(-1 0 0 1 ${2 * dot.x} 0)` : undefined}
            />
          {:else}
            {#if !dimmed}
              <circle cx={dot.x} cy={dot.y} r="18" fill="url(#sun-glow)" />
            {/if}
            <circle cx={dot.x} cy={dot.y} r="6.5" fill="var(--color-warn)" fill-opacity={dimmed ? 0.55 : 1} />
          {/if}
        </svg>

        <div class="nums -mt-0.5 flex justify-between text-xs text-muted-foreground">
          {#if night}
            <span class="flex items-center gap-1">
              <SunsetIcon class="size-3.5 text-warn" aria-label={t('sunset')} />
              {hhmm(sun.sunset)}
            </span>
            <span class="flex items-center gap-1">
              {hhmm(sun.sunrise)}
              <SunriseIcon class="size-3.5 text-warn" aria-label={t('sunrise')} />
            </span>
          {:else}
            <span class="flex items-center gap-1">
              <SunriseIcon class="size-3.5 text-warn" aria-label={t('sunrise')} />
              {hhmm(sun.sunrise)}
            </span>
            <span class="flex items-center gap-1">
              {hhmm(sun.sunset)}
              <SunsetIcon class="size-3.5 text-warn" aria-label={t('sunset')} />
            </span>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  </section>
{/if}
