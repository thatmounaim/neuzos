type SortModeScope = 'sessionSettings' | 'layoutSettings' | 'sessionActions';
type CollapsedGroupsScope = 'sessionSettings' | 'sessionLauncher' | 'sessionLauncherMainbar';
type SortMode = 'arrows' | 'dragDrop';
type CollapsedGroups = Record<string, boolean>;

export type MiniBrowserFavorite = {
  url: string;
  title: string;
};

export type WidgetWindowState = {
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
};

export type MiniBrowserWindowState = WidgetWindowState;

type MiniBrowserStorage = {
  window?: Partial<MiniBrowserWindowState>;
  settings?: {
    zoom?: number;
  };
  favorites?: MiniBrowserFavorite[];
};

type ActionPadRow = {
  id: string;
  actionIds: string[];
  name?: string;
};

type ActionPadStorage = {
  window?: Partial<WidgetWindowState>;
  settings?: {
    backgroundTransparency?: number;
  };
  rows?: ActionPadRow[];
};

type FcoinCalculatorStorage = {
  window?: Partial<WidgetWindowState>;
  settings?: {
    rate?: number;
  };
};

type NotepadStorage = {
  window?: Partial<WidgetWindowState>;
  settings?: {
    tabLayoutMode?: 'horizontal' | 'vertical';
  };
  files?: unknown[];
};

type TodoStorage = {
  window?: Partial<WidgetWindowState>;
  state?: Record<string, unknown>;
  characters?: Record<string, Record<string, unknown>>;
};

type ActionPinsStorage = {
  autoLoadLatest?: boolean;
  latestPins?: string[];
};

type PaneforgePaneGroupState = Record<string, {
  expandToSizes?: Record<string, unknown>;
  layout?: unknown;
}>;

type FloatingSessionStorage = {
  window?: Partial<WidgetWindowState>;
};

type QuestlogStorage = {
  state?: Record<string, unknown>;
};

const SETTINGS_SORT_MODE_STORAGE_KEY = 'settings.sortMode';
const SETTINGS_COLLAPSED_GROUPS_STORAGE_KEY = 'settings.collapsedGroups';
const MINI_BROWSER_STORAGE_KEY = 'widget.miniBrowser';
const FCOIN_CALCULATOR_STORAGE_KEY = 'widget.fcoinCalculator';
const NOTEPAD_STORAGE_KEY = 'widget.notepad';
const TODO_STORAGE_KEY = 'widget.todo';
const ACTION_PINS_STORAGE_KEY = 'widget.actionPins';
const QUESTLOG_STORAGE_KEY = 'widget.questlog';
const PANEFORGE_STORAGE_PREFIX = 'paneforge:';
const PANEFORGE_DEFAULT_LAYOUT_TOLERANCE = 0.05;

const LEGACY_SORT_MODE_KEYS: Record<SortModeScope, string> = {
  sessionSettings: 'neuzos.sessionSettings.sortMode',
  layoutSettings: 'neuzos.layoutSettings.sortMode',
  sessionActions: 'neuzos.sessionActions.sortMode'
};

const LEGACY_COLLAPSED_GROUPS_KEYS: Record<CollapsedGroupsScope, string> = {
  sessionSettings: 'neuzos.sessionSettings.collapsedGroups',
  sessionLauncher: 'neuzos.sessionLauncher.collapsedGroups',
  sessionLauncherMainbar: 'neuzos.mainbar.sessionPopup.collapsedGroups'
};

const LEGACY_MINI_BROWSER_FAVORITES_KEY = 'widget.builtin.mini_browser.favorites';
const LEGACY_MINI_BROWSER_WINDOW_KEY = 'floating-window-widget.builtin.mini_browser';
const LEGACY_FCOIN_CALCULATOR_RATE_KEY = 'widget.builtin.fcoin_calculator.rate';
const LEGACY_FCOIN_CALCULATOR_WINDOW_KEY = 'floating-window-widget.builtin.fcoin_calculator';
const LEGACY_NOTEPAD_KEY = 'widget.builtin.notepad';
const LEGACY_NOTEPAD_WINDOW_KEY = 'floating-window-widget.builtin.notepad';
const LEGACY_TODO_KEY = 'todoChecklist';
const LEGACY_TODO_WINDOW_KEY = 'floating-window-widget.builtin.todo';
const LEGACY_ACTION_PIN_LATEST_PINS_KEY = 'widgets.actionPin.latestPins';
const LEGACY_ACTION_PIN_AUTOLOAD_KEY = 'widgets.actionPin.autoLoadLatest';
const LEGACY_QUESTLOG_KEY = 'questPanel';

