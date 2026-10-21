<script lang="ts">
    import { BarChart } from "layerchart";
    import * as Chart from "$lib/components/ui/chart";
    import { t } from "$lib/i18n.svelte";
    import { fmtMm } from "$lib/format";
    import type { RainHour } from "$lib/tips";

    type Props = { hours: RainHour[] };
    let { hours }: Props = $props();

    const data = $derived(
        hours.map((h) => ({
            hour: h.hour,
            wet: !h.past && h.wet ? h.pop : undefined,
            dry: !h.past && !h.wet ? h.pop : undefined,
            past: h.past ? h.pop : undefined,
        })),
    );
    const mmByHour = $derived(new Map(hours.map((h) => [h.hour, h.mm])));

    const config = $derived({
        wet: { label: t("tips.chance"), color: "var(--color-rain)" },
        dry: { label: t("tips.chance"), color: "var(--color-muted-foreground)" },
        past: { label: t("tips.chance"), color: "var(--color-muted)" },
    } satisfies Chart.ChartConfig);

    const series = $derived(
        Object.entries(config).map(([key, c]) => ({ key, label: c.label, color: c.color })),
    );

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
        {series}
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
                {#snippet formatter({ value, name, item })}
                    <div
                        style="--color-bg: {item.color}"
                        class="size-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
                    ></div>
                    <div class="flex flex-1 items-center justify-between gap-3 leading-none">
                        <span class="text-muted-foreground">{name}</span>
                        <span class="text-foreground font-mono font-medium tabular-nums">{value}%</span>
                    </div>
                {/snippet}
            </Chart.Tooltip>
        {/snippet}
    </BarChart>
</Chart.Container>
