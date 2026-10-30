import { cubicOut } from 'svelte/easing';
import { MediaQuery } from 'svelte/reactivity';

const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

export function chartEnter() {
  return reducedMotion.current
    ? ({ type: 'none' } as const)
    : ({ type: 'tween', duration: 500, easing: cubicOut } as const);
}

export const DAY_CHART_PADDING = { top: 4, left: 20, bottom: 20, right: 4 };

export const WIND_MEDIAN = 'var(--color-muted-foreground)';
export const WIND_STRONGEST = 'color-mix(in oklab, var(--color-muted-foreground) 55%, transparent)';

export const PRECIP_MEDIAN = 'var(--color-rain)';
export const PRECIP_WETTEST = 'color-mix(in oklab, var(--color-rain) 55%, transparent)';

export const BAR_SEAM = { strokeWidth: 1, stroke: 'var(--color-card)' };
