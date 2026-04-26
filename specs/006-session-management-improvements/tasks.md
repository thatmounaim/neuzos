# Tasks: Session Management Improvements

**Input**: Design documents from `specs/006-session-management-improvements/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ipc-channels.md ✅, quickstart.md ✅

**Tests**: No automated test suite for this project — manual smoke tests are defined in quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in all descriptions

> **Already implemented** (base branch `005-session-groups` — do NOT re-implement):
> Session Groups full UI (FR-023–FR-031), Session Launcher grouping, export/import round-trip,
> session.delete stop-wait + 5× retry (FR-003/FR-004/FR-034), deletion error dialog (FR-005),
> tooltips on cache-clear/storage-clear/delete buttons (FR-032 partial).

---

## Phase 1: Setup (Foundational Type Changes)

**Purpose**: Add the two new config fields that block both User Stories 1 and 2. Must be complete before any story phase starts.

- [X] T001 Add `autoDeleteCache?: boolean` to `NeuzSession` and `autoDeleteAllCachesOnStartup?: boolean` to `NeuzConfig` in `src/renderer/src/lib/types.ts`

**Checkpoint**: TypeScript types updated — US1 and US2 implementation can begin.

---

## Phase 2: Foundational (Main-Process Bootstrap)

**Purpose**: Wire up the runtime state and default config values in the main process that all subsequent handlers depend on.

**⚠️ CRITICAL**: US1 Phase 3 IPC handler tasks cannot be completed until this phase is done.

- [X] T002 Add `const runningSessionIds = new Set<string>()` module-level declaration alongside existing `mouseBindWebContents` in `src/main/index.ts`
- [X] T003 Add `autoDeleteAllCachesOnStartup: false` to `defaultNeuzosConfig` in `src/main/index.ts`

**Checkpoint**: Foundation ready — US1 and US2 story implementation can now begin.

---

## Phase 3: User Story 1 — Safe Session Deletion and Cloning (Priority: P1) 🎯 MVP

**Goal**: Users can delete running sessions with an explicit stop-warning dialog and clone any session with state preserved, while developers have a secure main-process clone IPC channel.

**Independent Test**: Delete a running session (verify stop-warning dialog, then confirm partition gone); clone a stopped session and a running session (verify clone label, login state preserved in clone, stoppedBeforeClone info shown when applicable). See quickstart.md Smoke Tests 1–4.

### Implementation for User Story 1

- [X] T004 [US1] Update `ipcMain.on("session.start")` handler to call `runningSessionIds.add(sessionId)` and `ipcMain.on("session.stop")` handler to call `runningSessionIds.delete(sessionId)` in `src/main/index.ts`
- [X] T005 [US1] Add `ipcMain.handle("session.get_running_ids", () => [...runningSessionIds])` handler in `src/main/index.ts`
- [X] T006 [US1] Add `ipcMain.handle("session.clone", ...)` handler in `src/main/index.ts` with: (1) sourceId validation against `/^[a-zA-Z0-9_\-]+$/`, (2) stop-wait if source is in `runningSessionIds` (send `event.stop_session` to mainWindow + await 5 000 ms), (3) generate `newId = Date.now().toString()`, (4) path construction + traversal guards (both paths must start with `partitionsBase + path.sep`), (5) `fs.promises.cp` for each of `["IndexedDB", "Local Storage", "Cookies"]` skipping missing entries, (6) return `{ success: true, stoppedBeforeClone, newId }` or `{ success: false, error }` — per `contracts/ipc-channels.md`
- [X] T007 [P] [US1] Add `sessions.getRunningIds(): Promise<string[]>` and `sessions.clone(sourceId: string)` wrapper methods to `neuzosBridge` in `src/renderer/src/lib/core.ts`
- [X] T008 [P] [US1] Add `generateCloneLabel(sourceLabel: string, existingLabels: Set<string>): string` helper function in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte` — sequence: `X (Copy)`, then `X (Copy) (2)`, `X (Copy) (3)`, etc.
- [X] T009 [US1] Update the delete button click handler in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte` to call `neuzosBridge.sessions.getRunningIds()` before opening the confirm dialog and conditionally show a running-session stop-warning variant (FR-002) when the target session is in the returned list — (FR-001 base confirmation dialog already exists in the base branch; only add the running-session warning variant) — ⚠️ Reopened — BUG-007: warning was never visible because `runningSessionIds` was always empty at runtime due to BUG-007; fixed by T021; re-verify after T021 is complete
- [X] T010 [US1] Add clone icon button (use `Copy` or `GitFork` lucide icon) with `<Tooltip>` "Clone session" in the Actions column of each session row in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`, matching the existing action-button pattern
- [X] T011 [US1] Add clone click handler in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`: call `neuzosBridge.sessions.clone(session.id)`, on success build clone config entry (copy all source fields, set `id: result.newId`, set `label: generateCloneLabel(...)`, clear `partitionOverwrite`), insert immediately after source in `neuzosConfig.sessions`, if `result.stoppedBeforeClone` show informational message, then call `neuzosBridge.config.save(neuzosConfig)`; on failure surface the `error` string to the user

**Checkpoint**: User Story 1 fully functional — safe delete with running warning + session clone end-to-end.

---

## Phase 4: User Story 2 — Automatic Cache Lifecycle Controls (Priority: P2)

**Goal**: Users can enable per-session auto-delete cache on stop and a global startup cache-clear toggle, with no impact on login or game state.

**Independent Test**: Enable Auto-Delete Cache on one session, stop it, verify cache gone but login intact; enable global startup toggle, restart app, verify all caches cleared without blocking dialog. See quickstart.md Smoke Tests 5–6.

### Implementation for User Story 2

- [X] T012 [US2] Add startup cache-clear loop in `app.whenReady().then(async () => {...})` after `await loadConfig()` in `src/main/index.ts`: if `neuzosConfig.autoDeleteAllCachesOnStartup`, run `await Promise.all((neuzosConfig.sessions ?? []).map(s => session.fromPartition("persist:" + s.id).clearCache().catch(err => console.warn("Startup cache clear failed for session", s.id, err))))` — per plan.md Implementation Notes
- [X] T013 [P] [US2] In `stopClient()` in `src/renderer/src/components/Shared/NeuzClient.svelte`, after the `started = false` line add: `if (session.autoDeleteCache) { neuzosBridge.sessions.clearCache(session.id) }`
- [X] T014 [P] [US2] Add **Auto-Delete Cache** column to the sessions table in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`: column header wrapped in `<Tooltip>` describing the column purpose; per-row `<Switch>` bound to `session.autoDeleteCache` that calls `neuzosBridge.config.save(neuzosConfig)` on change (FR-018, FR-033)
- [X] T015 [P] [US2] Add **Clear all caches on app startup** `<Switch>` toggle bound to `neuzosConfig.autoDeleteAllCachesOnStartup` in `src/renderer/src/components/SettingsWindow/Tabs/GeneralSettings.svelte`, following the existing Switch pattern used for other boolean settings in that component (FR-021)
- [X] T016 [P] [US2] Add `autoDeleteAllCachesOnStartup` to the `general-settings` category branch of `cloneForExport` in `src/renderer/src/lib/configExport.ts` so it survives config export/import round-trips

