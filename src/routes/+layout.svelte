<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";
    import { updated } from "$app/state";
    import { Toaster } from "$lib/components/ui/sonner";
    import { TooltipProvider } from "$lib/components/ui/tooltip";

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

<TooltipProvider delayDuration={200}>
    {@render children()}
</TooltipProvider>
<Toaster richColors position="top-center" />
