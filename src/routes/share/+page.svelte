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
    const ogImage = $derived(`${data.origin}/icon-192.png`);
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
    <meta property="og:url" content={ogUrl} />
    <meta name="twitter:card" content="summary" />
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
