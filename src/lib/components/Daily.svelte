<script lang="ts">
    import Icon from "./Icon.svelte";
    import { describe, iconColor } from "$lib/wmo";
    import {
        fmtTemp,
        fmtHour,
        fmtDayShort,
        fmtDate,
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

    let openIdx = $state(-1);

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

    function hourlyForDay(dayIso: string) {
        const out: any[] = [];
        for (let i = 0; i < hourly.time.length; i++) {
            if (isSameYMD(hourly.time[i], dayIso, tz)) {
                out.push({
                    time: hourly.time[i],
                    temp: hourly.temperature_2m[i],
                    code: hourly.weather_code[i],
                    isDay: hourly.is_day[i],
                    pop: hourly.precipitation_probability?.[i] ?? 0,
                    wind: hourly.wind_speed_10m?.[i] ?? 0,
                    humidity: hourly.relative_humidity_2m?.[i] ?? 0,
                });
            }
        }
        return out;
    }

    function toggle(i: number) {
        openIdx = openIdx === i ? -1 : i;
    }
</script>

<section class="px-5 pb-8">
    <h2 class="text-xs uppercase tracking-wider text-sub mb-2 px-1">
        {t("forecast_7d")}
    </h2>
    <div
        class="rounded-2xl bg-panel hairline divide-y divide-line overflow-hidden"
    >
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
            <div>
                <button
                    type="button"
                    class="w-full grid grid-cols-[56px_26px_minmax(0,1fr)_auto] sm:grid-cols-[88px_36px_minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-3 text-left hover:bg-panel2 transition"
                    onclick={() => toggle(i)}
                    aria-expanded={isOpen}
                >
                    <div>
                        <div class="text-[15px]">
                            {i === 0
                                ? t("today")
                                : fmtDayShort(day, tz, locale())}
                        </div>
                        <div class="text-[11px] text-mute nums">
                            {fmtDate(day, tz, locale())}
                        </div>
                    </div>
                    <Icon name={w.icon} size={26} class={iconColor(w.icon)} />
                    <div class="flex items-center gap-0.5 sm:gap-2">
                        <span class="text-sub nums text-sm w-9 text-right"
                            >{fmtTemp(min)}</span
                        >
                        <span class="block min-[400px]:hidden">-</span>
                        <div
                            class="relative hidden min-[400px]:flex flex-1 h-1.5 rounded-full bg-panel2 overflow-hidden"
                        >
                            <span
                                class="absolute top-0 h-full rounded-full bg-accent min-[400px]:bg-gradient-to-r min-[400px]:from-rain min-[400px]:via-accent min-[400px]:to-warn"
                                style={barStyle(min, max)}
                            ></span>
                        </div>
                        <span class="nums text-sm w-9">{fmtTemp(max)}</span>
                    </div>
                    <div class="flex items-center gap-1 sm:gap-2 sm:pl-1">
                        {#if hasDayDir}
                            <span
                                class="hidden min-[340px]:flex text-[11px] text-sub items-center gap-0.5 whitespace-nowrap"
                            >
                                {dayBf} Bf
                            </span>
                            <span
                                class="hidden min-[340px]:flex text-[11px] text-sub items-center whitespace-nowrap"
                                aria-label={t("wind")}
                                title={t("wind")}
                            >
                                <span
                                    class="inline-flex"
                                    style={`transform: rotate(${dayDirDeg ?? 0}deg);`}
                                >
                                    <Icon name="cursor" size={12} />
                                </span>
                            </span>
                        {/if}

                        {#if pop >= 10}
                            <span
                                class="text-[11px] text-rain nums flex items-center gap-0.5 whitespace-nowrap"
                            >
                                <Icon name="drizzle" size={12} />
                                {pop}%
                            </span>
                        {/if}
                        <Icon
                            name="chevron"
                            size={16}
                            class="text-mute transition-transform {isOpen
                                ? 'rotate-180'
                                : ''}"
                        />
                    </div>
                </button>

                {#if isOpen}
                    {@const hours = hourlyForDay(day)}
                    <div class="px-3 pb-4 pt-1 bg-panel2/40">
                        <div class="grid grid-cols-2 gap-2 mb-3">
                            <div
                                class="rounded-lg bg-panel hairline px-2.5 py-2 text-xs"
                            >
                                <span class="text-sub">{t("precip")} </span>
                                <span class="nums">{sum.toFixed(1)} mm</span>
                                <span class="text-sub"> · {pop}%</span>
                            </div>
                            <div
                                class="rounded-lg bg-panel hairline px-2.5 py-2 text-xs"
                            >
                                <span class="text-sub">{t("max_wind")} </span>
                                <span class="nums">{dayBf} Bf</span>
                                {#if hasDayDir}
                                    <span
                                        class="text-sub inline-flex items-center"
                                    >
                                        · <span
                                            class="inline-flex ml-1"
                                            style={`transform: rotate(${dayDirDeg ?? 0}deg);`}
                                            ><Icon
                                                name="cursor"
                                                size={11}
                                            /></span
                                        ></span
                                    >
                                {/if}
                                <span class="text-sub">
                                    · {t("bf." + dayBf)}</span
                                >
                            </div>
                        </div>
                        <div class="overflow-x-auto no-scrollbar">
                            <ul class="flex gap-1 min-w-max">
                                {#each hours as h}
                                    {@const hw = describe(h.code, h.isDay)}
                                    {@const hbf = kmhToBeaufort(h.wind)}
                                    <li
                                        class="flex flex-col items-center gap-1 px-2.5 py-1 min-w-[56px]"
                                    >
                                        <span class="text-[11px] text-sub nums"
                                            >{fmtHour(
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
                                        {#if h.pop >= 20}
                                            <span
                                                class="text-[10px] text-rain nums leading-none"
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
                                            class="text-[10px] text-mute nums leading-none"
                                            >{hbf} Bf</span
                                        >
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</section>
