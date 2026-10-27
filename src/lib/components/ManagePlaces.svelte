<script lang="ts">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import GripIcon from '@lucide/svelte/icons/grip-vertical';
  import HouseIcon from '@lucide/svelte/icons/house';
  import TrashIcon from '@lucide/svelte/icons/trash-2';
  import * as Drawer from '#lib/components/ui/drawer/index.js';
  import { Button } from '#lib/components/ui/button/index.js';
  import { describe, iconColor } from '#lib/wmo.js';
  import { fmtTemp } from '#lib/format.js';
  import { t } from '#lib/i18n.svelte.js';
  import { MAX_PLACES, movePlace, places, setHome } from '#lib/places.svelte.js';
  import { removeWithUndo } from '#lib/placeToasts.js';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let drag = $state<{ id: string; y: number } | null>(null);
  let list = $state<HTMLUListElement | null>(null);

  const indexOf = (id: string) => places.list.findIndex((p) => p.id === id);

  function startDrag(e: PointerEvent, id: string) {
    drag = { id, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function moveDrag(e: PointerEvent) {
    if (!drag) return;
    const rowHeight = (e.currentTarget as HTMLElement).closest('li')?.offsetHeight ?? 56;
    const from = indexOf(drag.id);
    const rows = Math.round((e.clientY - drag.y) / rowHeight);
    const to = Math.max(0, Math.min(places.list.length - 1, from + rows));
    if (to === from) return;
    movePlace(from, to);
    drag.y += (to - from) * rowHeight;
  }

  async function moveWithKeys(e: KeyboardEvent, id: string) {
    const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    const from = indexOf(id);
    movePlace(from, from + step);
    await tick();
    list?.querySelector<HTMLElement>(`[data-grip="${id}"]`)?.focus();
  }
</script>

<Drawer.Root bind:open>
  <Drawer.Content class="mx-auto max-w-md">
    <Drawer.Header class="flex-row items-center justify-between px-4 pt-3 pb-2 text-left">
      <Drawer.Title>{t('places.title')}</Drawer.Title>
      <Drawer.Description class="sr-only">{t('places.manage_hint')}</Drawer.Description>
      <Drawer.Close>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="sm" class="text-accent hover:text-accent">{t('places.done')}</Button>
        {/snippet}
      </Drawer.Close>
    </Drawer.Header>

    <ul bind:this={list} data-vaul-no-drag class="max-h-[60vh] overflow-y-auto">
      {#each places.list as place (place.id)}
        {@const summary = places.summaries[place.id]}
        {@const w = summary && describe(summary.code, summary.isDay)}
        {@const home = place.id === places.homeId}
        <li
          class="flex items-center gap-3 border-t border-line/60 px-3 py-2.5 transition-colors {drag?.id === place.id
            ? 'bg-muted/60'
            : ''}"
        >
          <button
            type="button"
            data-grip={place.id}
            aria-label={t('places.reorder_named', { name: place.shortName })}
            class="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
            onpointerdown={(e) => startDrag(e, place.id)}
            onpointermove={moveDrag}
            onpointerup={() => (drag = null)}
            onpointercancel={() => (drag = null)}
            onkeydown={(e) => moveWithKeys(e, place.id)}
          >
            <GripIcon class="size-4" />
          </button>
          {#if w}
            <Icon name={w.icon} size={22} class={iconColor(w.icon)} />
          {:else}
            <span class="size-[22px] shrink-0"></span>
          {/if}
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-sm font-medium">
              <span class="truncate">{place.shortName}</span>
              {#if home}
                <span class="shrink-0 rounded bg-accent/15 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-accent">
                  {t('places.home')}
                </span>
              {/if}
            </div>
            <div class="truncate text-xs text-muted-foreground">{place.name}</div>
          </div>
          {#if summary}
            <span class="nums w-9 text-right text-sm">{fmtTemp(summary.temp)}</span>
          {/if}
          <button
            type="button"
            aria-label={t('places.set_home_named', { name: place.shortName })}
            aria-pressed={home}
            class="pressable grid size-9 shrink-0 place-items-center rounded-md hover:bg-muted"
            onclick={() => setHome(place.id)}
          >
            <HouseIcon class="size-4 {home ? 'text-accent' : 'text-muted-foreground/50'}" />
          </button>
          <button
            type="button"
            aria-label={t('places.remove_named', { name: place.shortName })}
            class="pressable grid size-9 shrink-0 place-items-center rounded-md text-bad/80 hover:bg-bad/10 hover:text-bad"
            onclick={() => removeWithUndo(place.id)}
          >
            <TrashIcon class="size-4" />
          </button>
        </li>
      {/each}
    </ul>

    <Drawer.Footer class="border-t border-line/60 py-2.5 text-center text-xs text-muted-foreground">
      {t('places.count', { n: places.list.length, max: MAX_PLACES })}
    </Drawer.Footer>
  </Drawer.Content>
</Drawer.Root>
