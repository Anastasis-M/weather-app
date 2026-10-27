<script lang="ts">
    import HourBars from "./HourBars.svelte";
    import { t, locale } from "$lib/i18n.svelte";
    import { fmtHour, fmtMm } from "$lib/format";

    type Hour = { time: string; precip: number; pop: number };
    type Props = { hours: Hour[]; tz: string };
    let { hours, tz }: Props = $props();

    const bars = $derived(
        hours.map((h) => ({ label: fmtHour(h.time, tz, locale()), value: h.precip, color: "var(--color-rain)" })),
    );
    const wettest = $derived(Math.max(0.4, ...hours.map((h) => h.precip)));
</script>

<HourBars
    class="mt-1.5 h-24 w-full px-2.5 pb-1"
    {bars}
    max={wettest}
    formatTick={(v) => `${v}`}
    showLabel={(b) => parseInt(b.label) % 6 === 0}
    title={(b) => b.label}
    name={t("precip")}
    formatValue={fmtMm}
/>
