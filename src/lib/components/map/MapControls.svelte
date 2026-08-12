<script lang="ts">
    import type OlMap from "ol/Map.js";
    import PlusIcon from "@lucide/svelte/icons/plus";
    import MinusIcon from "@lucide/svelte/icons/minus";
    import { Button } from "$lib/components/ui/button";
    import { t } from "$lib/i18n.svelte";

    let {
        map,
        zoom,
        min,
        max,
    }: { map: OlMap | undefined; zoom: number; min: number; max: number } =
        $props();

    const atMax = $derived(zoom >= max - 0.01);
    const atMin = $derived(zoom <= min + 0.01);

    function step(by: 1 | -1) {
        const view = map?.getView();
        if (!view) return;
        view.animate({ zoom: (view.getZoom() ?? zoom) + by, duration: 250 });
    }
</script>

<div class="weather-card flex flex-col overflow-hidden rounded-lg">
    <Button
        variant="ghost"
        size="icon"
        class="pressable size-9 rounded-none text-muted-foreground hover:text-foreground"
        disabled={atMax}
        onclick={() => step(1)}
        aria-label={t("map.zoom_in")}
    >
        <PlusIcon class="size-4" />
    </Button>
    <div class="h-px bg-border" aria-hidden="true"></div>
    <Button
        variant="ghost"
        size="icon"
        class="pressable size-9 rounded-none text-muted-foreground hover:text-foreground"
        disabled={atMin}
        onclick={() => step(-1)}
        aria-label={t("map.zoom_out")}
    >
        <MinusIcon class="size-4" />
    </Button>
</div>