export const getActionPadStorageKey = (sessionId: string) => `widget.actionPad_${sessionId}`;
export const getFloatingSessionStorageKey = (sessionId: string) => `widget.floatingSession_${sessionId}`;
const getLegacyActionPadRowsKey = (sessionId: string) => `widget.builtin.action_padrows-${sessionId}`;
const getLegacyActionPadPersistId = (sessionId: string) => `widget.builtin.action_padsession-${sessionId}`;
const getLegacyFloatingSessionPersistId = (sessionId: string) => `widget.builtin.floating_session.session-${sessionId}`;
const getLegacyFloatingWindowKey = (persistId: string) => `floating-window-${persistId}`;
const getLegacyActionPadTransparencyKey = (sessionId: string) => `${getLegacyActionPadPersistId(sessionId)}-background-transparency`;
const getLegacyTodoKey = (characterId: string | null) => characterId ? `${LEGACY_TODO_KEY}:${characterId}` : LEGACY_TODO_KEY;

const canUseLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readObject = <T extends Record<string, unknown> = Record<string, unknown>>(key: string): T => {
  if (!canUseLocalStorage()) return {} as T;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : {} as T;
  } catch {
    return {} as T;
  }
};

const writeObject = (key: string, value: Record<string, unknown>) => {
  if (!canUseLocalStorage()) return;

  if (Object.keys(value).length === 0) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const normalizeSortMode = (value: unknown): SortMode | null => {
  if (value === 'dragDrop' || value === 'drag') return 'dragDrop';
  if (value === 'arrows' || value === 'buttons') return 'arrows';
  return null;
};

const normalizeCollapsedGroups = (value: unknown): CollapsedGroups => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, collapsed]) => collapsed === true || collapsed === false)
  ) as CollapsedGroups;
};

const normalizeMiniBrowserFavorites = (value: unknown): MiniBrowserFavorite[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((favorite) => favorite && typeof favorite === 'object' && typeof (favorite as any).url === 'string')
    .map((favorite: any) => ({
      url: favorite.url,
      title: typeof favorite.title === 'string' ? favorite.title : favorite.url
    }));
};

const normalizeMiniBrowserWindowState = (value: unknown): Partial<MiniBrowserWindowState> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const state = value as Record<string, unknown>;
  const windowState: Partial<MiniBrowserWindowState> = {};

  for (const key of ['x', 'y', 'width', 'height'] as const) {
    const numberValue = Number(state[key]);
    if (Number.isFinite(numberValue)) {
      windowState[key] = numberValue;
    }
  }

  if (typeof state.isMinimized === 'boolean') {
    windowState.isMinimized = state.isMinimized;
  }

  return Object.keys(windowState).length > 0 ? windowState : undefined;
};

const normalizeWidgetWindowState = normalizeMiniBrowserWindowState;

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))];
};

const normalizeActionPadRows = (value: unknown): ActionPadRow[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row: any) => {
    if (!row || typeof row !== 'object' || !row.id || !Array.isArray(row.actionIds)) return [];
    return [{
      id: String(row.id),
      actionIds: row.actionIds.filter((id: unknown): id is string => typeof id === 'string'),
      name: typeof row.name === 'string' ? row.name : undefined
    }];
  });
};

const readJsonValue = (key: string): unknown => {
  if (!canUseLocalStorage()) return undefined;

  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const readLegacyWindowState = (persistId: string): Partial<WidgetWindowState> | undefined => {
  return normalizeWidgetWindowState(readJsonValue(getLegacyFloatingWindowKey(persistId)));
};

const normalizeRecord = (value: unknown): Record<string, unknown> | undefined => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
};

const normalizePaneforgeLayout = (value: unknown): number[] | null => {
  if (!Array.isArray(value)) return null;

  const layout = value.map((entry) => Number(entry));
  return layout.every((entry) => Number.isFinite(entry)) ? layout : null;
};

const isDefaultPaneforgeLayout = (layout: number[]) => {
  if (layout.length <= 1) return true;

  const defaultSize = 100 / layout.length;
  return layout.every((size) => Math.abs(size - defaultSize) <= PANEFORGE_DEFAULT_LAYOUT_TOLERANCE);
};

