import type {
  CategoryPreviewResult,
  ConfigExportPayloadV2,
  ConfigImportPayload,
  ExportCategory,
  NeuzConfig,
  SanitizationResult,
} from '$lib/types';

export type CategoryDefinition = {
  id: ExportCategory;
  label: string;
  description: string;
  enabled: boolean;
};

export const exportCategories: CategoryDefinition[] = [
  {
    id: 'general-settings',
    label: 'General Settings',
    description: 'Autosave, Cache Cleanup, Window Sizes, Title Bar Buttons, Fullscreen Behavior.',
    enabled: true,
  },
  {
    id: 'sessions',
    label: 'Session',
    description: 'Sessions and Groups.',
    enabled: true,
  },
  {
    id: 'layouts',
    label: 'Layouts',
    description: 'Layouts and Default Layouts.',
    enabled: true,
  },
  {
    id: 'keybinds',
    label: 'Keybinds',
    description: 'Keybinds and Profiles.',
    enabled: true,
  },
  {
    id: 'session-actions',
    label: 'Session Actions',
    description: 'Sessions including their Actions and Settings.',
    enabled: true,
  },
  {
    id: 'launch-settings',
    label: 'Launch Settings',
    description: 'Launch Mode, Custom User Agent, Command Line Switches.',
    enabled: true,
  },
];

export const categoryConfigFields: Record<ExportCategory, string[]> = {
  'general-settings': ['autoSaveSettings', 'autoDeleteAllCachesOnStartup', 'window', 'titleBarButtons', 'fullscreen'],
  sessions: ['sessions', 'sessionGroups', 'sessionZoomLevels'],
  layouts: ['layouts', 'defaultLayouts'],
  keybinds: ['keyBinds', 'keyBindProfiles', 'activeKeyBindProfileId'],
  'session-actions': ['sessionActions'],
  'launch-settings': ['defaultLaunchMode', 'userAgent', 'chromium.commandLineSwitches'],
  'ui-layout': ['window', 'sessionZoomLevels', 'fullscreen', 'sessionGroups'],
};

const exportCategoryOrder = exportCategories.map((category) => category.id);
const legacyCategoryOrder: ExportCategory[] = ['ui-layout'];
const pathPattern = /^[A-Za-z]:\\|^\/home\/|^\/Users\//;

function cloneValue<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function normalizeCategories(categories: unknown): ExportCategory[] {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories.filter((category): category is ExportCategory => [...exportCategoryOrder, ...legacyCategoryOrder].includes(category as ExportCategory));
}

function expandLegacyCategories(categories: ExportCategory[]): ExportCategory[] {
  const expanded = new Set<ExportCategory>();
  for (const category of categories) {
    if (category === 'ui-layout') {
      expanded.add('general-settings');
      expanded.add('sessions');
      expanded.add('layouts');
      continue;
    }
    expanded.add(category);
  }

  return exportCategoryOrder.filter((category) => expanded.has(category));
}

function inferPayloadCategories(payload: Partial<ConfigImportPayload>): ExportCategory[] {
  const categories: ExportCategory[] = [];

  if (Array.isArray((payload as ConfigExportPayloadV2).keyBinds) || Array.isArray((payload as ConfigExportPayloadV2).keyBindProfiles) || (payload as ConfigExportPayloadV2).activeKeyBindProfileId !== undefined) {
    categories.push('keybinds');
  }
  if (Array.isArray((payload as ConfigExportPayloadV2).sessionActions)) {
    categories.push('session-actions');
  }
  if ((payload as ConfigExportPayloadV2).window !== undefined || (payload as ConfigExportPayloadV2).autoSaveSettings !== undefined || (payload as ConfigExportPayloadV2).autoDeleteAllCachesOnStartup !== undefined || (payload as ConfigExportPayloadV2).titleBarButtons !== undefined || (payload as ConfigExportPayloadV2).fullscreen !== undefined) {
    categories.push('general-settings');
  }
  if (Array.isArray((payload as ConfigExportPayloadV2).sessions) || Array.isArray((payload as ConfigExportPayloadV2).sessionGroups) || (payload as ConfigExportPayloadV2).sessionZoomLevels !== undefined) {
    categories.push('sessions');
  }
  if (Array.isArray((payload as ConfigExportPayloadV2).layouts) || Array.isArray((payload as ConfigExportPayloadV2).defaultLayouts)) {
    categories.push('layouts');
  }
  if ((payload as ConfigExportPayloadV2).defaultLaunchMode !== undefined || (payload as ConfigExportPayloadV2).userAgent !== undefined || (payload as ConfigExportPayloadV2).chromium !== undefined) {
    categories.push('launch-settings');
  }

  return categories;
}

