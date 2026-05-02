<script lang="ts">
    import { onMount } from "svelte";
    import Search from "$lib/components/Search.svelte";
    import Current from "$lib/components/Current.svelte";
    import Hourly from "$lib/components/Hourly.svelte";
    import Daily from "$lib/components/Daily.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import {
        fetchWeather,
        getCurrentPosition,
        reverseGeocode,
        saveLocation,
        loadLocation,
        saveAutofetch,
        loadAutofetch,
        type Location,
        type WeatherData,
    } from "$lib/weather";
    import { i18n, t, locale, initLang, toggleLang } from "$lib/i18n.svelte";

    let place = $state<Location | null>(null);
    let data = $state<WeatherData | null>(null);
    let loading = $state(true);
    let refreshing = $state(false);
    let error = $state("");
    let updated = $state<Date | null>(null);

    // ── Auto-fetch every hour ──────────────────────────────────────
    const AUTOFETCH_MS = 60 * 60 * 1000;
    let autofetch = $state(false); // real value loaded in onMount
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function armInterval() {
        clearInterval(intervalId);
        intervalId =
            autofetch && !!place
                ? setInterval(refresh, AUTOFETCH_MS)
                : undefined;
    }

    function toggleAutofetch() {
        autofetch = !autofetch;
        saveAutofetch(autofetch);
        armInterval();
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

    async function load(loc: Location) {
        loading = true;
        error = "";
        try {
            const w = await fetchWeather(loc);
            data = w;
            place = loc;
            updated = new Date();
            saveLocation(loc);
            armInterval();
        } catch (e: any) {
            error = e?.message || t("fetch_failed");
        } finally {
            loading = false;
        }
    }

    async function refresh() {
        if (!place || refreshing) return;
        refreshing = true;
        error = "";
        try {
            const w = await fetchWeather(place);
            data = w;
            updated = new Date();
            armInterval(); // reset the 1-hour timer
        } catch (e: any) {
            error = e?.message || t("refresh_failed");
        } finally {
            refreshing = false;
            pullY = 0;
        }
    }

    async function locate() {
        loading = true;
        error = "";
        try {
            const pos = await getCurrentPosition();
            const p = await reverseGeocode(pos, i18n.lang);
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
            error =
                e?.code === 1
                    ? t("permission_denied")
                    : e?.message || t("could_not_get_location");
            loading = false;
        }
    }

    onMount(async () => {
        initLang();
        document.documentElement.lang = i18n.lang;
        autofetch = loadAutofetch();
        const saved = loadLocation();
        if (saved) await load(saved);
        else await locate();
    });

    onMount(() => () => clearInterval(intervalId));

    onMount(() => {
        const onVisible = () => {
            if (
                document.visibilityState === "visible" &&
                autofetch &&
                updated &&
                place
            ) {
                if (Date.now() - updated.getTime() >= AUTOFETCH_MS) refresh();
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () =>
            document.removeEventListener("visibilitychange", onVisible);
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

<main class="mx-auto w-full max-w-2xl safe-pt safe-pb">
    <!-- Pull-to-refresh indicator -->
    <div
        class="flex items-end justify-center overflow-hidden"
        style="height:{pulling || refreshing
            ? pullY
            : 0}px;transition:height {pulling ? 0 : 300}ms ease"
        aria-hidden="true"
    >
        <div
            class="mb-2 w-10 h-10 rounded-full bg-panel hairline flex items-center justify-center"
        >
            {#if refreshing}
                <Icon name="refresh" size={16} class="text-sub animate-spin" />
            {:else}
                <Icon
                    name="arrow"
                    size={16}
                    class="text-sub transition-transform duration-200 {pullReady
                        ? 'rotate-180'
                        : ''}"
                />
            {/if}
        </div>
    </div>

    <header class="px-5 pt-4 pb-3 sticky top-0 z-20 bg-bg/85 backdrop-blur-md">
        <div class="flex items-center gap-2">
            <div class="flex-1 min-w-0">
                <Search onSelect={load} onLocate={locate} />
            </div>
            <button
                type="button"
                onclick={toggleLang}
                class="h-11 px-3 shrink-0 rounded-2xl bg-panel hairline flex items-center justify-center text-sub hover:text-ink hover:bg-panel2 transition text-xs font-medium nums tracking-wider uppercase"
                aria-label={t("language")}
                title={t("language")}
            >
                {i18n.lang === "en" ? "EN" : "ΕΛ"}
            </button>
            {#if data}
                <button
                    type="button"
                    onclick={toggleAutofetch}
                    class="h-11 w-11 shrink-0 rounded-2xl hairline flex items-center justify-center transition {autofetch
                        ? 'bg-accent/15 text-accent'
                        : 'bg-panel text-sub hover:text-ink hover:bg-panel2'}"
                    aria-label={t("autofetch")}
                    title={t("autofetch")}
                    aria-pressed={autofetch}
                >
                    <Icon name="clock" size={18} />
                </button>
                <button
                    type="button"
                    onclick={refresh}
                    disabled={refreshing}
                    class="h-11 w-11 shrink-0 rounded-2xl bg-panel hairline flex items-center justify-center text-sub hover:text-ink hover:bg-panel2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("refresh")}
                    title={t("refresh")}
                >
                    <Icon
                        name="refresh"
                        size={18}
                        class={refreshing ? "animate-spin" : ""}
                    />
                </button>
            {/if}
        </div>
    </header>

    {#if loading && !data}
        <div class="px-5 py-20 flex flex-col items-center text-sub gap-3">
            <div class="animate-pulse text-accent">
                <Icon name="sun" size={42} />
            </div>
            <div class="text-sm">{t("loading")}</div>
        </div>
    {:else if error && !data}
        <div class="px-5 py-10 text-center">
            <div class="text-warn text-sm mb-3">{error}</div>
            <button
                class="rounded-xl bg-panel hairline px-4 py-2 text-sm"
                onclick={locate}>{t("try_again")}</button
            >
        </div>
    {:else if data}
        {#if error}
            <div
                class="mx-5 mb-3 rounded-lg bg-panel hairline px-3 py-2 text-xs text-warn"
            >
                {error}
            </div>
        {/if}
        <Current {data} {place} />
        <Hourly {data} />
        <Daily {data} />
        <footer class="px-5 pb-8 text-center text-[11px] text-mute">
            {#if updated}{t("updated")}
                {updated.toLocaleTimeString(locale(), {
                    hour: "2-digit",
                    minute: "2-digit",
                })} ·
            {/if}
            {t("powered_by")}
            <a
                class="hover:text-sub"
                href="https://open-meteo.com"
                target="_blank"
                rel="noopener noreferrer">Open-Meteo</a
            >
        </footer>
    {/if}
</main>
