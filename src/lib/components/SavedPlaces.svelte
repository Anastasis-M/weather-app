<script lang="ts">
  import Icon from './Icon.svelte';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import StarIcon from '@lucide/svelte/icons/star';
  import HouseIcon from '@lucide/svelte/icons/house';
  import NavigationIcon from '@lucide/svelte/icons/navigation';
  import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import XIcon from '@lucide/svelte/icons/x';
  import ManagePlaces from './ManagePlaces.svelte';
  import { Skeleton } from '#lib/components/ui/skeleton/index.js';
  import { describe, iconColor } from '#lib/wmo.js';
  import { fmtAge, fmtTemp } from '#lib/format.js';
  import { t, locale } from '#lib/i18n.svelte.js';
  import { MAX_PLACES, placeId, places } from '#lib/places.svelte.js';
  import type { Location, PlaceSummary } from '#lib/weather.js';

  type Props = {
    activeId: string | null;
    onSelect: (loc: Location) => void;
    onLocate: () => void;
    onAdd: () => void;
  };
  let { activeId, onSelect, onLocate, onAdd }: Props = $props();

  const cardClass = 'weather-card w-34 shrink-0 snap-start rounded-lg border px-3 py-2 text-left transition-colors lg:w-auto lg:min-w-0 lg:max-w-44 lg:flex-1';
  const tone = (active: boolean) => (active ? 'border-accent bg-card' : 'border-transparent bg-card/60 hover:bg-card');
  const empty = $derived(places.ready && !places.list.length && !places.here);
  const full = $derived(places.list.length >= MAX_PLACES);
  const LONG_PRESS_MS = 500;

  let managing = $state(false);
  let limitNote = $state(false);
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let pressStart: { x: number; y: number } | null = null;
  let longPressed = false;

  function pressDown(e: PointerEvent) {
    longPressed = false;
    pressStart = { x: e.clientX, y: e.clientY };
    pressTimer = setTimeout(() => {
      longPressed = true;
      managing = true;
    }, LONG_PRESS_MS);
  }

  function pressMove(e: PointerEvent) {
    if (pressStart && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 10) pressCancel();
  }

  function pressCancel() {
    clearTimeout(pressTimer);
    pressStart = null;
  }

  function selectCard(place: Location) {
    if (longPressed) {
      longPressed = false;
      return;
    }
    onSelect(place);
  }

  function add() {
    if (full) limitNote = true;
    else onAdd();
  }
</script>

{#snippet reading(summary: PlaceSummary | undefined | null)}
  {#if summary}
    {@const w = describe(summary.code, summary.isDay)}
    <div class="mt-0.5 flex items-center justify-between {places.stale ? 'opacity-50' : ''}">
      <span class="nums text-xl font-light">{fmtTemp(summary.temp)}</span>
      <Icon name={w.icon} size={22} class={iconColor(w.icon)} />
    </div>
  {:else}
    <Skeleton class="mt-1.5 h-6 w-12" />
  {/if}
{/snippet}

{#if places.ready}
  <nav aria-label={t('places.title')} class="mb-3 px-5">
    {#if empty}
      <div class="flex gap-2">
        <div class="weather-card flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-dashed border-line px-3.5 py-3">
          <StarIcon class="size-5 shrink-0 text-accent" />
          <div class="min-w-0 text-sm">
            <div class="font-medium">{t('places.empty_title')}</div>
            <div class="text-[13px] text-muted-foreground">{t('places.empty_body')}</div>
          </div>
        </div>
        <button
          type="button"
          onclick={onAdd}
          class="pressable flex w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-[11px] text-muted-foreground hover:text-foreground"
        >
          <PlusIcon class="size-4" />
          {t('places.add')}
        </button>
      </div>
    {:else}
      <ul class="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0">
        {#if places.here}
          {@const here = places.here}
          <li class="contents">
            <button type="button" onclick={onLocate} class="pressable {cardClass} {tone(activeId === placeId(here.location))}">
              <div class="flex items-center gap-1.5 text-sm font-medium text-accent">
                <NavigationIcon class="size-3.5 shrink-0 fill-accent" />
                <span class="truncate">{t('places.my_location')}</span>
              </div>
              {@render reading(here.summary)}
              <div class="truncate text-[11px] text-muted-foreground">{here.location.shortName}</div>
            </button>
          </li>
        {/if}
        {#each places.list as place (place.id)}
          {@const summary = places.summaries[place.id]}
          <li class="contents">
            <button
              type="button"
              onclick={() => selectCard(place)}
              onpointerdown={pressDown}
              onpointermove={pressMove}
              onpointerup={pressCancel}
              onpointerleave={pressCancel}
              onpointercancel={pressCancel}
              oncontextmenu={(e) => longPressed && e.preventDefault()}
              aria-current={activeId === place.id ? 'true' : undefined}
              class="pressable {cardClass} {tone(activeId === place.id)}"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="truncate text-sm font-medium">{place.shortName}</span>
                {#if place.id === places.homeId}
                  <HouseIcon class="size-3.5 shrink-0 text-accent" aria-label={t('places.home')} />
                {/if}
              </div>
              {@render reading(summary)}
              {#if summary && places.stale}
                <div class="flex items-center gap-1 text-[11px] text-warn">
                  <WifiOffIcon class="size-3 shrink-0" />
                  <span class="truncate">{fmtAge(Date.now() - summary.fetchedAt, locale())}</span>
                </div>
              {:else if summary}
                <div class="nums text-[11px] text-muted-foreground">{fmtTemp(summary.high)} / {fmtTemp(summary.low)}</div>
              {:else}
                <Skeleton class="mt-1.5 h-3 w-16" />
              {/if}
            </button>
          </li>
        {/each}
        <li class="contents">
          <button
            type="button"
            onclick={add}
            aria-disabled={full}
            class="pressable flex w-20 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-[11px] text-muted-foreground {full
              ? 'opacity-40'
              : 'hover:text-foreground'}"
          >
            <PlusIcon class="size-4" />
            {t('places.add')}
          </button>
        </li>
        {#if places.list.length}
          <li class="contents">
            <button
              type="button"
              onclick={() => (managing = true)}
              class="pressable flex shrink-0 snap-start items-center gap-1.5 self-center px-2 text-xs font-medium text-accent hover:underline"
            >
              <PencilIcon class="size-3.5" />
              {t('places.edit')}
            </button>
          </li>
        {/if}
      </ul>
      {#if limitNote && full}
        <div role="status" class="weather-card mt-2 flex items-start gap-2.5 rounded-lg border border-line px-3.5 py-2.5 text-[13px] text-muted-foreground">
          <button type="button" aria-label={t('places.dismiss')} class="pressable -m-1 p-1" onclick={() => (limitNote = false)}>
            <XIcon class="size-4" />
          </button>
          <span>{t('places.full', { max: MAX_PLACES })}</span>
        </div>
      {/if}
    {/if}
  </nav>
  <ManagePlaces bind:open={managing} />
{/if}
