<script lang="ts">
  import MapPinIcon from '@lucide/svelte/icons/map-pin';
  import StarIcon from '@lucide/svelte/icons/star';
  import { Button } from '#lib/components/ui/button/index.js';
  import * as Tooltip from '#lib/components/ui/tooltip/index.js';
  import { describe } from '#lib/wmo.js';
  import { fmtTemp } from '#lib/format.js';
  import { t } from '#lib/i18n.svelte.js';
  import { todayHighLow, type Location, type WeatherData } from '#lib/weather.js';

  type Props = { data: WeatherData; place: Location | null; saved?: boolean; onToggleSave?: () => void };
  let { data, place, saved = false, onToggleSave }: Props = $props();

  const c = $derived(data.current);
  const highLow = $derived(todayHighLow(data));
  const w = $derived(describe(c.weather_code, c.is_day));
  const placeTitle = $derived(place?.shortName || place?.name || '—');
  const placeDetail = $derived(place?.name && place?.shortName && place.name !== place.shortName ? place.name : '');
</script>

<section class="relative px-5 pt-1 pb-4 text-center [text-shadow:0_1px_14px_rgb(0_0_0/0.4)] lg:pb-3">
  {#if place && onToggleSave}
    <div class="absolute top-1 right-5">
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="outline"
              size="sm"
              onclick={onToggleSave}
              aria-pressed={saved}
              aria-label={t(saved ? 'places.saved' : 'places.save')}
              class="pressable size-9 shrink-0 gap-1.5 bg-card px-0 [text-shadow:none] sm:w-auto sm:px-3 {saved ? 'border-accent/30 bg-accent/15 text-accent hover:bg-accent/20 hover:text-accent' : 'text-muted-foreground'}"
            >
              <StarIcon class="size-4 {saved ? 'fill-accent' : ''}" />
              <span class="hidden sm:inline">{t(saved ? 'places.saved' : 'places.save')}</span>
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>{t(saved ? 'places.saved' : 'places.save')}</Tooltip.Content>
      </Tooltip.Root>
    </div>
  {/if}

  <div class="mx-auto flex max-w-[calc(100%-5.5rem)] items-center justify-center gap-1.5 sm:max-w-[calc(100%-14rem)]">
    <MapPinIcon class="size-4.5 shrink-0 text-accent" />
    <h1 class="min-w-0 text-balance wrap-break-word text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
      {placeTitle}
    </h1>
  </div>
  {#if placeDetail}
    <p class="mx-auto mt-0.5 max-w-[calc(100%-5.5rem)] truncate text-sm text-muted-foreground sm:max-w-[calc(100%-14rem)]">{placeDetail}</p>
  {/if}

  <div class="nums mt-1 text-[96px] font-extralight leading-none tracking-tight text-foreground sm:text-[104px]">
    {fmtTemp(c.temperature_2m)}
  </div>
  <div class="mt-1 text-lg font-medium text-foreground">{t(w.labelKey)}</div>
  <div class="mt-0.5 flex items-center justify-center gap-3 text-base text-foreground/90">
    <span>{t('high_short')} <span class="nums">{fmtTemp(highLow.high)}</span></span>
    <span>{t('low_short')} <span class="nums">{fmtTemp(highLow.low)}</span></span>
  </div>
</section>
