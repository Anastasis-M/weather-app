<script lang="ts">
    import { BarChart } from "layerchart";
    import * as Chart from "#lib/components/ui/chart/index.js";
    import { chartEnter, DAY_CHART_PADDING } from "#lib/dayChart.svelte.js";
    import { t } from "#lib/i18n.svelte.js";
    import { fmtHour, fmtMm } from "#lib/format.js";

    type Hour = { time: string; precip: number; precipHigh: number };
    type Props = { hours: Hour[] };
    let { hours }: Props = $props();

    const data = $derived(
        hours.map((h) => ({
            hour: fmtHour(h.time),
            mm: h.precip,
            high: Math.max(h.precip, h.precipHigh),
        })),
    );

    const series = $derived([
        { key: "high", label: t("precip.wettest_model"), color: "color-mix(in oklab, var(--color-rain) 30%, transparent)" },
        { key: "mm", label: t("precip"), color: "var(--color-rain)" },
    ]);

    const config = $derived({
        high: { label: t("precip.wettest_model"), color: series[0].color },
        mm: { label: t("precip"), color: series[1].color },
    } satisfies Chart.ChartConfig);

    const yMax = $derived(Math.max(0.4, ...data.map((d) => d.high)) * 1.35);
</script>

<Chart.Container {config} class="aspect-auto h-40 w-full">
    <BarChart
        {data}
        x="hour"
        padding={DAY_CHART_PADDING}
        yDomain={[0, yMax]}
        highlight={{ area: true, motion: "none" }}
        bandPadding={0.3}
        {series}
        props={{
            bars: { motion: chartEnter(), strokeWidth: 0 },
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
                        <span class="text-foreground font-mono font-medium tabular-nums">{fmtMm(Number(value))}</span>
                    </div>
                {/snippet}
            </Chart.Tooltip>
        {/snippet}
    </BarChart>
</Chart.Container>
