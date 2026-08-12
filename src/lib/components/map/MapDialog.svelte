<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import LoaderIcon from "@lucide/svelte/icons/loader-2";
    import XIcon from "@lucide/svelte/icons/x";
    import type { Location } from "$lib/weather";
    import { t } from "$lib/i18n.svelte";

    let {
        open = $bindable(false),
        place,
    }: { open?: boolean; place: Location } = $props();

    let WeatherMap = $state<
        typeof import("./WeatherMap.svelte").default | null
    >(null);

    $effect(() => {
        if (open && !WeatherMap) {
            import("./WeatherMap.svelte").then((m) => (WeatherMap = m.default));
        }
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Content
        class="inset-0 top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 p-0 ring-0 sm:inset-6 sm:h-auto sm:w-auto sm:max-w-none sm:rounded-xl sm:border sm:border-border sm:ring-1 sm:ring-foreground/10"
        showCloseButton={false}
        data-no-pull
    >
        <Dialog.Title class="sr-only">{t("map.title")}</Dialog.Title>
        <Dialog.Description class="sr-only">
            {t("map.precipitation")} — {place.shortName}
        </Dialog.Description>
        {#if WeatherMap}
            <WeatherMap {place}>
                {#snippet action()}
                    <Dialog.Close>
                        {#snippet child({ props })}
                            <Button
                                {...props}
                                variant="ghost"
                                size="icon"
                                class="weather-card pressable size-9 rounded-lg text-muted-foreground hover:text-foreground"
                                aria-label={t("map.close")}
                            >
                                <XIcon class="size-4" />
                            </Button>
                        {/snippet}
                    </Dialog.Close>
                {/snippet}
            </WeatherMap>
        {:else}
            <div class="flex h-full w-full items-center justify-center">
                <div
                    class="flex items-center gap-2 text-sm text-muted-foreground"
                >
                    <LoaderIcon class="size-4 animate-spin text-accent" />
                    {t("map.loading")}
                </div>
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>
