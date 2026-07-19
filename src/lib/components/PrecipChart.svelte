<script lang="ts">
    import { BarChart } from "layerchart";
    import * as Chart from "$lib/components/ui/chart";
    import { t, locale } from "$lib/i18n.svelte";
    import { fmtHour } from "$lib/format";

    type Hour = { time: string; precip: number; pop: number };
    type Props = { hours: Hour[]; tz: string };
    let { hours, tz }: Props = $props();

    const data = $derived(
        hours.map((h) => ({
            hour: fmtHour(h.time, tz, locale()),
            mm: h.precip,
        })),
    );

    const config = $derived({
        mm: { label: t("precip"), color: "var(--color-rain)" },
    } satisfies Chart.ChartConfig);

    // Headroom above the wettest hour so the top tick label never sits at
    // the plot edge under the card title.
    const yMax = $derived(Math.max(0.4, ...hours.map((h) => h.precip)) * 1.35);
</script>

<Chart.Container {config} class="mt-1.5 aspect-auto h-24 w-full px-2.5 pb-1">
    <BarChart
        {data}
        x="hour"
        yDomain={[0, yMax]}
        bandPadding={0.3}
        series={[{ key: "mm", label: t("precip"), color: "var(--color-rain)" }]}
        props={{
            xAxis: {
                format: (d: string) => (parseInt(d) % 6 === 0 ? d : ""),
            },
            yAxis: {
                format: (d: number) => (d === 0 ? "" : `${d}`),
                ticks: 3,
            },
        }}
    >
        {#snippet tooltip()}
            <Chart.Tooltip>
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
                            >{value} mm</span
                        >
                    </div>
                {/snippet}
            </Chart.Tooltip>
        {/snippet}
    </BarChart>
</Chart.Container>
