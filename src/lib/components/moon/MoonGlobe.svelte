<script lang="ts">
    import { Canvas } from "@threlte/core";
    import { NoToneMapping } from "three";
    import MoonScene from "./MoonScene.svelte";

    type Props = { cycle: number; southern: boolean; interactive?: boolean };
    let { cycle, southern, interactive = false }: Props = $props();

    const STIFFNESS = 38;
    const DAMPING = 7;
    const MAX_PITCH = 1.3;
    const TAU = 2 * Math.PI;

    let yaw = $state(0);
    let pitch = $state(0);
    let el: HTMLDivElement | undefined = $state();

    $effect(() => {
        if (!interactive || !el) return;
        const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const velocity = { yaw: 0, pitch: 0 };
        let drag: { x: number; y: number; t: number } | null = null;
        let onScreen = true;
        let frame = 0;
        let last = performance.now();

        const tick = (now: number) => {
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            if (!drag) {
                const s = now / 1000;
                const rest = calm ? { yaw: 0, pitch: 0 } : { yaw: 0.09 * Math.sin((TAU * s) / 11), pitch: 0.05 * Math.sin((TAU * s) / 17) };
                velocity.yaw += (STIFFNESS * (rest.yaw - yaw) - DAMPING * velocity.yaw) * dt;
                velocity.pitch += (STIFFNESS * (rest.pitch - pitch) - DAMPING * velocity.pitch) * dt;
                yaw += velocity.yaw * dt;
                pitch += velocity.pitch * dt;
            }
            frame = onScreen ? requestAnimationFrame(tick) : 0;
        };

        const observer = new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            if (onScreen && !frame) {
                last = performance.now();
                frame = requestAnimationFrame(tick);
            }
        });
        observer.observe(el);

        const down = (e: PointerEvent) => {
            el?.setPointerCapture(e.pointerId);
            drag = { x: e.clientX, y: e.clientY, t: e.timeStamp };
            velocity.yaw = velocity.pitch = 0;
        };
        const move = (e: PointerEvent) => {
            if (!drag || !el) return;
            const k = Math.PI / el.clientWidth;
            const dYaw = (e.clientX - drag.x) * k;
            const dPitch = (e.clientY - drag.y) * k;
            const dt = Math.max((e.timeStamp - drag.t) / 1000, 1 / 120);
            yaw += dYaw;
            pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch + dPitch));
            velocity.yaw = dYaw / dt;
            velocity.pitch = dPitch / dt;
            drag = { x: e.clientX, y: e.clientY, t: e.timeStamp };
        };
        const up = () => {
            if (!drag) return;
            drag = null;
            yaw -= TAU * Math.round(yaw / TAU);
        };

        el.addEventListener("pointerdown", down);
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            el?.removeEventListener("pointerdown", down);
            el?.removeEventListener("pointermove", move);
            el?.removeEventListener("pointerup", up);
            el?.removeEventListener("pointercancel", up);
        };
    });
</script>

<div bind:this={el} class="size-full" class:moon-grab={interactive}>
    <Canvas toneMapping={NoToneMapping} renderMode="on-demand">
        <MoonScene {cycle} {southern} {yaw} {pitch} />
    </Canvas>
</div>

<style>
    .moon-grab {
        touch-action: none;
        cursor: grab;
    }
    .moon-grab:active {
        cursor: grabbing;
    }
</style>
