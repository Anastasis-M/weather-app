<script lang="ts">
  import { moonLitPath } from '#lib/moon.js';

  type Props = { cycle: number; southern: boolean; class?: string };
  let { cycle, southern, class: className }: Props = $props();

  const id = $props.id();
</script>

<svg viewBox="0 0 100 100" class={className} aria-hidden="true">
  <defs>
    <mask id="{id}-shadow">
      <circle cx="50" cy="50" r="50" fill="white" />
      <path
        d={moonLitPath(cycle, 50, 50, 50)}
        fill="black"
        transform={southern ? 'matrix(-1 0 0 1 100 0)' : undefined}
      />
    </mask>
  </defs>
  <image href="/moon-face.webp" width="100" height="100" />
  <circle cx="50" cy="50" r="50" fill="rgb(6 9 18)" fill-opacity="0.8" mask="url(#{id}-shadow)" />
</svg>
