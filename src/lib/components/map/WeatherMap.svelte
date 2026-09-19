<script lang="ts">
    import "ol/ol.css";
    import { untrack, type Snippet } from "svelte";
    import OlMap from "ol/Map.js";
    import View from "ol/View.js";
    import TileLayer from "ol/layer/Tile.js";
    import Overlay from "ol/Overlay.js";
    import { fromLonLat, transformExtent } from "ol/proj.js";
    import LoaderIcon from "@lucide/svelte/icons/loader-2";
    import { Button } from "$lib/components/ui/button";
    import MapControls from "./MapControls.svelte";
    import MapAttribution from "./MapAttribution.svelte";
    import MapLegend from "./MapLegend.svelte";
    import MapScrubber from "./MapScrubber.svelte";
    import type ImageTileSource from "ol/source/ImageTile.js";
    import {
        basemapSource,
        frameKey,
        showFrame,
        syncDataBounds,
        viewportAround,
        weatherSource,
        type Bounds,
    } from "$lib/mapLayers";
    import { FramePlayer, type Slot } from "$lib/mapPlayer.svelte";
    import type { Location } from "$lib/weather";
    import { t } from "$lib/i18n.svelte";

    let {
        place,
        action,
        active = true,
    }: { place: Location; action?: Snippet; active?: boolean } = $props();

    const SLOTS = ["a", "b"] as const;
    const PRECIP_OPACITY = 0.8;
    const ZOOM = { start: 7, min: 3, max: 12 };
    const REPICK_MS = 400;

    const player = new FramePlayer("precipitation");
    $effect(() => () => player.destroy());

    let el = $state<HTMLDivElement>();
    let markerEl = $state<HTMLDivElement>();
    let map = $state<OlMap>();
    let zoom = $state(ZOOM.start);

    const sources: Record<Slot, ImageTileSource> = {
        a: weatherSource(),
        b: weatherSource(),
    };
    const layers: Record<Slot, TileLayer> = {
        a: new TileLayer({ source: sources.a, opacity: PRECIP_OPACITY }),
        b: new TileLayer({ source: sources.b, opacity: 0 }),
    };

    function wantedKey(slot: Slot): string {
        const fs = player.frameSet;
        const frame = fs?.frames[player.slots[slot]];
        return fs && frame ? frameKey(fs.domain, frame) : "";
    }

    const painted: Record<Slot, string> = { a: "", b: "" };
    const settled = (slot: Slot) => {
        const want = wantedKey(slot);
        return want !== "" && painted[slot] === want;
    };

    player.loadedProbe = settled;

    $effect(() => {
        const target = el;
        if (!target) return;

        const m = new OlMap({
            target,
            controls: [],
            layers: [
                new TileLayer({ source: basemapSource() }),
                layers.a,
                layers.b,
            ],
            view: new View({
                center: fromLonLat([place.longitude, place.latitude]),
                zoom: ZOOM.start,
                minZoom: ZOOM.min,
                maxZoom: ZOOM.max,
                constrainResolution: false,
            }),
        });
        map = m;

        return () => {
            map = undefined;
            m.setTarget(undefined);
            m.dispose();
        };
    });

    $effect(() => {
        const m = map;
        const element = markerEl;
        if (!m || !element) return;

        const overlay = new Overlay({
            element,
            positioning: "center-center",
            position: fromLonLat([place.longitude, place.latitude]),
            stopEvent: false,
        });
        m.addOverlay(overlay);
        return () => m.removeOverlay(overlay);
    });

    $effect(() => {
        const guess = viewportAround(place.latitude, place.longitude);
        untrack(() => player.ensureDomain(guess));
    });

    function viewOf(m: OlMap): Bounds {
        const size = m.getSize();
        if (!size) return viewportAround(place.latitude, place.longitude);
        const [w, s, e, n] = transformExtent(
            m.getView().calculateExtent(size),
            "EPSG:3857",
            "EPSG:4326",
        );
        const south = Math.max(s, -90);
        const north = Math.min(n, 90);

        const span = e - w;
        if (span >= 360) return [-180, south, 180, north];

        const mid = ((((w + e) / 2 + 180) % 360) + 360) % 360 - 180;
        return [mid - span / 2, south, mid + span / 2, north];
    }

    $effect(() => {
        const m = map;
        if (!m || !active) return;
        const view = m.getView();

        const sync = () => syncDataBounds(viewOf(m));
        let repick: ReturnType<typeof setTimeout>;
        const settled = () => {
            sync();
            clearTimeout(repick);
            repick = setTimeout(() => player.ensureDomain(viewOf(m)), REPICK_MS);
        };
        const onZoom = () => (zoom = view.getZoom() ?? zoom);

        settled();
        onZoom();

        view.on(["change:center", "change:resolution"], sync);
        view.on("change:resolution", onZoom);
        m.on("moveend", settled);
        return () => {
            clearTimeout(repick);
            view.un(["change:center", "change:resolution"], sync);
            view.un("change:resolution", onZoom);
            m.un("moveend", settled);
        };
    });

    for (const slot of SLOTS) {
        $effect(() => {
            const fs = player.frameSet;
            const frame = fs?.frames[player.slots[slot]];
            if (!fs || !frame) return;
            showFrame(sources[slot], "precipitation", fs.domain, frame);
        });
    }

    $effect(() => {
        const m = map;
        if (!m) return;

        const onPostRender = () => {
            for (const slot of SLOTS) {
                const renderer = layers[slot].getRenderer() as unknown as {
                    renderComplete?: boolean;
                    renderedSourceKey_?: string;
                } | null;
                if (!renderer?.renderComplete) continue;
                const want = wantedKey(slot);
                if (!want || painted[slot] === want) continue;
                // renderComplete still describes the previous key until
                // OpenLayers redraws the layer, so wait for a finished render
                // that actually used the key we asked for.
                const drawn = renderer.renderedSourceKey_;
                if (drawn !== undefined && drawn !== want) continue;
                painted[slot] = want;
                player.reportSlotLoaded(slot);
            }
        };

        m.on("postrender", onPostRender);
        return () => m.un("postrender", onPostRender);
    });

    $effect(() => {
        for (const slot of SLOTS) {
            layers[slot].setOpacity(
                player.visible === slot ? PRECIP_OPACITY : 0,
            );
        }
    });

    let resumeOnActivate = false;
    $effect(() => {
        const on = active;
        untrack(() => {
            if (!on) {
                resumeOnActivate = player.playing;
                player.pause();
            } else if (resumeOnActivate) {
                resumeOnActivate = false;
                player.play();
            }
        });
    });
