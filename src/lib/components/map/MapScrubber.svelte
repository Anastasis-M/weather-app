<script lang="ts">
    import PlayIcon from "@lucide/svelte/icons/play";
    import PauseIcon from "@lucide/svelte/icons/pause";
    import LoaderIcon from "@lucide/svelte/icons/loader-2";
    import { Button } from "$lib/components/ui/button";
    import { Slider } from "$lib/components/ui/slider";
    import type { FramePlayer } from "$lib/mapPlayer.svelte";
    import { t, locale } from "$lib/i18n.svelte";

    let {
        player,
        timezone,
    }: { player: FramePlayer; timezone?: string } = $props();

    const label = $derived.by(() => {
        const frame = player.frames[player.idx];
        if (!frame) return "";
        return frame.time.toLocaleString(locale(), {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone,
        });
    });
</script>

<div
    class="weather-card flex items-center gap-3 rounded-lg px-2 py-1.5 backdrop-blur"
>
    <Button
        variant="ghost"
        size="icon-sm"
        class="pressable shrink-0 text-muted-foreground hover:text-foreground"
        onclick={() => player.togglePlay()}
        aria-label={player.playing ? t("map.pause") : t("map.play")}
    >
        {#if !player.ready}
            <LoaderIcon class="size-4 animate-spin text-accent" />
        {:else if player.playing}
            <PauseIcon class="size-4" />
        {:else}
            <PlayIcon class="size-4" />
        {/if}
    </Button>
    <Slider
        type="single"
        class="min-w-0 flex-1 [&_[data-slot=slider-range]]:bg-accent [&_[data-slot=slider-range]]:transition-opacity [&_[data-slot=slider-thumb]]:border-accent [&_[data-slot=slider-thumb]]:bg-accent [&_[data-slot=slider-track]]:bg-foreground/15 {player.loading
            ? '[&_[data-slot=slider-range]]:animate-pulse [&_[data-slot=slider-thumb]]:animate-pulse'
            : ''}"
        value={player.idx}
        min={0}
        max={Math.max(player.frames.length - 1, 0)}
        step={1}
        onValueChange={(v: number) => player.seek(v)}
        onValueCommit={() => player.settle()}
        aria-label={t("map.precipitation")}
    />
    <span
        class="nums w-24 shrink-0 text-right text-xs {player.isNow
            ? 'text-accent'
            : 'text-muted-foreground'}"
    >
        {player.isNow ? t("now") : label}
    </span>
</div>
