<script lang="ts">
    import { BarChart } from "layerchart";
    import * as Chart from "$lib/components/ui/chart";
    import { t } from "$lib/i18n.svelte";
    import { fmtMm } from "$lib/format";
    import type { RainHour } from "$lib/tips";

    type Props = { hours: RainHour[] };
    let { hours }: Props = $props();

    const STATES = ["wet", "dry", "past"] as const;
    const COLORS = ["var(--color-rain)", "var(--color-muted-foreground)", "var(--color-muted)"];

    const data = $derived(
        hours.map((h) => ({
            hour: h.hour,
            pop: h.pop,
            state: h.past ? "past" : h.wet ? "wet" : "dry",
        })),
    );
    const mmByHour = $derived(new Map(hours.map((h) => [h.hour, h.mm])));

    const config = $derived({
        pop: { label: t("tips.chance"), color: "var(--color-rain)" },
    } satisfies Chart.ChartConfig);

    const tickHours = $derived(
        new Set([hours[0]?.hour, hours[Math.floor(hours.length / 2)]?.hour, hours[hours.length - 1]?.hour]),
    );
</script>

<Chart.Container {config} class="mt-3 aspect-auto h-20 w-full">
    <BarChart
        {data}
        x="hour"
        yDomain={[0, 100]}
        bandPadding={0.2}
        series={[{ key: "pop", label: t("tips.chance") }]}
        c="state"
        cDomain={[...STATES]}
        cRange={COLORS}
        axis="x"
        grid={false}
        props={{
            xAxis: { format: (d: string) => (tickHours.has(d) ? d : "") },
        }}
    >
        {#snippet tooltip()}
            <Chart.Tooltip
                labelFormatter={(hour: string) => `${hour} · ${fmtMm(mmByHour.get(hour) ?? 0)}`}
            >
                {#snippet formatter({ value, name })}
                    <div class="size-2.5 shrink-0 rounded-[2px] bg-rain"></div>
                    <div class="flex flex-1 items-center justify-between gap-3 leading-none">
                        <span class="text-muted-foreground">{name}</span>
                        <span class="text-foreground font-mono font-medium tabular-nums">{value}%</span>
                    </div>
                {/snippet}
            </Chart.Tooltip>
        {/snippet}
    </BarChart>
</Chart.Container>
