<script lang="ts">
    import Icon from "./Icon.svelte";
    import PrecipChart from "./PrecipChart.svelte";
    import TempChart from "./TempChart.svelte";
    import { tempGradient } from "#lib/tempScale.js";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import NavigationIcon from "@lucide/svelte/icons/navigation";
    import WindIcon from "@lucide/svelte/icons/wind";
    import CloudRainIcon from "@lucide/svelte/icons/cloud-rain";
    import * as Card from "#lib/components/ui/card/index.js";
    import { Badge } from "#lib/components/ui/badge/index.js";
    import * as Collapsible from "#lib/components/ui/collapsible/index.js";
    import { Separator } from "#lib/components/ui/separator/index.js";
    import { ScrollArea } from "#lib/components/ui/scroll-area/index.js";
    import * as Tooltip from "#lib/components/ui/tooltip/index.js";
    import type { Snippet } from "svelte";
    import * as Popover from "#lib/components/ui/popover/index.js";
    import { Button } from "#lib/components/ui/button/index.js";
    import InfoIcon from "@lucide/svelte/icons/info";
    import { describe, iconColor } from "#lib/wmo.js";
    import {
        fmtTemp,
        fmtHour,
        fmtDayShort,
        fmtDate,
        fmtMm,
        isSameYMD,
        kmhToBeaufort,
    } from "#lib/format.js";
    import { t, locale } from "#lib/i18n.svelte.js";
    import { CONSENSUS_MODELS, dayForecast, type ConsensusVariable, type Spread, type WeatherData } from "#lib/weather.js";

    type Props = { data: WeatherData };
    let { data }: Props = $props();

    const tz = $derived(data.timezone as string);
    const daily = $derived(data.daily);
    const hourly = $derived(data.hourly);

    let openIdx = $state(-1);
    let closingIdx = $state(-1);

    function setOpen(i: number, open: boolean) {
        if (openIdx >= 0 && (open || openIdx === i)) closingIdx = openIdx;
        openIdx = open ? i : -1;
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

    const hasHourlyMedians = $derived(!!data.consensus?.hourly);

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


    function cell(i: number, now = false, dayBreak = "") {
        return {
            time: hourly.time[i],
            temp: hourly.temperature_2m[i],
            code: hourly.weather_code[i],
            isDay: hourly.is_day[i],
            pop: hourly.precipitation_probability?.[i] ?? 0,
            precip: hourly.precipitation?.[i] ?? 0,
            wind: hourly.wind_speed_10m?.[i] ?? 0,
            now,
            dayBreak,
        };
    }

    function hourlyForDay(dayIso: string, isToday = false) {
        const out: any[] = [];

        if (isToday) {
            // Roll forward from the current hour through the next 24h so the
            // strip never dead-ends at midnight; flag where tomorrow begins.
            const cutoff = Date.now() - 60 * 60 * 1000; // keep the in-progress hour
            let prev = "";
            for (let i = 0; i < hourly.time.length && out.length < 24; i++) {
                if (new Date(hourly.time[i]).getTime() < cutoff) continue;
                const dayBreak =
                    prev && !isSameYMD(prev, hourly.time[i], tz)
                        ? fmtDayShort(hourly.time[i], tz, locale())
                        : "";
                out.push(cell(i, out.length === 0, dayBreak));
                prev = hourly.time[i];
            }
            return out;
        }

        for (let i = 0; i < hourly.time.length; i++) {
            if (isSameYMD(hourly.time[i], dayIso, tz)) out.push(cell(i));
        }
        return out;
    }
</script>

{#snippet badgeTooltip(lines: string[], badge: Snippet<[Record<string, unknown>]>)}
    <Tooltip.Root>
        <Tooltip.Trigger tabindex={-1}>
            {#snippet child({ props })}
                {@render badge(props)}
            {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>
            <div class="flex flex-col gap-0.5">
                {#each lines as line (line)}<span>{line}</span>{/each}
            </div>
        </Tooltip.Content>
    </Tooltip.Root>
{/snippet}

{#snippet source(label: string)}
    <div class="text-[11px] text-muted-foreground/70">{label}</div>
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
            {@const isOpen = openIdx === i}
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
                    {rainDisagrees(sumSpread) ? fmtMm(sum) : rainLabel(sum, pop)}
                    {#if rainDisagrees(sumSpread)}
                        <span class="font-normal text-rain/60"
                            >{Math.round(sumSpread!.low)}–{Math.round(sumSpread!.high)}</span
                        >
                    {/if}
                </Badge>
            {/snippet}
            {#if i > 0}<Separator />{/if}
            <Collapsible.Root
                open={isOpen}
                onOpenChange={(v) => setOpen(i, v)}
            >
                <Collapsible.Trigger
                    class="grid w-full cursor-pointer select-none grid-cols-[52px_26px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 active:bg-muted/55 data-[state=open]:bg-muted/30 min-[460px]:min-h-[56px] min-[460px]:py-0 sm:grid-cols-[62px_28px_minmax(0,1fr)_auto] lg:grid-cols-[84px_28px_minmax(0,1fr)_auto] lg:gap-3 xl:grid-cols-[84px_28px_128px_minmax(0,1fr)_auto]"
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
                            {@render badgeTooltip(windLines, desktopWind)}
                        {/if}
                        {#if sum >= 0.2 || pop >= 35}
                            {#snippet desktopRain(props: Record<string, unknown>)}
                                {@render rainBadge(props, "hidden min-[460px]:inline-flex")}
                            {/snippet}
                            {@render badgeTooltip(rainLines, desktopRain)}
                        {/if}
                        <ChevronDownIcon
                            class="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 {isOpen
                                ? 'rotate-180'
                                : ''}"
                        />
                    </div>
                    <!-- Mobile meta line: keeps chips out of the bar row so
                         every track spans the same width and stays comparable -->
                    <div
                        class="col-span-full flex min-w-0 items-center gap-1.5 min-[460px]:hidden"
                    >
                        {#snippet mobileWind(props: Record<string, unknown>)}
                            {@render windBadge(props, "min-w-0 shrink", hasDayDir)}
                        {/snippet}
                        {@render badgeTooltip(windLines, mobileWind)}
                        {#if sum >= 0.2 || pop >= 35}
                            {#snippet mobileRain(props: Record<string, unknown>)}
                                {@render rainBadge(props, "ml-auto")}
                            {/snippet}
                            {@render badgeTooltip(rainLines, mobileRain)}
                        {/if}
                    </div>
                </Collapsible.Trigger>

                <Collapsible.Content
                    class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
                    onanimationend={() => {
                        if (!isOpen && closingIdx === i) closingIdx = -1;
                    }}
                >
                    {#if isOpen || closingIdx === i}
                    {@const hours = hourlyForDay(day, i === 0)}
                    <div class="bg-muted/25 px-3 pb-3 pt-1.5">
                        <div
                            class="grid grid-cols-1 gap-2 mb-2.5 min-[460px]:grid-cols-2"
                        >
                            <div
                                class="weather-card rounded-md px-2.5 py-2 text-xs"
                            >
                                <span class="text-muted-foreground"
                                    >{t("day_total")}
                                </span>
                                <span class="nums">{sum.toFixed(1)} mm</span>
                                {#if sumSpread}
                                    {@render source(t("consensus.models", { count: sumSpread.models }))}
                                {/if}
                                <div class="nums mt-1.5 text-muted-foreground">
                                    {t("rain_chance", { pop })}
                                </div>
                                {@render source(t("source.best_match"))}
                            </div>
                            <div
                                class="weather-card rounded-md px-2.5 py-2 text-xs"
                            >
                                <span class="text-muted-foreground"
                                    >{t("max_wind")}
                                </span>
                                <span class="nums">{dayBf} Bf</span>
                                <span class="text-muted-foreground">
                                    · {t("bf." + dayBf)}</span
                                >
                                {#if Number.isFinite(gusts)}
                                    <span class="nums text-muted-foreground">
                                        · {t("gusts", { speed: `${Math.round(gusts)} km/h` })}</span
                                    >
                                {/if}
                                {#if windSpread}
                                    {@render source(t("consensus.models", { count: windSpread.models }))}
                                {/if}
                            </div>
                        </div>
                        {#if hours.length > 1}
                            <div
                                class="weather-card mb-2.5 rounded-md px-2.5 py-2 text-xs"
                            >
                                <span class="text-muted-foreground"
                                    >{t("temp_trend")}</span
                                >
                                {#if hasHourlyMedians && models >= 2}
                                    {@render source(t("consensus.models", { count: models }))}
                                {/if}
                                <TempChart {hours} {tz} />
                            </div>
                        {/if}
                        {#if hours.some((h) => h.precip >= 0.1)}
                            <div
                                class="weather-card mb-2.5 rounded-md px-2.5 py-2 text-xs"
                            >
                                <span class="text-muted-foreground"
                                    >{t("precip")}</span
                                >
                                {@render source(t("source.best_match"))}
                                <PrecipChart {hours} {tz} />
                            </div>
                        {/if}
                        <ScrollArea
                            orientation="horizontal"
                            class="w-full"
                            scrollbarXClasses="h-1.5"
                        >
                            <ul class="flex gap-1 min-w-max">
                                {#each hours as h}
                                    {@const hw = describe(h.code, h.isDay)}
                                    {@const hbf = kmhToBeaufort(h.wind)}
                                    <li
                                        class="flex flex-col items-center gap-1 px-2.5 py-1 min-w-[56px] {h.now
                                            ? 'rounded-md bg-muted/40'
                                            : ''} {h.dayBreak
                                            ? 'ml-2 border-l border-border/70 pl-3.5'
                                            : ''}"
                                    >
                                        <span
                                            class="text-[11px] nums {h.dayBreak
                                                ? 'font-medium text-foreground'
                                                : 'text-muted-foreground'}"
                                            >{h.now
                                                ? t("now")
                                                : h.dayBreak
                                                  ? h.dayBreak
                                                  : fmtHour(
                                                        h.time,
                                                        tz,
                                                        locale(),
                                                    )}</span
                                        >
                                        <Icon
                                            name={hw.icon}
                                            size={20}
                                            class={iconColor(hw.icon)}
                                        />
                                        {#if h.precip > 0}
                                            <Tooltip.Root>
                                                <Tooltip.Trigger tabindex={-1}>
                                                    {#snippet child({ props })}
                                                        <span
                                                            {...props}
                                                            class="text-[10px] text-rain nums leading-none"
                                                            >{fmtMm(h.precip)}</span
                                                        >
                                                    {/snippet}
                                                </Tooltip.Trigger>
                                                <Tooltip.Content>{t("precip")}</Tooltip.Content>
                                            </Tooltip.Root>
                                        {:else if h.pop >= 20}
                                            <span
                                                class="text-[10px] text-rain/70 nums leading-none"
                                                >{h.pop}%</span
                                            >
                                        {:else}
                                            <span
                                                class="text-[10px] leading-none"
                                                >&nbsp;</span
                                            >
                                        {/if}
                                        <span class="text-xs nums"
                                            >{fmtTemp(h.temp)}</span
                                        >
                                        <span
                                            class="text-[10px] text-muted-foreground/70 nums leading-none"
                                            >{hbf} Bf</span
                                        >
                                    </li>
                                {/each}
                            </ul>
                        </ScrollArea>
                    </div>
                    {/if}
                </Collapsible.Content>
            </Collapsible.Root>
        {/each}
        </div>
    </Card.Root>
</section>