**Checkpoint**: User Story 2 fully functional — per-session and global cache lifecycle controls working independently.

---

## Phase 5: User Story 3 — Session Groups (Priority: P3) ✅ Already Implemented

**Goal**: Verify the complete Session Groups implementation from the `005-session-groups` base branch is present and working.

**Independent Test**: Create/rename/reorder/delete groups; assign sessions to groups; verify Session Launcher mirrors Settings order; export and re-import UI layout, confirm groups survive round-trip. See quickstart.md Regression section.

### Verification for User Story 3

- [X] T017 [US3] Verify all Session Groups features are present per the "Already Implemented" section of plan.md: `NeuzSessionGroup` type in `src/renderer/src/lib/types.ts`, `sessionGroups` in `defaultNeuzosConfig` in `src/main/index.ts`, grouped/collapsible UI in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`, group rendering in `src/renderer/src/SessionLauncher.svelte`, and `sessionGroups` handled in `cloneForExport` / `applyUiLayout` — if any are missing, implement the gap

**Checkpoint**: All four user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify action discoverability (US4) and run full smoke-test validation.

- [X] T018 [US4] Audit every action icon in the session row in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte` and confirm all four `<Tooltip>` wrappers are present: "Clear Cache" (pre-existing), "Clear Session Data" (pre-existing), "Delete" (pre-existing), "Clone session" (added in T010); and the "Auto-Delete Cache" column header tooltip (added in T014) — add any missing tooltip wrappers; **this task is required before FR-032 and FR-033 can be considered satisfied**, even if prior phases are shipped
- [ ] T019 Run all 7 smoke tests from `specs/006-session-management-improvements/quickstart.md` against the built app and confirm each passes before marking this feature complete

