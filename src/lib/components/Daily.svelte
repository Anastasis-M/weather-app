<script lang="ts">
    import Icon from "./Icon.svelte";
    import DayDetail from "./DayDetail.svelte";
    import { tempGradient } from "#lib/tempScale.js";
    import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
    import NavigationIcon from "@lucide/svelte/icons/navigation";
    import WindIcon from "@lucide/svelte/icons/wind";
    import CloudRainIcon from "@lucide/svelte/icons/cloud-rain";
    import * as Card from "#lib/components/ui/card/index.js";
    import { Badge } from "#lib/components/ui/badge/index.js";
    import { Separator } from "#lib/components/ui/separator/index.js";
    import * as Dialog from "#lib/components/ui/dialog/index.js";
    import * as Drawer from "#lib/components/ui/drawer/index.js";
    import * as Tooltip from "#lib/components/ui/tooltip/index.js";
    import type { Snippet } from "svelte";
    import { MediaQuery } from "svelte/reactivity";
    import { mergeProps } from "bits-ui";
    import * as Popover from "#lib/components/ui/popover/index.js";
    import { Button } from "#lib/components/ui/button/index.js";
    import InfoIcon from "@lucide/svelte/icons/info";
    import { describe, iconColor } from "#lib/wmo.js";
    import { fmtTemp, fmtDayShort, fmtDayLong, fmtDate, fmtMm, kmhToBeaufort } from "#lib/format.js";
    import { t, locale } from "#lib/i18n.svelte.js";
    import { CONSENSUS_MODELS, dayForecast, type ConsensusVariable, type Spread, type WeatherData } from "#lib/weather.js";

    type Props = { data: WeatherData };
    let { data }: Props = $props();

    const tz = $derived(data.timezone as string);
    const daily = $derived(data.daily);

    const canHover = new MediaQuery("(hover: hover)");
    const isDesktop = new MediaQuery("(min-width: 768px)");

    let selected = $state(-1);
    let detailOpen = $state(false);

    function openDay(i: number) {
        selected = i;
        detailOpen = true;
    }

    const spreadOf = (variable: ConsensusVariable, day: string): Spread | null =>
        data.consensus?.[variable]?.[day] ?? null;

    const days = $derived(
        (daily.time as string[]).map((day, i) => {
            const minSpread = spreadOf("temperature_2m_min", day);
            const maxSpread = spreadOf("temperature_2m_max", day);
            const sumSpread = spreadOf("precipitation_sum", day);
            const windSpread = spreadOf("wind_speed_10m_max", day);
            return {
                ...dayForecast(data, i),
                band: minSpread && maxSpread ? { low: minSpread.low, high: maxSpread.high } : null,
                sumSpread,
                windSpread,
                models: maxSpread?.models ?? 0,
            };
        }),
    );

    const modelCount = $derived(
        Math.max(0, ...Object.values(data.consensus?.temperature_2m_max ?? {}).map((s) => (s as Spread).models)),
    );

    const tempRange = $derived.by(() => {
        const lo = Math.min(...days.map((d) => Math.min(d.min, d.band?.low ?? d.min)));
        const hi = Math.max(...days.map((d) => Math.max(d.max, d.band?.high ?? d.max)));
        return { lo, hi, span: Math.max(1, hi - lo) };
    });

    function bandStyle(low: number, high: number): string {
        const { lo, span } = tempRange;
        return `left:${((low - lo) / span) * 100}%;width:${((high - low) / span) * 100}%`;
    }

    const RAIN_DISAGREE_MM = 2;
    const rainDisagrees = (s: Spread | null) =>
        !!s && s.high - s.low >= Math.max(RAIN_DISAGREE_MM, s.median);

    const WIND_DISAGREE_BF = 2;
    const windDisagrees = (s: Spread | null) =>
        !!s && kmhToBeaufort(s.high) - kmhToBeaufort(s.low) >= WIND_DISAGREE_BF;

    function barStyle(min: number, max: number): string {
        const { lo, span } = tempRange;
        const left = ((min - lo) / span) * 100;
        const width = ((max - min) / span) * 100;
        return `left:${left}%;width:${Math.max(width, 4)}%;background:${tempGradient(min, max)}`;
    }

    // Position of the current temperature within today's min–max bar.
    function nowDotStyle(min: number, max: number): string {
        const { lo, span } = tempRange;
        const cur = Math.min(Math.max(data.current.temperature_2m, min), max);
        const left = ((cur - lo) / span) * 100;
        return `left:clamp(3px,${left}%,calc(100% - 3px))`;
    }

    function rainLabel(sum: number, pop: number): string {
        return sum >= 0.2 ? fmtMm(sum) : `${Math.round(pop)}%`;
    }

