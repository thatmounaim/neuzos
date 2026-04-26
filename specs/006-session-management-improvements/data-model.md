# Data Model: Session Management Improvements

**Phase**: 1 — Design  
**Date**: 2026-04-26  
**Feature**: [spec.md](spec.md)

---

## Modified Types

### `NeuzSession` — add `autoDeleteCache`

**File**: `src/renderer/src/lib/types.ts`

```typescript
export type NeuzSession = {
  id: string;
  label: string;
  icon: NeuzIcon;
  floatable?: boolean;
  srcOverwrite?: string;
  partitionOverwrite?: string;
  autoDeleteCache?: boolean;   // NEW — defaults to false/undefined (backward compatible)
}
```

**Persistence**: Stored inside `neuzosConfig.sessions[]` in `config.json`. Absence of the field is treated as `false` everywhere it is read.

---

### `NeuzConfig` — add `autoDeleteAllCachesOnStartup`

**File**: `src/renderer/src/lib/types.ts`

```typescript
export type NeuzConfig = {
  // ... existing fields unchanged ...
  autoDeleteAllCachesOnStartup?: boolean;  // NEW — defaults to false/undefined
}
```

**Persistence**: Stored at the root of `config.json`. The `defaultNeuzosConfig` object in `src/main/index.ts` gains `autoDeleteAllCachesOnStartup: false`.

---

## Runtime State (main process only — not persisted)

### `runningSessionIds: Set<string>`

**File**: `src/main/index.ts` (module-level, alongside existing `mouseBindWebContents`)

```typescript
const runningSessionIds = new Set<string>();
```

**Lifecycle**:
- Added: when `ipcMain.on("session.start")` fires for a given `sessionId`.
- Removed: when `ipcMain.on("session.stop")` fires for a given `sessionId`.
- Not persisted: cleared on app restart (correct — running state is ephemeral).

---

## Existing Types — No Changes Required

| Type | Reason |
|------|--------|
| `NeuzSessionGroup` | Already defined and fully implemented in base branch. |
| `ConfigExportPayloadV2` | Already includes `sessionGroups?: NeuzSessionGroup[]`. Auto-delete cache settings are under `general-settings` category implicitly via `autoDeleteAllCachesOnStartup`, but this field does not need to be exported/imported (it is a general setting, not a session-level or layout artifact). |

> **Note on `autoDeleteAllCachesOnStartup` export category**: This field controls a startup behavior preference. It belongs in the `general-settings` export category. `cloneForExport` in `configExport.ts` already copies all `general-settings` fields by name — it will need to be extended to include `autoDeleteAllCachesOnStartup` when the `general-settings` category is selected. The `inferPayloadCategories` function in both `src/main/index.ts` and `configExport.ts` already uses `autoSaveSettings` as a signal for `general-settings` — `autoDeleteAllCachesOnStartup` is co-located so no inference changes are needed.

---

## Validation Rules

| Field | Rule |
|-------|------|
| `autoDeleteCache` | Boolean. Treated as `false` when absent. No validation required — Switch toggle in UI guarantees valid values. |
| `autoDeleteAllCachesOnStartup` | Boolean. Treated as `false` when absent. No validation required. |
| `session.clone` source ID | Must pass `/^[a-zA-Z0-9_\-]+$/` — same regex already used in `session.delete` and `session.clear_storage` handlers. |
| Clone destination path | Must start with `<userData>/Partitions/persist/` + `path.sep` after `path.resolve`. |
