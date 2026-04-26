# Tasks: Core QoL — Health Monitor, Config Portability & Per-Session Zoom

**Input**: `specs/002-core-qol-features/` — spec.md, plan.md, research.md, data-model.md, contracts/ipc-channels.md, quickstart.md
**Branch**: `002-core-qol-features`
**Date**: 2026-04-20

> **Tests**: No automated tests in this project (manual only per plan.md). Test criteria documented in quickstart.md.
> **Format**: `- [ ] [ID] [P?] [Story?] Description — file path`
> - **[P]**: Parallelisable (different files, no incomplete dependencies)
> - **[Story]**: US1 / US2 / US3 — maps to user stories in spec.md
> - **[IPC]**: New `ipcMain.handle` channel; must follow `<scope>.<action>` convention
> - **[CONFIG]**: Config schema change; must update `defaultNeuzosConfig` and/or Settings load
> - **[CLEANUP]**: Listener removal / teardown path

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Shared type definitions and bridge stubs that ALL three user stories depend on. Must be complete before any story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 [CONFIG] Add `SessionHealthStatus`, `ConfigExportPayload`, `ConfigImportResult`, `ConfigApplyImportArgs` types; add `sessionZoomLevels?: { [sessionId: string]: number }` to `NeuzConfig`; extend the `sessionsLayoutsRef` session-level type in `MainWindowState` with `healthStatus?: SessionHealthStatus` and `healthDetail?: string` (health state is stored here, not in local $state, so it survives layout tab switches and component remounts) — `src/renderer/src/lib/types.ts`

- [X] T002 Add `neuzosBridge.sessions.setZoom(sessionId, zoomLevel)` method and `neuzosBridge.backup` namespace with `export()`, `import()`, `applyImport(payload, mode)` bridge methods (all calling `electronApi?.invoke(...)` with `Promise.resolve` fallbacks) — `src/renderer/src/lib/core.ts`

**Checkpoint**: Types and bridge stubs exist — all three user story phases can now begin independently.

---

## Phase 2: User Story 1 — Session Health Monitor (Priority: P1) 🎯 MVP

**Goal**: Detect webview crashes, load failures, and unresponsiveness in each session pane. Show a full-pane overlay with a one-click reload button on crash/failure; show a non-blocking amber indicator on unresponsive.

**Independent Test**: Start two sessions. Force-crash one webview renderer. Confirm only that pane shows the full-pane error overlay with "Reload Session". Click it — confirm the session reloads and the overlay clears. See `quickstart.md` § Feature 1 for full steps.

- [X] T003 [US1] Import `SessionHealthStatus` from `$lib/types`; in the `onMount` block (where `sessionsLayoutsRef[session.id]` is initialised), also initialise `sessionsLayoutsRef[session.id].healthStatus = 'healthy'` and `sessionsLayoutsRef[session.id].healthDetail = ''` if not already set (use `??=` or guard); derive local readable aliases `let healthStatus = $derived(mainWindowState.sessionsLayoutsRef[session.id]?.healthStatus ?? 'healthy')` and `let healthDetail = $derived(mainWindowState.sessionsLayoutsRef[session.id]?.healthDetail ?? '')` for use in the template — `src/renderer/src/components/Shared/NeuzClient.svelte`

- [X] T004 [US1] In `startClient()` after the `tick()` call, define named handler functions and attach four webview event listeners. All handlers write to `mainWindowState.sessionsLayoutsRef[session.id]` (not local vars): `render-process-gone` → set `.healthStatus = 'crashed'`, `.healthDetail = e.reason`; `did-fail-load` → if `e.errorCode !== -3 && e.isMainFrame` then set `.healthStatus = 'load-failed'`, `.healthDetail = \`${e.errorCode}: ${e.errorDescription}\``; `unresponsive` → set `.healthStatus = 'unresponsive'`; `responsive` → reset `.healthStatus = 'healthy'`, `.healthDetail = ''` — `src/renderer/src/components/Shared/NeuzClient.svelte`

