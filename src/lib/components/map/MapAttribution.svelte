<script lang="ts">
    import InfoIcon from "@lucide/svelte/icons/info";
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { MAP_ATTRIBUTION } from "$lib/mapLayers";
    import { t } from "$lib/i18n.svelte";

    let { domain }: { domain?: string } = $props();

    const model = $derived(
        domain === "dwd_icon_eu"
            ? "DWD ICON-EU · ~7 km"
            : domain
              ? "DWD ICON · ~11 km"
              : null,
    );
</script>

<Popover.Root>
    <Popover.Trigger>
        {#snippet child({ props })}
            <Button
                {...props}
                variant="ghost"
                size="icon"
                class="weather-card pressable size-9 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label={t("map.attribution")}
            >
                <InfoIcon class="size-4" />
            </Button>
        {/snippet}
    </Popover.Trigger>
    <Popover.Content
        side="bottom"
        align="end"
        sideOffset={8}
        class="w-auto max-w-64 p-3"
    >
        <p class="text-xs text-muted-foreground">
            {#each MAP_ATTRIBUTION as source, i (source.href)}{#if i > 0}<span
                        aria-hidden="true">{" · "}</span
                    >{/if}<a
                    class="underline-offset-2 hover:text-foreground hover:underline"
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer">{source.label}</a
                >{/each}
        </p>
        {#if model}
            <p class="nums mt-2 text-[11px] text-muted-foreground/70">
                {t("map.model")}: {model}
            </p>
        {/if}
    </Popover.Content>
</Popover.Root>
