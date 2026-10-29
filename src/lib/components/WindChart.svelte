<script lang="ts">
    import { BarChart } from "layerchart";
    import * as Chart from "#lib/components/ui/chart/index.js";
    import { chartEnter } from "#lib/chartMotion.svelte.js";
    import { t, locale } from "#lib/i18n.svelte.js";
    import { fmtHour, kmhToBeaufort } from "#lib/format.js";

    type Hour = { time: string; wind: number };
    type Props = { hours: Hour[]; tz: string };
    let { hours, tz }: Props = $props();

    const data = $derived(
        hours.map((h) => ({ hour: fmtHour(h.time, tz, locale()), kmh: Math.round(h.wind) })),
    );

    const config = $derived({
        kmh: { label: t("wind"), color: "var(--color-muted-foreground)" },
    } satisfies Chart.ChartConfig);

    const yMax = $derived(Math.max(10, ...data.map((d) => d.kmh)) * 1.2);
</script>

<Chart.Container {config} class="aspect-auto h-40 w-full">
    <BarChart
        {data}
        x="hour"
        yDomain={[0, yMax]}
        highlight={{ area: true, motion: "none" }}
        bandPadding={0.3}
        series={[{ key: "kmh", label: t("wind"), color: "var(--color-muted-foreground)" }]}
        props={{
            bars: { motion: chartEnter() },
            xAxis: { format: (d: string) => (parseInt(d) % 6 === 0 ? d : "") },
            yAxis: { format: (d: number) => (d === 0 ? "" : `${d}`), ticks: 3 },
        }}
    >
        {#snippet tooltip()}
            <Chart.Tooltip>
                {#snippet formatter({ value, name, item })}
                    <div
                        style="--color-bg: {item.color}"
                        class="size-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
                    ></div>
                    <div class="flex flex-1 items-center justify-between gap-3 leading-none">
                        <span class="text-muted-foreground">{name}</span>
                        <span class="text-foreground font-mono font-medium tabular-nums"
                            >{value} km/h · {kmhToBeaufort(Number(value))} Bf</span
                        >
                    </div>
                {/snippet}
            </Chart.Tooltip>
        {/snippet}
    </BarChart>
</Chart.Container>
