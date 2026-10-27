<script lang="ts">
    import HourBars from "./HourBars.svelte";
    import { t } from "#lib/i18n.svelte.js";
    import { fmtMm } from "#lib/format.js";
    import type { RainHour } from "#lib/tips.js";

    type Props = { hours: RainHour[] };
    let { hours }: Props = $props();

    const COLOR = { wet: "var(--color-rain)", dry: "var(--color-muted-foreground)", past: "var(--color-muted)" };

    const bars = $derived(
        hours.map((h) => ({ label: h.hour, value: h.mm, color: COLOR[h.past ? "past" : h.wet ? "wet" : "dry"] })),
    );
    const popByHour = $derived(new Map(hours.map((h) => [h.hour, h.pop])));
    const wettest = $derived(Math.max(0.4, ...hours.map((h) => h.mm)));
    const tickIndexes = $derived(new Set([0, Math.floor(hours.length / 2), hours.length - 1]));
</script>

<HourBars
    class="mt-3 h-20 w-full"
    {bars}
    max={wettest}
    formatTick={(v) => `${v}mm`}
    showLabel={(_, i) => tickIndexes.has(i)}
    title={(b) => `${b.label} · ${t("tips.chance")} ${popByHour.get(b.label) ?? 0}%`}
    name={t("precip")}
    formatValue={fmtMm}
/>
