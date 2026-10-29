<script lang="ts">
    import Icon from "./Icon.svelte";
    import PrecipChart from "./PrecipChart.svelte";
    import TempChart from "./TempChart.svelte";
    import WindChart from "./WindChart.svelte";
    import * as Tabs from "#lib/components/ui/tabs/index.js";
    import ThermometerIcon from "@lucide/svelte/icons/thermometer";
    import UmbrellaIcon from "@lucide/svelte/icons/umbrella";
    import CloudDrizzleIcon from "@lucide/svelte/icons/cloud-drizzle";
    import SunIcon from "@lucide/svelte/icons/sun";
    import WindIcon from "@lucide/svelte/icons/wind";
    import { describe, iconColor } from "#lib/wmo.js";
    import { fmtTemp, fmtMm, isSameYMD, kmhToBeaufort } from "#lib/format.js";
    import { t, locale } from "#lib/i18n.svelte.js";
    import { daySummary, type SummaryLine } from "#lib/daySummary.js";
    import { WIND_MEDIAN, WIND_STRONGEST } from "#lib/dayChart.svelte.js";
    import type { Component } from "svelte";
    import { dayForecast, type Spread, type WeatherData } from "#lib/weather.js";

    type Metric = "temp" | "rain" | "wind";
    type Props = { data: WeatherData; index: number };
    let { data, index }: Props = $props();

    let metric = $state<Metric>("temp");

    const tz = $derived(data.timezone as string);
    const hourly = $derived(data.hourly);
    const day = $derived(data.daily.time[index] as string);
    const forecast = $derived(dayForecast(data, index));
    const pop = $derived(data.daily.precipitation_probability_max?.[index] ?? 0);
    const bf = $derived(kmhToBeaufort(forecast.wind));
    const sumSpread = $derived<Spread | null>(data.consensus?.precipitation_sum?.[day] ?? null);
    const windSpread = $derived<Spread | null>(data.consensus?.wind_speed_10m_max?.[day] ?? null);
    const tempSpread = $derived<Spread | null>(data.consensus?.temperature_2m_max?.[day] ?? null);

    const hours = $derived(
        (hourly.time as string[]).flatMap((time, i) => {
            if (!isSameYMD(time, day, tz)) return [];
            const precip = hourly.precipitation?.[i] ?? 0;
            return [
                {
                    time,
                    temp: hourly.temperature_2m[i],
                    code: hourly.weather_code[i],
                    isDay: hourly.is_day[i],
                    pop: hourly.precipitation_probability?.[i] ?? 0,
                    precip,
                    precipHigh: data.consensus?.hourly?.precipitation?.[time]?.high ?? precip,
                    wind: hourly.wind_speed_10m?.[i] ?? 0,
                    windHigh: data.consensus?.hourly?.wind_speed_10m?.[time]?.high ?? hourly.wind_speed_10m?.[i] ?? 0,
                },
            ];
        }),
    );

    const ICON_EVERY = 3;

    const LOOK: Record<SummaryLine["kind"], { icon: Component; tone: string; bg: string }> = {
        temp: { icon: ThermometerIcon, tone: "text-warn", bg: "bg-warn/10" },
        rain: { icon: UmbrellaIcon, tone: "text-rain", bg: "bg-rain/10" },
        rain_possible: { icon: CloudDrizzleIcon, tone: "text-rain", bg: "bg-rain/10" },
        chance: { icon: CloudDrizzleIcon, tone: "text-rain", bg: "bg-rain/10" },
        dry: { icon: SunIcon, tone: "text-ok", bg: "bg-ok/10" },
        wind: { icon: WindIcon, tone: "text-sub", bg: "bg-sub/10" },
    };

    const summary = $derived(
        daySummary(hours, { ...forecast, wettestModelSum: sumSpread?.high ?? null }),
    );

    function sentence(line: SummaryLine): string {
        switch (line.kind) {
            case "temp":
                return t("summary.temp", { max: fmtTemp(line.max), at: line.at, min: fmtTemp(line.min) });
            case "rain":
                return t("summary.rain", { from: line.from, to: line.to, mm: fmtMm(line.mm) });
            case "rain_possible":
                return t("summary.rain_possible", { mm: fmtMm(line.mm) });
            case "chance":
                return t("summary.chance", { pop: line.pop });
            case "dry":
                return t("summary.dry");
            case "wind":
                return t("summary.wind", { bf: line.bf, gusts: `${Math.round(line.gusts)} km/h` });
        }
    }
</script>

