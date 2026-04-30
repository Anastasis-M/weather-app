<script lang="ts">
    import Icon from "./Icon.svelte";
    import { searchPlaces, type Location, type Place } from "$lib/weather";
    import { i18n, t } from "$lib/i18n.svelte";

    type Props = {
        onSelect?: (loc: Location) => void;
        onLocate?: () => void;
    };
    let { onSelect, onLocate }: Props = $props();

    let q = $state("");
    let results = $state<Place[]>([]);
    let open = $state(false);
    let loading = $state(false);
    let active = $state(-1);
    let timer: ReturnType<typeof setTimeout> | undefined;

    function run(value: string) {
        clearTimeout(timer);
        if (!value || value.trim().length < 2) {
            results = [];
            return;
        }
        loading = true;
        const lang = i18n.lang;
        timer = setTimeout(async () => {
            try {
                results = await searchPlaces(value, lang);
                active = results.length ? 0 : -1;
            } finally {
                loading = false;
            }
        }, 220);
    }

    $effect(() => {
        run(q);
    });

    function pick(r: Place) {
        open = false;
        q = "";
        results = [];
        onSelect?.({
            name: [r.name, r.admin1, r.country_code].filter(Boolean).join(", "),
            shortName: r.name,
            latitude: r.latitude,
            longitude: r.longitude,
            timezone: r.timezone,
        });
    }

    function onKey(e: KeyboardEvent) {
        if (!results.length) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            active = (active + 1) % results.length;
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            active = (active - 1 + results.length) % results.length;
        } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(results[active]);
        } else if (e.key === "Escape") {
            open = false;
        }
    }
</script>

<div class="relative w-full">
    <div
        class="flex items-center gap-2 rounded-2xl bg-panel hairline px-3 h-11 overflow-hidden"
    >
        <Icon name="search" size={18} class="text-sub shrink-0" />
        <input
            type="search"
            bind:value={q}
            onfocus={() => (open = true)}
            onkeydown={onKey}
            placeholder={t("search_placeholder")}
            class="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-mute"
            autocomplete="off"
            enterkeyhint="search"
            role="combobox"
            aria-expanded={open && (results.length > 0 || loading)}
            aria-controls="search-listbox"
            aria-autocomplete="list"
            aria-activedescendant={active >= 0
                ? `search-result-${active}`
                : undefined}
        />
        <button
            type="button"
            onclick={() => onLocate?.()}
            class="shrink-0 p-1.5 rounded-lg text-sub hover:text-ink hover:bg-panel2 transition"
            aria-label={t("use_location")}
            title={t("use_location")}
        >
            <Icon name="pin" size={18} />
        </button>
    </div>

    {#if open && (results.length > 0 || loading)}
        <ul
            id="search-listbox"
            class="absolute left-0 right-0 mt-2 z-30 rounded-2xl bg-panel hairline overflow-hidden max-h-80 overflow-y-auto"
            role="listbox"
            aria-label={t("search_placeholder")}
        >
            {#if loading && results.length === 0}
                <li class="px-3 py-3 text-sm text-sub">{t("searching")}</li>
            {/if}
            {#each results as r, i}
                <li>
                    <button
                        id="search-result-{i}"
                        type="button"
                        class="w-full text-left px-3 py-2.5 flex items-baseline gap-2 hover:bg-panel2 transition {i ===
                        active
                            ? 'bg-panel2'
                            : ''}"
                        onclick={() => pick(r)}
                        onmouseenter={() => (active = i)}
                        role="option"
                        aria-selected={i === active}
                    >
                        <span class="text-[15px]">{r.name}</span>
                        <span class="text-xs text-sub truncate">
                            {[r.admin1, r.country].filter(Boolean).join(", ")}
                        </span>
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<svelte:window
    onclick={(e: MouseEvent) => {
        if (!(e.target instanceof Element)) return;
        if (!e.target.closest(".relative")) open = false;
    }}
/>
