<script lang="ts" module>
    export type HourBar = { label: string; value: number; color: string };
</script>

<script lang="ts">
    type Props = {
        bars: HourBar[];
        max: number;
        formatTick: (value: number) => string;
        showLabel: (bar: HourBar, index: number) => boolean;
        title: (bar: HourBar) => string;
        name: string;
        formatValue: (value: number) => string;
        class?: string;
    };
    let { bars, max, formatTick, showLabel, title, name, formatValue, class: className = "" }: Props =
        $props();

    const HEADROOM = 1.35;
    const STEPS = [0.2, 0.5, 1, 2, 5, 10, 20, 50];

    const yMax = $derived(max * HEADROOM);
    const step = $derived(STEPS.find((s) => max / s <= 2) ?? 100);
    const yTicks = $derived([step, step * 2].filter((v) => v <= yMax));

    let plot = $state<HTMLDivElement>();
    let active = $state(-1);
    let tipWidth = $state(0);

    const bar = $derived(active >= 0 ? bars[active] : null);
    const tipLeft = $derived.by(() => {
        if (!plot || active < 0) return 0;
        const width = plot.clientWidth;
        const center = ((active + 0.5) / bars.length) * width;
        return Math.max(0, Math.min(center - tipWidth / 2, width - tipWidth));
    });

    function track(e: PointerEvent) {
        if (!plot) return;
        const rect = plot.getBoundingClientRect();
        const index = Math.floor(((e.clientX - rect.left) / rect.width) * bars.length);
        active = Math.max(0, Math.min(bars.length - 1, index));
    }
</script>

<div class="flex flex-col text-xs {className}">
    <div class="relative min-h-0 flex-1 pl-8">
        {#each yTicks as tick (tick)}
            <span
                class="nums absolute left-0 w-7 translate-y-1/2 text-right text-muted-foreground"
                style="bottom:{(tick / yMax) * 100}%">{formatTick(tick)}</span
            >
        {/each}
        <div
            bind:this={plot}
            class="relative flex h-full items-end"
            role="img"
            aria-label={name}
            onpointermove={track}
            onpointerdown={track}
            onpointerleave={() => (active = -1)}
        >
            {#each bars as b, i (b.label + i)}
                <div class="flex h-full min-w-0 flex-1 items-end justify-center">
                    <div
                        class="w-[70%] rounded-t-[2px] transition-opacity {active >= 0 && active !== i ? 'opacity-60' : ''}"
                        style="height:{Math.min(100, (b.value / yMax) * 100)}%;background:{b.color}"
                    ></div>
                </div>
            {/each}
            {#if bar}
                <div
                    bind:clientWidth={tipWidth}
                    class="pointer-events-none absolute bottom-full z-10 mb-1 grid min-w-[9rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 shadow-xl"
                    style="left:{tipLeft}px"
                >
                    <div class="font-medium">{title(bar)}</div>
                    <div class="flex items-center gap-2">
                        <div class="size-2.5 shrink-0 rounded-[2px] bg-rain"></div>
                        <div class="flex flex-1 items-center justify-between gap-3 leading-none">
                            <span class="text-muted-foreground">{name}</span>
                            <span class="font-mono font-medium tabular-nums text-foreground">{formatValue(bar.value)}</span>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
    <div class="mt-1 flex h-4 pl-8 text-muted-foreground">
        {#each bars as b, i (b.label + i)}
            <span class="relative flex-1">
                {#if showLabel(b, i)}
                    <span class="nums absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{b.label}</span>
                {/if}
            </span>
        {/each}
    </div>
</div>