const filterPaneforgeSerializedState = (serialized: string | null): string | null => {
  if (!serialized) return null;

  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const nextState: PaneforgePaneGroupState = {};

    for (const [paneKey, state] of Object.entries(parsed as PaneforgePaneGroupState)) {
      if (!state || typeof state !== 'object' || Array.isArray(state)) continue;

      const layout = normalizePaneforgeLayout(state.layout);
      if (!layout || !isDefaultPaneforgeLayout(layout)) {
        nextState[paneKey] = state;
      }
    }

    return Object.keys(nextState).length > 0 ? JSON.stringify(nextState) : null;
  } catch {
    return serialized;
  }
};

const cleanupPaneforgeStorageKey = (key: string) => {
  if (!canUseLocalStorage() || !key.startsWith(PANEFORGE_STORAGE_PREFIX)) return;

  const currentValue = window.localStorage.getItem(key);
  const nextValue = filterPaneforgeSerializedState(currentValue);

  if (nextValue === null) {
    window.localStorage.removeItem(key);
  } else if (nextValue !== currentValue) {
    window.localStorage.setItem(key, nextValue);
  }
};

const readMiniBrowserStorage = (): MiniBrowserStorage => readObject<MiniBrowserStorage>(MINI_BROWSER_STORAGE_KEY);

const writeMiniBrowserStorage = (storage: MiniBrowserStorage) => {
  if (!canUseLocalStorage()) return;

  const next: MiniBrowserStorage = {};

  if (storage.window && Object.keys(storage.window).length > 0) {
    next.window = storage.window;
  }

  const zoom = storage.settings?.zoom;
  if (typeof zoom === 'number' && Number.isFinite(zoom) && zoom !== 100) {
    next.settings = {zoom};
  }

  if (storage.favorites && storage.favorites.length > 0) {
    next.favorites = storage.favorites;
  }

  writeObject(MINI_BROWSER_STORAGE_KEY, next as Record<string, unknown>);
  window.localStorage.removeItem(LEGACY_MINI_BROWSER_FAVORITES_KEY);
  window.localStorage.removeItem(LEGACY_MINI_BROWSER_WINDOW_KEY);
};

const readActionPadStorage = (sessionId: string): ActionPadStorage => readObject<ActionPadStorage>(getActionPadStorageKey(sessionId));

const writeActionPadStorage = (sessionId: string, storage: ActionPadStorage) => {
  if (!canUseLocalStorage()) return;

  const next: ActionPadStorage = {};
  if (storage.window && Object.keys(storage.window).length > 0) next.window = storage.window;

  const backgroundTransparency = Number(storage.settings?.backgroundTransparency);
  if (Number.isFinite(backgroundTransparency) && backgroundTransparency !== 100) {
    next.settings = {backgroundTransparency};
  }

  const rows = normalizeActionPadRows(storage.rows);
  if (rows.length > 0) next.rows = rows;

  writeObject(getActionPadStorageKey(sessionId), next as Record<string, unknown>);
  window.localStorage.removeItem(getLegacyActionPadRowsKey(sessionId));
  window.localStorage.removeItem(getLegacyActionPadTransparencyKey(sessionId));
  window.localStorage.removeItem(getLegacyFloatingWindowKey(getLegacyActionPadPersistId(sessionId)));
};

const readFcoinCalculatorStorage = (): FcoinCalculatorStorage => readObject<FcoinCalculatorStorage>(FCOIN_CALCULATOR_STORAGE_KEY);

const writeFcoinCalculatorStorage = (storage: FcoinCalculatorStorage) => {
  if (!canUseLocalStorage()) return;

  const next: FcoinCalculatorStorage = {};
  if (storage.window && Object.keys(storage.window).length > 0) next.window = storage.window;

  const rate = Number(storage.settings?.rate);
  if (Number.isFinite(rate) && rate > 0 && rate !== 180000000) {
    next.settings = {rate};
  }

  writeObject(FCOIN_CALCULATOR_STORAGE_KEY, next as Record<string, unknown>);
  window.localStorage.removeItem(LEGACY_FCOIN_CALCULATOR_RATE_KEY);
  window.localStorage.removeItem(LEGACY_FCOIN_CALCULATOR_WINDOW_KEY);
};

const readNotepadStorage = (): NotepadStorage => readObject<NotepadStorage>(NOTEPAD_STORAGE_KEY);

