<script lang="ts">
  import type { Component, Snippet } from 'svelte';

  type Props = { icon: Component<{ class?: string }>; title: string; iconClass?: string; children: Snippet };
  let { icon: Glyph, title, iconClass = 'text-muted-foreground', children }: Props = $props();
</script>

<div class="weather-card flex aspect-square min-w-0 flex-col gap-2 rounded-lg p-3.5 sm:p-4">
  <div class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
    <Glyph class="size-3.5 shrink-0 {iconClass}" />
    <span class="min-w-0 truncate">{title}</span>
  </div>
  {@render children()}
</div>
