# IPC Contracts: Core QoL — Health Monitor, Config Portability & Per-Session Zoom

**Phase**: 1 — Design
**Branch**: `002-core-qol-features`
**Date**: 2026-04-20

> Existing channels are unchanged. This document lists **only new channels** introduced by this feature.
> Channel naming follows the `<scope>.<action>` snake_case convention established in the constitution.

---

## New IPC Channels

### `config.set_session_zoom`

**Direction**: Renderer → Main (via `ipcRenderer.invoke`)
**Handler**: `ipcMain.handle` in `src/main/index.ts`
**Purpose**: Persist a per-session zoom level to config JSON.

**Request** (args passed to `invoke`):
```ts
sessionId: string   // ID of the session to update
zoomLevel: number   // Zoom factor in [0.5, 1.5]
```

**Response** (`Promise<{ success: boolean; error?: string }>`):
```ts
{ success: true }
// or
{ success: false, error: "Session ID is required" }
```

**Behaviour**:
1. Validate `sessionId` is a non-empty string; validate `zoomLevel` is a number in [0.5, 1.5]. Return error if not.
2. Set `config.sessionZoomLevels[sessionId] = zoomLevel`.
3. Call `saveConfig()`.
4. Return `{ success: true }`.

**No broadcast needed** — the Renderer maintains local `$state` for instant reactivity; persistence is fire-and-trust.

---

### `config.export`

**Direction**: Renderer → Main (via `ipcRenderer.invoke`)
**Handler**: `ipcMain.handle` in `src/main/index.ts`
**Purpose**: Serialise current config and prompt the user to save a JSON export file.

**Request**: No arguments.

**Response** (`Promise<ConfigExportResponse>`):
```ts
type ConfigExportResponse =
  | { success: true;  filePath: string }
  | { success: false; error: string }   // "canceled" if user dismissed dialog
```

**Behaviour**:
1. Call `dialog.showSaveDialog(settingsWindow, { defaultPath: 'neuzos-config-export-YYYY-MM-DD.json', filters: [{ name: 'JSON', extensions: ['json'] }] })`.
2. If `canceled`, return `{ success: false, error: 'canceled' }`.
3. Build `ConfigExportPayload` from current in-memory config:
   - `schemaVersion: 1`
   - `exportedAt: new Date().toISOString()`
   - `sessionActions: config.sessionActions`
   - `keyBinds: config.keyBinds`
   - `keyBindProfiles: config.keyBindProfiles`
   - `activeKeyBindProfileId: config.activeKeyBindProfileId`
4. Write to `filePath` via `fs.promises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')`.
5. Return `{ success: true, filePath }`.

**Security note**: Only the explicitly listed fields are written. No window dimensions, partition IDs, chromium flags, or file paths are included.

---

### `config.import`

**Direction**: Renderer → Main (via `ipcRenderer.invoke`)
**Handler**: `ipcMain.handle` in `src/main/index.ts`
**Purpose**: Open a file picker, read and validate the selected JSON file, and return the parsed payload for the Renderer to preview before confirming.

**Request**: No arguments.

**Response** (`Promise<ConfigImportResult>`):
```ts
type ConfigImportResult =
  | { valid: true;  payload: ConfigExportPayload; warnings: string[] }
  | { valid: false; error: string }
```

**Behaviour**:
1. Call `dialog.showOpenDialog(settingsWindow, { filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile'] })`.
2. If `canceled` or no file selected, return `{ valid: false, error: 'canceled' }`.
3. `stat` the selected file: if `size > 5_242_880`, return `{ valid: false, error: 'File too large (max 5 MB)' }`.
4. Read file via `fs.promises.readFile(filePath, 'utf-8')`.
5. Parse JSON — if invalid JSON, return `{ valid: false, error: 'Invalid JSON: <parse error message>' }`.
6. Validate structure (manual checks):
   - `schemaVersion` must be `number` → error: "Missing or invalid field: schemaVersion"
   - `exportedAt` must be `string` → error: "Missing or invalid field: exportedAt"
   - `sessionActions` must be `Array` → error: "Missing or invalid field: sessionActions"
   - `keyBinds` must be `Array` → error: "Missing or invalid field: keyBinds"
   - `keyBindProfiles` must be `Array` → error: "Missing or invalid field: keyBindProfiles"
   - If `schemaVersion > 1`, add warning: "This file was exported by a newer version of NeuzOS. Some data may not import correctly."
7. Build `warnings[]`:
   - Count actions referencing session IDs not in `config.sessions` → warning: "N session action set(s) reference unknown session IDs and will be imported as orphaned entries."
8. Return `{ valid: true, payload, warnings }`.

---

### `config.apply_import`

**Direction**: Renderer → Main (via `ipcRenderer.invoke`)
**Handler**: `ipcMain.handle` in `src/main/index.ts`
**Purpose**: Apply a previously validated import payload to the live config and persist to disk.

**Request**:
```ts
args: ConfigApplyImportArgs = {
  payload: ConfigExportPayload;
  mode: 'replace' | 'merge';
}
```

**Response** (`Promise<{ success: boolean; error?: string }>`):
```ts
{ success: true }
// or
{ success: false, error: string }
```

**Behaviour (Replace mode)**:
1. Set `config.sessionActions = payload.sessionActions`.
2. Set `config.keyBinds = payload.keyBinds`.
3. Set `config.keyBindProfiles = payload.keyBindProfiles`.
4. Set `config.activeKeyBindProfileId = payload.activeKeyBindProfileId`.
5. Call `saveConfig()`. Return `{ success: true }`.

**Behaviour (Merge mode)**:
1. **sessionActions**: For each `SessionActions` in `payload.sessionActions`:
   - Find existing entry with same `sessionId`. If none exists, append the whole entry.
   - If exists, merge individual actions: for each action in the imported entry, skip if an action with the same `id` already exists in the current entry; otherwise append.
2. **keyBinds**: For each `NeuzKeybind` in `payload.keyBinds`: skip if a keybind with the same `key` already exists in `config.keyBinds`; otherwise append.
3. **keyBindProfiles**: For each `NeuzKeyBindProfile` in `payload.keyBindProfiles`: skip if a profile with the same `id` already exists; otherwise append.
4. **activeKeyBindProfileId**: Only update if `config.activeKeyBindProfileId` is currently `null`.
5. Call `saveConfig()`. Return `{ success: true }`.

**Error handling**: Wrap in try/catch; return `{ success: false, error: e.message }` on any exception.

---

## neuzosBridge additions (`src/renderer/src/lib/core.ts`)

New methods added to the `neuzosBridge` export:

```ts
// Under neuzosBridge.sessions:
setZoom: (sessionId: string, zoomLevel: number): Promise<{ success: boolean; error?: string }> =>
  electronApi?.invoke("config.set_session_zoom", sessionId, zoomLevel) ?? Promise.resolve({ success: false }),

// New top-level namespace:
backup: {
  export: (): Promise<ConfigExportResponse> =>
    electronApi?.invoke("config.export") ?? Promise.resolve({ success: false, error: 'not initialized' }),

  import: (): Promise<ConfigImportResult> =>
    electronApi?.invoke("config.import") ?? Promise.resolve({ valid: false, error: 'not initialized' }),

  applyImport: (payload: ConfigExportPayload, mode: 'replace' | 'merge'): Promise<{ success: boolean; error?: string }> =>
    electronApi?.invoke("config.apply_import", { payload, mode }) ?? Promise.resolve({ success: false }),
}
```
