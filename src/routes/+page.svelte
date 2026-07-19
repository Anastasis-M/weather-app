<script lang="ts">
    import { onMount } from "svelte";
    import { replaceState } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import LanguagesIcon from "@lucide/svelte/icons/languages";
    import RefreshIcon from "@lucide/svelte/icons/refresh-cw";
    import ShareIcon from "@lucide/svelte/icons/share-2";
    import CheckIcon from "@lucide/svelte/icons/check";
    import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
    import SunIcon from "@lucide/svelte/icons/sun";
    import LoaderIcon from "@lucide/svelte/icons/loader-2";
    import Search from "$lib/components/Search.svelte";
    import Current from "$lib/components/Current.svelte";
    import Daily from "$lib/components/Daily.svelte";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import * as Alert from "$lib/components/ui/alert";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import {
        fetchWeather,
        getCurrentPosition,
        reverseGeocode,
        saveLocation,
        loadLocation,
        saveWeather,
        loadWeather,
        type Location,
        type WeatherData,
    } from "$lib/weather";
    import { i18n, t, locale, initLang, toggleLang } from "$lib/i18n.svelte";

    let place = $state<Location | null>(null);
    let data = $state<WeatherData | null>(null);
    let loading = $state(true);
    let loadingLocation = $state<Location | null>(null);
    let refreshing = $state(false);
    let error = $state("");
    let updated = $state<Date | null>(null);
    let loadRequestId = 0;
    let loadingMessage = $derived(
        loadingLocation
            ? `${t("loading_location")} ${loadingLocation.shortName}`
            : t("loading"),
    );

    // ── Share ──────────────────────────────────────────────────────
    let copied = $state(false);
    let copiedTimer: ReturnType<typeof setTimeout> | undefined;

    async function share() {
        if (!place) return;
        const params = new URLSearchParams({
            lat: String(place.latitude),
            lon: String(place.longitude),
            name: place.shortName,
        });
        const url = `${window.location.origin}/share?${params}`;

        if (navigator.canShare?.({ url }) && navigator.share) {
            try {
                await navigator.share({
                    title: `Weather in ${place.shortName}`,
                    url,
                });
                return;
            } catch (e) {
                if ((e as Error).name === "AbortError") return;
            }
        }

        await navigator.clipboard.writeText(url);
        clearTimeout(copiedTimer);
        copied = true;
        copiedTimer = setTimeout(() => {
            copied = false;
        }, 2000);
        toast.success(t("copied"));
    }

    // ── Auto-fetch every hour ──────────────────────────────────────
    const AUTOFETCH_MS = 60 * 60 * 1000;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function armInterval() {
        clearInterval(intervalId);
        intervalId = place ? setInterval(refresh, AUTOFETCH_MS) : undefined;
    }

    // ── Pull-to-refresh ────────────────────────────────────────────
    const PULL_THRESHOLD = 64; // damped px needed to arm a refresh
    const PULL_DAMPING = 0.45; // raw drag × damping = visual travel
    const PULL_MAX = 80; // max visual travel in px
    const PULL_SETTLE = 52; // height kept while spinner shows

    let pullY = $state(0);
    let pulling = $state(false);
    let pullReady = $state(false);

    let ptY0 = 0,
        ptX0 = 0,
        ptOk = false,
        ptLocked = false;

    function ptStart(e: TouchEvent) {
        if (loading || !data) return;
        ptY0 = e.touches[0].clientY;
        ptX0 = e.touches[0].clientX;
        ptOk = false;
        ptLocked = false;
    }

    function ptMove(e: TouchEvent) {
        if (loading || refreshing || ptLocked) return;
        if (window.scrollY > 0) return;
        const dy = e.touches[0].clientY - ptY0;
        if (dy <= 0) return;
        if (!ptOk) {
            const dx = Math.abs(e.touches[0].clientX - ptX0);
            if (dx > 12) {
                ptLocked = true;
                return;
            } // horizontal swipe — ignore
            if (dy > 8) {
                ptOk = true;
            } else return; // commit to vertical pull
        }
        e.preventDefault();
        pulling = true;
        pullY = Math.min(dy * PULL_DAMPING, PULL_MAX);
        pullReady = pullY >= PULL_THRESHOLD;
    }

    function ptEnd() {
        if (!pulling) return;
        if (pullReady) {
            pullY = PULL_SETTLE;
            refresh();
        } else pullY = 0;
        pulling = false;
        pullReady = false;
    }

    function ptCancel() {
        pulling = pullReady = false;
        pullY = 0;
    }

    // Hydrate from the persisted forecast when the network is unreachable.
    // Returns true if we recovered something useful to render.
    function hydrateFromCache(preferred?: Location): boolean {
        const cached = loadWeather();
        if (!cached) return false;
        // Use the requested location only when it matches the cached coords
        // (~10km); otherwise show the cached place so the data stays honest.
        const sameSpot =
            !!preferred &&
            Math.abs(preferred.latitude - cached.location.latitude) < 0.1 &&
            Math.abs(preferred.longitude - cached.location.longitude) < 0.1;
        data = cached.data;
        place = sameSpot ? preferred! : cached.location;
        updated = new Date(cached.fetchedAt);
        return true;
    }

    function fetchErrorMessage(e: any, fallback: string): string {
        return e?.message === "weather_unavailable"
            ? t("weather_unavailable")
            : e?.message || fallback;
    }

    async function load(loc: Location) {
        const requestId = ++loadRequestId;
        loading = true;
        loadingLocation = loc;
        error = "";
        try {
            const w = await fetchWeather(loc);
            if (requestId !== loadRequestId) return;
            data = w;
            place = loc;
            updated = new Date();
            saveLocation(loc);
            saveWeather(loc, w);
            armInterval();
            // Keep the URL in sync so the current location is always shareable
            const p = new URLSearchParams({
                lat: String(loc.latitude),
                lon: String(loc.longitude),
                name: loc.shortName,
            });
            replaceState(`?${p}`, {});
        } catch (e: any) {
            if (requestId !== loadRequestId) return;
            // Offline / network blip — render the last saved forecast so the
            // PWA isn't a blank page. We still surface the state via a banner.
            if (data) {
                error = navigator.onLine
                    ? fetchErrorMessage(e, t("fetch_failed"))
                    : t("offline_cached");
            } else if (hydrateFromCache(loc)) {
                error = navigator.onLine
                    ? fetchErrorMessage(e, t("fetch_failed"))
                    : t("offline_cached");
                armInterval();
            } else {
                error = fetchErrorMessage(e, t("fetch_failed"));
            }
        } finally {
            if (requestId === loadRequestId) {
                loading = false;
                loadingLocation = null;
            }
        }
    }

    async function refresh() {
        if (!place || refreshing || loading) return;
        const requestId = loadRequestId;
        refreshing = true;
        error = "";
        try {
            const w = await fetchWeather(place);
            if (requestId !== loadRequestId) return;
            data = w;
            updated = new Date();
            saveWeather(place, w);
            armInterval(); // reset the 1-hour timer
        } catch (e: any) {
            if (requestId !== loadRequestId) return;
            // Keep showing whatever we have; only flag the failure.
            error = navigator.onLine
                ? fetchErrorMessage(e, t("refresh_failed"))
                : t("offline_cached");
        } finally {
            refreshing = false;
            pullY = 0;
        }
    }

    async function locate() {
        const requestId = ++loadRequestId;
        loading = true;
        loadingLocation = null;
        error = "";
        try {
            const pos = await getCurrentPosition();
            if (requestId !== loadRequestId) return;
            const p = await reverseGeocode(pos, i18n.lang);
            if (requestId !== loadRequestId) return;
            const loc: Location = {
                name: p
                    ? [p.name, p.admin1, p.country_code]
                          .filter(Boolean)
                          .join(", ")
                    : t("current_location"),
                shortName: p?.name ?? t("current_location"),
                latitude: pos.latitude,
                longitude: pos.longitude,
                timezone: p?.timezone,
            };
            await load(loc);
        } catch (e: any) {
            if (requestId !== loadRequestId) return;
            error =
                e?.code === 1
                    ? t("permission_denied")
                    : e?.message || t("could_not_get_location");
            loading = false;
            loadingLocation = null;
        }
    }

    onMount(async () => {
        initLang();
        document.documentElement.lang = i18n.lang;
        // A shared link (/share?...) redirects here with URL params — honour them first
        const params = new URLSearchParams(window.location.search);
        const pLat = parseFloat(params.get("lat") ?? "");
        const pLon = parseFloat(params.get("lon") ?? "");
        const pName = params.get("name") ?? "";
        if (pLat && pLon && pName) {
            await load({
                name: pName,
                shortName: pName,
                latitude: pLat,
                longitude: pLon,
            });
            return;
        }

        const saved = loadLocation();
        if (saved) await load(saved);
        else await locate();
    });

    onMount(() => () => clearInterval(intervalId));

    onMount(() => {
        const onVisible = () => {
            if (document.visibilityState === "visible" && updated && place) {
                if (Date.now() - updated.getTime() >= AUTOFETCH_MS) refresh();
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () =>
            document.removeEventListener("visibilitychange", onVisible);
    });

    // Auto-recover once the network returns. If we were showing cached
    // data (or had nothing at all), this swaps in a fresh forecast.
    onMount(() => {
        const onOnline = () => {
            if (place) refresh();
            else {
                const saved = loadLocation();
                if (saved) load(saved);
            }
        };
        window.addEventListener("online", onOnline);
        return () => window.removeEventListener("online", onOnline);
    });

    onMount(() => {
        document.addEventListener("touchstart", ptStart, { passive: true });
        document.addEventListener("touchmove", ptMove, { passive: false });
        document.addEventListener("touchend", ptEnd);
        document.addEventListener("touchcancel", ptCancel);
        return () => {
            document.removeEventListener("touchstart", ptStart);
            document.removeEventListener("touchmove", ptMove);
            document.removeEventListener("touchend", ptEnd);
            document.removeEventListener("touchcancel", ptCancel);
        };
    });

    $effect(() => {
        if (typeof document !== "undefined")
            document.documentElement.lang = i18n.lang;
    });
</script>

<main
    class="safe-pt safe-pb mx-auto min-h-screen w-full max-w-6xl lg:flex lg:h-screen lg:min-h-0 lg:flex-col lg:overflow-hidden"
>
    <!-- Pull-to-refresh indicator -->
    <div
        class="flex items-end justify-center overflow-hidden"
        style="height:{pulling || refreshing
            ? pullY
            : 0}px;transition:height {pulling ? 0 : 300}ms ease"
        aria-hidden="true"
    >
        <Badge
            variant="outline"
            class="weather-card mb-2 flex size-10 rounded-full p-0 text-muted-foreground"
        >
            {#if refreshing}
                <RefreshIcon class="size-4 animate-spin" />
            {:else}
                <ArrowUpIcon
                    class="size-4 transition-transform duration-200 {pullReady
                        ? 'rotate-180'
                        : ''}"
                />
            {/if}
        </Badge>
    </div>

    <header
        class="sticky top-0 z-20 bg-background/85 px-5 pt-4 pb-2 backdrop-blur-md mb-2"
    >
        <div class="relative flex items-center gap-2">
            <div class="flex-1 min-w-0">
                <Search onSelect={load} onLocate={locate} />
            </div>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    {#snippet child({ props })}
                        <Button
                            {...props}
                            variant="outline"
                            size="icon"
                            class="pressable h-11 w-auto rounded-md px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground nums"
                            onclick={toggleLang}
                            aria-label={t("language")}
                        >
                            <LanguagesIcon class="size-4" />
                            <span class="ml-1"
                                >{i18n.lang === "en" ? "EN" : "ΕΛ"}</span
                            >
                        </Button>
                    {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content>{t("language")}</Tooltip.Content>
            </Tooltip.Root>
            {#if data}
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        {#snippet child({ props })}
                            <Button
                                {...props}
                                variant={copied ? "default" : "outline"}
                                size="icon"
                                class="pressable h-11 w-11 rounded-md {copied
                                    ? 'border-accent/30 bg-accent/20 text-accent hover:bg-accent/25'
                                    : 'text-muted-foreground'}"
                                onclick={share}
                                aria-label={t("share")}
                            >
                                {#if copied}
                                    <CheckIcon class="size-4.5" />
                                {:else}
                                    <ShareIcon class="size-4.5" />
                                {/if}
                            </Button>
                        {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content>{t("share")}</Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        {#snippet child({ props })}
                            <Button
                                {...props}
                                variant="outline"
                                size="icon"
                                class="pressable hidden h-11 w-11 rounded-md text-muted-foreground sm:inline-flex"
                                onclick={refresh}
                                disabled={refreshing}
                                aria-label={t("refresh")}
                            >
                                <RefreshIcon
                                    class="size-4.5 {refreshing
                                        ? 'animate-spin'
                                        : ''}"
                                />
                            </Button>
                        {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content>{t("refresh")}</Tooltip.Content>
                </Tooltip.Root>
            {/if}
        </div>
    </header>

    {#if loading && !data}
        <div
            class="px-5 py-10 lg:grid lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] lg:gap-4"
        >
            <div class="space-y-4">
                <div class="flex items-center gap-3 text-muted-foreground">
                    <SunIcon class="size-10 text-accent animate-pulse" />
                    <span class="text-sm">{t("loading")}</span>
                </div>
                <div class="space-y-3">
                    <Skeleton class="h-52 w-full rounded-lg" />
                    <div
                        class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2"
                    >
                        <Skeleton class="h-16 rounded-lg" />
                        <Skeleton class="h-16 rounded-lg" />
                        <Skeleton class="h-16 rounded-lg" />
                        <Skeleton class="h-16 rounded-lg" />
                    </div>
                </div>
            </div>
            <div class="mt-3 space-y-3 lg:mt-0">
                <Skeleton class="h-72 w-full rounded-lg" />
                <Skeleton class="hidden h-40 w-full rounded-lg lg:block" />
            </div>
        </div>
    {:else if error && !data}
        <div class="px-5 py-10">
            <Alert.Root variant="destructive">
                <Alert.Title>{t("fetch_failed")}</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
                <Alert.Action>
                    <Button
                        class="pressable"
                        variant="outline"
                        size="sm"
                        onclick={locate}
                    >
                        {t("try_again")}
                    </Button>
                </Alert.Action>
            </Alert.Root>
        </div>
    {:else if data}
        {#if loading}
            <div class="mx-5 mb-3" role="status" aria-live="polite">
                <div
                    class="weather-card flex min-h-11 items-center gap-2 rounded-md bg-card px-3 py-2 text-sm text-muted-foreground"
                >
                    <LoaderIcon
                        class="size-4 shrink-0 animate-spin text-accent"
                    />
                    <span class="min-w-0 truncate">{loadingMessage}</span>
                </div>
            </div>
        {/if}
        {#if error}
            <div class="mx-5 mb-3">
                <Alert.Root
                    variant="default"
                    class="weather-card border-0 text-warn"
                >
                    <Alert.Description class="text-warn/90 text-xs">
                        {error}
                    </Alert.Description>
                </Alert.Root>
            </div>
        {/if}
        <div
            class="mt-1 lg:grid lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)] lg:gap-4 lg:px-5 lg:flex-1 lg:min-h-0"
        >
            <div class="lg:h-full lg:min-h-0 lg:space-y-4">
                <Current {data} {place} />
            </div>
            <div class="lg:flex lg:h-full lg:min-h-0 lg:min-w-0 lg:flex-col">
                <Daily {data} />
            </div>
        </div>
        <footer
            class="px-5 pb-8 text-center text-[11px] text-muted-foreground/70 lg:pt-2"
        >
            {#if updated}{t("updated")}
                {updated.toLocaleTimeString(locale(), {
                    hour: "2-digit",
                    minute: "2-digit",
                })} ·
            {/if}
            {t("powered_by")}
            <a
                class="hover:text-muted-foreground underline-offset-2 hover:underline"
                href="https://open-meteo.com"
                target="_blank"
                rel="noopener noreferrer">Open-Meteo</a
            >
        </footer>
    {/if}
</main>
