<script lang="ts">
    import { BarChart } from "layerchart";
    import * as Chart from "#lib/components/ui/chart/index.js";
    import { t } from "#lib/i18n.svelte.js";
    import { fmtMm } from "#lib/format.js";
    import type { RainHour } from "#lib/tips.js";

    type Props = { hours: RainHour[] };
    let { hours }: Props = $props();

    const STATES = ["wet", "dry", "past"] as const;
    const COLORS = ["var(--color-rain)", "var(--color-muted-foreground)", "var(--color-muted)"];

    const data = $derived(
        hours.map((h) => ({
            hour: h.hour,
            mm: h.mm,
            state: h.past ? "past" : h.wet ? "wet" : "dry",
        })),
    );
    const popByHour = $derived(new Map(hours.map((h) => [h.hour, h.pop])));
    const yMax = $derived(Math.max(0.4, ...hours.map((h) => h.mm)) * 1.35);

    const config = $derived({
        mm: { label: t("precip"), color: "var(--color-rain)" },
    } satisfies Chart.ChartConfig);

    const tickHours = $derived(
        new Set([hours[0]?.hour, hours[Math.floor(hours.length / 2)]?.hour, hours[hours.length - 1]?.hour]),
    );
</script>

<Chart.Container {config} class="mt-3 aspect-auto h-20 w-full">
    <BarChart
        {data}
        x="hour"
        yDomain={[0, yMax]}
        highlight={{ area: true, motion: "none" }}
        bandPadding={0.2}
        series={[{ key: "mm", label: t("precip") }]}
        c="state"
        cDomain={[...STATES]}
        cRange={COLORS}
        grid={false}
        props={{
            xAxis: { format: (d: string) => (tickHours.has(d) ? d : "") },
            yAxis: { format: (d: number) => (d === 0 ? "" : `${d}mm`), ticks: 2 },
        }}
    >
        {#snippet tooltip()}
            <Chart.Tooltip
                labelFormatter={(hour: string) => `${hour} · ${t("tips.chance")} ${popByHour.get(hour) ?? 0}%`}
            >
                {#snippet formatter({ value, name })}
                    <div class="size-2.5 shrink-0 rounded-[2px] bg-rain"></div>
                    <div class="flex flex-1 items-center justify-between gap-3 leading-none">
                        <span class="text-muted-foreground">{name}</span>
                        <span class="text-foreground font-mono font-medium tabular-nums">{fmtMm(Number(value))}</span>
                    </div>
                {/snippet}
            </Chart.Tooltip>
        {/snippet}
    </BarChart>
</Chart.Container>