function getPayloadCategories(payload: ConfigImportPayload): ExportCategory[] {
  if (payload.schemaVersion === 1) {
    return ['keybinds', 'session-actions'];
  }

  const explicitCategories = normalizeCategories(payload.categories);
  return explicitCategories.length > 0
    ? [...new Set([...expandLegacyCategories(explicitCategories), ...inferPayloadCategories(payload)])]
    : inferPayloadCategories(payload);
}

function isCategorySelected(selectedCategories: ExportCategory[], category: ExportCategory): boolean {
  return selectedCategories.includes(category);
}

function cloneSessionZoomLevels(sessionZoomLevels?: Record<string, number>): Record<string, number> {
  return cloneValue(sessionZoomLevels ?? {});
}

function cloneWindowForExport(windowConfig: NeuzConfig['window']): NeuzConfig['window'] {
  const cleanedWindow = cloneValue(windowConfig);
  if (cleanedWindow?.sidebarSide !== undefined) {
    delete cleanedWindow.sidebarSide;
  }
  if ((cleanedWindow as any)?.viewers !== undefined) {
    delete (cleanedWindow as any).viewers;
  }
  return cleanedWindow;
}

function getSessionActionItemCount(sessionActions: NeuzConfig['sessionActions']): number {
  return (sessionActions ?? []).reduce((total, sessionActionGroup) => total + (sessionActionGroup.actions?.length ?? 0), 0);
}

function getProfileKeybindCount(keyBindProfiles: NeuzConfig['keyBindProfiles']): number {
  return (keyBindProfiles ?? []).reduce((total, profile) => total + (profile.keybinds?.length ?? 0), 0);
}

function getKeybindSignature(keybind: { key?: string; event?: string }): string {
  const key = String(keybind?.key ?? '').trim().toLowerCase();
  const event = String(keybind?.event ?? '').trim().toLowerCase();
  return key && event ? `${key}::${event}` : '';
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatPieces(pieces: string[]): string {
  return pieces.filter(Boolean).join(', ');
}

function getImportCategories(payload: ConfigImportPayload): ExportCategory[] {
  return getPayloadCategories(payload);
}

function hasPathLikeValue(value: unknown): value is string {
  return typeof value === 'string' && pathPattern.test(value);
}

function sanitizeNode<T>(value: T, parentKey?: string): { value: T | undefined; sanitized: boolean } {
  if (value === undefined || value === null) {
    return {value, sanitized: false};
  }

  if (typeof value === 'string') {
    if (hasPathLikeValue(value)) {
      return {value: '' as T, sanitized: true};
    }
    return {value, sanitized: false};
  }

  if (Array.isArray(value)) {
    let sanitized = false;
    const nextArray = value
      .map((entry) => {
        const result = sanitizeNode(entry);
        sanitized = sanitized || result.sanitized;
        return result.value;
      })
      .filter((entry) => entry !== undefined) as unknown as T;

    return {value: nextArray, sanitized};
  }

  if (typeof value === 'object') {
    let sanitized = false;
    const nextObject: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'partitionOverwrite') {
        sanitized = true;
        continue;
      }
      if (key === 'srcOverwrite' && hasPathLikeValue(entry)) {
        sanitized = true;
        continue;
      }
      const result = sanitizeNode(entry, key);
      sanitized = sanitized || result.sanitized;
      if (result.value !== undefined) {
        nextObject[key] = result.value;
      }
    }

    return {value: nextObject as T, sanitized};
  }

  return {value, sanitized: false};
}