---

## Phase 7: Bugfix Patch (BUG-006 / BUG-007 / BUG-008 / BUG-009)

**Added**: 2026-04-26 — Runtime defects discovered during manual testing.

- [X] T020 [BUG-006/BUG-008/BUG-009] Remove the `clearStorageData()` block from `ipcMain.handle("session.delete")` in `src/main/index.ts`. Calling `session.fromPartition("persist:" + sessionId).clearStorageData()` after the 5-second stop-wait causes Electron to re-open the partition session object on Windows, which recreates or re-locks the partition folder before `rimraf` runs. This caused silent delete failures (folder remains) and suppressed the error dialog. Fix: delete the `try { const sess = session.fromPartition(...); await sess.clearStorageData() } catch` block entirely — rimraf will remove all data including what `clearStorageData` would have cleared.
- [X] T021 [BUG-007] Replace `neuzosBridge.sessions.stop(sessionId)` with direct `stopClient()` calls in the `listen('event.start_session', ...)` handler in `src/renderer/src/App.svelte`. The IPC `sessions.stop()` was immediately removing the session from `runningSessionIds` in the main process right after `session.start` added it, leaving the set always empty at delete-dialog time. Fix: iterate `mainWindowState.sessionsLayoutsRef[sessionId]?.layouts` and call `stopClient()` on each layout directly (same pattern as the `event.stop_session` handler), which resets the UI without sending `session.stop` IPC.
- [ ] T022 [BUG-006/BUG-007] Smoke-test verification for bugfix patch: (1) start a session, open Settings, delete it — confirm partition folder is gone from `<userData>/Partitions/persist/`; (2) start a session, open Settings, click delete — confirm the running-session warning dialog appears; (3) with a running session, force delete failure (rename folder to lock it) and confirm the error dialog appears.
- [ ] T023 [BUG-010] Smoke-test verification for the delete/cache race: enable Auto-Delete Cache on a session, stop and delete it, and confirm the partition folder does not reappear after rimraf completes; repeat with a queued `session.clear_cache` path to verify the delete guard suppresses folder recreation on Windows.

**Bugfix**: 2026-04-26 — BUG-006/BUG-007/BUG-008/BUG-009 Updated from bugfix patch
**Bugfix**: 2026-04-26 — BUG-010 Updated from bugfix patch

---

## Phase 8: Bugfix Patch (BUG-011)

**Added**: 2026-04-26 — Runtime defect discovered after the BUG-010 patch.

- [X] T024 [BUG-011] Add an `event.stop_session_ack` IPC contract for delete flows in `src/renderer/src/App.svelte`, `src/renderer/src/components/Shared/NeuzClient.svelte`, and `src/main/index.ts`
- [X] T025 [BUG-011] Replace the blind delete timeout in `src/main/index.ts` with an ACK-aware stop flow plus a final grace delay before `rimraf`
- [X] T026 [BUG-011] Fix `session.clear_storage` path validation and add `deletingSessionIds` suppression in `src/main/index.ts`
- [ ] T027 [BUG-011] Smoke-test running-session deletion on Windows and confirm the partition folder stays absent after delete

