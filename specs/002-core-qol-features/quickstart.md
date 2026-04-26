# Quickstart: Core QoL — Health Monitor, Config Portability & Per-Session Zoom

**Branch**: `002-core-qol-features`
**Date**: 2026-04-20

---

## Prerequisites

```bash
bun install   # already done — no new packages
bun dev       # starts Electron app in dev mode
```

No new npm/bun dependencies are introduced by this feature. All APIs used (`fs`, `dialog`, webview DOM) are already available in the existing Electron + Svelte 5 stack.

---

## Feature 1: Session Health Monitor

### What was changed
- `src/renderer/src/lib/types.ts` — new `SessionHealthStatus` type
- `src/renderer/src/components/Shared/NeuzClient.svelte` — new `healthStatus` / `healthDetail` `$state`, event listeners in `startClient()`, `onDestroy` cleanup, health overlay UI

### Manual test
1. `bun dev` → open the app
2. Start at least one session in a layout
3. **Test crash overlay**:
   - Open `chrome://process-internals` in any Chromium browser, or use the Electron DevTools process list
   - Force-kill the process associated with the game webview
   - Confirm: the session pane shows a full-pane error overlay with the crash reason and a "Reload Session" button
4. **Test load failure overlay**:
   - Go to Session Settings → change the session URL to `https://invalid.example.invalid`
   - Start the session
   - Confirm: the overlay shows the error code and description, and a "Retry" button
5. **Test unresponsive indicator**:
   - This is harder to trigger manually. You can simulate it by using `webContents.setUserAgent` to a very slow redirect in Main DevTools, or just verify the code path via the DevTools console by manually dispatching the state
6. **Test reload recovery**:
   - When the crash overlay is showing, click "Reload Session"
   - Confirm: the overlay disappears and the session reloads successfully
7. **Test state persistence across layout switches**:
   - Crash a session, then switch to a different layout tab and back
   - Confirm: the error overlay is still shown

---

## Feature 2: Config Import/Export

### What was changed
- `src/renderer/src/lib/types.ts` — new `ConfigExportPayload`, `ConfigImportResult`, `ConfigApplyImportArgs` types
- `src/main/index.ts` — new IPC handlers: `config.export`, `config.import`, `config.apply_import`
- `src/renderer/src/lib/core.ts` — new `neuzosBridge.backup.*` methods
- `src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte` — new component
- `src/renderer/src/Settings.svelte` — new "Backup" tab added

### Manual test
1. `bun dev` → open Settings
2. Click the **Backup** tab
3. **Export test**:
   - Click "Export Config"
   - Confirm: a native Save dialog appears with default filename `neuzos-config-export-YYYY-MM-DD.json`
   - Save the file; open it in a text editor
   - Confirm: JSON contains `schemaVersion`, `exportedAt`, `sessionActions`, `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId` and nothing else
4. **Import (Replace) test**:
   - Modify some session actions in the app
   - Click "Import Config", select the previously exported file
   - Confirm: a preview shows count of actions and profiles
   - Choose "Replace" and confirm
   - Confirm: session actions and keybinds are restored from the file; a success toast appears
5. **Import (Merge) test**:
   - Add a new session action with a unique ID
   - Import the same file with "Merge"
   - Confirm: the new action is preserved; duplicate IDs from the file are skipped
6. **Error rejection test**:
   - Create a text file with content `{ "foo": "bar" }` and rename it to `.json`
   - Try to import it
   - Confirm: an error toast appears with a descriptive message; config is unchanged
7. **Empty config export test**:
   - Clear all session actions and keybinds
   - Export — confirm the file has empty arrays (not null/undefined)

---

## Feature 3: Per-Session Zoom

### What was changed
- `src/renderer/src/lib/types.ts` — `NeuzConfig.sessionZoomLevels` field
- `src/main/index.ts` — `defaultNeuzosConfig` default, `config.set_session_zoom` IPC handler
- `src/renderer/src/lib/core.ts` — `neuzosBridge.sessions.setZoom()`
- `src/renderer/src/components/Shared/NeuzClient.svelte` — `zoomLevel` `$state`, zoom toolbar, `did-finish-load` listener
- `src/renderer/src/Settings.svelte` — load `sessionZoomLevels` in `loadConfig()`
- `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte` — zoom slider per session

### Manual test
1. `bun dev` → open the app with at least two sessions in a layout
2. **Toolbar zoom test**:
   - Hover over a session pane — confirm the zoom toolbar is visible (showing current value, − and + buttons)
   - Click + several times on session A — confirm only session A's webview scales up
   - Confirm session B is unaffected
3. **Min/max clamp test**:
   - Keep clicking + on session A until it reaches 1.5x — confirm the + button disables
   - Keep clicking − until it reaches 0.5x — confirm the − button disables
4. **Reset test**:
   - Click the reset button — confirm zoom returns to 1.0x and displays "1.0x"
5. **Persistence test**:
   - Set session A to 1.25x
   - Close and reopen the app (`Ctrl+R` in dev restarts the renderer; fully quit and reopen for persistence test)
   - Confirm: session A opens with 1.25x zoom applied
6. **Reload + zoom test** (integrates with Feature 1):
   - Crash a session that has a non-default zoom (e.g., 1.25x)
   - Click "Reload Session"
   - Confirm: after reload, the zoom is still 1.25x (re-applied on `did-finish-load`)
7. **Settings slider test**:
   - Open Settings → Sessions tab
   - Find the zoom slider for a session — adjust it
   - Confirm it reflects in the pane toolbar and persists
