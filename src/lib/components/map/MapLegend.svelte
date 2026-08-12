<script lang="ts">
    import { PRECIP_SCALE } from "$lib/mapLayers";
    import { t } from "$lib/i18n.svelte";

    const stops = $derived.by(() => {
        if (PRECIP_SCALE.type !== "breakpoint") return [];
        return PRECIP_SCALE.colors
            .map((c, i) => ({ color: `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`, i }))
            .slice(2);
    });

    const labels = $derived.by(() => {
        if (PRECIP_SCALE.type !== "breakpoint" || !stops.length) return [];
        const bp = PRECIP_SCALE.breakpoints;
        const first = stops[0].i;
        const last = stops[stops.length - 1].i;
        const mid = stops[Math.floor(stops.length / 2)].i;
        return [bp[first], bp[mid], bp[last]];
    });
</script>

{#if stops.length}
    <div
        class="weather-card pointer-events-none flex flex-col gap-1 rounded-lg px-2 py-1.5"
        aria-label={t("map.legend")}
    >
        <div class="flex h-1.5 w-28 overflow-hidden rounded-full">
            {#each stops as stop (stop.i)}
                <span
                    class="h-full flex-1"
                    style:background-color={stop.color}
                ></span>
            {/each}
        </div>
        <div
            class="nums flex w-28 justify-between text-[10px] leading-none text-muted-foreground/80"
        >
            {#each labels as label, i (i)}
                <span>{label}{i === labels.length - 1 ? " mm" : ""}</span>
            {/each}
        </div>
    </div>
{/if}