const writeNotepadStorage = (storage: NotepadStorage) => {
  if (!canUseLocalStorage()) return;

  const next: NotepadStorage = {};
  if (storage.window && Object.keys(storage.window).length > 0) next.window = storage.window;
  if (storage.settings?.tabLayoutMode === 'vertical') next.settings = {tabLayoutMode: 'vertical'};
  if (Array.isArray(storage.files) && storage.files.length > 0) next.files = storage.files;

  writeObject(NOTEPAD_STORAGE_KEY, next as Record<string, unknown>);
  window.localStorage.removeItem(LEGACY_NOTEPAD_KEY);
  window.localStorage.removeItem(LEGACY_NOTEPAD_WINDOW_KEY);
};

const readTodoStorage = (): TodoStorage => readObject<TodoStorage>(TODO_STORAGE_KEY);

const writeTodoStorage = (storage: TodoStorage) => {
  if (!canUseLocalStorage()) return;

  const next: TodoStorage = {};
  if (storage.window && Object.keys(storage.window).length > 0) next.window = storage.window;
  if (storage.state && Object.keys(storage.state).length > 0) next.state = storage.state;
  if (storage.characters && Object.keys(storage.characters).length > 0) next.characters = storage.characters;

  writeObject(TODO_STORAGE_KEY, next as Record<string, unknown>);
  window.localStorage.removeItem(LEGACY_TODO_KEY);
  window.localStorage.removeItem(LEGACY_TODO_WINDOW_KEY);
};

const readActionPinsStorage = (): ActionPinsStorage => readObject<ActionPinsStorage>(ACTION_PINS_STORAGE_KEY);

const writeActionPinsStorage = (storage: ActionPinsStorage) => {
  if (!canUseLocalStorage()) return;

  const next: ActionPinsStorage = {};
  if (storage.autoLoadLatest === true) next.autoLoadLatest = true;

  const latestPins = normalizeStringArray(storage.latestPins);
  if (latestPins.length > 0) next.latestPins = latestPins;

  writeObject(ACTION_PINS_STORAGE_KEY, next as Record<string, unknown>);
  window.localStorage.removeItem(LEGACY_ACTION_PIN_LATEST_PINS_KEY);
  window.localStorage.removeItem(LEGACY_ACTION_PIN_AUTOLOAD_KEY);
};

const readFloatingSessionStorage = (sessionId: string): FloatingSessionStorage => readObject<FloatingSessionStorage>(getFloatingSessionStorageKey(sessionId));

const writeFloatingSessionStorage = (sessionId: string, storage: FloatingSessionStorage) => {
  if (!canUseLocalStorage()) return;

  const next: FloatingSessionStorage = {};
  if (storage.window && Object.keys(storage.window).length > 0) next.window = storage.window;

  writeObject(getFloatingSessionStorageKey(sessionId), next as Record<string, unknown>);
  window.localStorage.removeItem(getLegacyFloatingWindowKey(getLegacyFloatingSessionPersistId(sessionId)));
};

const readQuestlogStorage = (): QuestlogStorage => readObject<QuestlogStorage>(QUESTLOG_STORAGE_KEY);

const writeQuestlogStorage = (storage: QuestlogStorage) => {
  if (!canUseLocalStorage()) return;

  const next: QuestlogStorage = {};
  if (storage.state && Object.keys(storage.state).length > 0) next.state = storage.state;

  writeObject(QUESTLOG_STORAGE_KEY, next as Record<string, unknown>);
  window.localStorage.removeItem(LEGACY_QUESTLOG_KEY);
};

export const migrateSettingsLocalStorage = () => {
  if (!canUseLocalStorage()) return;

  const sortModes = readObject(SETTINGS_SORT_MODE_STORAGE_KEY);
  for (const [scope, legacyKey] of Object.entries(LEGACY_SORT_MODE_KEYS) as Array<[SortModeScope, string]>) {
    const legacySortMode = normalizeSortMode(window.localStorage.getItem(legacyKey));
    if (normalizeSortMode(sortModes[scope]) === null && legacySortMode && legacySortMode !== 'arrows') {
      sortModes[scope] = legacySortMode;
    }
    window.localStorage.removeItem(legacyKey);
  }
  writeObject(SETTINGS_SORT_MODE_STORAGE_KEY, sortModes);

  const collapsedGroups = readObject(SETTINGS_COLLAPSED_GROUPS_STORAGE_KEY);
  for (const [scope, legacyKey] of Object.entries(LEGACY_COLLAPSED_GROUPS_KEYS) as Array<[CollapsedGroupsScope, string]>) {
    const legacyGroups = normalizeCollapsedGroups(readObject(legacyKey));
    const currentGroups = normalizeCollapsedGroups(collapsedGroups[scope]);
    const mergedGroups = {...legacyGroups, ...currentGroups};

    if (Object.keys(mergedGroups).length === 0) {
      delete collapsedGroups[scope];
    } else {
      collapsedGroups[scope] = mergedGroups;
    }

    window.localStorage.removeItem(legacyKey);
  }
  writeObject(SETTINGS_COLLAPSED_GROUPS_STORAGE_KEY, collapsedGroups);
};

