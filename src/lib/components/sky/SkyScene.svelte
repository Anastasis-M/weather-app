<script lang="ts">
    import { T, useTask, useThrelte } from "@threlte/core";
    import { Vector2, Vector3 } from "three";
    import { lerpLook, type SkyLook } from "#lib/sky.js";
    import { fragmentShader, vertexShader } from "./shader.js";

    type Props = { look: SkyLook; still: boolean };
    let { look, still }: Props = $props();

    const { size, invalidate } = useThrelte();

    const uniforms = {
        uTime: { value: 24 },
        uRes: { value: new Vector2(1, 1) },
        uTop: { value: new Vector3() },
        uBottom: { value: new Vector3() },
        uCloud: { value: new Vector3() },
        uGlow: { value: new Vector3() },
        uCover: { value: 0 },
        uRain: { value: 0 },
        uSnow: { value: 0 },
        uFog: { value: 0 },
        uStars: { value: 0 },
        uSun: { value: 0 },
        uFlash: { value: 0 },
    };

    let shown: SkyLook | null = null;
    let flash = 0;
    let nextFlash = 2;

    function apply(l: SkyLook) {
        uniforms.uTop.value.set(...l.top);
        uniforms.uBottom.value.set(...l.bottom);
        uniforms.uCloud.value.set(...l.cloud);
        uniforms.uGlow.value.set(...l.glow);
        uniforms.uCover.value = l.cover;
        uniforms.uRain.value = l.rain;
        uniforms.uSnow.value = l.snow;
        uniforms.uFog.value = l.fog;
        uniforms.uStars.value = l.stars;
        uniforms.uSun.value = l.sun;
    }

    $effect(() => {
        if (still || !shown) {
            shown = look;
            apply(look);
            invalidate();
        }
    });

    $effect(() => {
        uniforms.uRes.value.set($size.width, $size.height);
        invalidate();
    });

    useTask((delta) => {
        if (!shown) return;
        uniforms.uTime.value += delta;
        shown = lerpLook(shown, look, Math.min(1, delta * 1.5));
        apply(shown);

        nextFlash -= delta;
        if (shown.storm > 0.5 && nextFlash < 0) {
            flash = 1;
            nextFlash = 4 + Math.random() * 9;
        }
        flash = Math.max(0, flash - delta * 2.5);
        const flicker = flash > 0.55 && flash < 0.75 ? 0.35 : 1;
        uniforms.uFlash.value = flash * flash * flicker * shown.storm;
    }, { running: () => !still });
</script>

<T.Mesh frustumCulled={false}>
    <T.PlaneGeometry args={[2, 2]} />
    <T.ShaderMaterial
        {uniforms}
        {vertexShader}
        {fragmentShader}
        depthTest={false}
        depthWrite={false}
    />
</T.Mesh>
