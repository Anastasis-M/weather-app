<script lang="ts">
    import { T, useThrelte } from "@threlte/core";
    import { TextureLoader } from "three";
    import { fragmentShader, vertexShader } from "./shader.js";

    type Props = { cycle: number; southern: boolean };
    let { cycle, southern }: Props = $props();

    const { size, invalidate } = useThrelte();

    let loaded = $state(false);
    const map = new TextureLoader().load("/moon.jpg", () => {
        loaded = true;
        invalidate();
    });

    const uniforms = {
        uMap: { value: map },
        uCycle: { value: 0 },
        uMirror: { value: 1 },
    };

    $effect(() => {
        uniforms.uCycle.value = cycle;
        uniforms.uMirror.value = southern ? -1 : 1;
        invalidate();
    });

    $effect(() => () => map.dispose());
</script>

<T.OrthographicCamera makeDefault position={[0, 0, 100]} />

<T.Mesh visible={loaded} scale={Math.min($size.width, $size.height) / 2}>
    <T.SphereGeometry args={[1, 64, 48]} />
    <T.ShaderMaterial {uniforms} {vertexShader} {fragmentShader} transparent premultipliedAlpha />
</T.Mesh>
