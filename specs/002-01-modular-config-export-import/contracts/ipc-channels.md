# IPC Channel Contracts: Modular Config Export/Import (v2)

**Feature**: `002-01-modular-config-export-import`
**Schema version**: v2 (extends v1)

---

## Modified Channels

### `config.export` — MODIFIED

**Direction**: Renderer → Main

**Current signature**: `ipcMain.handle("config.export", async (event))` — reads `neuzosConfig` directly.

**New signature**: `ipcMain.handle("config.export", async (event, payload: ConfigExportPayloadV2))` — receives pre-filtered, pre-sanitized payload from renderer.

**Request**: `ConfigExportPayloadV2` — the filtered and sanitized payload (renderer builds it).

**Response**:
```typescript
{ success: true; filePath: string }
| { success: false; error: string }
```

**Change rationale**: Renderer now owns category selection and sanitization. Main only handles the file dialog and disk write.

**Backwards compatibility**: The handler is updated in-place. The settings window (`BackupSettings.svelte`) must pass the payload.

---

### `config.apply_import` — MODIFIED

**Direction**: Renderer → Main

**Current args type**:
```typescript
type ConfigApplyImportArgs = {
  payload: ConfigExportPayload;
  mode: 'replace' | 'merge';
}
```

**New args type**:
```typescript
type ConfigApplyImportArgsV2 = {
  payload: ConfigExportPayloadV2;
  mode: 'replace' | 'merge';
  categories: ExportCategory[];   // which categories to apply
}
```

**Response** (unchanged):
```typescript
{ success: true; added?: { actions: number; binds: number; profiles: number } }
| { success: false; error: string }
```

**New apply logic per category**:
- `"keybinds"`: existing replace/merge logic on `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId`
- `"session-actions"`: existing replace/merge logic on `sessionActions`
- `"ui-layout"`: always full replace of `window`, `sessionZoomLevels`, `fullscreen`; session IDs not present in local config are skipped for `sessionZoomLevels`
- `"general-settings"`: always full replace of `autoSaveSettings`, `defaultLaunchMode`, `userAgent`, `titleBarButtons`
- `"quest-log"`: no-op in v2 (stub)

**Categories not in `args.categories`** are skipped entirely, even if present in the payload.

---

## Unchanged Channels

### `config.import`

No changes. The handler still validates JSON structure and returns the raw payload with warnings. The renderer now computes per-category conflict counts (CategoryPreviewResult) locally.

### `config.load`, `config.save`, `config.set_session_zoom`

No changes.

---

## New Type Exports (src/renderer/src/lib/types.ts)

```typescript
export type ExportCategory =
  | 'keybinds'
  | 'session-actions'
  | 'ui-layout'
  | 'general-settings'
  | 'quest-log'

export type ConfigExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  categories: ExportCategory[];
  _sanitized?: true;

  // keybinds
  keyBinds: NeuzKeybind[];
  keyBindProfiles: NeuzKeyBindProfile[];
  activeKeyBindProfileId: string | null;

  // session-actions
  sessionActions: SessionActions[];

  // ui-layout (optional)
  window?: NeuzConfig['window'];
  sessionZoomLevels?: Record<string, number>;
  fullscreen?: NeuzConfig['fullscreen'];

  // general-settings (optional)
  autoSaveSettings?: boolean;
  defaultLaunchMode?: NeuzConfig['defaultLaunchMode'];
  userAgent?: string;
  titleBarButtons?: NeuzConfig['titleBarButtons'];

  // quest-log (stub)
  questLogTemplates?: never[];
}

export type ConfigApplyImportArgsV2 = {
  payload: ConfigExportPayloadV2 | ConfigExportPayload;  // accept both v1 and v2
  mode: 'replace' | 'merge';
  categories: ExportCategory[];
}

export type CategoryPreviewResult = {
  category: ExportCategory;
  foundInFile: boolean;
  type: 'list' | 'object';
  newCount?: number;
  conflictCount?: number;
  totalCount?: number;
  skippedSessionIds?: string[];
  willReplace?: boolean;
}

export type SanitizationResult = {
  payload: ConfigExportPayloadV2;
  sanitized: boolean;
}
```

---

## New Utility (src/renderer/src/lib/utils/ or lib/configExport.ts)

```typescript
// sanitizeConfigForExport(payload): SanitizationResult
// Strips partitionOverwrite, srcOverwrite (local paths), and any string matching
// /^[A-Za-z]:\\|^\/home\/|^\/Users\// — sets _sanitized: true if anything was removed.

// buildExportPayload(config, categories): ConfigExportPayloadV2
// Constructs the filtered payload from the current NeuzConfig and selected categories.

// computeCategoryPreview(payload, categories, currentConfig): CategoryPreviewResult[]
// Computes per-category conflict counts by diffing imported payload against current config.
// For list-based: ID dedup (sessionActions by id, keyBinds by key, profiles by id).
// For object-based: marks willReplace=true, computes skippedSessionIds for sessionZoomLevels.
```
