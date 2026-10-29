<script lang="ts">
    import Icon from "./Icon.svelte";
    import PrecipChart from "./PrecipChart.svelte";
    import TempChart from "./TempChart.svelte";
    import WindChart from "./WindChart.svelte";
    import * as Tabs from "#lib/components/ui/tabs/index.js";
    import { describe, iconColor } from "#lib/wmo.js";
    import { fmtTemp, fmtHour, fmtMm, isSameYMD, kmhToBeaufort } from "#lib/format.js";
    import { t, locale } from "#lib/i18n.svelte.js";
    import { daySummary, type SummaryLine } from "#lib/daySummary.js";
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
                },
            ];
        }),
    );

    const iconHours = $derived(hours.filter((_, i) => i % 3 === 0));

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

{#snippet source(label: string)}
    <div class="text-[11px] text-muted-foreground/70">{label}</div>
{/snippet}

{#snippet fact(label: string, value: string, note = "")}
    <div>
        <dt class="text-muted-foreground">{label}</dt>
        <dd class="nums text-sm">{value}</dd>
        {#if note}<dd class="nums text-muted-foreground">{note}</dd>{/if}
    </div>
{/snippet}

<div class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 p-0.5 text-xs">
    <Tabs.Root bind:value={metric}>
        <Tabs.List class="w-full">
            <Tabs.Trigger value="temp">{t("temp_trend")}</Tabs.Trigger>
            <Tabs.Trigger value="rain">{t("precip")}</Tabs.Trigger>
            <Tabs.Trigger value="wind">{t("wind")}</Tabs.Trigger>
        </Tabs.List>

        <section class="weather-card rounded-md px-2.5 py-2" data-vaul-no-drag>
            <ol class="mb-1 flex justify-between pl-6" aria-hidden="true">
                {#each iconHours as h (h.time)}
                    {@const hw = describe(h.code, h.isDay)}
                    <li class="flex flex-col items-center gap-0.5">
                        <Icon name={hw.icon} size={18} class={iconColor(hw.icon)} />
                        <span class="nums text-[10px] text-muted-foreground">{fmtHour(h.time, tz, locale())}</span>
                    </li>
                {/each}
            </ol>

            <Tabs.Content value="temp">
                {#if metric === "temp" && hours.length > 1}<TempChart {hours} {tz} />{/if}
                <dl class="mt-2 grid grid-cols-2 gap-2">
                    {@render fact(t("day.high"), fmtTemp(forecast.max))}
                    {@render fact(t("day.low"), fmtTemp(forecast.min))}
                </dl>
                {#if tempSpread}{@render source(t("consensus.models", { count: tempSpread.models }))}{/if}
            </Tabs.Content>

            <Tabs.Content value="rain">
                {#if metric === "rain"}<PrecipChart {hours} {tz} />{/if}
                <dl class="mt-2 grid grid-cols-2 gap-2">
                    {@render fact(
                        t("day_total"),
                        fmtMm(forecast.sum),
                        sumSpread
                            ? t("consensus.range", { low: fmtMm(sumSpread.low), high: fmtMm(sumSpread.high) })
                            : "",
                    )}
                    {@render fact(t("precip"), t("rain_chance", { pop }), t("source.best_match"))}
                </dl>
                {#if sumSpread}{@render source(t("consensus.models", { count: sumSpread.models }))}{/if}
            </Tabs.Content>

            <Tabs.Content value="wind">
                {#if metric === "wind"}<WindChart {hours} {tz} />{/if}
                <dl class="mt-2 grid grid-cols-2 gap-2">
                    {@render fact(t("max_wind"), `${bf} Bf · ${t("bf." + bf)}`)}
                    {#if Number.isFinite(forecast.gusts)}
                        {@render fact(t("day.gusts"), `${Math.round(forecast.gusts)} km/h`)}
                    {/if}
                </dl>
                {#if windSpread}{@render source(t("consensus.models", { count: windSpread.models }))}{/if}
            </Tabs.Content>
        </section>
    </Tabs.Root>

    <section class="weather-card rounded-md px-2.5 py-2">
        <h3 class="mb-1 text-muted-foreground">{t("day.summary")}</h3>
        {#each summary as line (line.kind)}
            <p class="text-sm">{sentence(line)}</p>
        {/each}
    </section>
</div>
