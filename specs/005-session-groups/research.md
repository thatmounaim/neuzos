# Research: Session Groups

**Feature**: `005-session-groups`  
**Date**: 2026-04-25  
**Status**: Complete — all unknowns resolved

## R-001: Config Persistence Mechanism

**Question**: How is `NeuzConfig` persisted and how do renderer changes reach the file?

**Decision**: Config is serialized to `<userData>/neuzos_config/config.json` via `saveConfig()` in the main process. The renderer saves changes by calling `neuzosBridge.preferences` / `config.save` IPC which sends the full config object as JSON. The main process parses it, calls `saveConfig()`, and broadcasts `event.config_changed`. No incremental patch mechanism exists — the full config object is always sent.

**Implication for this feature**: `sessionGroups` must be a top-level optional field on `NeuzConfig` and will be persisted automatically because the full config round-trips through the renderer's `neuzosConfig` reactive context and is saved on every settings change. No new IPC handler is needed for saves.

**Alternatives considered**: Storing group membership inside `NeuzSession` (e.g., `groupId?: string`). Rejected because it distributes ownership across all session objects, makes re-ordering groups harder (no single ordered array), and makes export/import more complex (groups could not be serialized as a list).

---

## R-002: Session Launcher IPC and Data Flow

**Question**: How does the Session Launcher window receive session data, and what do we need to change to include groups?

**Decision**: The Session Launcher calls `session_launcher.get_sessions` which returns `neuzosConfig.sessions` filtered to exclude browser-partition sessions. The window does not receive the full config. We must add a new `session_launcher.get_groups` IPC handle in main that returns `neuzosConfig.sessionGroups ?? []`.

Because SC-005 requires the launcher to reflect changes while the window remains open, the renderer should also subscribe to the existing `event.config_changed` broadcast and re-fetch groups after settings saves.

**Rationale**: Keeping the existing `get_sessions` contract unchanged avoids breaking the session launch flow. A minimal new handler is the simplest change.

**Alternatives considered**: Modifying `get_sessions` to return `{ sessions, groups }`. Rejected because it changes the existing call's return shape and every consumer would need updating.

---

## R-003: Export/Import Architecture for `ui-layout` Category

**Question**: Where exactly in `configExport.ts` (renderer) and `index.ts` (main) does `ui-layout` data flow, and what is the minimum set of changes to include `sessionGroups`?

**Decision**: Four touch points identified:

| Location | Change |
|----------|--------|
| `renderer/configExport.ts` → `cloneForExport` | Add `payload.sessionGroups = cloneValue(config.sessionGroups ?? [])` inside the `ui-layout` branch |
| `renderer/configExport.ts` → `inferPayloadCategories` | Add `|| Array.isArray(payload.sessionGroups)` to the `ui-layout` condition |
| `renderer/configExport.ts` → `getObjectPreviewCounts` | Include `sessionGroups` in `totalCount` for `ui-layout` preview |
| `main/index.ts` → `applyUiLayout` | Add session group apply logic (replace: overwrite; merge: update-by-id) |
| `main/index.ts` → `inferPayloadCategories` | Add `|| Array.isArray(payload?.sessionGroups)` |
| `main/index.ts` → `config.import` handler | Passthrough `sessionGroups` array from parsed payload |
| `main/index.ts` → `ConfigExportPayloadV2` local type | Add `sessionGroups?: any[]` |

**Rationale**: The `ui-layout` category is already the home for display-state data (window sizes, zoom, fullscreen). Groups are display-only with no launch behavior, so they belong here.

**Alternatives considered**: Creating a new `session-groups` export category. Rejected because it adds category management overhead and the spec explicitly assigns groups to `ui-layout`.

---

## R-004: Inline Name Edit Pattern in Svelte 5

**Question**: What is the simplest Svelte 5 pattern for inline-editable text that reverts to the last valid value on empty blur?

**Decision**: Use an `<input>` element controlled by a local `$state` variable `editingGroupId: string | null`. When a group row enters edit mode, store the current label in a `pendingLabel: string` state variable. On blur or Enter keydown: if `pendingLabel.trim()` is non-empty, commit; otherwise restore the original label. This matches the existing `Input` pattern already used for session labels in `SessionSettings.svelte` (which restores `'Unnamed Session'` on empty change).

**Alternatives considered**: A dedicated `InlineEdit` component. Rejected per the implementation discipline — one-off pattern, no reuse needed.

---

## R-005: Collapsible Section Pattern

**Question**: Is there an existing collapsible component in the project to reuse?

**Decision**: No existing collapsible/accordion component found in the shadcn-svelte imports used by the project. The simplest approach is a plain `$state<Set<string>>` tracking which group ids are collapsed, with a chevron-icon toggle button and a conditional `{#if !collapsed}` block. This requires no new dependency and matches the simplicity mandate.

**Alternatives considered**: `shadcn-svelte` Accordion component. Not installed in the project; importing it would add a dependency for a feature already achievable with two lines of state.
