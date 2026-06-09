<script lang="ts">
    import Icon from "./Icon.svelte";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import NavigationIcon from "@lucide/svelte/icons/navigation";
    import CloudRainIcon from "@lucide/svelte/icons/cloud-rain";
    import * as Card from "$lib/components/ui/card";
    import * as Collapsible from "$lib/components/ui/collapsible";
    import { Separator } from "$lib/components/ui/separator";
    import { ScrollArea } from "$lib/components/ui/scroll-area";
    import { describe, iconColor } from "$lib/wmo";
    import {
        fmtTemp,
        fmtHour,
        fmtDayShort,
        fmtDate,
        fmtMm,
        isSameYMD,
        kmhToBeaufort,
    } from "$lib/format";
    import { t, locale } from "$lib/i18n.svelte";
    import type { WeatherData } from "$lib/weather";

    type Props = { data: WeatherData };
    let { data }: Props = $props();

    const tz = $derived(data.timezone as string);
    const daily = $derived(data.daily);
    const hourly = $derived(data.hourly);

    let openIdx = $state(0);

    const tempRange = $derived.by(() => {
        const mins = daily.temperature_2m_min as number[];
        const maxs = daily.temperature_2m_max as number[];
        const lo = Math.min(...mins);
        const hi = Math.max(...maxs);
        return { lo, hi, span: Math.max(1, hi - lo) };
    });

    function barStyle(min: number, max: number): string {
        const { lo, span } = tempRange;
        const left = ((min - lo) / span) * 100;
        const width = ((max - min) / span) * 100;
        return `left:${left}%;width:${Math.max(width, 4)}%`;
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

<section class="px-5 pb-8 lg:px-0 lg:pb-0 lg:h-full lg:min-h-0">
    <Card.Root
        size="sm"
        class="weather-card gap-0 rounded-lg py-0 lg:h-full lg:min-h-0 lg:overflow-hidden"
    >
        <Card.Header class="border-b border-border/70 px-3 pb-2.5! lg:shrink-0">
            <Card.Title class="section-title">
                {t("forecast_7d")}
            </Card.Title>
        </Card.Header>
        <div class="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {#each daily.time as day, i}
            {@const w = describe(daily.weather_code[i], 1)}
            {@const min = daily.temperature_2m_min[i]}
            {@const max = daily.temperature_2m_max[i]}
            {@const pop = daily.precipitation_probability_max?.[i] ?? 0}
            {@const sum = daily.precipitation_sum?.[i] ?? 0}
            {@const dayBf = kmhToBeaufort(daily.wind_speed_10m_max?.[i])}
            {@const dayDirDeg = daily.wind_direction_10m_dominant?.[i]}
            {@const hasDayDir = dayDirDeg != null}
            {@const isOpen = openIdx === i}
            {#if i > 0}<Separator />{/if}
            <Collapsible.Root
                open={isOpen}
                onOpenChange={(v) => (openIdx = v ? i : -1)}
            >
                <Collapsible.Trigger
                    class="grid min-h-[56px] w-full cursor-pointer select-none grid-cols-[52px_26px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-0 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 active:bg-muted/55 data-[state=open]:bg-muted/30 sm:grid-cols-[62px_28px_minmax(0,1fr)_auto] lg:grid-cols-[84px_28px_128px_minmax(0,1fr)_auto] lg:gap-3"
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
                        class="hidden truncate text-sm text-muted-foreground lg:block"
                    >
                        {t(w.labelKey)}
                    </div>
                    <div class="flex items-center gap-1.5 sm:gap-2">
                        <span
                            class="text-muted-foreground nums text-sm w-9 text-right"
                            >{fmtTemp(min)}</span
                        >
                        <span
                            class="block min-[360px]:hidden text-sm text-muted-foreground/70"
                            >–</span
                        >
                        <div
                            class="relative hidden min-[360px]:flex flex-1 h-1.5 rounded-full bg-muted overflow-hidden"
                        >
                            <span
                                class="absolute top-0 h-full rounded-full bg-linear-to-r from-rain via-accent to-warn"
                                style={barStyle(min, max)}
                            ></span>
                        </div>
                        <span class="nums text-sm w-9">{fmtTemp(max)}</span>
                    </div>
                    <div class="flex items-center justify-end gap-1.5 pl-0.5">
                        {#if hasDayDir}
                            <span
                                class="hidden items-center gap-1 whitespace-nowrap rounded-md bg-muted/55 px-1.5 py-0.5 text-[11px] text-muted-foreground nums min-[460px]:flex"
                            >
                                {dayBf} Bf
                                <span
                                    class="inline-flex"
                                    aria-label={t("wind")}
                                    title={t("wind")}
                                    style={`transform: rotate(${dayDirDeg ?? 0}deg);`}
                                >
                                    <NavigationIcon class="size-3" />
                                </span>
                            </span>
                        {/if}
                        {#if sum >= 0.2 || pop >= 35}
                            <span
                                class="flex items-center gap-0.5 whitespace-nowrap rounded-md bg-rain/10 px-1.5 py-0.5 text-[11px] text-rain nums"
                            >
                                <CloudRainIcon class="size-3" />
                                {rainLabel(sum, pop)}
                            </span>
                        {/if}
                        <ChevronDownIcon
                            class="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 {isOpen
                                ? 'rotate-180'
                                : ''}"
                        />
                    </div>
                </Collapsible.Trigger>

                <Collapsible.Content
                    class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
                >
                    {@const hours = hourlyForDay(day, i === 0)}
                    <div class="bg-muted/25 px-3 pb-3 pt-1.5">
                        <div class="grid grid-cols-2 gap-2 mb-2.5">
                            <div
                                class="weather-card rounded-md px-2.5 py-2 text-xs"
                            >
                                <span class="text-muted-foreground"
                                    >{t("precip")}
                                </span>
                                <span class="nums">{sum.toFixed(1)} mm</span>
                                <span class="text-muted-foreground">
                                    · {pop}%</span
                                >
                            </div>
                            <div
                                class="weather-card rounded-md px-2.5 py-2 text-xs"
                            >
                                <span class="text-muted-foreground"
                                    >{t("max_wind")}
                                </span>
                                <span class="nums">{dayBf} Bf</span>
                                {#if hasDayDir}
                                    <span
                                        class="text-muted-foreground inline-flex items-center"
                                    >
                                        ·
                                        <span
                                            class="inline-flex ml-1"
                                            style={`transform: rotate(${dayDirDeg ?? 0}deg);`}
                                        >
                                            <NavigationIcon class="size-3" />
                                        </span>
                                    </span>
                                {/if}
                                <span class="text-muted-foreground">
                                    · {t("bf." + dayBf)}</span
                                >
                            </div>
                        </div>
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
                                            <span
                                                class="text-[10px] text-rain nums leading-none"
                                                title={t("precip")}
                                                >{fmtMm(h.precip)}</span
                                            >
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
                </Collapsible.Content>
            </Collapsible.Root>
        {/each}
        </div>
    </Card.Root>
</section>