export const readSettingsSortMode = (scope: SortModeScope): SortMode => {
  const current = readObject(SETTINGS_SORT_MODE_STORAGE_KEY);
  const legacyValue = canUseLocalStorage() ? window.localStorage.getItem(LEGACY_SORT_MODE_KEYS[scope]) : null;
  const sortMode = normalizeSortMode(current[scope]) ?? normalizeSortMode(legacyValue) ?? 'arrows';

  writeSettingsSortMode(scope, sortMode);
  return sortMode;
};

export const writeSettingsSortMode = (scope: SortModeScope, sortMode: SortMode) => {
  if (!canUseLocalStorage()) return;

  const current = readObject(SETTINGS_SORT_MODE_STORAGE_KEY);

  if (sortMode === 'arrows') {
    delete current[scope];
  } else {
    current[scope] = sortMode;
  }

  writeObject(SETTINGS_SORT_MODE_STORAGE_KEY, current);
  window.localStorage.removeItem(LEGACY_SORT_MODE_KEYS[scope]);
};

export const readSettingsCollapsedGroups = (
  scope: CollapsedGroupsScope,
  sanitize: (collapsedGroups: CollapsedGroups) => CollapsedGroups = (collapsedGroups) => collapsedGroups
): CollapsedGroups => {
  const current = readObject(SETTINGS_COLLAPSED_GROUPS_STORAGE_KEY);
  const legacy = readObject(LEGACY_COLLAPSED_GROUPS_KEYS[scope]);
  const collapsedGroups = sanitize(normalizeCollapsedGroups(current[scope] ?? legacy));

  writeSettingsCollapsedGroups(scope, collapsedGroups);
  return collapsedGroups;
};

export const writeSettingsCollapsedGroups = (scope: CollapsedGroupsScope, collapsedGroups: CollapsedGroups) => {
  if (!canUseLocalStorage()) return;

  const current = readObject(SETTINGS_COLLAPSED_GROUPS_STORAGE_KEY);
  const normalized = normalizeCollapsedGroups(collapsedGroups);

  if (Object.keys(normalized).length === 0) {
    delete current[scope];
  } else {
    current[scope] = normalized;
  }

  writeObject(SETTINGS_COLLAPSED_GROUPS_STORAGE_KEY, current);
  window.localStorage.removeItem(LEGACY_COLLAPSED_GROUPS_KEYS[scope]);
};

export const migrateMiniBrowserStorage = () => {
  if (!canUseLocalStorage()) return;

  const storage = readMiniBrowserStorage();

  if (!storage.favorites) {
    try {
      storage.favorites = normalizeMiniBrowserFavorites(JSON.parse(window.localStorage.getItem(LEGACY_MINI_BROWSER_FAVORITES_KEY) ?? '[]'));
    } catch {
      storage.favorites = [];
    }
  }

  if (!storage.window) {
    try {
      storage.window = normalizeMiniBrowserWindowState(JSON.parse(window.localStorage.getItem(LEGACY_MINI_BROWSER_WINDOW_KEY) ?? '{}'));
    } catch {
      storage.window = undefined;
    }
  }

  writeMiniBrowserStorage(storage);
};

export const readMiniBrowserFavorites = (): MiniBrowserFavorite[] => {
  migrateMiniBrowserStorage();
  return normalizeMiniBrowserFavorites(readMiniBrowserStorage().favorites);
};

export const writeMiniBrowserFavorites = (favorites: MiniBrowserFavorite[]) => {
  const storage = readMiniBrowserStorage();
  storage.favorites = normalizeMiniBrowserFavorites(favorites);
  writeMiniBrowserStorage(storage);
};

export const readMiniBrowserZoom = (): number => {
  migrateMiniBrowserStorage();
  const zoom = Number(readMiniBrowserStorage().settings?.zoom);
  return Number.isFinite(zoom) ? zoom : 100;
};