function cloneForExport(config: NeuzConfig, selectedCategories: ExportCategory[]): ConfigExportPayloadV2 {
  const categories = exportCategoryOrder.filter((category) => isCategorySelected(selectedCategories, category));
  const payload: ConfigExportPayloadV2 = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    categories,
  };

  if (isCategorySelected(selectedCategories, 'keybinds')) {
    payload.keyBinds = cloneValue(config.keyBinds ?? []);
    payload.keyBindProfiles = cloneValue(config.keyBindProfiles ?? []);
    payload.activeKeyBindProfileId = config.activeKeyBindProfileId ?? null;
  }

  if (isCategorySelected(selectedCategories, 'session-actions')) {
    payload.sessionActions = cloneValue(config.sessionActions ?? []);
  }

  if (isCategorySelected(selectedCategories, 'general-settings')) {
    if (config.window !== undefined) {
      payload.window = cloneWindowForExport(config.window);
    }
    payload.autoSaveSettings = config.autoSaveSettings;
    payload.autoDeleteAllCachesOnStartup = config.autoDeleteAllCachesOnStartup;
    payload.titleBarButtons = cloneValue(config.titleBarButtons);
    if (config.fullscreen !== undefined) {
      payload.fullscreen = cloneValue(config.fullscreen);
    }
  }

  if (isCategorySelected(selectedCategories, 'sessions')) {
    payload.sessions = cloneValue(config.sessions ?? []);
    payload.sessionGroups = cloneValue(config.sessionGroups ?? []);
    payload.sessionZoomLevels = cloneSessionZoomLevels(config.sessionZoomLevels);
  }

  if (isCategorySelected(selectedCategories, 'layouts')) {
    payload.layouts = cloneValue(config.layouts ?? []);
    payload.defaultLayouts = cloneValue(config.defaultLayouts ?? []);
  }

  if (isCategorySelected(selectedCategories, 'launch-settings')) {
    payload.defaultLaunchMode = config.defaultLaunchMode;
    if (config.userAgent !== undefined) {
      payload.userAgent = config.userAgent;
    }
    payload.chromium = cloneValue(config.chromium);
  }

  return payload;
}

export function getDefaultCategorySelection(): Record<ExportCategory, boolean> {
  return {
    keybinds: true,
    'session-actions': true,
    'general-settings': true,
    sessions: true,
    layouts: true,
    'launch-settings': true,
    'ui-layout': false,
  };
}

export function getCategoryCountLabel(config: NeuzConfig, category: ExportCategory): string {
  switch (category) {
    case 'keybinds':
      return formatPieces([
        pluralize((config.keyBinds ?? []).length + getProfileKeybindCount(config.keyBindProfiles), 'Keybind'),
        pluralize((config.keyBindProfiles ?? []).length, 'Profile'),
      ]);
    case 'session-actions':
      return formatPieces([
        pluralize((config.sessionActions ?? []).length, 'Session'),
        pluralize(getSessionActionItemCount(config.sessionActions), 'Action'),
      ]);
    case 'general-settings': {
      const titleBarButtonCount = Object.keys(config.titleBarButtons ?? {}).length;
      const fullscreenBehaviorCount = Object.keys(config.fullscreen ?? {}).length;
      const enabledSettings = 1 + 1 + titleBarButtonCount + fullscreenBehaviorCount;
      return formatPieces([
        pluralize(enabledSettings, 'Setting'),
        config.window ? 'Window Sizes' : '',
      ]);
    }
    case 'sessions':
      return formatPieces([
        pluralize((config.sessions ?? []).length, 'Session'),
        pluralize((config.sessionGroups ?? []).length, 'Group'),
      ]);
    case 'layouts':
      return formatPieces([
        pluralize((config.layouts ?? []).length, 'Layout'),
        pluralize((config.defaultLayouts ?? []).length, 'Default Layout'),
      ]);
    case 'launch-settings': {
      return formatPieces([
        'Default Launch Mode',
        config.userAgent !== undefined ? 'Custom User Agent' : '',
        (config.chromium?.commandLineSwitches ?? []).length > 0
          ? pluralize((config.chromium?.commandLineSwitches ?? []).length, 'Command Line Switch', 'Command Line Switches')
          : '',
      ]);
    }
    case 'ui-layout':
      return 'Legacy UI Layout';
  }
}

