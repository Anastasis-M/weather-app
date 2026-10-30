<script lang="ts">
    import { BarChart } from "layerchart";
    import * as Chart from "#lib/components/ui/chart/index.js";
    import { BAR_SEAM, chartEnter, DAY_CHART_PADDING, WIND_MEDIAN, WIND_STRONGEST } from "#lib/dayChart.svelte.js";
    import { t } from "#lib/i18n.svelte.js";
    import { fmtHour, kmhToBeaufort } from "#lib/format.js";

    type Hour = { time: string; wind: number; windHigh: number };
    type Props = { hours: Hour[] };
    let { hours }: Props = $props();

    const data = $derived(
        hours.map((h) => ({
            hour: fmtHour(h.time),
            kmh: Math.round(h.wind),
            high: Math.round(Math.max(h.wind, h.windHigh)),
        })),
    );

    const series = $derived([
        { key: "high", label: t("wind.strongest_model"), color: WIND_STRONGEST },
        { key: "kmh", label: t("wind"), color: WIND_MEDIAN },
    ]);

    const config = $derived({
        high: { label: t("wind.strongest_model"), color: WIND_STRONGEST },
        kmh: { label: t("wind"), color: WIND_MEDIAN },
    } satisfies Chart.ChartConfig);

    const yMax = $derived(Math.max(10, ...data.map((d) => d.high)) * 1.2);
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
            bars: { motion: chartEnter(), ...BAR_SEAM },
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
