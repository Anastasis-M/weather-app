<script lang="ts">
    import LoaderIcon from "@lucide/svelte/icons/loader-2";
    import MaximizeIcon from "@lucide/svelte/icons/maximize-2";
    import { Button } from "$lib/components/ui/button";
    import type { Location } from "$lib/weather";
    import { t } from "$lib/i18n.svelte";

    let {
        place,
        active = true,
        onexpand,
    }: { place: Location; active?: boolean; onexpand?: () => void } = $props();

    let el: HTMLElement;
    let WeatherMap = $state<
        typeof import("./WeatherMap.svelte").default | null
    >(null);

    $effect(() => {
        if (WeatherMap) return;
        const obs = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                obs.disconnect();
                import("./WeatherMap.svelte").then(
                    (m) => (WeatherMap = m.default),
                );
            }
        });
        obs.observe(el);
        return () => obs.disconnect();
    });
</script>

<div bind:this={el} class="relative rounded-lg h-full w-full overflow-hidden">
    {#if WeatherMap}
        <WeatherMap {place} {active}>
            {#snippet action()}
                <Button
                    variant="ghost"
                    size="icon"
                    class="weather-card pressable size-9 rounded-lg text-muted-foreground hover:text-foreground"
                    onclick={() => onexpand?.()}
                    aria-label={t("map.expand")}
                >
                    <MaximizeIcon class="size-4" />
                </Button>
            {/snippet}
        </WeatherMap>
    {:else}
        <div class="flex h-full w-full items-center justify-center">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderIcon class="size-4 animate-spin text-accent" />
                {t("map.loading")}
            </div>
        </div>
    {/if}
</div>