- [X] T005 [US1] [CLEANUP] Store the four named handler references outside `startClient()` scope; add an `onDestroy` call (import from `svelte`) that removes all four listeners via `getWebview()?.removeEventListener(...)` for each — `src/renderer/src/components/Shared/NeuzClient.svelte`

- [X] T006 [US1] In the `{#if started}` template block, add a full-pane overlay `{#if healthStatus === 'crashed' || healthStatus === 'load-failed'}`: `absolute inset-0 z-50` div with centred layout, `AlertTriangle` lucide icon, `healthDetail` text, and a button labelled "Reload Session" (crash) or "Retry" (load-failed) calling `getWebview()?.reload()` — `src/renderer/src/components/Shared/NeuzClient.svelte`

- [X] T007 [US1] Add amber pulsing unresponsive indicator: `{#if healthStatus === 'unresponsive'}` — `absolute inset-0 z-40 pointer-events-none` div with `animate-pulse` amber border ring (e.g. `ring-2 ring-amber-400`) and a small `Loader` or `AlertCircle` icon badge — `src/renderer/src/components/Shared/NeuzClient.svelte`

- [X] T008 [US1] Add a `did-finish-load` webview listener (named, added alongside the health listeners in T004, removed in T005) that resets `mainWindowState.sessionsLayoutsRef[session.id].healthStatus = 'healthy'` and `.healthDetail = ''`; also reset both in `stopClient()` — `src/renderer/src/components/Shared/NeuzClient.svelte`

**Checkpoint**: US1 fully functional and independently testable. Crash → overlay appears. Reload → overlay clears. Unresponsive → amber ring. Responsive → ring clears.

---

## Phase 3: User Story 2 — Config Import/Export (Priority: P2)

**Goal**: New "Backup" tab in Settings with Export (save JSON) and Import (validate + preview + Replace/Merge) buttons. All file I/O in Main process IPC handlers.

**Independent Test**: Export config, corrupt a field in the file, import it — confirm error toast with descriptive message and config unchanged. Export again, import with Replace — confirm session actions and keybinds restored. See `quickstart.md` § Feature 2.

- [X] T009 [IPC] [US2] Add `config.export` `ipcMain.handle` in `src/main/index.ts`: call `dialog.showSaveDialog` with `defaultPath: 'neuzos-config-export-YYYY-MM-DD.json'` and JSON filter; if canceled return `{ success: false, error: 'canceled' }`; build `ConfigExportPayload` from current in-memory config (only: `schemaVersion: 1`, `exportedAt`, `sessionActions`, `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId`); write via `fs.promises.writeFile`; return `{ success: true, filePath }` — `src/main/index.ts`

- [X] T010 [IPC] [US2] Add `config.import` `ipcMain.handle` in `src/main/index.ts`: call `dialog.showOpenDialog` (openFile, JSON filter); if canceled return `{ valid: false, error: 'canceled' }`; `fs.promises.stat` size guard (reject if `> 5_242_880` bytes); `fs.promises.readFile`; `JSON.parse` (catch SyntaxError); manual structural validation of **6 required fields** — `schemaVersion` (number), `exportedAt` (string), `sessionActions` (array), `keyBinds` (array), `keyBindProfiles` (array), `activeKeyBindProfileId` (string | null) — reject with descriptive error if any field is missing or wrong type; build `warnings[]` (schema version mismatch, orphaned session IDs); return `ConfigImportResult` — `src/main/index.ts`

- [X] T011 [IPC] [US2] Add `config.apply_import` `ipcMain.handle` in `src/main/index.ts`: accept `{ payload: ConfigExportPayload, mode: 'replace' | 'merge' }`; Replace mode overwrites all 4 fields directly; Merge mode applies ID-based deduplication (skip sessionAction entries with matching `id`, skip keyBinds with matching `key`, skip keyBindProfiles with matching `id`, only update `activeKeyBindProfileId` if currently null); call `saveConfig()`; return `{ success: true }` or `{ success: false, error }` — `src/main/index.ts`

