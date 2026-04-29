<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    const secure = location.protocol === 'https:' || location.hostname === 'localhost';
    if ('serviceWorker' in navigator && secure) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  });
</script>

{@render children()}
