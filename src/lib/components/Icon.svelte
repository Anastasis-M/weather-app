<script lang="ts">
  type Props = { name?: string; size?: number; class?: string };
  let { name = 'sun', size = 24, class: cls = '' }: Props = $props();
</script>

{#if name === 'sun'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
{:else if name === 'moon'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
{:else if name === 'cloud'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6 19h11.5Z" />
  </svg>
{:else if name === 'cloud-sun'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M12 2v2M5.6 5.6l1.4 1.4M2 12h2M19.5 6 18 7.5" />
    <circle cx="12" cy="11" r="3" />
    <path d="M16 19a4 4 0 0 0 .8-7.92A6 6 0 0 0 5.7 12.5 3.5 3.5 0 0 0 6 19h10Z" />
  </svg>
{:else if name === 'cloud-moon'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M16 19a4 4 0 0 0 .8-7.92A6 6 0 0 0 5.7 12.5 3.5 3.5 0 0 0 6 19h10Z" />
    <path d="M14 4.5a4 4 0 0 0 5.5 5.5A5 5 0 1 1 14 4.5Z" />
  </svg>
{:else if name === 'rain'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M17.5 15a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6 15" />
    <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
  </svg>
{:else if name === 'drizzle'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M17.5 15a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6 15" />
    <path d="M9 19v1M13 19v1M17 19v1" />
  </svg>
{:else if name === 'snow'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M17.5 15a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6 15" />
    <path d="M8 19l.5.5M8.5 19l-.5.5M12 19l.5.5M12.5 19l-.5.5M16 19l.5.5M16.5 19l-.5.5" />
  </svg>
{:else if name === 'sleet'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M17.5 15a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6 15" />
    <path d="M9 19l-1 2M13 19l.5.5M13.5 19l-.5.5M17 19l-1 2" />
  </svg>
{:else if name === 'storm'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M17.5 15a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6 15" />
    <path d="M11 14l-2 4h3l-1 4 4-6h-3l1-2H11Z" />
  </svg>
{:else if name === 'fog'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M3 15h13M5 19h14M3 11h18" />
  </svg>
{:else if name === 'wind'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M3 8h11a3 3 0 1 0-3-3M3 12h17a3 3 0 1 1-3 3M3 16h7" />
  </svg>
{:else if name === 'drop'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z" />
  </svg>
{:else if name === 'sunrise'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M12 3v6M5 11l1.5 1.5M19 11l-1.5 1.5M3 18h18M8 18a4 4 0 0 1 8 0M9 6l3-3 3 3" />
  </svg>
{:else if name === 'sunset'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M12 9V3M5 11l1.5 1.5M19 11l-1.5 1.5M3 18h18M8 18a4 4 0 0 1 8 0M9 6l3 3 3-3" />
  </svg>
{:else if name === 'uv'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </svg>
{:else if name === 'search'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
{:else if name === 'pin'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M12 22s7-7 7-13a7 7 0 1 0-14 0c0 6 7 13 7 13Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
{:else if name === 'chevron'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="m6 9 6 6 6-6" />
  </svg>
{:else if name === 'refresh'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
{:else if name === 'cursor'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M12 2 20 20l-8-4-8 4L12 2Z" />
    <path d="M12 16V7" />
  </svg>
{:else if name === 'arrow'}
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class={cls}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
{/if}
