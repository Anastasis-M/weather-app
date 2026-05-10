<script lang="ts">
    import { onMount } from 'svelte';

    let { data } = $props();

    const title = $derived(
        data.valid ? `${data.city} – ${data.temp}° ${data.condition}` : 'Weather'
    );
    const description = $derived(
        data.valid
            ? `${data.temp}° · ${data.condition} · ${data.precip}mm rain`
            : 'Check the weather anywhere, powered by Open-Meteo.'
    );
    // og:image points at the dynamic /api/og endpoint when we have a real
    // location, so the card shows the current temperature + 7-day forecast.
    // Falls back to the app icon when params are missing.
    const ogImage = $derived(
        data.valid
            ? `${data.origin}/api/og?lat=${data.lat}&lon=${data.lon}&name=${encodeURIComponent(data.name)}`
            : `${data.origin}/icon-192.png`,
    );
    const ogUrl = $derived(
        data.valid
            ? `${data.origin}/share?lat=${data.lat}&lon=${data.lon}&name=${encodeURIComponent(data.name)}`
            : data.origin
    );

    onMount(() => {
        const { valid, lat, lon, name } = data;
        const dest = valid
            ? `/?lat=${lat}&lon=${lon}&name=${encodeURIComponent(name)}`
            : '/';
        window.location.replace(dest);
    });
</script>

<svelte:head>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content={ogUrl} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImage} />
</svelte:head>

<main
    class="min-h-screen bg-bg text-ink flex items-center justify-center text-sm text-sub"
    aria-live="polite"
>
    {#if data.valid}
        Opening weather for {data.city}…
    {:else}
        Redirecting…
    {/if}
</main>
