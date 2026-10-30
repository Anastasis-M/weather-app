<script lang="ts">
    import { T, useThrelte } from "@threlte/core";
    import { fragmentShader, vertexShader } from "./shader.js";

    type Props = { cycle: number; southern: boolean };
    let { cycle, southern }: Props = $props();

    const { size, invalidate } = useThrelte();

    const uniforms = {
        uCycle: { value: 0 },
        uMirror: { value: 1 },
    };

    $effect(() => {
        uniforms.uCycle.value = cycle;
        uniforms.uMirror.value = southern ? -1 : 1;
        invalidate();
    });
</script>

<T.OrthographicCamera makeDefault position={[0, 0, 100]} />

<T.Mesh scale={Math.min($size.width, $size.height) / 2}>
    <T.SphereGeometry args={[1, 48, 32]} />
    <T.ShaderMaterial {uniforms} {vertexShader} {fragmentShader} transparent premultipliedAlpha />
</T.Mesh>