export const writeMiniBrowserZoom = (zoom: number) => {
  const storage = readMiniBrowserStorage();
  storage.settings = {...storage.settings, zoom};
  writeMiniBrowserStorage(storage);
};

export const readMiniBrowserWindowState = (): Partial<MiniBrowserWindowState> | null => {
  migrateMiniBrowserStorage();
  return normalizeMiniBrowserWindowState(readMiniBrowserStorage().window) ?? null;
};

export const writeMiniBrowserWindowState = (windowState: MiniBrowserWindowState) => {
  const storage = readMiniBrowserStorage();
  storage.window = windowState;
  writeMiniBrowserStorage(storage);
};

export const migratePublicWidgetStorage = () => {
  cleanupPaneforgeStorage();
  migrateMiniBrowserStorage();
  migrateFcoinCalculatorStorage();
  migrateNotepadStorage();
  migrateTodoStorage();
  migrateActionPinsStorage();
  migrateQuestlogStorage();
};

export const cleanupPaneforgeStorage = () => {
  if (!canUseLocalStorage()) return;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(PANEFORGE_STORAGE_PREFIX)) {
      cleanupPaneforgeStorageKey(key);
    }
  }
};

export const paneforgePaneGroupStorage = {
  getItem: (name: string) => {
    if (!canUseLocalStorage()) return null;
    if (!name.startsWith(PANEFORGE_STORAGE_PREFIX)) return window.localStorage.getItem(name);

    cleanupPaneforgeStorageKey(name);
    return window.localStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (!canUseLocalStorage()) return;

    if (!name.startsWith(PANEFORGE_STORAGE_PREFIX)) {
      window.localStorage.setItem(name, value);
      return;
    }

    const nextValue = filterPaneforgeSerializedState(value);
    if (nextValue === null) {
      window.localStorage.removeItem(name);
      return;
    }

    window.localStorage.setItem(name, nextValue);
  }
};

export const migrateActionPadStorage = (sessionId: string) => {
  if (!canUseLocalStorage() || !sessionId) return;

  const storage = readActionPadStorage(sessionId);

  if (!storage.rows) {
    storage.rows = normalizeActionPadRows(readJsonValue(getLegacyActionPadRowsKey(sessionId)));
  }

  if (!storage.settings?.backgroundTransparency) {
    const transparency = Number(window.localStorage.getItem(getLegacyActionPadTransparencyKey(sessionId)));
    if (Number.isFinite(transparency)) {
      storage.settings = {...storage.settings, backgroundTransparency: Math.max(0, Math.min(100, Math.round(transparency)))};
    }
  }

  if (!storage.window) {
    storage.window = readLegacyWindowState(getLegacyActionPadPersistId(sessionId));
  }

  writeActionPadStorage(sessionId, storage);
};

export const readActionPadRows = (sessionId: string): ActionPadRow[] => {
  migrateActionPadStorage(sessionId);
  return normalizeActionPadRows(readActionPadStorage(sessionId).rows);
};

export const writeActionPadRows = (sessionId: string, rows: ActionPadRow[]) => {
  const storage = readActionPadStorage(sessionId);
  storage.rows = normalizeActionPadRows(rows);
  writeActionPadStorage(sessionId, storage);
};

export const readActionPadBackgroundTransparency = (sessionId: string): number => {
  migrateActionPadStorage(sessionId);
  const transparency = Number(readActionPadStorage(sessionId).settings?.backgroundTransparency);
  return Number.isFinite(transparency) ? Math.max(0, Math.min(100, Math.round(transparency))) : 100;
};

export const writeActionPadBackgroundTransparency = (sessionId: string, backgroundTransparency: number) => {
  const storage = readActionPadStorage(sessionId);
  storage.settings = {...storage.settings, backgroundTransparency};
  writeActionPadStorage(sessionId, storage);
};

export const readActionPadWindowState = (sessionId: string): Partial<WidgetWindowState> | null => {
  migrateActionPadStorage(sessionId);
  return normalizeWidgetWindowState(readActionPadStorage(sessionId).window) ?? null;
};

export const writeActionPadWindowState = (sessionId: string, windowState: WidgetWindowState) => {
  const storage = readActionPadStorage(sessionId);
  storage.window = windowState;
  writeActionPadStorage(sessionId, storage);
};