**Bugfix**: 2026-04-26 — BUG-011 Updated from bugfix patch

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — **BLOCKS US1 and US2 IPC work**
- **Phase 3 (US1)**: Depends on Phase 2 — T004–T008 can start; T009–T011 depend on T007 + T008
- **Phase 4 (US2)**: Depends on Phase 2 — can proceed in parallel with Phase 3
- **Phase 5 (US3 verify)**: No dependencies on Phases 3–4 — can verify at any time
- **Phase 6 (Polish)**: Depends on Phases 3, 4, 5 completion
- **Phase 7 (BUG-006 / BUG-007 / BUG-008 / BUG-009 / BUG-010)**: Follow-up bugfix verification based on runtime findings; no new feature dependency beyond the already-implemented code paths.
- **Phase 8 (BUG-011)**: Follow-up bugfix planning for the still-open partition-delete ACK gap; depends on the same delete/renderer paths already tracked in Phase 7.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. T004 → T005 → T006 (sequential, same file). T007 [P], T008 [P] can run alongside T004–T006. T009–T011 need T007 and T008 done first.
- **US2 (P2)**: Starts after Phase 2. T012 in index.ts (sequential after US1 index.ts work, or run separately). T013–T016 [P] in four different files, fully independent of each other and of T012.
- **US3 (P3)**: No blocking dependency — verification only.
- **US4 (P4)**: No blocking dependency — verification only. Confirm during Polish.

### Within Each User Story

- Models/types before services/handlers
- Main-process handlers before renderer bridge methods
- Bridge methods before UI wiring
- Core implementation before integration
- Story complete before advancing to Polish

### Parallel Opportunities

| Parallel Set | Tasks | Condition |
|---|---|---|
| Types + any prep | T001 | Immediately |
| Foundation | T002, T003 | After T001 |
| US1 main-process | T004 → T005 → T006 | After T002/T003, sequential |
| US1 bridge + helper | T007 [P], T008 [P] | **Immediately** — no type dependencies (T007 uses inline invoke; T008 is a pure utility) |
| US1 UI | T009 → T010 → T011 | After T007 + T008 |
| US2 main-process | T012 | After Phase 2 |
| US2 renderer (4 files) | T013, T014, T015, T016 [P] | After Phase 2, all parallel |

---

## Parallel Example: User Story 1

```
T001 (types.ts)
    └── T002, T003 (index.ts bootstrap)
              └── T004 → T005 → T006 (index.ts IPC handlers, sequential)

T007 [P] (core.ts)                              ← can start immediately
T008 [P] (SessionSettings.svelte cloneLabel)    ← can start immediately
    └── T009 → T010 → T011 (SessionSettings.svelte UI — needs T007 + T008 done first)
```

## Parallel Example: User Story 2

```
T001 (types.ts)
    └── T002, T003 (index.ts bootstrap)
              ├── T012 (index.ts startup cache loop)
              ├── T013 [P] (NeuzClient.svelte)
              ├── T014 [P] (SessionSettings.svelte column)
              ├── T015 [P] (GeneralSettings.svelte)
              └── T016 [P] (configExport.ts)
```

---

## Implementation Strategy

**MVP Scope**: Complete Phase 3 (US1) in isolation. This delivers the highest-priority user-facing feature — safe delete warning + session cloning — and can be shipped independently.

**Incremental Delivery**:
1. Phase 1–2: Types + bootstrap (< 1 hour, invisible to users)
2. Phase 3 (US1): Safe delete + clone (primary P1 value)
3. Phase 4 (US2): Cache lifecycle controls (P2 value, fully independent)
4. Phase 5 (US3): Verify existing work (no implementation cost)
5. Phase 6: Polish + smoke test sign-off

**Task Count Summary**:
| Phase | Story | Tasks | Notes |
|---|---|---|---|
| Phase 1 (Setup) | — | 1 | Types only |
| Phase 2 (Foundational) | — | 2 | index.ts bootstrap |
| Phase 3 | US1 (P1) | 8 | Core value delivery |
| Phase 4 | US2 (P2) | 5 | 4 tasks parallelizable |
| Phase 5 | US3 (P3) | 1 | Verify only |
| Phase 6 | Polish | 2 | Tooltips + smoke test |
| Phase 7 | BUG-006/7/8/9 + BUG-010 | 4 | Runtime bugfix follow-ups |
| Phase 8 | BUG-011 | 4 | ACK-based delete follow-up |
| **Total** | | **27** | |
