# Research: Session Management Improvements

**Phase**: 0 — Research  
**Date**: 2026-04-26  
**Feature**: [spec.md](spec.md)

---

## Decision 1: Running-session state visibility from the Settings window

**Context**: FR-002 requires the Settings window to know whether a session is currently running before it shows a delete confirmation dialog. The Settings window (`settingsWindow`) is a separate `BrowserWindow` from `mainWindow`. Svelte state in the main window (`sessionsLayoutsRef`) is not accessible from a different process.

**Decision**: Maintain a `runningSessionIds: Set<string>` in the main process (`src/main/index.ts`). Update it inside the existing `session.start` and `session.stop` `ipcMain.on` handlers. Expose it via a new `ipcMain.handle("session.get_running_ids")` that returns the set as a plain string array.

**Rationale**: This is the least-invasive approach. It reuses the two handlers that already exist, adds one new handle, and requires no inter-window messaging or config changes. It mirrors the existing `mouseBindWebContents: Map<string, number>` pattern in the same file.

**Alternatives considered**:
- Broadcast running state updates via `event.config_changed` to all windows — rejected because it conflates config persistence with ephemeral runtime state.
- Add a round-trip renderer→main→mainWindow→main→renderer bus — rejected as disproportionately complex.
- Track running IDs in `NeuzConfig` — rejected because running state is ephemeral and must not persist across restarts.

---

## Decision 2: Partition copy mechanism for session.clone

**Context**: FR-012 requires copying `IndexedDB/`, `Local Storage/`, and `Cookies` from the source partition folder to the new partition folder, while explicitly skipping `Cache/`, `Code Cache/`, `GPUCache/`.

**Decision**: Use `fs.cp(src, dest, { recursive: true })` (Node 20 built-in, available in Electron 33's runtime) per subdirectory. Copy these named entries: `IndexedDB`, `Local Storage`, `Cookies`. Do not enumerate or copy any other entries.

**Rationale**: `fs.cp` with `{ recursive: true }` is the idiomatic Node 20 approach and avoids a third-party dependency. Copying only named known-safe entries (allowlist) is safer than copying everything and excluding cache entries (denylist) — new Chromium data directories introduced in future Electron upgrades will be excluded by default.

**Alternatives considered**:
- Copy entire partition then delete cache folders — rejected because it risks copying unknown future cache-adjacent directories and requires a second destructive pass.
- Use `ncp` or `fs-extra` — rejected because the project already uses Node 20 built-ins for `rimraf` and `fs.promises`, adding a dependency is unnecessary.

**Runtime path**: Electron 33 embeds Node 20. `fs.cp` is available without a flag. Confirmed by cross-referencing Electron 33 release notes (Node 20.18.x).

**Partition folder layout (confirmed from 005 BUG-003 fix)**:
```
<userData>/Partitions/persist/<sessionId>/
  IndexedDB/
  Local Storage/
  Cookies          ← file (not directory)
  Cache/           ← skip
  Code Cache/      ← skip
  GPUCache/        ← skip
  blob_storage/    ← skip (not in copy list)
```

---

## Decision 3: Clone stop-wait strategy

**Context**: FR-034 requires the same stop-wait mechanism (5 s + 5× retry @ 800 ms) before any partition mutation. For clone, we only need the 5 s initial wait (to release file handles) — retries apply to the deletion/copy attempt itself if it fails.

**Decision**: Replicate the `session.delete` stop-wait pattern exactly: if `runningSessionIds.has(sourceId)`, send `event.stop_session` to `mainWindow` and await 5 s before proceeding with `fs.cp`. Return `stoppedBeforeClone: true` in the success result.

**Rationale**: Consistency with the existing pattern. The same 5 s window that allows Chromium to release handles for deletion also suffices for copy — the source files need to be closed before `fs.cp` can read them reliably on Windows.

---

## Decision 4: Startup cache-clear failure handling

**Context**: FR-022 specifies silent per-session logging on failure, startup continues normally.

**Decision**: Wrap each `session.fromPartition(...).clearCache()` call in an individual `.catch()` that calls `console.warn`. Use `Promise.all` so all sessions clear in parallel — startup is not serialised on slow partitions.

**Rationale**: `Promise.all` with per-item catch is the minimum-code pattern that satisfies the "silent, non-blocking, non-serialised" requirements. No retry; cache staleness is not a correctness issue.

---

## Decision 5: autoDeleteCache trigger point

**Context**: FR-019 — cache must clear on session stop, not on app quit or any other event.

**Decision**: Add a conditional in `NeuzClient.svelte` `stopClient()`, after `started = false`, that calls `neuzosBridge.sessions.clearCache(session.id)` if `session.autoDeleteCache === true`. This reuses the existing `session.clear_cache` IPC which calls `sess.clearCache()` in main.

**Rationale**: `stopClient()` is the single authoritative stop point in `NeuzClient`. Adding the call there means it fires whether stop is triggered by the user, by a layout close, or by `event.stop_session` from the main process. No new lifecycle hook is needed.

**Confirmed**: `session.clear_cache` IPC in `src/main/index.ts` calls `session.fromPartition("persist:" + sessionId).clearCache()` — it clears HTTP cache only. `clearStorageData()` (used by `session.clear_storage`) clears login/state data. These are distinct calls; using `clearCache()` preserves all session state.

---

## Decision 6: Global startup cache clear location in main process

**Context**: FR-022 — clear all session caches on startup when `autoDeleteAllCachesOnStartup` is true.

**Decision**: Insert the cache-clear block in `app.whenReady().then(async () => {...})` in `src/main/index.ts`, immediately after the `await loadConfig()` / `neuzosConfig` initialisation IIFE completes (before `createWindow()` is called). This ensures caches are cleared before any webview opens.

**Rationale**: Placing it before `createWindow()` means no session webview has been started yet, so there is no risk of clearing a cache that is actively in use at startup.