</script>

<div
    class="relative h-full w-full overflow-hidden rounded-[inherit]"
    data-no-pull
>
    <div bind:this={el} class="absolute inset-0"></div>

    <div
        bind:this={markerEl}
        class="size-3.5 rounded-full border-2 border-background bg-accent shadow-md"
    ></div>

    <div
        class="pointer-events-none absolute top-0 left-0 z-10 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))]"
    >
        <div class="pointer-events-auto">
            <MapControls {map} {zoom} min={ZOOM.min} max={ZOOM.max} />
        </div>
    </div>

    <div
        class="pointer-events-none absolute top-0 right-0 z-20 flex flex-col items-end gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
        {#if action}
            <div class="pointer-events-auto">{@render action()}</div>
        {/if}
        <div class="pointer-events-auto">
            <MapAttribution domain={player.frameSet?.domain} />
        </div>
    </div>

    {#if player.frameSet}
        <div
            class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
            <div class="flex w-full max-w-xl justify-start">
                <MapLegend />
            </div>
            <div class="pointer-events-auto w-full max-w-xl">
                <MapScrubber {player} timezone={place.timezone} />
            </div>
        </div>
    {/if}

    {#if player.failed}
        <div
            class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/60"
        >
            <p class="text-sm text-muted-foreground">{t("map.error")}</p>
            <Button
                class="pressable"
                variant="outline"
                size="sm"
                onclick={() => player.retry()}
            >
                {t("try_again")}
            </Button>
        </div>
    {:else if !player.frameSet}
        <div
            class="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[2px]"
        >
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderIcon class="size-4 animate-spin text-accent" />
                {t("map.loading")}
            </div>
        </div>
    {/if}
</div>
