<script lang="ts">
    import { Canvas } from "@threlte/core";
    import { NoToneMapping } from "three";
    import MoonScene from "./MoonScene.svelte";

    type Props = { cycle: number; southern: boolean };
    let { cycle, southern }: Props = $props();
</script>

<Canvas toneMapping={NoToneMapping} renderMode="on-demand">
    <MoonScene {cycle} {southern} />
</Canvas>
