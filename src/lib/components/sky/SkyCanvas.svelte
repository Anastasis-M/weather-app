<script lang="ts">
    import { Canvas } from "@threlte/core";
    import { NoToneMapping } from "three";
    import type { SkyLook } from "#lib/sky.js";
    import SkyScene from "./SkyScene.svelte";

    type Props = { look: SkyLook; still: boolean };
    let { look, still }: Props = $props();
</script>

<Canvas
    dpr={1}
    toneMapping={NoToneMapping}
    renderMode={still ? "on-demand" : "always"}
>
    <SkyScene {look} {still} />
</Canvas>
