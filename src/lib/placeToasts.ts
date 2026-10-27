import { toast } from "svelte-sonner";
import { t } from "#lib/i18n.svelte.js";
import { MAX_PLACES, isSaved, placeId, removePlace, savePlace, undoRemove } from "#lib/places.svelte.js";
import type { Location } from "#lib/weather.js";

const UNDO_TOAST_MS = 6000;

export function saveWithUndo(loc: Location): void {
  const result = savePlace(loc);
  if (result === "full") {
    toast(t("places.full", { max: MAX_PLACES }));
  } else if (result === "saved") {
    toast(t("places.saved_toast", { name: loc.shortName }), {
      duration: UNDO_TOAST_MS,
      action: { label: t("places.undo"), onClick: () => removePlace(placeId(loc)) },
    });
  }
}

export function removeWithUndo(id: string): void {
  const removal = removePlace(id);
  if (!removal) return;
  toast(t("places.removed_toast", { name: removal.place.shortName }), {
    duration: UNDO_TOAST_MS,
    action: { label: t("places.undo"), onClick: () => undoRemove(removal) },
  });
}

export function toggleSaved(loc: Location): void {
  if (isSaved(loc)) removeWithUndo(placeId(loc));
  else saveWithUndo(loc);
}
