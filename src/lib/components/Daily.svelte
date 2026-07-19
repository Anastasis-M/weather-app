<script lang="ts">
    import Icon from "./Icon.svelte";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import NavigationIcon from "@lucide/svelte/icons/navigation";
    import CloudRainIcon from "@lucide/svelte/icons/cloud-rain";
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
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

    // Absolute temperature → color scale (°C), so bar colors mean the same
    // thing in any city or season instead of restating the weekly min/max.
    const TEMP_STOPS: [number, number, number, number][] = [
        [-15, 0x81, 0x8c, 0xf8], // indigo — severe cold
        [0, 0x60, 0xa5, 0xfa], // blue — freezing (matches --color-rain)
        [8, 0x2d, 0xd4, 0xbf], // teal — chilly
        [16, 0xa3, 0xe6, 0x35], // lime — mild
        [24, 0xfb, 0xbf, 0x24], // amber — warm (matches --color-accent)
        [32, 0xf9, 0x73, 0x16], // orange — hot
        [40, 0xef, 0x44, 0x44], // red — extreme heat
    ];

    function tempColor(t: number): string {
        const s = TEMP_STOPS;
        if (t <= s[0][0]) return rgb(s[0]);
        for (let i = 1; i < s.length; i++) {
            if (t <= s[i][0]) {
                const [t0, ...a] = s[i - 1];
                const [t1, ...b] = s[i];
                const k = (t - t0) / (t1 - t0);
                return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(",")})`;
            }
        }
        return rgb(s[s.length - 1]);
    }

    function rgb([, r, g, b]: [number, number, number, number]): string {
        return `rgb(${r},${g},${b})`;
    }

    // Gradient stops for a min→max span: endpoints plus any scale anchors
    // the span crosses, each placed proportionally so e.g. 16°C is lime at
    // the exact point of the bar where 16°C falls.
    function tempGradient(min: number, max: number, dir = "90deg"): string {
        const stops = [`${tempColor(min)} 0%`];
        if (max > min) {
            for (const [t] of TEMP_STOPS) {
                if (t > min && t < max) {
                    stops.push(
                        `${tempColor(t)} ${(((t - min) / (max - min)) * 100).toFixed(1)}%`,
                    );
                }
            }
        }
        stops.push(`${tempColor(max)} 100%`);
        return `linear-gradient(${dir},${stops.join(",")})`;
    }

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

    // Sparkline of the expanded day's hourly temps, colored by the same
    // absolute temperature scale as the range bars. y is normalized to the
    // shown window's own min/max so the shape stays readable on flat days.
    function sparkline(hs: { temp: number }[]) {
        const temps = hs.map((h) => h.temp);
        const lo = Math.min(...temps);
        const hi = Math.max(...temps);
        const span = Math.max(1, hi - lo);
        const pts = temps
            .map(
                (t, j) =>
                    `${((j / (temps.length - 1)) * 100).toFixed(2)},${(29 - ((t - lo) / span) * 28).toFixed(2)}`,
            )
            .join(" ");
        const stops = temps.map((t, j) => ({
            offset: ((j / (temps.length - 1)) * 100).toFixed(1),
            color: tempColor(t),
        }));
        return { pts, stops, lo, hi };
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

<section class="px-5 pb-8 lg:px-0 lg:pb-0 lg:flex lg:min-h-0 lg:flex-col">
    <Card.Root
        size="sm"
        class="weather-card gap-0 rounded-lg py-0 lg:min-h-0 lg:overflow-hidden"
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
                    class="grid w-full cursor-pointer select-none grid-cols-[52px_26px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 active:bg-muted/55 data-[state=open]:bg-muted/30 min-[460px]:min-h-[56px] min-[460px]:py-0 sm:grid-cols-[62px_28px_minmax(0,1fr)_auto] lg:grid-cols-[84px_28px_128px_minmax(0,1fr)_auto] lg:gap-3"
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
                        <div
                            class="relative flex flex-1 h-1.5 rounded-full bg-muted"
                        >
                            <span
                                class="absolute top-0 h-full rounded-full"
                                style={barStyle(min, max)}
                            ></span>
                            {#if i === 0}
                                <span
                                    class="absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_var(--card)]"
                                    style={nowDotStyle(min, max)}
                                ></span>
                            {/if}
                        </div>
                        <span class="nums text-sm w-9">{fmtTemp(max)}</span>
                    </div>
                    <div class="flex items-center justify-end gap-1.5 pl-0.5">
                        {#if hasDayDir}
                            <Badge
                                variant="secondary"
                                class="nums hidden text-muted-foreground min-[460px]:inline-flex"
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
                            </Badge>
                        {/if}
                        {#if sum >= 0.2 || pop >= 35}
                            <Badge
                                class="nums hidden bg-rain/10 text-rain min-[460px]:inline-flex"
                            >
                                <CloudRainIcon />
                                {rainLabel(sum, pop)}
                            </Badge>
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
                        <Badge
                            variant="secondary"
                            class="nums text-muted-foreground"
                        >
                            {dayBf} Bf
                            {#if hasDayDir}
                                <span
                                    class="inline-flex"
                                    aria-label={t("wind")}
                                    style={`transform: rotate(${dayDirDeg ?? 0}deg);`}
                                >
                                    <NavigationIcon class="size-3" />
                                </span>
                            {/if}
                        </Badge>
                        <span
                            class="truncate text-[11px] text-muted-foreground/70"
                            >{t("bf." + dayBf)}</span
                        >
                        {#if sum >= 0.2 || pop >= 35}
                            <Badge class="nums ml-auto bg-rain/10 text-rain">
                                <CloudRainIcon />
                                {rainLabel(sum, pop)}
                            </Badge>
                        {/if}
                    </div>
                </Collapsible.Trigger>

                <Collapsible.Content
                    class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
                >
                    {@const hours = hourlyForDay(day, i === 0)}
                    <div class="bg-muted/25 px-3 pb-3 pt-1.5">
                        <div
                            class="grid grid-cols-1 gap-2 mb-2.5 min-[460px]:grid-cols-2"
                        >
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
                                class="weather-card hidden rounded-md px-2.5 py-2 text-xs min-[460px]:block"
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
                        {#if hours.length > 1}
                            {@const sp = sparkline(hours)}
                            <div
                                class="weather-card mb-2.5 rounded-md px-2.5 py-2 text-xs"
                            >
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground"
                                        >{t("temp_trend")}</span
                                    >
                                    <span class="nums text-muted-foreground"
                                        >{fmtTemp(sp.lo)} – {fmtTemp(
                                            sp.hi,
                                        )}</span
                                    >
                                </div>
                                <svg
                                    viewBox="0 0 100 30"
                                    preserveAspectRatio="none"
                                    class="mt-1 h-10 w-full"
                                    aria-hidden="true"
                                >
                                    <defs>
                                        <linearGradient
                                            id="tg-{i}"
                                            x1="0"
                                            y1="0"
                                            x2="1"
                                            y2="0"
                                        >
                                            {#each sp.stops as s}
                                                <stop
                                                    offset="{s.offset}%"
                                                    stop-color={s.color}
                                                />
                                            {/each}
                                        </linearGradient>
                                    </defs>
                                    <polyline
                                        points={sp.pts}
                                        fill="none"
                                        stroke="url(#tg-{i})"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        vector-effect="non-scaling-stroke"
                                    />
                                </svg>
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
