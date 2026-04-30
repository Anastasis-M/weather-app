<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";
    import { updated } from "$app/state";

    let { children } = $props();

    onMount(() => {
        const secure =
            location.protocol === "https:" || location.hostname === "localhost";
        if ("serviceWorker" in navigator && secure) {
            navigator.serviceWorker.register("/sw.js").catch(() => {});
            // When skipWaiting() promotes a new SW, reload so the fresh
            // cache and updated assets are used from the start.
            navigator.serviceWorker.addEventListener("controllerchange", () =>
                location.reload(),
            );
        }
    });

    $effect(() => {
        if (updated.current) location.reload();
    });
</script>

{@render children()}