{#snippet fact(label: string, value: string, notes: string[] = [])}
    <div class="min-w-0">
        <dt class="text-xs text-muted-foreground">{label}</dt>
        <dd class="nums mt-0.5 text-xl font-semibold leading-tight">{value}</dd>
        {#each notes.filter(Boolean) as note (note)}
            <dd class="nums mt-0.5 text-xs text-muted-foreground">{note}</dd>
        {/each}
    </div>
{/snippet}

{#snippet swatch(color: string, label: string)}
    <span class="flex items-center gap-1.5">
        <span class="size-2.5 rounded-[2px]" style="background:{color}"></span>{label}
    </span>
{/snippet}

<div class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 p-0.5 text-sm">
    <Tabs.Root bind:value={metric} class="gap-3">
        <Tabs.List class="w-full">
            <Tabs.Trigger value="temp">{t("temp_trend")}</Tabs.Trigger>
            <Tabs.Trigger value="rain">{t("precip")}</Tabs.Trigger>
            <Tabs.Trigger value="wind">{t("wind")}</Tabs.Trigger>
        </Tabs.List>

        <section class="weather-card rounded-lg p-3" data-vaul-no-drag>
            <ol
                class="mb-1 grid pr-1 pl-5"
                style="grid-template-columns: repeat({hours.length}, minmax(0, 1fr))"
                aria-hidden="true"
            >
                {#each hours as h, i (h.time)}
                    <li class="flex justify-center">
                        {#if i % ICON_EVERY === 0}
                            {@const hw = describe(h.code, h.isDay)}
                            <Icon name={hw.icon} size={20} class="shrink-0 {iconColor(hw.icon)}" />
                        {/if}
                    </li>
                {/each}
            </ol>

            <Tabs.Content value="temp">
                {#if metric === "temp" && hours.length > 1}<TempChart {hours} {tz} />{/if}
                <dl class="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                    {@render fact(t("day.high"), fmtTemp(forecast.max), [
                        tempSpread ? t("consensus.models", { count: tempSpread.models }) : "",
                    ])}
                    {@render fact(t("day.low"), fmtTemp(forecast.min))}
                </dl>
            </Tabs.Content>

            <Tabs.Content value="rain">
                {#if metric === "rain"}<PrecipChart {hours} {tz} />{/if}
                <div class="mt-1.5 flex justify-end gap-3 text-[11px] text-muted-foreground">
                    {@render swatch("var(--color-rain)", t("chart.median"))}
                    {@render swatch("color-mix(in oklab, var(--color-rain) 30%, transparent)", t("precip.wettest_model"))}
                </div>
                <dl class="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                    {@render fact(t("day_total"), fmtMm(forecast.sum), [
                        sumSpread ? t("consensus.range", { low: fmtMm(sumSpread.low), high: fmtMm(sumSpread.high) }) : "",
                        sumSpread ? t("consensus.models", { count: sumSpread.models }) : "",
                    ])}
                    {@render fact(t("day.chance"), `${pop}%`, [t("source.best_match")])}
                </dl>
            </Tabs.Content>

            <Tabs.Content value="wind">
                {#if metric === "wind"}<WindChart {hours} {tz} />{/if}
                <div class="mt-1.5 flex justify-end gap-3 text-[11px] text-muted-foreground">
                    {@render swatch(WIND_MEDIAN, t("chart.median"))}
                    {@render swatch(WIND_STRONGEST, t("wind.strongest_model"))}
                </div>
                <dl class="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                    {@render fact(t("max_wind"), `${bf} Bf`, [
                        t("bf." + bf),
                        windSpread ? t("consensus.models", { count: windSpread.models }) : "",
                    ])}
                    {#if Number.isFinite(forecast.gusts)}
                        {@render fact(t("day.gusts"), `${Math.round(forecast.gusts)} km/h`)}
                    {/if}
                </dl>
            </Tabs.Content>
        </section>
    </Tabs.Root>

    <section class="weather-card rounded-lg p-3">
        <h3 class="section-title mb-2.5">{t("day.summary")}</h3>
        <ul class="flex flex-col gap-2.5">
            {#each summary as line (line.kind)}
                {@const look = LOOK[line.kind]}
                <li class="flex items-center gap-3">
                    <div class="grid size-8 shrink-0 place-items-center rounded-md {look.bg}">
                        <look.icon class="size-4.5 {look.tone}" />
                    </div>
                    <p class="min-w-0 text-[13px] leading-snug">{sentence(line)}</p>
                </li>
            {/each}
        </ul>
    </section>
</div>