- [X] T012 [P] [US2] Create `src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte`: Export button calls `neuzosBridge.backup.export()` — show success toast with file path or error toast; Import button calls `neuzosBridge.backup.import()` — if `valid: true` show inline preview (action count, profile count, warnings list) with "Replace" and "Merge" confirm buttons that call `neuzosBridge.backup.applyImport(payload, mode)`, then call `getContext<() => Promise<void>>('loadConfig')()` (callable exposed by Settings.svelte via T013) to refresh the in-memory config, then show result toast; if `valid: false` show error toast — `src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte`

- [X] T013 [US2] Add `import BackupSettings from './components/SettingsWindow/Tabs/BackupSettings.svelte'`; call `setContext('loadConfig', loadConfig)` immediately after the existing `setContext('neuzosConfig', neuzosConfig)` call (this lets BackupSettings trigger a config reload after import); add `<Tabs.Trigger value="backup">Backup</Tabs.Trigger>` to the tab list; add `<Tabs.Content value="backup" class="h-full overflow-y-auto"><BackupSettings/></Tabs.Content>` — `src/renderer/src/Settings.svelte`

**Checkpoint**: US2 fully functional. Export produces a valid JSON file with the 6 expected fields only. Import validates, previews, and applies with Replace/Merge. Invalid files are rejected without touching config.

---

## Phase 4: User Story 3 — Per-Session Zoom (Priority: P3)

**Goal**: Per-webview zoom factor (0.5x–1.5x, step 0.05) controlled from both the session pane toolbar (+/−/reset) and a slider in Session Settings. Persisted to config keyed by session ID. Re-applied after reload.

**Independent Test**: Set session A to 1.25x, confirm session B unchanged. Restart app — confirm 1.25x restored. Crash session A (relies on US1), reload, confirm zoom is still 1.25x. See `quickstart.md` § Feature 3.

- [X] T014 [CONFIG] [IPC] [US3] Add `sessionZoomLevels: {}` to `defaultNeuzosConfig` in `src/main/index.ts`; add `config.set_session_zoom` `ipcMain.handle`: validate `sessionId` (non-empty string) and `zoomLevel` (number in [0.5, 1.5]); set `config.sessionZoomLevels[sessionId] = zoomLevel`; call `saveConfig()`; return `{ success: true }` or `{ success: false, error }` — `src/main/index.ts`

- [X] T015 [P] [US3] In `loadConfig()`, add `neuzosConfig.sessionZoomLevels = conf.sessionZoomLevels ?? {}` after the existing field assignments — `src/renderer/src/Settings.svelte`

- [X] T016 [US3] Add `let zoomLevel: number = $state(mainWindowState.config?.sessionZoomLevels?.[session.id] ?? 1.0)`; add `$effect(() => { getWebview()?.setZoomFactor(zoomLevel); })`; extend the `did-finish-load` named handler from T008 to also re-apply `getWebview()?.setZoomFactor(zoomLevel)` after resetting health state — `src/renderer/src/components/Shared/NeuzClient.svelte`

- [X] T017 [US3] Add zoom toolbar to the session pane (visible alongside the RadioTower button area): "−" button (disabled when `zoomLevel <= 0.5`) decrements by 0.05; "+" button (disabled when `zoomLevel >= 1.5`) increments by 0.05; value label showing `${(zoomLevel * 100).toFixed(0)}%`; reset button returning to 1.0; each change calls `neuzosBridge.sessions.setZoom(session.id, zoomLevel)` — `src/renderer/src/components/Shared/NeuzClient.svelte`

- [X] T018 [P] [US3] In `SessionSettings.svelte`, for each session row add a zoom slider (`<input type="range" min="0.5" max="1.5" step="0.05">`) and reset button bound to `neuzosConfig.sessionZoomLevels?.[session.id] ?? 1.0`; on change call `neuzosBridge.sessions.setZoom(session.id, value)` and update `neuzosConfig.sessionZoomLevels[session.id]` — `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`