export function buildExportPayload(config: NeuzConfig, selectedCategories: ExportCategory[]): ConfigExportPayloadV2 {
  return cloneForExport(config, selectedCategories);
}

export function sanitizeConfigForExport(payload: ConfigExportPayloadV2): SanitizationResult {
  const clonedPayload = cloneValue(payload);
  const result = sanitizeNode(clonedPayload);
  const sanitizedPayload = (result.value ?? clonedPayload) as ConfigExportPayloadV2;

  if (result.sanitized) {
    sanitizedPayload._sanitized = true;
  }

  return {
    payload: sanitizedPayload,
    sanitized: Boolean(result.sanitized || clonedPayload._sanitized),
  };
}

function getImportedListItems(payload: ConfigImportPayload, category: 'keybinds' | 'session-actions' | 'sessions' | 'layouts') {
  if (category === 'keybinds') {
    return {
      keyBinds: (payload as ConfigExportPayloadV2).keyBinds ?? [],
      keyBindProfiles: (payload as ConfigExportPayloadV2).keyBindProfiles ?? [],
    };
  }

  if (category === 'session-actions') {
    return {
      sessionActions: (payload as ConfigExportPayloadV2).sessionActions ?? [],
    };
  }

  if (category === 'sessions') {
    return {
      sessions: (payload as ConfigExportPayloadV2).sessions ?? [],
    };
  }

  return {
    layouts: (payload as ConfigExportPayloadV2).layouts ?? [],
  };
}

function getLocalListItems(config: NeuzConfig, category: 'keybinds' | 'session-actions' | 'sessions' | 'layouts') {
  if (category === 'keybinds') {
    return {
      keyBinds: config.keyBinds ?? [],
      keyBindProfiles: config.keyBindProfiles ?? [],
    };
  }

  if (category === 'session-actions') {
    return {
      sessionActions: config.sessionActions ?? [],
    };
  }

  if (category === 'sessions') {
    return {
      sessions: config.sessions ?? [],
    };
  }

  return {
    layouts: config.layouts ?? [],
  };
}

function getObjectPreviewCounts(payload: ConfigImportPayload, category: 'general-settings' | 'launch-settings') {
  const settingsPayload = payload as ConfigExportPayloadV2;
  if (category === 'launch-settings') {
    return {
      totalCount: ['defaultLaunchMode', 'userAgent', 'chromium']
        .filter((field) => settingsPayload[field as keyof ConfigExportPayloadV2] !== undefined)
        .length,
    };
  }

  return {
    totalCount: ['autoSaveSettings', 'autoDeleteAllCachesOnStartup', 'window', 'titleBarButtons', 'fullscreen']
      .filter((field) => settingsPayload[field as keyof ConfigExportPayloadV2] !== undefined)
      .length,
  };
}

