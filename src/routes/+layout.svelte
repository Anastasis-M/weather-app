<script lang="ts">
    import "../app.css";
    import "@fontsource-variable/inter";
    import { onMount } from "svelte";
    import { dev } from '$app/env';
    import { updated } from "$app/state";
    import { Toaster } from "#lib/components/ui/sonner/index.js";
    import { TooltipProvider } from "#lib/components/ui/tooltip/index.js";

    let { children } = $props();

    onMount(() => {
        if (!("serviceWorker" in navigator)) return;
        // The SW caches modules, which serves stale code against a dev
        // server — keep it (and any leftover registration) out of dev.
        if (dev) {
            navigator.serviceWorker
                .getRegistrations()
                .then((rs) => rs.forEach((r) => r.unregister()));
            return;
        }
        const secure =
            location.protocol === "https:" || location.hostname === "localhost";
        if (secure) {
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
