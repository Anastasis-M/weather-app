import { cubicOut } from 'svelte/easing';
import { MediaQuery } from 'svelte/reactivity';

const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

export function chartEnter() {
  return reducedMotion.current
    ? ({ type: 'none' } as const)
    : ({ type: 'tween', duration: 500, easing: cubicOut } as const);
}
