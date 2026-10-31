<script module lang="ts">
    type Texture = { data: Uint8ClampedArray; width: number; height: number };

    const TEXTURE_WIDTH = 1024;
    let texture: Promise<Texture> | null = null;

    function loadTexture(): Promise<Texture> {
        texture ??= new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const width = TEXTURE_WIDTH;
                const height = TEXTURE_WIDTH / 2;
                const ctx = new OffscreenCanvas(width, height).getContext("2d")!;
                ctx.drawImage(img, 0, 0, width, height);
                resolve({ data: ctx.getImageData(0, 0, width, height).data, width, height });
            };
            img.onerror = reject;
            img.src = "/moon.jpg";
        });
        return texture;
    }
</script>

<script lang="ts">
    type Props = { cycle: number; southern: boolean; interactive?: boolean; class?: string };
    let { cycle, southern, interactive = false, class: className = "" }: Props = $props();

    const STIFFNESS = 38;
    const DAMPING = 7;
    const MAX_PITCH = 1.3;
    const TAU = 2 * Math.PI;
    const EARTHSHINE = [0.14, 0.17, 0.24];

    let canvas: HTMLCanvasElement | undefined = $state();
    let map: Texture | null = $state(null);
    let size = $state(0);
    let yaw = $state(0);
    let pitch = $state(0);

    $effect(() => {
        loadTexture().then((t) => (map = t), () => {});
    });

    $effect(() => {
        if (!canvas) return;
        const observer = new ResizeObserver(([entry]) => {
            size = Math.round(entry.contentRect.width * Math.min(devicePixelRatio, 2));
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    });

    const smoothstep = (a: number, b: number, x: number) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    };

    function sample(t: Texture, u: number, v: number, out: number[]) {
        const x = (((u % 1) + 1) % 1) * t.width - 0.5;
        const y = Math.min(Math.max((1 - v) * t.height - 0.5, 0), t.height - 1);
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const fx = x - x0;
        const fy = y - y0;
        const xa = ((x0 % t.width) + t.width) % t.width;
        const xb = (xa + 1) % t.width;
        const yb = Math.min(y0 + 1, t.height - 1);
        for (let c = 0; c < 3; c++) {
            const top = t.data[(y0 * t.width + xa) * 4 + c] * (1 - fx) + t.data[(y0 * t.width + xb) * 4 + c] * fx;
            const bottom = t.data[(yb * t.width + xa) * 4 + c] * (1 - fx) + t.data[(yb * t.width + xb) * 4 + c] * fx;
            out[c] = (top * (1 - fy) + bottom * fy) / 255;
        }
    }

    function render(ctx: CanvasRenderingContext2D, t: Texture, n: number) {
        const image = ctx.createImageData(n, n);
        const px = image.data;
        const mirror = southern ? -1 : 1;
        const phase = TAU * cycle;
        const sun = [Math.sin(phase) * mirror, 0, -Math.cos(phase)];
        const [cy, sy, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
        const albedo = [0, 0, 0];
        const radius = n / 2;

        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                const x = (i + 0.5 - radius) / radius;
                const y = (radius - j - 0.5) / radius;
                const r = Math.hypot(x, y);
                const edge = Math.min(1, Math.max(0, (1 - r) * radius));
                if (edge <= 0) continue;
                const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));

                const y1 = y * cp + z * sp;
                const z1 = -y * sp + z * cp;
                const ox = (x * cy - z1 * sy) * mirror;
                const oy = y1 * mirror;
                const oz = x * sy + z1 * cy;
                sample(t, 0.5 + Math.atan2(ox, oz) / TAU, 0.5 + Math.asin(Math.max(-1, Math.min(1, oy))) / Math.PI, albedo);

                const facing = x * sun[0] + y * sun[1] + z * sun[2];
                const lit = smoothstep(-0.02, 0.06, facing);
                const limb = 0.75 + 0.25 * Math.pow(z, 0.4);
                const day = limb * (0.6 + 0.5 * Math.max(facing, 0));
                const k = (i + j * n) * 4;
                for (let c = 0; c < 3; c++) {
                    const a = Math.min(1, Math.max(0, (albedo[c] - 0.5) * 1.15 + 0.55));
                    const night = a * EARTHSHINE[c];
                    px[k + c] = Math.min(255, (night + (a * day - night) * lit) * 255);
                }
                px[k + 3] = (0.6 + 0.4 * lit) * edge * 255;
            }
        }
        ctx.putImageData(image, 0, 0);
    }

    $effect(() => {
        if (!canvas || !map || size < 2) return;
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) render(ctx, map, size);
    });

    $effect(() => {
        if (!interactive || !canvas) return;
        const el = canvas;
        const velocity = { yaw: 0, pitch: 0 };
        let drag: { x: number; y: number; t: number } | null = null;
        let frame = 0;
        let last = 0;

        const settled = () =>
            Math.abs(yaw) + Math.abs(pitch) < 1e-3 && Math.abs(velocity.yaw) + Math.abs(velocity.pitch) < 1e-3;

        const tick = (now: number) => {
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            if (!drag) {
                velocity.yaw += (-STIFFNESS * yaw - DAMPING * velocity.yaw) * dt;
                velocity.pitch += (-STIFFNESS * pitch - DAMPING * velocity.pitch) * dt;
                yaw += velocity.yaw * dt;
                pitch += velocity.pitch * dt;
                if (settled()) {
                    yaw = pitch = 0;
                    frame = 0;
                    return;
                }
            }
            frame = requestAnimationFrame(tick);
        };

        const down = (e: PointerEvent) => {
            el.setPointerCapture(e.pointerId);
            drag = { x: e.clientX, y: e.clientY, t: e.timeStamp };
            velocity.yaw = velocity.pitch = 0;
            if (!frame) {
                last = performance.now();
                frame = requestAnimationFrame(tick);
            }
        };
        const move = (e: PointerEvent) => {
            if (!drag) return;
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
            el.removeEventListener("pointerdown", down);
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerup", up);
            el.removeEventListener("pointercancel", up);
        };
    });
</script>

<canvas bind:this={canvas} class="block aspect-square {className}" class:moon-grab={interactive} aria-hidden="true"></canvas>

<style>
    .moon-grab {
        touch-action: none;
        cursor: grab;
    }
    .moon-grab:active {
        cursor: grabbing;
    }
</style>
