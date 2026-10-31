<script lang="ts">
  import * as Card from '#lib/components/ui/card/index.js';
  import SunriseIcon from '@lucide/svelte/icons/sunrise';
  import SunsetIcon from '@lucide/svelte/icons/sunset';
  import { t } from '#lib/i18n.svelte.js';
  import { localNowMs, sunState } from '#lib/sun.js';
  import { moonAltitude, moonLitPath, moonPhase } from '#lib/moon.js';
  import type { WeatherData } from '#lib/weather.js';
  import { hasWebgl } from '#lib/webgl.js';

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
  const SAMPLES = 48;
  const DIP = 12;
  const MIN_PEAK = 25 * (Math.PI / 180);
  const xAt = (p: number) => PAD + (W - 2 * PAD) * p;
  const toPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const sunTrack = Array.from({ length: SAMPLES + 1 }, (_, i) => point(i / SAMPLES));

  const progress = $derived(sun?.progress ?? 0);
  const night = $derived(sun?.phase === 'night');
  const moon = $derived(moonPhase(clock));
  const MOON_R = 12;
  const webgl = hasWebgl();
  const southern = $derived((data.latitude ?? 0) < 0);

  const moonTrack = $derived.by(() => {
    if (sun?.phase !== 'night') return null;
    const offset = (data.utc_offset_seconds ?? 0) * 1000;
    const span = sun.nightEnd - sun.nightStart;
    const altAt = (p: number) => moonAltitude(sun.nightStart - offset + p * span, data.latitude, data.longitude);
    const alts = Array.from({ length: SAMPLES + 1 }, (_, i) => altAt(i / SAMPLES));
    const peak = Math.max(MIN_PEAK, ...alts);
    const trough = Math.max(MIN_PEAK, ...alts.map((a) => -a));
    const y = (a: number) => BASE - (a >= 0 ? (RY * a) / peak : (DIP * a) / trough);
    const now = altAt(progress);
    return {
      points: alts.map((a, i) => ({ x: xAt(i / SAMPLES), y: y(a) })),
      dot: { x: xAt(progress), y: Math.min(y(now), BASE) },
      up: now > 0,
    };
  });
  const track = $derived(moonTrack?.points ?? sunTrack);
  const dot = $derived(moonTrack?.dot ?? point(progress));
  const visible = $derived(moonTrack?.up ?? true);
  const travelled = $derived(toPath([...track.filter((_, i) => i / SAMPLES < progress), dot]));
  const fill = $derived(`${travelled} L${dot.x.toFixed(1)},${BASE} L${PAD},${BASE} Z`);

  const duration = (ms: number) => {
    const minutes = Math.round(ms / MINUTE);
    if (minutes < 60) return t('sun.minutes', { m: minutes });
    return t('sun.duration', { h: Math.floor(minutes / 60), m: String(minutes % 60).padStart(2, '0') });
  };
  const hhmm = (iso: string) => iso.slice(11, 16);
  const localClock = (localMs: number) => new Date(localMs).toISOString().slice(11, 16);
</script>

{#if sun}
  <section class="px-5 pb-3 lg:px-0 lg:pb-0 lg:pt-3">
    <Card.Root class="weather-card gap-0 rounded-lg py-0">
      <Card.Content class="px-4 pt-4 pb-4 sm:px-5">
        <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span class="font-medium">
            {#if sun.phase === 'day'}
              {t('sun.left', { left: duration(sun.left) })}
            {:else}
              {t('sun.rises_in', { in: duration(sun.untilRise) })}
            {/if}
          </span>
          <span class="nums whitespace-nowrap text-xs text-muted-foreground">
            {#if night}
              {t(`moon.${moon.key}`)} · {Math.round(moon.illumination * 100)}%
            {:else}
              {t('sun.length', { length: duration(sun.length) })}
            {/if}
          </span>
        </div>

        <div class="relative mt-1">
          <svg
            viewBox="0 0 {W} {H}"
            class="w-full overflow-visible"
            role="img"
            aria-label={night
              ? t('moon.position', { phase: t(`moon.${moon.key}`), lit: Math.round(moon.illumination * 100) })
              : t('sun.position')}
          >
            <defs>
              <linearGradient id="sun-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--color-warn)" stop-opacity="0.32" />
                <stop offset="100%" stop-color="var(--color-warn)" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="moon-sky" x1="0" y1="0" x2="0" y2="1">
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
              <clipPath id="above-horizon">
                <rect x="0" y={-H} width={W} height={H + BASE} />
              </clipPath>
            </defs>
            <path d={toPath(track)} fill="none" stroke="var(--color-line)" stroke-width="1.5" stroke-dasharray="3 5" stroke-linecap="round" />
            <line x1="6" x2={W - 6} y1={BASE} y2={BASE} stroke="var(--color-line)" stroke-width="1" />
            <path d={fill} fill={night ? 'url(#moon-sky)' : 'url(#sun-sky)'} clip-path="url(#above-horizon)" />
            <path
              clip-path="url(#above-horizon)"
              d={travelled}
              fill="none"
              stroke={night ? 'var(--color-snow)' : 'var(--color-warn)'}
              stroke-opacity={night ? 0.55 : 1}
              stroke-width="2.5"
              stroke-linecap="round"
            />
            <circle cx={PAD} cy={BASE} r="2.5" fill={night ? 'var(--color-snow)' : 'var(--color-warn)'} />
            <circle cx={W - PAD} cy={BASE} r="2.5" fill="var(--color-mute)" />
            {#if night}
              {#if visible}
                <circle cx={dot.x} cy={dot.y} r="26" fill="url(#moon-glow)" />
              {/if}
              {#if !webgl}
                <g opacity={visible ? 1 : 0.35}>
                <circle cx={dot.x} cy={dot.y} r={MOON_R} fill="var(--color-line)" stroke="var(--color-mute)" stroke-width="0.75" />
                <path
                  d={moonLitPath(moon.cycle, dot.x, dot.y, MOON_R)}
                  fill="var(--color-snow)"
                  transform={southern ? `matrix(-1 0 0 1 ${2 * dot.x} 0)` : undefined}
                />
                </g>
              {/if}
            {:else}
              <circle cx={dot.x} cy={dot.y} r="18" fill="url(#sun-glow)" />
              <circle cx={dot.x} cy={dot.y} r="6.5" fill="var(--color-warn)" />
            {/if}
          </svg>
          {#if night && webgl}
            {#await import('./moon/MoonGlobe.svelte') then { default: MoonGlobe }}
              <div
                class="pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 transition-opacity"
                class:opacity-35={!visible}
                style:left="{(dot.x / W) * 100}%"
                style:top="{(dot.y / H) * 100}%"
                style:width="{((2 * MOON_R) / W) * 100}%"
                aria-hidden="true"
              >
                <MoonGlobe cycle={moon.cycle} {southern} />
              </div>
            {/await}
          {/if}
        </div>

        <div class="nums -mt-0.5 flex justify-between text-xs text-muted-foreground">
          {#if sun.phase === 'night'}
            <span class="flex items-center gap-1">
              <SunsetIcon class="size-3.5 text-warn" aria-label={t('sunset')} />
              {localClock(sun.nightStart)}
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
