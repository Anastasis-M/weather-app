<script lang="ts">
    import { AreaChart, Area } from "layerchart";
    import * as Chart from "$lib/components/ui/chart";
    import { tempColor } from "$lib/tempScale";
    import { fmtHour } from "$lib/format";
    import { t, locale } from "$lib/i18n.svelte";

    type Hour = { time: string; temp: number };
    type Props = { hours: Hour[]; tz: string };
    let { hours, tz }: Props = $props();

    const uid = $props.id();

    const data = $derived(
        hours.map((h) => ({
            date: new Date(h.time),
            temp: Math.round(h.temp * 10) / 10,
        })),
    );

    const hi = $derived(Math.max(...hours.map((h) => h.temp)));
    const lo = $derived(Math.min(...hours.map((h) => h.temp)));
    const dLo = $derived(Math.floor(lo) - 1);
    const dHi = $derived(Math.ceil(hi) + 1);

    // Explicit tick values kept inside the plot by a margin, so an edge
    // tick's label can never overhang into the card title or hour labels.
    const yTicks = $derived.by(() => {
        const span = dHi - dLo;
        const pad = Math.max(1, Math.round(span * 0.15));
        const min = dLo + pad;
        const max = dHi - pad;
        const step = Math.max(1, Math.ceil((max - min) / 3));
        const out: number[] = [];
        for (let v = min; v <= max; v += step) out.push(v);
        return out;
    });

    // Per-hour gradient stops so the line is colored by the temperature at
    // each point of the day, on the shared absolute scale.
    const stops = $derived(
        hours.map((h, j) => ({
            offset: ((j / Math.max(1, hours.length - 1)) * 100).toFixed(1),
            color: tempColor(h.temp),
        })),
    );

    const config = $derived({
        temp: { label: t("temp_trend"), color: tempColor(hi) },
    } satisfies Chart.ChartConfig);

    function fmtAxisHour(d: Date): string {
        return fmtHour(d.toISOString(), tz, locale());
    }
</script>

<Chart.Container {config} class="mt-1.5 aspect-auto h-28 w-full px-2.5 pb-1">
    <AreaChart
        {data}
        x="date"
        y="temp"
        yDomain={[dLo, dHi]}
        series={[
            { key: "temp", label: t("temp_trend"), color: tempColor(hi) },
        ]}
        props={{
            xAxis: { format: fmtAxisHour, ticks: 4 },
            yAxis: {
                format: (d: number) => `${Math.round(d)}°`,
                ticks: yTicks,
            },
        }}
    >
        {#snippet marks()}
            <defs>
                <linearGradient
                    id="temp-line-{uid}"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                >
                    {#each stops as s}
                        <stop offset="{s.offset}%" stop-color={s.color} />
                    {/each}
                </linearGradient>
                <linearGradient
                    id="temp-fill-{uid}"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop
                        offset="0%"
                        stop-color={tempColor(hi)}
                        stop-opacity="0.22"
                    />
                    <stop
                        offset="100%"
                        stop-color={tempColor(lo)}
                        stop-opacity="0.02"
                    />
                </linearGradient>
            </defs>
            <Area
                seriesKey="temp"
                y0={() => dLo}
                fill="url(#temp-fill-{uid})"
                line={{ stroke: `url(#temp-line-${uid})`, class: "stroke-2" }}
            />
        {/snippet}
        {#snippet tooltip()}
            <Chart.Tooltip labelFormatter={(d: Date) => fmtAxisHour(d)}>
                {#snippet formatter({ value, name, item })}
                    <div
                        style="--color-bg: {item.color}"
                        class="size-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
                    ></div>
                    <div
                        class="flex flex-1 items-center justify-between gap-3 leading-none"
                    >
                        <span class="text-muted-foreground">{name}</span>
                        <span
                            class="text-foreground font-mono font-medium tabular-nums"
                            >{value}°</span
                        >
                    </div>
                {/snippet}
            </Chart.Tooltip>
        {/snippet}
    </AreaChart>
</Chart.Container>