export const migrateFcoinCalculatorStorage = () => {
  if (!canUseLocalStorage()) return;

  const storage = readFcoinCalculatorStorage();

  if (!storage.settings?.rate) {
    const legacyRate = normalizeRecord(readJsonValue(LEGACY_FCOIN_CALCULATOR_RATE_KEY));
    const rate = Number(legacyRate?.rate);
    if (Number.isFinite(rate) && rate > 0) {
      storage.settings = {...storage.settings, rate};
    }
  }

  if (!storage.window) {
    storage.window = readLegacyWindowState('widget.builtin.fcoin_calculator');
  }

  writeFcoinCalculatorStorage(storage);
};

export const readFcoinCalculatorRate = (): number => {
  migrateFcoinCalculatorStorage();
  const rate = Number(readFcoinCalculatorStorage().settings?.rate);
  return Number.isFinite(rate) && rate > 0 ? rate : 180000000;
};

export const writeFcoinCalculatorRate = (rate: number) => {
  const storage = readFcoinCalculatorStorage();
  storage.settings = {...storage.settings, rate};
  writeFcoinCalculatorStorage(storage);
};

export const readFcoinCalculatorWindowState = (): Partial<WidgetWindowState> | null => {
  migrateFcoinCalculatorStorage();
  return normalizeWidgetWindowState(readFcoinCalculatorStorage().window) ?? null;
};

export const writeFcoinCalculatorWindowState = (windowState: WidgetWindowState) => {
  const storage = readFcoinCalculatorStorage();
  storage.window = windowState;
  writeFcoinCalculatorStorage(storage);
};

export const migrateNotepadStorage = () => {
  if (!canUseLocalStorage()) return;

  const storage = readNotepadStorage();
  const legacyState = normalizeRecord(readJsonValue(LEGACY_NOTEPAD_KEY));

  if (!storage.files && Array.isArray(legacyState?.files)) {
    storage.files = legacyState.files;
  }

  if (!storage.settings?.tabLayoutMode && legacyState?.tabLayoutMode === 'vertical') {
    storage.settings = {...storage.settings, tabLayoutMode: 'vertical'};
  }

  if (!storage.window) {
    storage.window = readLegacyWindowState('widget.builtin.notepad');
  }

  writeNotepadStorage(storage);
};

export const readNotepadState = <T extends Record<string, unknown>>(): T | null => {
  migrateNotepadStorage();
  const storage = readNotepadStorage();
  if (!storage.files && !storage.settings?.tabLayoutMode) return null;
  return {
    files: storage.files,
    tabLayoutMode: storage.settings?.tabLayoutMode
  } as T;
};

export const writeNotepadState = (state: {files?: unknown[]; tabLayoutMode?: 'horizontal' | 'vertical'}) => {
  const storage = readNotepadStorage();
  storage.files = state.files;
  storage.settings = {...storage.settings, tabLayoutMode: state.tabLayoutMode};
  writeNotepadStorage(storage);
};

export const readNotepadWindowState = (): Partial<WidgetWindowState> | null => {
  migrateNotepadStorage();
  return normalizeWidgetWindowState(readNotepadStorage().window) ?? null;
};

export const writeNotepadWindowState = (windowState: WidgetWindowState) => {
  const storage = readNotepadStorage();
  storage.window = windowState;
  writeNotepadStorage(storage);
};

export const migrateTodoStorage = () => {
  if (!canUseLocalStorage()) return;

  const storage = readTodoStorage();

  if (!storage.state) {
    storage.state = normalizeRecord(readJsonValue(LEGACY_TODO_KEY));
  }

  if (!storage.characters) {
    const characters: Record<string, Record<string, unknown>> = {};
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(`${LEGACY_TODO_KEY}:`)) continue;
      const characterId = key.slice(`${LEGACY_TODO_KEY}:`.length);
      const value = normalizeRecord(readJsonValue(key));
      if (characterId && value) {
        characters[characterId] = value;
      }
    }
    if (Object.keys(characters).length > 0) {
      storage.characters = characters;
    }
  }

  if (!storage.window) {
    storage.window = readLegacyWindowState('widget.builtin.todo');
  }

  writeTodoStorage(storage);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(`${LEGACY_TODO_KEY}:`)) {
      window.localStorage.removeItem(key);
    }
  }
};

export const readTodoState = (characterId: string | null): Record<string, unknown> | null => {
  migrateTodoStorage();
  const storage = readTodoStorage();
  return characterId ? storage.characters?.[characterId] ?? null : storage.state ?? null;
};