export function computeCategoryPreview(
  payload: ConfigImportPayload,
  selectedCategories: ExportCategory[],
  currentConfig: NeuzConfig,
): CategoryPreviewResult[] {
  const previewCategories = selectedCategories.filter((category) => category !== 'ui-layout');
  const importedCategories = new Set(getImportCategories(payload));
  const knownSessionIds = new Set((currentConfig.sessions ?? []).map((session) => session.id));

  return previewCategories.map((category) => {
    if (!importedCategories.has(category)) {
      return {
        category,
        foundInFile: false,
        type: category === 'general-settings' || category === 'launch-settings' ? 'object' : 'list',
      } satisfies CategoryPreviewResult;
    }

    if (category === 'general-settings' || category === 'launch-settings') {
      const {totalCount} = getObjectPreviewCounts(payload, category);
      const preview: CategoryPreviewResult = {
        category,
        foundInFile: true,
        type: 'object',
        totalCount,
        willReplace: true,
      };

      return preview;
    }

    const importedListItems = getImportedListItems(payload, category);
    const localListItems = getLocalListItems(currentConfig, category);

    if (category === 'keybinds') {
      const importedKeyBinds = importedListItems.keyBinds;
      const importedProfiles = importedListItems.keyBindProfiles;
      const existingKeyBindSignatures = new Set((localListItems.keyBinds ?? []).map((bind) => getKeybindSignature(bind)).filter(Boolean));
      const existingProfileIds = new Set((localListItems.keyBindProfiles ?? []).map((profile) => profile.id));
      const totalCount = importedKeyBinds.length + importedProfiles.length;
      const conflictCount = importedKeyBinds.filter((bind) => existingKeyBindSignatures.has(getKeybindSignature(bind))).length
        + importedProfiles.filter((profile) => existingProfileIds.has(profile.id)).length;

      return {
        category,
        foundInFile: true,
        type: 'list',
        totalCount,
        conflictCount,
        newCount: Math.max(totalCount - conflictCount, 0),
      } satisfies CategoryPreviewResult;
    }

    if (category === 'session-actions') {
      const importedSessions = importedListItems.sessionActions;
      const existingSessionIds = new Set((localListItems.sessionActions ?? []).map((entry) => entry.sessionId));
      const totalCount = importedSessions.length;
      const conflictCount = importedSessions.filter((entry) => existingSessionIds.has(entry.sessionId)).length;

      return {
        category,
        foundInFile: true,
        type: 'list',
        totalCount,
        conflictCount,
        newCount: Math.max(totalCount - conflictCount, 0),
      } satisfies CategoryPreviewResult;
    }

    if (category === 'sessions') {
      const importedSessions = importedListItems.sessions;
      const existingSessionIds = new Set((localListItems.sessions ?? []).map((entry) => entry.id));
      const availableSessionIds = new Set([
        ...knownSessionIds,
        ...importedSessions.map((entry) => entry.id).filter(Boolean),
      ]);
      const totalCount = importedSessions.length;
      const conflictCount = importedSessions.filter((entry) => existingSessionIds.has(entry.id)).length;
      const sessionZoomLevels = (payload as ConfigExportPayloadV2).sessionZoomLevels ?? {};
      const skippedSessionIds = Object.keys(sessionZoomLevels).filter((sessionId) => !availableSessionIds.has(sessionId));

      return {
        category,
        foundInFile: true,
        type: 'list',
        totalCount,
        conflictCount,
        newCount: Math.max(totalCount - conflictCount, 0),
        ...(skippedSessionIds.length > 0 ? {skippedSessionIds} : {}),
      } satisfies CategoryPreviewResult;
    }

    const importedLayouts = importedListItems.layouts;
    const existingLayoutIds = new Set((localListItems.layouts ?? []).map((entry) => entry.id));
    const totalCount = importedLayouts.length;
    const conflictCount = importedLayouts.filter((entry) => existingLayoutIds.has(entry.id)).length;

    return {
      category,
      foundInFile: true,
      type: 'list',
      totalCount,
      conflictCount,
      newCount: Math.max(totalCount - conflictCount, 0),
    } satisfies CategoryPreviewResult;
  });
}

export function getSelectedCategories(selection: Record<ExportCategory, boolean>): ExportCategory[] {
  return exportCategoryOrder.filter((category) => selection[category]);
}
