import { pushState } from '$app/navigation';
import { page } from '$app/state';

export type Sheet = NonNullable<App.PageState['sheet']>;

export function isSheetOpen(sheet: Sheet): boolean {
  return page.state.sheet === sheet;
}

export function setSheetOpen(sheet: Sheet, open: boolean): void {
  if (open === isSheetOpen(sheet)) return;
  if (open) pushState('', { ...page.state, sheet });
  else history.back();
}