export const writeTodoState = (characterId: string | null, state: Record<string, unknown>) => {
  const storage = readTodoStorage();
  if (characterId) {
    storage.characters = {...storage.characters, [characterId]: state};
  } else {
    storage.state = state;
  }
  writeTodoStorage(storage);
};

export const readTodoWindowState = (): Partial<WidgetWindowState> | null => {
  migrateTodoStorage();
  return normalizeWidgetWindowState(readTodoStorage().window) ?? null;
};

export const writeTodoWindowState = (windowState: WidgetWindowState) => {
  const storage = readTodoStorage();
  storage.window = windowState;
  writeTodoStorage(storage);
};

export const migrateActionPinsStorage = () => {
  if (!canUseLocalStorage()) return;

  const storage = readActionPinsStorage();

  if (storage.autoLoadLatest === undefined) {
    const legacyAutoLoad = readJsonValue(LEGACY_ACTION_PIN_AUTOLOAD_KEY);
    if (typeof legacyAutoLoad === 'boolean') {
      storage.autoLoadLatest = legacyAutoLoad;
    } else if (window.localStorage.getItem(LEGACY_ACTION_PIN_AUTOLOAD_KEY) === 'true') {
      storage.autoLoadLatest = true;
    }
  }

  if (!storage.latestPins) {
    const legacyPins = readJsonValue(LEGACY_ACTION_PIN_LATEST_PINS_KEY);
    if (Array.isArray(legacyPins)) {
      storage.latestPins = normalizeStringArray(legacyPins);
    } else if (legacyPins && typeof legacyPins === 'object' && Array.isArray((legacyPins as any).sessionIds)) {
      storage.latestPins = normalizeStringArray((legacyPins as any).sessionIds);
    }
  }

  writeActionPinsStorage(storage);
};

export const readActionPinsAutoLoadLatest = (): boolean => {
  migrateActionPinsStorage();
  return readActionPinsStorage().autoLoadLatest === true;
};

export const writeActionPinsAutoLoadLatest = (autoLoadLatest: boolean) => {
  const storage = readActionPinsStorage();
  storage.autoLoadLatest = autoLoadLatest;
  writeActionPinsStorage(storage);
};

export const readActionPinsLatestPins = (): string[] => {
  migrateActionPinsStorage();
  return normalizeStringArray(readActionPinsStorage().latestPins);
};

export const writeActionPinsLatestPins = (sessionIds: string[]) => {
  const storage = readActionPinsStorage();
  storage.latestPins = normalizeStringArray(sessionIds);
  writeActionPinsStorage(storage);
};

export const migrateFloatingSessionStorage = (sessionId: string) => {
  if (!canUseLocalStorage() || !sessionId) return;

  const storage = readFloatingSessionStorage(sessionId);
  if (!storage.window) {
    storage.window = readLegacyWindowState(getLegacyFloatingSessionPersistId(sessionId));
  }
  writeFloatingSessionStorage(sessionId, storage);
};

export const readFloatingSessionWindowState = (sessionId: string): Partial<WidgetWindowState> | null => {
  migrateFloatingSessionStorage(sessionId);
  return normalizeWidgetWindowState(readFloatingSessionStorage(sessionId).window) ?? null;
};

export const writeFloatingSessionWindowState = (sessionId: string, windowState: WidgetWindowState) => {
  const storage = readFloatingSessionStorage(sessionId);
  storage.window = windowState;
  writeFloatingSessionStorage(sessionId, storage);
};

export const removeFloatingSessionStorage = (sessionId: string) => {
  if (!canUseLocalStorage() || !sessionId) return;
  window.localStorage.removeItem(getFloatingSessionStorageKey(sessionId));
  window.localStorage.removeItem(getLegacyFloatingWindowKey(getLegacyFloatingSessionPersistId(sessionId)));
};

export const migrateQuestlogStorage = () => {
  if (!canUseLocalStorage()) return;

  const storage = readQuestlogStorage();
  if (!storage.state) {
    storage.state = normalizeRecord(readJsonValue(LEGACY_QUESTLOG_KEY));
  }

  writeQuestlogStorage(storage);
};

export const readQuestlogState = (): Record<string, unknown> | null => {
  migrateQuestlogStorage();
  return readQuestlogStorage().state ?? null;
};

export const writeQuestlogState = (state: Record<string, unknown>) => {
  const storage = readQuestlogStorage();
  storage.state = state;
  writeQuestlogStorage(storage);
};
