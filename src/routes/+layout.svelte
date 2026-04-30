<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { updated } from '$app/stores';

  let { children } = $props();

  onMount(() => {
    const secure = location.protocol === 'https:' || location.hostname === 'localhost';
    if ('serviceWorker' in navigator && secure) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  });

  $effect(() => {
    if ($updated) location.reload();
  });
</script>

{@render children()}
