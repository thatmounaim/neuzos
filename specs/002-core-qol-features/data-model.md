# Data Model: Core QoL — Health Monitor, Config Portability & Per-Session Zoom

**Phase**: 1 — Design
**Branch**: `002-core-qol-features`
**Date**: 2026-04-20

---

## Existing Types (unchanged)

These types already exist in `src/renderer/src/lib/types.ts` and are referenced but not modified:

```ts
type NeuzSession           // { id, label, icon, ... }
type SessionAction         // { id, icon, label, ingameKey, castTime, cooldown, ... }
type SessionActions        // { sessionId, actions: SessionAction[] }
type NeuzKeybind           // { key, event, args? }
type NeuzKeyBindProfile    // { id, name, keybinds: NeuzKeybind[] }
type NeuzConfig            // top-level config object (will gain sessionZoomLevels — see below)
```

---

## New / Modified Types

### 1. `NeuzConfig` — extended field (persisted)

**File**: `src/renderer/src/lib/types.ts`
**Change**: Add optional field `sessionZoomLevels` to `NeuzConfig`.

```ts
// Existing NeuzConfig gains:
sessionZoomLevels?: { [sessionId: string]: number };
```

- Keys are session IDs (strings matching `NeuzSession.id`).
- Values are zoom factors in the range [0.5, 1.5].
- Optional with `{}` default in `defaultNeuzosConfig` in `src/main/index.ts`.
- Sessions without an entry default to zoom factor `1.0` at runtime.

---

### 2. `SessionHealthStatus` — runtime enum (not persisted)

**File**: `src/renderer/src/lib/types.ts`

```ts
export type SessionHealthStatus =
  | 'healthy'
  | 'crashed'       // render-process-gone
  | 'load-failed'   // did-fail-load (genuine errors only)
  | 'unresponsive'; // unresponsive event (recoverable)
```

---

### 3. `SessionHealthState` — runtime state (not persisted)

Lives as local `$state` variables inside each `NeuzClient.svelte` instance. No shared context needed — each webview pane manages its own health.

```ts
// Inside NeuzClient.svelte (Svelte 5 $state runes)
let healthStatus: SessionHealthStatus = $state('healthy');
let healthDetail: string = $state('');   // human-readable crash reason or error description
```

State transitions:

| Event | `healthStatus` | `healthDetail` |
|-------|---------------|----------------|
| Session starts (initial) | `'healthy'` | `''` |
| `render-process-gone` | `'crashed'` | `e.reason` (e.g. "crashed", "oom", "killed") |
| `did-fail-load` (filtered) | `'load-failed'` | `${e.errorCode}: ${e.errorDescription}` |
| `unresponsive` | `'unresponsive'` | `''` |
| `responsive` | `'healthy'` | `''` |
| `did-finish-load` (after reload) | `'healthy'` | `''` |
| `stopClient()` called | reset to `'healthy'` | `''` |

---

### 4. `ConfigExportPayload` — serialised file format

**File**: `src/renderer/src/lib/types.ts`

```ts
export type ConfigExportPayload = {
  schemaVersion: 1;                          // literal 1 for current schema
  exportedAt: string;                        // ISO 8601 timestamp
  sessionActions: SessionActions[];          // full sessionActions array
  keyBinds: NeuzKeybind[];                   // global keybinds
  keyBindProfiles: NeuzKeyBindProfile[];     // all profiles
  activeKeyBindProfileId: string | null;     // currently active profile ID
};
```

**Example file** (`neuzos-config-export-2026-04-20.json`):
```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-04-20T12:00:00.000Z",
  "sessionActions": [
    {
      "sessionId": "session-1",
      "actions": [
        { "id": "act-1", "icon": { "slug": "skill_001" }, "label": "Heal", "ingameKey": "F1", "castTime": 0, "cooldown": 3000 }
      ]
    }
  ],
  "keyBinds": [
    { "key": "ctrl+1", "event": "send_to_receiver" }
  ],
  "keyBindProfiles": [
    { "id": "default", "name": "Default", "keybinds": [] }
  ],
  "activeKeyBindProfileId": "default"
}
```

---

### 5. `ConfigImportResult` — IPC return type (internal)

Returned by the `config.import` IPC handler to the Renderer before the user confirms.

```ts
type ConfigImportResult =
  | { valid: true;  payload: ConfigExportPayload; warnings: string[] }
  | { valid: false; error: string };
```

- `warnings` examples: "3 session actions reference unknown session IDs", "Schema version 1 matches — no compatibility issues"
- `error` examples: "File too large (max 5 MB)", "Missing required field: sessionActions", "Invalid JSON"

---

### 6. `ConfigApplyImportArgs` — IPC request type (internal)

Sent by the Renderer to the `config.apply_import` handler:

```ts
type ConfigApplyImportArgs = {
  payload: ConfigExportPayload;
  mode: 'replace' | 'merge';
};
```

**Merge semantics** (per clarification Q1):
- `sessionActions`: For each imported `SessionActions` entry, if an action with the same `id` already exists in the current config's session actions, skip it. Non-matching IDs are appended.
- `keyBinds`: If an imported `NeuzKeybind` with the same `key` already exists, skip it.
- `keyBindProfiles`: If an imported `NeuzKeyBindProfile` with the same `id` already exists, skip it.
- `activeKeyBindProfileId`: On merge, only update if the current value is `null`.

**Replace semantics**: Overwrite `sessionActions`, `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId` entirely with imported values.

---

## `defaultNeuzosConfig` additions (Main process)

**File**: `src/main/index.ts` — `defaultNeuzosConfig` object gains:

```ts
sessionZoomLevels: {}   // empty map — all sessions default to 1.0 at runtime
```

---

## Settings.svelte `loadConfig()` additions

The `loadConfig()` function in `Settings.svelte` gains:

```ts
neuzosConfig.sessionZoomLevels = conf.sessionZoomLevels ?? {};
```
