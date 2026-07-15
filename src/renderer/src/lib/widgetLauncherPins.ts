export type WidgetLauncherId =
  | 'fcoin_calculator'
  | 'notepad'
  | 'todo'
  | 'navi_guide'
  | 'flyffipedia'
  | 'flyffulator'
  | 'flyff_calculators'
  | 'siege_stats'
  | 'cs_modelviewer'
  | 'quest_log';

const STORAGE_KEY = 'mainbar.pinnedWidgetLaunchers';
export const WIDGET_LAUNCHER_PINS_CHANGED = 'widget-launcher-pins-changed';

const validLauncherIds: WidgetLauncherId[] = [
  'fcoin_calculator',
  'notepad',
  'todo',
  'navi_guide',
  'flyffipedia',
  'flyffulator',
  'flyff_calculators',
  'siege_stats',
  'cs_modelviewer',
  'quest_log'
];

function normalizeLauncherIds(value: unknown): WidgetLauncherId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is WidgetLauncherId => validLauncherIds.includes(id)))];
}

export function readPinnedWidgetLaunchers(): WidgetLauncherId[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeLauncherIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writePinnedWidgetLaunchers(ids: WidgetLauncherId[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeLauncherIds(ids)));
  window.dispatchEvent(new CustomEvent(WIDGET_LAUNCHER_PINS_CHANGED));
}

export function isWidgetLauncherPinned(id: WidgetLauncherId): boolean {
  return readPinnedWidgetLaunchers().includes(id);
}

export function toggleWidgetLauncherPin(id: WidgetLauncherId): boolean {
  const current = readPinnedWidgetLaunchers();
  const pinned = current.includes(id);
  writePinnedWidgetLaunchers(pinned ? current.filter(entry => entry !== id) : [...current, id]);
  return !pinned;
}
