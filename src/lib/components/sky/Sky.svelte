<script lang="ts">
    import { MediaQuery } from "svelte/reactivity";
    import { skyFor } from "#lib/wmo.js";
    import { rgbToCss, skyLook } from "#lib/sky.js";
    import { hasWebgl } from "#lib/webgl.js";

    type Props = { code: number | null; isDay: boolean };
    let { code, isDay }: Props = $props();

    const look = $derived(skyLook(skyFor(code ?? 3), isDay));
    const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
    const webgl = hasWebgl();
</script>

<div
    class="pointer-events-none fixed inset-0 -z-10"
    style:background="linear-gradient(to bottom, {rgbToCss(look.top)}, {rgbToCss(look.bottom)})"
    aria-hidden="true"
>
    {#if webgl}
        {#await import("./SkyCanvas.svelte") then { default: SkyCanvas }}
            <SkyCanvas {look} still={reducedMotion.current} />
        {/await}
    {/if}
</div>