</script>

{#snippet hintLines(lines: string[])}
    <div class="flex flex-col gap-0.5">
        {#each lines as line (line)}<span>{line}</span>{/each}
    </div>
{/snippet}

{#snippet badgeHint(lines: string[], badge: Snippet<[Record<string, unknown>]>)}
    {#if canHover.current}
        <Tooltip.Root>
            <Tooltip.Trigger tabindex={-1}>
                {#snippet child({ props })}
                    {@render badge(props)}
                {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>{@render hintLines(lines)}</Tooltip.Content>
        </Tooltip.Root>
    {:else}
        <Popover.Root>
            <Popover.Trigger>
                {#snippet child({ props })}
                    {@render badge(mergeProps(props, { onclick: (e: MouseEvent) => e.stopPropagation() }))}
                {/snippet}
            </Popover.Trigger>
            <Popover.Content
                side="top"
                sideOffset={6}
                collisionPadding={16}
                class="w-auto max-w-64 gap-0 p-2.5 text-xs"
            >
                {@render hintLines(lines)}
            </Popover.Content>
        </Popover.Root>
    {/if}
{/snippet}

{#snippet rangeBar(min: number, max: number, band: { low: number; high: number } | null, isToday: boolean)}
    <div class="relative flex flex-1 h-1.5 rounded-full bg-muted">
        {#if band}
            <span
                class="absolute top-0 h-full rounded-full bg-foreground/15"
                style={bandStyle(band.low, band.high)}
            ></span>
        {/if}
        <span
            class="absolute top-0 h-full rounded-full"
            style={barStyle(min, max)}
        ></span>
        {#if isToday}
            <span
                class="absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_var(--card)]"
                style={nowDotStyle(min, max)}
            ></span>
        {/if}
    </div>
{/snippet}

<section
    class="select-none px-5 pb-8 lg:px-0 lg:pb-0 lg:flex lg:min-h-0 lg:flex-none lg:flex-col"
>
    <Card.Root
        size="sm"
        class="weather-card gap-0 rounded-lg py-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden"
    >
        <Card.Header class="border-b border-border/70 px-3 pb-2.5! lg:shrink-0">
            <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <Card.Title class="section-title">
                    {t("forecast_7d")}
                </Card.Title>
                {#if modelCount >= 2}
                    <div class="flex items-baseline gap-0.5 whitespace-nowrap">
                        <span class="text-[11px] text-muted-foreground/70">
                            {t("consensus.models", { count: modelCount })}
                        </span>
                        <Popover.Root>
                            <Popover.Trigger>
                                {#snippet child({ props })}
                                    <Button
                                        {...props}
                                        variant="ghost"
                                        size="icon"
                                        class="pressable -my-1.5 size-7 self-center rounded-md text-muted-foreground/70 hover:text-foreground"
                                        aria-label={t("consensus.info")}
                                    >
                                        <InfoIcon class="size-3.5" />
                                    </Button>
                                {/snippet}
                            </Popover.Trigger>
                            <Popover.Content
                                side="bottom"
                                align="end"
                                sideOffset={6}
                                collisionPadding={16}
                                class="w-72 gap-2 p-3 text-xs"
                            >
                                <p class="font-medium text-foreground">{t("consensus.info_title")}</p>
                                <p class="text-muted-foreground">{t("consensus.info_median")}</p>
                                <ul class="grid gap-0.5">
                                    {#each CONSENSUS_MODELS as model (model.id)}
                                        <li class="flex items-center gap-2">
                                            <span class="size-1 shrink-0 rounded-full bg-muted-foreground/60"></span>
                                            {model.name}
                                        </li>
                                    {/each}
                                </ul>
                                <p class="text-muted-foreground">{t("consensus.info_best_match")}</p>
                                <p class="text-muted-foreground">{t("consensus.info_range")}</p>
                                <p class="text-muted-foreground">{t("consensus.info_wind")}</p>
                            </Popover.Content>
                        </Popover.Root>
                    </div>
                {/if}
            </div>
        </Card.Header>
        <div class="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {#each daily.time as day, i}
            {@const w = describe(daily.weather_code[i], 1)}
            {@const { min, max, sum, wind, gusts, band, sumSpread, windSpread, models } = days[i]}
            {@const pop = daily.precipitation_probability_max?.[i] ?? 0}
            {@const dayBf = kmhToBeaufort(wind)}
            {@const dayDirDeg = daily.wind_direction_10m_dominant?.[i]}
            {@const hasDayDir = dayDirDeg != null}
            {@const windLines = [
                `${t("wind")}: ${dayBf} Bf, ${t("bf." + dayBf)}`,
                ...(windDisagrees(windSpread)
                    ? [t("consensus.range", { low: `${kmhToBeaufort(windSpread!.low)} Bf`, high: `${kmhToBeaufort(windSpread!.high)} Bf` })]
                    : []),
            ]}
            {@const rainLines = [
                sum >= 0.2 ? `${t("day_total")}: ${fmtMm(sum)}` : t("rain_chance", { pop }),
                ...(rainDisagrees(sumSpread)
                    ? [t("consensus.range", { low: fmtMm(sumSpread!.low), high: fmtMm(sumSpread!.high) })]
                    : []),
            ]}
            {#snippet windBadge(props: Record<string, unknown>, extra: string, withDir: boolean)}
                <Badge {...props} variant="secondary" class="nums text-muted-foreground {extra}">
                    <span class="sr-only">{windLines.join(". ")}</span>
                    <WindIcon aria-hidden="true" />
                    <span aria-hidden="true">{dayBf} Bf</span>
                    {#if windDisagrees(windSpread)}
                        <span class="font-normal text-muted-foreground/60" aria-hidden="true"
                            >{kmhToBeaufort(windSpread!.low)}–{kmhToBeaufort(windSpread!.high)}</span
                        >
                    {/if}
                    {#if withDir}
                        <span
                            class="inline-flex"
                            aria-hidden="true"
                            style={`transform: rotate(${dayDirDeg ?? 0}deg);`}
                        >
                            <NavigationIcon class="size-3" />
                        </span>
                    {/if}
                </Badge>
            {/snippet}
            {#snippet rainBadge(props: Record<string, unknown>, extra: string)}
                <Badge {...props} class="nums bg-rain/10 text-rain {extra}">
                    <CloudRainIcon />
                    {rainLabel(sum, pop)}
                    {#if rainDisagrees(sumSpread)}
                        <span class="font-normal text-rain/60"
                            >{Math.round(sumSpread!.low)}–{Math.round(sumSpread!.high)}</span
                        >
                    {/if}
                </Badge>
            {/snippet}
            {#if i > 0}<Separator />{/if}
            <div
                    role="button"
                    tabindex="0"
                    aria-haspopup="dialog"
                    onclick={() => openDay(i)}
                    onkeydown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDay(i);
                        }
                    }}
                    class="grid w-full cursor-pointer select-none grid-cols-[52px_26px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 active:bg-muted/55 min-[460px]:min-h-[56px] min-[460px]:py-0 sm:grid-cols-[62px_28px_minmax(0,1fr)_auto] lg:grid-cols-[84px_28px_minmax(0,1fr)_auto] lg:gap-3 xl:grid-cols-[84px_28px_128px_minmax(0,1fr)_auto]"
                >
                    <div>
                        <div
                            class="text-[15px] font-medium {i === 0
                                ? 'text-accent'
                                : ''}"
                        >
                            {i === 0
                                ? t("today")
                                : fmtDayShort(day, tz, locale())}
                        </div>
                        <div class="text-[11px] text-muted-foreground/70 nums">
                            {fmtDate(day, tz, locale())}
                        </div>
                    </div>
                    <Icon name={w.icon} size={24} class={iconColor(w.icon)} />
                    <div
                        class="hidden truncate text-sm text-muted-foreground xl:block"
                    >
                        {t(w.labelKey)}
                    </div>
                    <div class="flex items-center gap-1.5 sm:gap-2">
                        <span
                            class="text-muted-foreground nums text-sm w-9 text-right"
                            >{fmtTemp(min)}</span
                        >
                        {#if band}
                            <Tooltip.Root>
                                <Tooltip.Trigger tabindex={-1}>
                                    {#snippet child({ props })}
                                        <div {...props} class="flex flex-1 items-center self-stretch">
                                            {@render rangeBar(min, max, band, i === 0)}
                                        </div>
                                    {/snippet}
                                </Tooltip.Trigger>
                                <Tooltip.Content
                                    >{t("consensus.range", { low: fmtTemp(band.low), high: fmtTemp(band.high) })}</Tooltip.Content
                                >
                            </Tooltip.Root>
                        {:else}
                            {@render rangeBar(min, max, band, i === 0)}
                        {/if}
                        <span class="nums text-sm w-9">{fmtTemp(max)}</span>
                    </div>
                    <div class="flex items-center justify-end gap-1.5 pl-0.5">
                        {#if hasDayDir}
                            {#snippet desktopWind(props: Record<string, unknown>)}
                                {@render windBadge(props, "hidden min-[460px]:inline-flex", true)}
                            {/snippet}
                            {@render badgeHint(windLines, desktopWind)}
                        {/if}
                        {#if sum >= 0.2 || pop >= 35}
                            {#snippet desktopRain(props: Record<string, unknown>)}
                                {@render rainBadge(props, "hidden min-[460px]:inline-flex")}
                            {/snippet}
                            {@render badgeHint(rainLines, desktopRain)}
                        {/if}
                        <ChevronRightIcon class="size-4 shrink-0 text-muted-foreground/60" />
                    </div>
                    <!-- Mobile meta line: keeps chips out of the bar row so
                         every track spans the same width and stays comparable -->
                    <div
                        class="col-span-full flex min-w-0 items-center gap-1.5 min-[460px]:hidden"
                    >
                        {#snippet mobileWind(props: Record<string, unknown>)}
                            {@render windBadge(props, "min-w-0 shrink", hasDayDir)}
                        {/snippet}
                        {@render badgeHint(windLines, mobileWind)}
                        {#if sum >= 0.2 || pop >= 35}
                            {#snippet mobileRain(props: Record<string, unknown>)}
                                {@render rainBadge(props, "ml-auto")}
                            {/snippet}
                            {@render badgeHint(rainLines, mobileRain)}
                        {/if}
                    </div>
                </div>
        {/each}
        </div>
    </Card.Root>
</section>

{#snippet daySwitcher()}
    <div class="no-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label={t("forecast_7d")}>
        {#each daily.time as day, i (day)}
            {@const w = describe(daily.weather_code[i], 1)}
            <Button
                variant={selected === i ? "secondary" : "ghost"}
                size="sm"
                role="tab"
                aria-selected={selected === i}
                class="h-auto min-w-11 flex-1 flex-col gap-0.5 px-1 py-1.5"
                onclick={() => (selected = i)}
            >
                <span class="text-xs">{i === 0 ? t("today") : fmtDayShort(day, tz, locale())}</span>
                <Icon name={w.icon} size={18} class={iconColor(w.icon)} />
                <span class="nums text-[11px]">{fmtTemp(days[i].max)}</span>
            </Button>
        {/each}
    </div>
{/snippet}

{#snippet detailTitle()}
    {@const day = daily.time[selected]}
    {selected === 0 ? t("today") : fmtDayLong(day, tz, locale())}
{/snippet}

{#snippet detailDescription()}
    {@const day = daily.time[selected]}
    {@const w = describe(daily.weather_code[selected], 1)}
    <span class="nums">{fmtDate(day, tz, locale())} · {t(w.labelKey)} · {fmtTemp(days[selected].max)} / {fmtTemp(days[selected].min)}</span>
{/snippet}

{#if isDesktop.current}
    <Dialog.Root bind:open={detailOpen}>
        <Dialog.Content class="max-h-[85vh] grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] gap-4 sm:max-w-2xl">
            {#if selected >= 0}
                <Dialog.Header>
                    <Dialog.Title>{@render detailTitle()}</Dialog.Title>
                    <Dialog.Description>{@render detailDescription()}</Dialog.Description>
                </Dialog.Header>
                {@render daySwitcher()}
                <div class="min-h-0 overflow-y-auto">
                    <DayDetail {data} index={selected} />
                </div>
            {/if}
        </Dialog.Content>
    </Dialog.Root>
{:else}
    <Drawer.Root bind:open={detailOpen}>
        <Drawer.Content class="max-h-[90dvh]!">
            {#if selected >= 0}
                <Drawer.Header class="text-left">
                    <Drawer.Title>{@render detailTitle()}</Drawer.Title>
                    <Drawer.Description>{@render detailDescription()}</Drawer.Description>
                </Drawer.Header>
                <div class="px-4 pb-2" data-vaul-no-drag>{@render daySwitcher()}</div>
                <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
                    <DayDetail {data} index={selected} />
                </div>
            {/if}
        </Drawer.Content>
    </Drawer.Root>
{/if}
