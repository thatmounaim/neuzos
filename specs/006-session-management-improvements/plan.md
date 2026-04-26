# Implementation Plan: Session Management Improvements

**Branch**: `006-add-session-groups` | **Date**: 2026-04-26 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/006-session-management-improvements/spec.md`

## Summary

Fix the silent partition-delete failure on session delete, add session cloning with safe partition copy, add per-session and global auto-delete cache controls, and add Action-column tooltips. Session Groups (FR-023–FR-031) and the existing deletion retry/error-dialog logic are fully implemented in the `005-session-groups` base — this plan targets only the remaining gaps.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Svelte 5  
**Primary Dependencies**: Electron 33 (Node 20 runtime), electron-vite, Tailwind CSS, shadcn-svelte (`Switch`, `Tooltip`, `AlertDialog`, `Table`, `Button`, `Card`)  
**Storage**: JSON flat file at `<userData>/neuzos_config/config.json` written via `saveConfig()` in main process after every `config.save` IPC call; Electron session partition data at `<userData>/Partitions/persist/<sessionId>/`  
**Testing**: No automated test suite; manual smoke-testing a release build on Windows  
**Target Platform**: Windows desktop (primary), Linux desktop (secondary)  
**Project Type**: Desktop application (Electron + Svelte 5 renderer)  
**Performance Goals**: Clone copy completes within 10 s for typical partition sizes; startup cache clear is fire-and-forget with no perceptible delay to app ready  
**Constraints**: Renderer must not bypass IPC bridge for privileged operations; all new config fields must be backward-compatible (optional with safe defaults); path traversal guards required on any main-process file operation derived from user input  
**Scale/Scope**: Up to ~100 sessions; partition data typically 1–50 MB per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality and Maintainability | ✅ PASS | All new types are explicit and strongly typed. No new abstraction layers. Changes are additive modifications to existing files. |
| II. Testing Standards and Verification | ✅ PASS | Each sub-feature has a concrete manual smoke path defined in quickstart.md. |
| III. User Experience Consistency | ✅ PASS | Clone button mirrors existing action-button pattern. Auto-Delete Cache uses the existing Switch component. Dialogs reuse the existing AlertDialog pattern. |
| IV. Performance and Responsiveness | ✅ PASS | Clone copy and startup cache clear are async, non-blocking. Auto-Delete Cache trigger in stopClient() is fire-and-forget. |

**Post-design re-check**: No violations found after Phase 1 design.

## Already Implemented (base branch — no action needed)

The `005-session-groups` branch that `006` is based on already contains:

- **Session Groups full UI** (FR-023–FR-031): collapsible group sections, inline rename, reorder, delete with confirmation, per-session group assignment dropdown, ungrouped tail section.
- **Session Groups in Session Launcher**: grouped headers, collapsible, ungrouped tail.
- **Session Groups in export/import**: `applyUiLayout` in `src/main/index.ts` handles `sessionGroups` in both replace and merge modes; `cloneForExport` in `configExport.ts` includes `sessionGroups` under `ui-layout`.
- **`session.delete` stop-wait and retry** (FR-003, FR-004, FR-034): 5 s wait + rimraf with 5× retry @ 800 ms + `{ success, error }` return shape. ~~**No action needed**~~ ⚠️ Partially broken — `clearStorageData()` was being called after the wait, causing Electron to re-open the partition session object and recreate the folder on Windows. Fix: remove the `clearStorageData()` block entirely from the delete handler (BUG-006/BUG-008/BUG-009 patch). Also suppress any queued `session.clear_cache` IPC for the same session during deletion so a late auto-delete-cache event cannot recreate the partition folder after rimraf (BUG-010). Additionally, BUG-012 (IPC re-entrant loop via `session.clear_cache`) and BUG-013 (ACK sent before Svelte DOM flush) are follow-on bugs that must also be resolved — see Implementation Notes below.
- **Deletion error dialog** (FR-005): `deleteErrorModal` state in `SessionSettings.svelte`. ~~**No action needed**~~ ⚠️ Was not firing because `rimraf` never threw (Electron recreated the folder before it could be locked — see above). Fixed as side-effect of the `clearStorageData()` removal.
- **Tooltips on existing action buttons** (FR-032 partial): `<Tooltip.Root>` already wraps cache-clear, storage-clear, and delete buttons.

## Project Structure

### Documentation (this feature)

```text
specs/006-session-management-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ipc-channels.md  # Phase 1 output — session.clone + session.get_running_ids
└── tasks.md             # Phase 2 output (generated by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── main/
│   └── index.ts                              # MODIFY:
│                                             #   + runningSessionIds: Set<string> (module-level)
│                                             #   + update session.start / session.stop handlers
│                                             #     to maintain runningSessionIds
│                                             #   + ipcMain.handle("session.get_running_ids")
│                                             #   + ipcMain.handle("session.clone")
│                                             #     (stop-wait, path validate, fs.cp, return shape)
│                                             #   + defaultNeuzosConfig.autoDeleteAllCachesOnStartup
│                                             #   + startup cache-clear loop in app.whenReady
├── renderer/
│   └── src/
│       ├── lib/
│       │   ├── types.ts                      # MODIFY:
│       │   │                                 #   + NeuzSession.autoDeleteCache?: boolean
│       │   │                                 #   + NeuzConfig.autoDeleteAllCachesOnStartup?: boolean
│       │   └── core.ts                       # MODIFY:
│       │                                     #   + neuzosBridge.sessions.clone()
│       │                                     #   + neuzosBridge.sessions.getRunningIds()
│       └── components/
│           ├── Shared/
│           │   └── NeuzClient.svelte          # MODIFY:
│           │                                  #   stopClient(): fire clearCache if autoDeleteCache
│           └── SettingsWindow/Tabs/
│               ├── SessionSettings.svelte     # MODIFY:
│               │                              #   + running-session check before delete dialog
│               │                              #   + stronger warning dialog for running sessions
│               │                              #   + clone button + tooltip in Actions column
│               │                              #   + clone label generation (Copy / (2) / (3))
│               │                              #   + insert-after-source on clone
│               │                              #   + Auto-Delete Cache Switch column
│               │                              #   + Auto-Delete Cache column header tooltip
│               └── GeneralSettings.svelte     # MODIFY:
│                                              #   + "Clear all caches on app startup" Switch toggle
```

**Structure Decision**: Single Electron project. No new files are added to `src/` — all changes are additive modifications to existing files. The new IPC contract is documented in the spec contracts folder.

## Complexity Tracking

No constitution violations. All changes follow the simplest direct path:
- `runningSessionIds` is a plain `Set<string>` in main process — no new IPC bus, no state sync protocol.
- Clone inserts directly into `neuzosConfig.sessions` array after the source index — no helper modules.
- Auto-Delete Cache trigger is a single conditional in `stopClient()` — no new lifecycle hooks.

## Implementation Notes

### Running-session detection (BUG FIX / FR-002)

The Settings window is a separate `BrowserWindow` and cannot read the main window's Svelte state (`sessionsLayoutsRef`). Solution: maintain a `runningSessionIds: Set<string>` in main process, updated by the existing `session.start` and `session.stop` IPC handlers, and expose it via `session.get_running_ids`. The Settings renderer invokes this once when the delete dialog opens to decide which dialog variant to show.

Edge case: if a session crashes without calling `session.stop`, it remains in the set. This produces a false-positive warning (extra stop notice shown), which is a safe failure mode.

### session.clone stop-wait (FR-034)

Mirrors the existing `session.delete` pattern exactly: send `event.stop_session` to mainWindow, await 5 s, then proceed. If source session is not running (not in `runningSessionIds`), skip the wait. Return `stoppedBeforeClone: true` in the success result so the renderer can show the informational popup.

### Partition copy (FR-012)

Use `fs.cp(src, dest, { recursive: true })` per subdirectory, available in Node 20 (Electron 33 runtime). Directories to copy: `IndexedDB`, `Local Storage`. File to copy: `Cookies`. Directories to explicitly skip (not copied): `Cache`, `Code Cache`, `GPUCache`, `blob_storage`, `GrShaderCache`, `ShaderCache`. Copy is executed in main process only, with both source and destination validated against `<userData>/Partitions/persist/` prefix before any `fs.cp` call.

### autoDeleteCache on session stop (FR-019)

In `NeuzClient.svelte` `stopClient()`, add after the existing `started = false` line:
```ts
if (session.autoDeleteCache) {
  neuzosBridge.sessions.clearCache(session.id)
}
```
This reuses the existing `session.clear_cache` IPC which calls `sess.clearCache()` in main — only cache is cleared, login/state data is preserved.

### Global startup cache clear (FR-022)

In `app.whenReady().then(async () => {...})`, after `await loadConfig()`, add:
```ts
if (neuzosConfig.autoDeleteAllCachesOnStartup) {
  await Promise.all(
    (neuzosConfig.sessions ?? []).map((s: any) =>
      session.fromPartition("persist:" + s.id).clearCache().catch((err: any) => {
        console.warn("Startup cache clear failed for session", s.id, err)
      })
    )
  )
}
```

### Clone label generation (FR-011)

```ts
function generateCloneLabel(sourceLabel: string, existingLabels: Set<string>): string {
  const base = `${sourceLabel} (Copy)`
  if (!existingLabels.has(base)) return base
  let n = 2
  while (existingLabels.has(`${base} (${n})`)) n++
  return `${base} (${n})`
}
```

### event.start_session handler — do NOT use sessions.stop() IPC (BUG-007 fix)

The `event.start_session` renderer handler in `App.svelte` was calling `neuzosBridge.sessions.stop(sessionId)` as a pre-start cleanup. This IPC call immediately removed the session from `runningSessionIds` in the main process, so `getRunningIds()` always returned empty and the running-session delete warning never appeared.

Fix: replace the IPC call with direct `stopClient()` calls on all layouts (same as what `event.stop_session` does), so `runningSessionIds` is preserved:

```ts
listen('event.start_session', (_, sessionId: string, layoutId: string) => {
  // Local stopClient — does NOT send session.stop IPC to main
  Object.keys(mainWindowState.sessionsLayoutsRef[sessionId]?.layouts ?? {}).forEach(lid => {
    mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[lid]?.stopClient()
  })
  setTimeout(() => {
    mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId].startClient()
  }, 100)
})
```

### session.delete — do NOT call clearStorageData() before rimraf (BUG-006/BUG-008/BUG-009 fix)

`session.fromPartition("persist:" + sessionId).clearStorageData()` was called after the 5-second wait. On Windows, accessing the Electron session object causes Chromium to re-open or recreate the partition folder, making `rimraf` either find locked files or delete a folder that reappears immediately. Since we are about to delete the entire folder, the `clearStorageData()` call is unnecessary and must be removed.

**Bugfix**: 2026-04-26 — BUG-006/BUG-007/BUG-008/BUG-009 Updated from bugfix patch

### Concurrent cache-clear suppression during delete (BUG-010)

The renderer's `stopClient()` can still emit `session.clear_cache` for sessions with `autoDeleteCache` enabled while the delete flow is waiting for file handles to close. That IPC call must be ignored while a delete is in progress, otherwise `session.fromPartition()` can recreate the just-deleted partition folder on Windows.

Implementation note: track in-progress deletes in a module-level `deletingSessionIds: Set<string>` and short-circuit `session.clear_cache` when the session ID is present.

**Bugfix**: 2026-04-26 — BUG-010 Updated from bugfix patch

### Delete acknowledgement gap (BUG-011)

The current runtime behavior still depends on a blind timeout before partition deletion. That is not enough under all Windows flush timings, so the next implementation pass must wait for a renderer stop acknowledgement, then apply a short final grace delay before rimraf. BUG-012 and BUG-013 are follow-on defects discovered after this patch; see sections below.

**Bugfix**: 2026-04-26 — BUG-011 Updated from bugfix patch

### IPC re-entrant loop on autoDeleteCache session stop (BUG-012)

Two cooperating defects create an infinite IPC feedback loop when a session with `autoDeleteCache: true` is stopped:

1. **`session.clear_cache` handler (`src/main/index.ts` ~L1729)** sends `event.stop_session` back to the renderer before calling `clearCache()`. Cache clearing does not require the webview to be stopped — this send is unnecessary and triggers `stopClient`, which immediately fires another `clearCache` IPC.
2. **`stopClient` (`src/renderer/src/components/Shared/NeuzClient.svelte` ~L131)** calls `neuzosBridge.sessions.clearCache()` unconditionally when `session.autoDeleteCache` is true, regardless of whether `started` was already `false`. Every re-entry caused by the `event.stop_session` from the main handler fires another `clearCache` IPC.

The loop also builds a `session.clear_cache` IPC backlog that can outlast the `deletingSessionIds` guard, causing `session.fromPartition()` to recreate the partition folder after rimraf has already run.

Fix:
1. Remove `win.webContents.send("event.stop_session", sessionId)` from the `session.clear_cache` handler in `src/main/index.ts`.
2. Guard `stopClient` in `NeuzClient.svelte`: if `started === false`, invoke `onStopped?.()` immediately and return without calling `clearCache` IPC.

**Bugfix**: 2026-04-26 — BUG-012 Updated from bugfix patch

### ACK sent before Svelte DOM flush (BUG-013)

`stopClient` sets `started = false` then synchronously calls `onStopped?.()` (which sends `event.stop_session_ack`). Svelte's reactive DOM update for `{#if started}` is batched and runs in the next microtask — so the `<webview>` element is still in the DOM when the ACK is sent, and the 2-second grace period starts while Chromium still holds file-system handles on the partition directory.

Fix: await `tick()` from `'svelte'` in `stopClient` before invoking `onStopped`, so the DOM is flushed and the webview element is removed before the ACK reaches the main process:

```ts
if (onStopped) {
  void tick().then(onStopped)
}
```

**Bugfix**: 2026-04-26 — BUG-013 Updated from bugfix patch

### Chromium/LevelDB partition recreation race (BUG-014)

Even with BUG-013's `tick()` fix, the `<webview>` DOM removal does **not** synchronously destroy
the Electron WebContents. Chromium's internal teardown and LevelDB file-handle release are
async and take 2–5 s on Windows. During that window:

- `rimraf` deletes the partition files (NTFS allows unlinking open files immediately)
- LevelDB detects its `LOCK`/`MANIFEST`/`LOG` files are gone and **recreates the directory**
- `rimraf` returns `true` (no throw) because the unlink succeeded at that moment
- The folder reappears; the renderer gets `{ success: true }` and removes the session from
  the list — but the folder is still on disk

Fix (applied in `src/main/index.ts` `session.delete` handler):
1. **Grace period 2 000 → 5 000 ms** — covers typical Chromium WebContents teardown time on Windows.
2. **`rimraf(path, { maxRetries: 5, retryDelay: 1000 })`** — internal retries for transient ENOTEMPTY/EPERM.
3. **Post-rimraf `fs.existsSync` check** — if LevelDB silently recreated the folder, `existsSync`
   returns `true`; this is converted to a thrown error so the outer retry loop re-attempts.
4. **Outer retries 5 → 8, delay 800 → 1 200 ms** — wider window for longer teardown scenarios.

Maximum total wait: 5 s grace + 8 × (rimraf + existsSync + 1.2 s) ≈ 15 s.

**Bugfix**: 2026-04-26 — BUG-014 Updated from bugfix patch
```

Existing labels are derived from `neuzosConfig.sessions.map(s => s.label)` at clone time.

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
