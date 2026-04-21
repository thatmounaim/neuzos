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
    id: 'keybinds',
    label: 'Keybinds & Hotkeys',
    description: 'Global keybinds plus keybind profiles and the active profile.',
    enabled: true,
  },
  {
    id: 'session-actions',
    label: 'Session Actions',
    description: 'Session-specific action groups and their actions.',
    enabled: true,
  },
  {
    id: 'ui-layout',
    label: 'UI Layout',
    description: 'Window sizes, zoom values, fullscreen behavior, and layout state.',
    enabled: true,
  },
  {
    id: 'general-settings',
    label: 'General Settings',
    description: 'Autosave, launch mode, user agent, and title bar button settings.',
    enabled: true,
  },
  {
    id: 'quest-log',
    label: 'Quest Log Templates',
    description: 'Reserved placeholder for a future quest log export feature.',
    enabled: false,
  },
];

const exportCategoryOrder = exportCategories.map((category) => category.id);
const pathPattern = /^[A-Za-z]:\\|^\/home\/|^\/Users\//;

function cloneValue<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function normalizeCategories(categories: unknown): ExportCategory[] {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories.filter((category): category is ExportCategory => exportCategoryOrder.includes(category as ExportCategory));
}

function inferPayloadCategories(payload: Partial<ConfigImportPayload>): ExportCategory[] {
  const categories: ExportCategory[] = [];

  if (Array.isArray((payload as ConfigExportPayloadV2).keyBinds) || Array.isArray((payload as ConfigExportPayloadV2).keyBindProfiles) || (payload as ConfigExportPayloadV2).activeKeyBindProfileId !== undefined) {
    categories.push('keybinds');
  }
  if (Array.isArray((payload as ConfigExportPayloadV2).sessionActions)) {
    categories.push('session-actions');
  }
  if ((payload as ConfigExportPayloadV2).window !== undefined || (payload as ConfigExportPayloadV2).sessionZoomLevels !== undefined || (payload as ConfigExportPayloadV2).fullscreen !== undefined) {
    categories.push('ui-layout');
  }
  if ((payload as ConfigExportPayloadV2).autoSaveSettings !== undefined || (payload as ConfigExportPayloadV2).defaultLaunchMode !== undefined || (payload as ConfigExportPayloadV2).userAgent !== undefined || (payload as ConfigExportPayloadV2).titleBarButtons !== undefined) {
    categories.push('general-settings');
  }
  if (Array.isArray((payload as ConfigExportPayloadV2).questLogTemplates)) {
    categories.push('quest-log');
  }

  return categories;
}

function getPayloadCategories(payload: ConfigImportPayload): ExportCategory[] {
  if (payload.schemaVersion === 1) {
    return ['keybinds', 'session-actions'];
  }

  const explicitCategories = normalizeCategories(payload.categories);
  return explicitCategories.length > 0 ? explicitCategories : inferPayloadCategories(payload);
}

function isCategorySelected(selectedCategories: ExportCategory[], category: ExportCategory): boolean {
  return selectedCategories.includes(category);
}

function cloneSessionZoomLevels(sessionZoomLevels?: Record<string, number>): Record<string, number> {
  return cloneValue(sessionZoomLevels ?? {});
}

function getSessionActionItemCount(sessionActions: NeuzConfig['sessionActions']): number {
  return (sessionActions ?? []).reduce((total, sessionActionGroup) => total + (sessionActionGroup.actions?.length ?? 0), 0);
}

function getKeybindItemCount(keyBinds: NeuzConfig['keyBinds'], keyBindProfiles: NeuzConfig['keyBindProfiles']): number {
  return (keyBinds ?? []).length + (keyBindProfiles ?? []).length;
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

  if (isCategorySelected(selectedCategories, 'ui-layout')) {
    if (config.window !== undefined) {
      payload.window = cloneValue(config.window);
    }
    payload.sessionZoomLevels = cloneSessionZoomLevels(config.sessionZoomLevels);
    if (config.fullscreen !== undefined) {
      payload.fullscreen = cloneValue(config.fullscreen);
    }
  }

  if (isCategorySelected(selectedCategories, 'general-settings')) {
    payload.autoSaveSettings = config.autoSaveSettings;
    payload.defaultLaunchMode = config.defaultLaunchMode;
    if (config.userAgent !== undefined) {
      payload.userAgent = config.userAgent;
    }
    payload.titleBarButtons = cloneValue(config.titleBarButtons);
  }

  if (isCategorySelected(selectedCategories, 'quest-log')) {
    payload.questLogTemplates = [];
  }

  return payload;
}

export function getDefaultCategorySelection(): Record<ExportCategory, boolean> {
  return {
    keybinds: true,
    'session-actions': true,
    'ui-layout': true,
    'general-settings': true,
    'quest-log': false,
  };
}

