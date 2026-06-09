<script lang="ts">
    import SearchIcon from "@lucide/svelte/icons/search";
    import MapPinIcon from "@lucide/svelte/icons/map-pin";
    import LoaderIcon from "@lucide/svelte/icons/loader-2";
    import * as Command from "$lib/components/ui/command";
    import * as InputGroup from "$lib/components/ui/input-group";
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
    let selectedValue = $state("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let container: HTMLDivElement;
    let inputEl: HTMLInputElement | null = $state(null);

    function resultValue(r: Place) {
        return `${r.name}-${r.latitude}-${r.longitude}`;
    }

    function run(value: string) {
        clearTimeout(timer);
        if (!value || value.trim().length < 2) {
            results = [];
            active = -1;
            selectedValue = "";
            return;
        }
        loading = true;
        const lang = i18n.lang;
        timer = setTimeout(async () => {
            try {
                results = await searchPlaces(value, lang);
                active = results.length ? 0 : -1;
                selectedValue = results.length ? resultValue(results[0]) : "";
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
        inputEl?.blur();
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
            selectedValue = resultValue(results[active]);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            active = (active - 1 + results.length) % results.length;
            selectedValue = resultValue(results[active]);
        } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(results[active]);
        } else if (e.key === "Escape") {
            open = false;
            inputEl?.blur();
        }
    }
</script>

<div class="relative w-full" bind:this={container}>
    <InputGroup.Root class="h-11 bg-card/40 pl-0.5 pr-0.5 shadow-xs">
        <InputGroup.Addon class="pl-2">
        <SearchIcon class="size-4 shrink-0 text-muted-foreground" />
        </InputGroup.Addon>
        <InputGroup.Input
            bind:ref={inputEl}
            bind:value={q}
            onfocus={() => (open = true)}
            onkeydown={onKey}
            type="search"
            placeholder={t("search_placeholder")}
            autocomplete="off"
            enterkeyhint="search"
            role="combobox"
            aria-expanded={open && (results.length > 0 || loading)}
            aria-controls="search-listbox"
            aria-autocomplete="list"
            aria-activedescendant={active >= 0
                ? `search-result-${active}`
                : undefined}
            class="h-10 px-0 text-[15px]"
        />
        <InputGroup.Addon align="inline-end" class="py-0 pr-0.5">
        <InputGroup.Button
            variant="ghost"
            size="icon-sm"
            class="pressable size-10 text-muted-foreground"
            onclick={() => onLocate?.()}
            aria-label={t("use_location")}
            title={t("use_location")}
        >
            <MapPinIcon />
        </InputGroup.Button>
        </InputGroup.Addon>
    </InputGroup.Root>

    {#if open && (results.length > 0 || loading)}
        <Command.Root
            id="search-listbox"
            shouldFilter={false}
            loop
            bind:value={selectedValue}
            onValueChange={(value) => {
                selectedValue = value;
                const next = results.findIndex((r) => resultValue(r) === value);
                if (next >= 0) active = next;
            }}
            class="absolute left-0 right-0 top-full z-30 mt-2 h-auto rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
            <Command.List class="max-h-80">
                {#if loading && results.length === 0}
                    <Command.Loading
                        class="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground"
                    >
                        <LoaderIcon class="size-4 animate-spin" />
                        {t("searching")}
                    </Command.Loading>
                {/if}
                {#each results as r, i}
                    <Command.Item
                        id="search-result-{i}"
                        value={resultValue(r)}
                        onSelect={() => pick(r)}
                        forceMount
                        class="pressable min-h-10 cursor-pointer gap-3 px-3 py-2.5 {i ===
                        active
                            ? 'bg-muted text-foreground'
                            : 'hover:bg-muted/60'}"
                        onmouseenter={() => {
                            active = i;
                            selectedValue = resultValue(r);
                        }}
                    >
                        <MapPinIcon class="size-3.5 text-muted-foreground" />
                        <span class="min-w-0 flex-1 truncate text-[15px]">{r.name}</span>
                        <Command.Shortcut
                            class="max-w-[42%] truncate text-xs tracking-normal"
                        >
                            {[r.admin1, r.country].filter(Boolean).join(", ")}
                        </Command.Shortcut>
                    </Command.Item>
                {/each}
            </Command.List>
        </Command.Root>
    {/if}
</div>

<svelte:window
    onclick={(e: MouseEvent) => {
        if (container && !container.contains(e.target as Node)) open = false;
    }}
/>
