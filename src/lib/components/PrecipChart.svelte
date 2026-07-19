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
</script>

<Chart.Container {config} class="aspect-auto h-24 w-full">
    <BarChart
        {data}
        x="hour"
        axis="x"
        bandPadding={0.3}
        series={[{ key: "mm", label: t("precip"), color: "var(--color-rain)" }]}
        props={{
            xAxis: {
                format: (d: string) => (parseInt(d) % 6 === 0 ? d : ""),
            },
        }}
    >
        {#snippet tooltip()}
            <Chart.Tooltip />
        {/snippet}
    </BarChart>
</Chart.Container>