export function getCategoryCountLabel(config: NeuzConfig, category: ExportCategory): string {
  switch (category) {
    case 'keybinds':
      return `${getKeybindItemCount(config.keyBinds, config.keyBindProfiles)} item(s)`;
    case 'session-actions':
      return `${getSessionActionItemCount(config.sessionActions)} action(s)`;
    case 'ui-layout': {
      const zoomCount = Object.keys(config.sessionZoomLevels ?? {}).length;
      const layoutPieces = [
        config.window ? 'window' : null,
        zoomCount > 0 ? `${zoomCount} zoom level(s)` : null,
        config.fullscreen ? 'fullscreen' : null,
      ].filter(Boolean);
      return layoutPieces.length > 0 ? layoutPieces.join(', ') : 'layout defaults';
    }
    case 'general-settings': {
      const enabledSettings = [
        'autoSaveSettings',
        'defaultLaunchMode',
        config.userAgent !== undefined ? 'userAgent' : null,
        'titleBarButtons',
        config.fullscreen ? 'fullscreen' : null,
      ].filter(Boolean);
      return `${enabledSettings.length} setting(s)`;
    }
    case 'quest-log':
      return 'disabled placeholder';
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

function getImportedListItems(payload: ConfigImportPayload, category: 'keybinds' | 'session-actions') {
  if (category === 'keybinds') {
    return {
      keyBinds: (payload as ConfigExportPayloadV2).keyBinds ?? [],
      keyBindProfiles: (payload as ConfigExportPayloadV2).keyBindProfiles ?? [],
    };
  }

  return {
    sessionActions: (payload as ConfigExportPayloadV2).sessionActions ?? [],
  };
}

function getLocalListItems(config: NeuzConfig, category: 'keybinds' | 'session-actions') {
  if (category === 'keybinds') {
    return {
      keyBinds: config.keyBinds ?? [],
      keyBindProfiles: config.keyBindProfiles ?? [],
    };
  }

  return {
    sessionActions: config.sessionActions ?? [],
  };
}

function getObjectPreviewCounts(payload: ConfigImportPayload, category: 'ui-layout' | 'general-settings') {
  if (category === 'ui-layout') {
    const layoutPayload = payload as ConfigExportPayloadV2;
    return {
      totalCount: ['window', 'sessionZoomLevels', 'fullscreen']
        .filter((field) => layoutPayload[field as keyof ConfigExportPayloadV2] !== undefined)
        .length,
    };
  }

  const settingsPayload = payload as ConfigExportPayloadV2;
  return {
    totalCount: ['autoSaveSettings', 'defaultLaunchMode', 'userAgent', 'titleBarButtons']
      .filter((field) => settingsPayload[field as keyof ConfigExportPayloadV2] !== undefined)
      .length,
  };
}

export function computeCategoryPreview(
  payload: ConfigImportPayload,
  selectedCategories: ExportCategory[],
  currentConfig: NeuzConfig,
): CategoryPreviewResult[] {
  const previewCategories = selectedCategories.filter((category) => category !== 'quest-log');
  const importedCategories = new Set(getImportCategories(payload));
  const knownSessionIds = new Set((currentConfig.sessions ?? []).map((session) => session.id));

  return previewCategories.map((category) => {
    if (!importedCategories.has(category)) {
      return {
        category,
        foundInFile: false,
        type: category === 'ui-layout' || category === 'general-settings' ? 'object' : 'list',
      } satisfies CategoryPreviewResult;
    }

    if (category === 'ui-layout' || category === 'general-settings') {
      const {totalCount} = getObjectPreviewCounts(payload, category);
      const preview: CategoryPreviewResult = {
        category,
        foundInFile: true,
        type: 'object',
        totalCount,
        willReplace: true,
      };

      if (category === 'ui-layout') {
        const sessionZoomLevels = (payload as ConfigExportPayloadV2).sessionZoomLevels ?? {};
        const skippedSessionIds = Object.keys(sessionZoomLevels).filter((sessionId) => !knownSessionIds.has(sessionId));
        if (skippedSessionIds.length > 0) {
          preview.skippedSessionIds = skippedSessionIds;
        }
      }

      return preview;
    }

    const importedListItems = getImportedListItems(payload, category);
    const localListItems = getLocalListItems(currentConfig, category);

    if (category === 'keybinds') {
      const importedKeyBinds = importedListItems.keyBinds;
      const importedProfiles = importedListItems.keyBindProfiles;
      const existingKeyBindKeys = new Set((localListItems.keyBinds ?? []).map((bind) => String(bind.key ?? '').trim().toLowerCase()));
      const existingProfileIds = new Set((localListItems.keyBindProfiles ?? []).map((profile) => profile.id));
      const totalCount = importedKeyBinds.length + importedProfiles.length;
      const conflictCount = importedKeyBinds.filter((bind) => existingKeyBindKeys.has(String(bind.key ?? '').trim().toLowerCase())).length
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
  });
}

export function getSelectedCategories(selection: Record<ExportCategory, boolean>): ExportCategory[] {
  return exportCategoryOrder.filter((category) => category !== 'quest-log' && selection[category]);
}