**Checkpoint**: US3 fully functional. Zoom changes one session at a time. Persists across restarts. Re-applied after crash-reload. Pane toolbar and Settings slider stay in sync.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup verification and listener audit across all three features.

- [X] T019 [CLEANUP] Audit `NeuzClient.svelte` to ensure the single `onDestroy` block removes ALL named webview listeners added across T004/T005/T008: `render-process-gone`, `did-fail-load`, `unresponsive`, `responsive`, `did-finish-load`, and the existing `ipc-message` listener. Confirm no duplicate `did-finish-load` handler registrations between health (T008) and zoom (T016) — consolidate into one named handler if needed — `src/renderer/src/components/Shared/NeuzClient.svelte`

---

## Dependency Graph

```
T001 (types.ts)
 └─► T002 (core.ts bridge)
      ├─► US1: T003 → T004 → T005 → T006 → T007 → T008
      ├─► US2: T009 → T010 → T011  (main/index.ts, sequential)
      │         T012 (BackupSettings.svelte, parallel with T009-T011)
      │         T013 (Settings.svelte, depends on T012)
      └─► US3: T014 (main/index.ts)
               T015 (Settings.svelte, parallel with T014)
               T016 → T017 (NeuzClient.svelte, after US1 T008)
               T018 (SessionSettings.svelte, parallel with T016-T017)

T019 (cleanup audit, after all US1+US3 NeuzClient tasks)
```

---

## Parallel Execution Examples

**US2 (Config Import/Export)**:
```
T009 → T010 → T011    # main/index.ts IPC handlers (sequential, same file)
T012                   # BackupSettings.svelte (parallel with above, different file)
         └─► T013      # Settings.svelte tab registration (after T012)
```

**US3 (Per-Session Zoom)**:
```
T014                   # main/index.ts IPC handler
T015                   # Settings.svelte loadConfig (parallel, different file)
T016 → T017            # NeuzClient.svelte state + toolbar
T018                   # SessionSettings.svelte slider (parallel with T016-T017)
```

---

## Implementation Strategy

**Recommended MVP scope**: Ship US1 (T001–T008, T019) first. Session crash recovery is P1 and the highest-impact stability fix. It is purely Renderer-side and can be delivered without any Main process changes.

**Incremental delivery order**:
1. **MVP**: T001 → T002 → T003–T008 → T019 (US1 complete: health monitor)
2. **Increment 2**: T009–T013 (US2 complete: backup/portability)
3. **Increment 3**: T014–T018 (US3 complete: per-session zoom)

**Notes for implementer**:
- `NeuzClient.svelte` is touched by both US1 (T003–T008) and US3 (T016–T017). Complete all US1 tasks before starting US3 tasks in that file to avoid merge conflicts with yourself.
- The `did-finish-load` listener is shared between US1 (health reset) and US3 (zoom re-apply). T008 creates it; T016 extends it. Do not register it twice — T016 should modify the existing handler from T008 rather than adding a second `did-finish-load` listener.
- `src/main/index.ts` is touched by T009–T011 (US2) and T014 (US3). All are sequential additions of new `ipcMain.handle` blocks. Each can be appended independently with minimal conflict risk.

---

## Task Count Summary

| Phase | Story | Tasks | Parallel Opportunities |
|-------|-------|-------|----------------------|
| Phase 1: Foundational | — | 2 (T001–T002) | T001 and T002 are different files but T002 imports from T001 |
| Phase 2: US1 Health Monitor | US1 (P1) | 6 (T003–T008) | None — all in NeuzClient.svelte |
| Phase 3: US2 Config Import/Export | US2 (P2) | 5 (T009–T013) | T012 ‖ T009–T011 |
| Phase 4: US3 Per-Session Zoom | US3 (P3) | 5 (T014–T018) | T015 ‖ T014; T018 ‖ T016–T017 |
| Phase 5: Polish | — | 1 (T019) | — |
| **Total** | | **19 tasks** | |
