# Research: Core QoL — Health Monitor, Config Portability & Per-Session Zoom

**Phase**: 0 — Pre-design research
**Branch**: `002-core-qol-features`
**Date**: 2026-04-20

---

## 1. WebviewTag `setZoomFactor()` — Renderer-side availability

**Question**: Is `setZoomFactor()` callable on the `<webview>` element from the Renderer process, or does it require Main process involvement?

**Findings**:
- `setZoomFactor(factor: number)` is a Renderer-side DOM method on the `<webview>` HTMLElement — it is part of the Electron Webview DOM API, not the `webContents` API.
- It is available directly via `(webview as WebviewTag).setZoomFactor(factor)` in any Renderer script, with no IPC or Main process involvement.
- It applies a visual scaling factor to the webview's content. It is independent of `webContents.setZoomFactor()` (which is a Main process call).
- **Decision**: Apply zoom directly in `NeuzClient.svelte` via `getWebview()?.setZoomFactor(zoomLevel)`. No new Main process code needed for zoom application.

---

## 2. WebviewTag event API — `render-process-gone`, `did-fail-load`, `unresponsive`, `responsive`

**Question**: Are all four health events available in the Renderer process on the `<webview>` element in Electron 38?

**Findings**:
- All four are standard Electron webview DOM events, available without IPC:
  - `render-process-gone` — fires with `{ reason: 'crashed' | 'killed' | 'oom' | 'launch-failed' | 'integrity-failure' }`. Only fires for content process failures, not GPU crashes.
  - `did-fail-load` — fires with `{ errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean }`. Fires on navigation failures. `errorCode === -3` (`ERR_ABORTED`) is a normal navigation abort (e.g., page redirected, user navigated away) and must be filtered out per the spec.
  - `unresponsive` — fires when the webview's renderer process becomes unresponsive (no arguments).
  - `responsive` — fires when the webview recovers (no arguments).
- **Decision**: Attach all four in `startClient()` after `tick()` (same pattern as the existing `ipc-message` listener). Clean up via `onDestroy`.

---

## 3. `did-fail-load` — Error code −3 (ERR_ABORTED) filtering

**Question**: Is filtering `errorCode === -3` sufficient to suppress normal navigation aborts?

**Findings**:
- `ERR_ABORTED` (`-3`) covers: same-page navigation aborts, redirects that cancel the previous load, user-initiated navigation while a load is in progress, and WebSocket upgrade aborts.
- A secondary filter `isMainFrame: false` can suppress subframe errors (ads, iframes) that are irrelevant to the game session. Applying this filter keeps the overlay reserved for genuine main-frame failures.
- **Decision**: Filter on `errorCode === -3 || !isMainFrame`. This eliminates noise while ensuring the overlay only appears for meaningful main-frame failures.

---

## 4. `dialog.showSaveDialog` / `dialog.showOpenDialog` — Electron 38 API shape

**Question**: What is the exact return shape in Electron 38's Main process for the dialog APIs?

**Findings**:
- `dialog.showSaveDialog(win, options)` returns `Promise<{ canceled: boolean, filePath: string | undefined }>`.
- `dialog.showOpenDialog(win, options)` returns `Promise<{ canceled: boolean, filePaths: string[] }>`.
- Both must be called from the Main process (they require a `BrowserWindow` parent for modal behaviour on Windows).
- **Decision**: New IPC handlers `config.export` and `config.import` in `src/main/index.ts` will call these APIs and return the result via `ipcMain.handle`.

---

## 5. Import file size guard — `fs.stat` before `fs.readFile`

**Question**: What is the correct way to enforce the 5 MB import file size cap without reading the file into memory first?

**Findings**:
- `fs.stat(filePath)` returns file metadata including `size` in bytes synchronously-equivalently via `fs.promises.stat`.
- Reading `stat.size > 5_242_880` (5 × 1024 × 1024) before `fs.readFile` prevents loading a large file into memory.
- **Decision**: In the `config.import` IPC handler: `stat` the selected file first; if `size > 5_242_880`, return `{ valid: false, error: 'File too large (max 5 MB)' }` without reading.

---

## 6. Schema validation strategy — library vs manual

**Question**: Should import schema validation use a library (zod, ajv) or manual checks?

**Findings**:
- The export payload has a flat, well-known structure with 6 top-level fields. Deep per-entry validation is explicitly out-of-scope (spec Assumption: validate top-level fields only).
- Introducing `zod` or `ajv` adds a dependency for a handful of field checks. The existing codebase has no validation library.
- Manual structural checks (typeof + Array.isArray + field presence) are sufficient and keep the diff minimal.
- **Decision**: Manual validation in the Main process handler. Validate: `schemaVersion` (number), `exportedAt` (string), `sessionActions` (array), `keyBinds` (array), `keyBindProfiles` (array), `activeKeyBindProfileId` (string or null). Reject on any mismatch with a descriptive error string.

---

## 7. Per-session zoom persistence — IPC approach

**Question**: How should zoom level changes from the main window's pane toolbar be persisted to config, given that config is owned by Main?

**Findings**:
- The existing pattern for runtime config mutations from the Renderer is via `ipcMain.handle` + `saveConfig()` in Main. Feature 001 used this pattern for `config.set_sync_receiver`.
- The Settings window already loads `neuzosConfig` and saves it; the main window has `mainWindowState.config`.
- A dedicated `config.set_session_zoom` handler (same pattern as `config.set_sync_receiver`) is the cleanest approach: handles the mutation + persistence in a single atomic IPC call.
- The main window's `mainWindowState.config.sessionZoomLevels` local state updates optimistically (immediately via local `$state` in NeuzClient), and the IPC call persists it. No need for a full config reload broadcast.
- **Decision**: `config.set_session_zoom` IPC handle in Main. Local `$state zoomLevel` in NeuzClient for instant reactivity. `neuzosBridge.sessions.setZoom(sessionId, level)` as the bridge method.

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| Zoom application | Renderer-side `webview.setZoomFactor()` — no Main involvement |
| Health events | 4 webview DOM events in Renderer; attach in `startClient()` after tick |
| `did-fail-load` filter | `errorCode === -3 OR !isMainFrame` — skip both aborts and subframe errors |
| File dialogs | Main process IPC handlers `config.export` / `config.import` |
| File size guard | `fs.stat` before `fs.readFile`; reject if > 5 MB |
| Schema validation | Manual structural checks; no new library dependency |
| Zoom persistence | `config.set_session_zoom` IPC handler (same pattern as feature 001) |
