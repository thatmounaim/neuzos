# Data Model: Modular & Secure Configuration Export/Import

**Feature**: `002-01-modular-config-export-import`
**Date**: 2026-04-21

---

## Entities

### ExportCategory (enum-like string union)

Represents a selectable unit of config data for export/import.

| Value | Type | Config Keys Covered |
|---|---|---|
| `"keybinds"` | List-based | `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId` |
| `"session-actions"` | List-based | `sessionActions` |
| `"ui-layout"` | Object-based (Full Replace) | `window`, `sessionZoomLevels`, `fullscreen` |
| `"general-settings"` | Object-based (Full Replace) | `autoSaveSettings`, `defaultLaunchMode`, `userAgent`, `titleBarButtons` |
| `"quest-log"` | List-based (stub, empty in v2) | _(reserved)_ |

**Conflict semantics**:
- **List-based**: Supports item-level diff → `new`, `conflict`, `total` counts in preview.
- **Object-based**: Always Full Replace. No item-level merge offered. Preview explains this.

---

### ConfigExportPayloadV2 (extends existing `ConfigExportPayload`)

```typescript
// Existing (schemaVersion: 1)
type ConfigExportPayload = {
  schemaVersion: 1;
  exportedAt: string;
  sessionActions: SessionActions[];
  keyBinds: NeuzKeybind[];
  keyBindProfiles: NeuzKeyBindProfile[];
  activeKeyBindProfileId: string | null;
}

// New (schemaVersion: 2) — adds optional category fields + metadata
type ConfigExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  categories: ExportCategory[];       // which categories are present
  _sanitized?: true;                  // set if sanitization removed any values

  // Keybinds & Hotkeys (category: "keybinds")
  keyBinds: NeuzKeybind[];
  keyBindProfiles: NeuzKeyBindProfile[];
  activeKeyBindProfileId: string | null;

  // Session Actions (category: "session-actions")
  sessionActions: SessionActions[];

  // UI Layout (category: "ui-layout") — optional
  window?: NeuzConfig['window'];
  sessionZoomLevels?: Record<string, number>;
  fullscreen?: NeuzConfig['fullscreen'];

  // General Settings (category: "general-settings") — optional
  autoSaveSettings?: boolean;
  defaultLaunchMode?: NeuzConfig['defaultLaunchMode'];
  userAgent?: string;
  titleBarButtons?: NeuzConfig['titleBarButtons'];

  // Quest Log (category: "quest-log") — placeholder
  questLogTemplates?: never[];        // always empty array in v2
}
```

**Backwards compatibility**: v1 files (`schemaVersion: 1`) are still valid. They are treated as implicitly covering `"keybinds"` + `"session-actions"` only. All other categories show "Not found in file" in the preview.

---

### ConfigApplyImportArgsV2 (extends existing `ConfigApplyImportArgs`)

```typescript
// Existing
type ConfigApplyImportArgs = {
  payload: ConfigExportPayload;
  mode: 'replace' | 'merge';
}

// New
type ConfigApplyImportArgsV2 = {
  payload: ConfigExportPayloadV2;
  mode: 'replace' | 'merge';
  categories: ExportCategory[];       // which categories to apply (user-selected subset)
}
```

---

### CategoryPreviewResult

Computed at import time (renderer-side) from the import payload against the current local config.

```typescript
type CategoryPreviewResult = {
  category: ExportCategory;
  foundInFile: boolean;               // false → shows "Not found in file"
  type: 'list' | 'object';
  // only populated when foundInFile && type === 'list':
  newCount?: number;
  conflictCount?: number;
  totalCount?: number;
  // only populated when foundInFile && type === 'object':
  skippedSessionIds?: string[];       // session IDs not found locally
  willReplace?: boolean;              // always true for object-based
}
```

---

### SanitizationResult

Returned by `sanitizeConfigForExport(payload)`.

```typescript
type SanitizationResult = {
  payload: ConfigExportPayloadV2;     // sanitized copy
  sanitized: boolean;                 // true if any value was removed/replaced
}
```

**Sanitization rules**:
1. Remove field `partitionOverwrite` from any session entry (always).
2. Remove field `srcOverwrite` from any session entry if value matches local path pattern.
3. Replace any `string` value matching `/^[A-Za-z]:\\|^\/home\/|^\/Users\//` with `""`.
4. Set `_sanitized: true` on the payload root if rule 2 or 3 fired.

---

## State Transitions

### Import Flow (updated)

```
User checks categories
       ↓
User clicks Import
       ↓
[Main] config.import → file dialog → validate JSON → return payload + warnings
       ↓
[Renderer] compute CategoryPreviewResult[] per selected category
           (diff imported payload vs. current config)
       ↓
Preview shown:
  - List categories: new / conflict / total counts
  - Object categories: "Will replace" badge + skipped session IDs warning
  - Missing categories: "Not found in file" (disabled)
       ↓
User selects Replace or Merge
       ↓
User confirms (Apply button)
       ↓
[Main] config.apply_import (v2 args with categories)
       → apply selected categories only
       → object-based: always replace
       → list-based: replace or merge per mode
       → saveConfig() + event.config_changed
       ↓
[Renderer] App.svelte event.config_changed handler
           → updates mainWindowState.config
           → imperatively applies zoom to running webviews
```

### Export Flow (updated)

```
User checks categories (≥ 1 required)
       ↓
User clicks Export
       ↓
[Renderer] build ConfigExportPayloadV2 from current config
           filtered to selected categories only
       ↓
[Renderer] sanitizeConfigForExport(payload)
           → strips partitionOverwrite, srcOverwrite, local paths
           → sets _sanitized: true if anything removed
       ↓
[Main] config.export → Save dialog → write JSON to disk
       (receives pre-filtered, sanitized payload)
       ↓
If _sanitized: show toast notice "Some values were sanitized for safety"
```

---

## Validation Rules

| Rule | Where | Condition | Action |
|---|---|---|---|
| At least one category selected | Renderer (UI) | `selectedCategories.length === 0` | Disable Export button |
| File size | Main | `stats.size > 5 * 1024 * 1024` | Return `{valid: false, error: '...'}` |
| Valid JSON | Main | `JSON.parse` throws | Return `{valid: false, error: '...'}` |
| Schema version | Main | `schemaVersion > 2` | Add warning, continue |
| Session ID match (UI Layout) | Renderer | `sessionZoomLevels` key not in `config.sessions` | Skip entry, add to `skippedSessionIds` |
| Sanitization path pattern | Renderer | `/^[A-Za-z]:\\|^\/home\/|^\/Users\//` | Replace with `""`, set `_sanitized` |
| Apply categories filter | Main | Category not in `args.categories` | Skip that category block entirely |
