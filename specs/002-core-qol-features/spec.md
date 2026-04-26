# Feature Specification: Core QoL — Health Monitor, Config Portability & Per-Session Zoom

**Feature Branch**: `002-core-qol-features`
**Created**: 2026-04-20
**Status**: Draft

---

## Existing Baseline (Must Read Before Planning)

> **Session management, config persistence, and keybind infrastructure already exist.**
> Sessions are defined in `NeuzConfig.sessions` with `id`, `label`, and `icon`.
> Session Actions (`NeuzConfig.sessionActions`) and Keybind Profiles (`NeuzConfig.keyBindProfiles`, `NeuzConfig.keyBinds`) are fully implemented.
> Config is stored in `userData/neuzos_config/config.json`, owned exclusively by the Main process, loaded via `config.load`, saved via `saveConfig()`.
> The `<webview>` tag is rendered by `NeuzClient.svelte` and exposes Electron webview DOM APIs (`setZoomFactor`, event listeners, etc.) from the Renderer process.
>
> **What does NOT yet exist (the scope of this feature):**
> - **Health Monitor** — no crash/error detection or recovery UI for webview sessions.
> - **Config Import/Export** — no mechanism to serialise or deserialise session actions & keybinds to/from a file.
> - **Per-Session Zoom** — no individual zoom factor per webview; only the main/settings/session window-level zoom exists in `NeuzConfig.window`.
>
> This spec defines only the delta.

---

## User Scenarios & Testing

### User Story 1 — Session Health Monitor: Detect & Recover from Webview Crashes (Priority: P1)

A player is running multiple Flyff sessions in NeuzOS. One of the game webviews crashes (out-of-memory), fails to load (network error), or becomes unresponsive. The player needs an immediate, clear visual signal telling them which session is affected and a one-click way to reload it — without guessing or manually restarting the entire app.

**Why this priority**: Session crashes during gameplay are the most disruptive failure mode. Without detection and recovery, users lose progress and must restart the app entirely. This is the highest-impact stability improvement.

**Independent Test**: Open NeuzOS with two sessions. Force-kill the renderer process of one webview (e.g., via Chrome's task manager at `chrome://process-internals` or by triggering an OOM). Confirm a visual error state appears on that session's pane and a "Reload Session" button is shown. Click it and confirm the session reloads successfully.

**Acceptance Scenarios**:

1. **Given** a session with a running webview, **When** the webview's renderer process crashes (`render-process-gone`), **Then** the session pane displays an error overlay with a warning icon, the crash reason (e.g., "crashed", "killed", "oom"), and a "Reload Session" button.
2. **Given** a session with a running webview, **When** the webview fires `did-fail-load` with a genuine error (error code is NOT `−3 ERR_ABORTED`), **Then** the session pane displays a full-pane load-failure overlay with the error code and description, and a "Retry" button. Normal navigation aborts (`ERR_ABORTED`) are silently ignored.
3. **Given** a session with a running webview, **When** the webview becomes unresponsive for a sustained period (`unresponsive` event), **Then** the session pane shows a warning indicator (e.g., a pulsing amber border or icon). When the webview recovers (`responsive` event), the indicator clears automatically.
4. **Given** a session showing the crash/error overlay, **When** the user clicks "Reload Session", **Then** the webview reloads and, upon successful load, the error overlay is dismissed.
5. **Given** a session showing an error overlay, **When** the user switches to a different layout and back, **Then** the error overlay persists until the session is explicitly reloaded.

---

### User Story 2 — Config Import/Export: Share Actions & Keybinds (Priority: P2)

A player has spent time configuring session actions (skill bars) and keybind profiles. They want to back up their configuration, share it with friends or the community, or transfer it to another machine — all via a simple JSON file.

**Why this priority**: Config portability saves significant manual setup time and enables community sharing. It is high-value but not blocking gameplay like crash recovery (US1).

**Independent Test**: Open NeuzOS Settings. Click "Export Config". Confirm a `.json` file is saved via a native Save dialog. Edit or delete the local config. Click "Import Config", select the saved file. Confirm the imported session actions and keybind profiles appear and function correctly.

**Acceptance Scenarios**:

1. **Given** the Settings panel, **When** the user clicks "Export Config", **Then** a native Save dialog opens with a default filename of `neuzos-config-export-YYYY-MM-DD.json`, and the exported file contains the current `sessionActions` and keybind data (`keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId`) in a well-structured JSON format with a schema version field.
2. **Given** a valid exported JSON file, **When** the user clicks "Import Config" and selects the file, **Then** the system validates the JSON schema and displays a preview showing what will be imported (count of actions, count of keybind profiles).
3. **Given** a valid import file, **When** the user confirms the import, **Then** the imported data replaces (or merges with, based on user choice) the current session actions and keybind profiles, and the config is saved to disk.
4. **Given** an invalid or corrupted JSON file, **When** the user selects it for import, **Then** the system displays a clear error message explaining the validation failure (e.g., "Missing required field: sessionActions") and does not modify the existing config.
5. **Given** an exported file from a newer schema version, **When** the user imports it on an older app version, **Then** the system warns the user about potential incompatibility before proceeding.
6. **Given** the user clicks "Export Config", **When** the export completes, **Then** no sensitive data (file paths, partition info, window dimensions) is included in the exported file — only session actions and keybind configuration.

---

### User Story 3 — Per-Session Zoom/Scale: Adjust Individual Webview Zoom (Priority: P3)

A player has multiple sessions visible in a layout — some in small panes, others in large ones. They want to zoom in on a small session to read text, or zoom out on a large one to see more of the game world, without affecting other sessions.

**Why this priority**: Per-session zoom is a visual convenience feature. It improves accessibility and screen real-estate management but is not critical to core gameplay or stability. Depends on the session infrastructure being stable (US1).

**Independent Test**: Open a layout with two sessions. Use the zoom control on one session to set it to 1.25x. Confirm only that session's webview is scaled. Restart the app. Confirm the zoom level persists.

**Acceptance Scenarios**:

1. **Given** a running session in a layout, **When** the user adjusts the zoom slider/buttons on that session's pane, **Then** only that session's webview zoom factor changes (other sessions remain unaffected).
2. **Given** a session with a custom zoom level, **When** the user restarts the app, **Then** the zoom level is restored from config.
3. **Given** a session with a zoom level of 0.5x, **When** the user clicks the "Reset Zoom" button, **Then** the zoom returns to 1.0x (default).
4. **Given** a session webview, **When** the user sets zoom to the minimum (0.5x) or maximum (1.5x), **Then** the zoom control disables further adjustment in that direction and displays the current value.
5. **Given** a session that has crashed and been reloaded (US1), **When** the webview reloads, **Then** the persisted zoom level is re-applied automatically.

---

### Edge Cases

- **Health Monitor**: What if multiple sessions crash simultaneously? Each session's overlay must be independent — crashing one does not affect the overlay state of another.
- **Health Monitor**: What if a session crashes during an import operation? The import must complete or roll back atomically; a concurrent crash must not corrupt config.
- **Config Export**: What if the user has zero session actions and zero keybinds? The export should still produce a valid JSON file with empty arrays.
- **Config Import**: What if the import file contains session actions referencing session IDs that don't exist locally? The import should proceed with a warning; orphaned actions are imported but flagged.
- **Config Import**: What if the import file is extremely large (> 5 MB)? The system should reject it with a clear error to prevent memory issues.
- **Zoom**: What happens when a session is moved between layouts with different pane sizes? The zoom level persists because it's tied to the session ID, not the layout.
- **Zoom**: What if `setZoomFactor()` is called before the webview has loaded? The zoom should be applied once the webview finishes loading (`did-finish-load`).

---

## Requirements

### Functional Requirements

#### Session Health Monitor

- **FR-001**: The system MUST attach listeners for `render-process-gone`, `did-fail-load`, and `unresponsive` / `responsive` webview events on each session's `<webview>` element. For `did-fail-load`, only events with an error code other than `−3` (`ERR_ABORTED`) MUST trigger the error state; `ERR_ABORTED` events MUST be silently ignored.
- **FR-002**: When a webview crash or genuine load failure is detected, the system MUST display a full-pane overlay (covering the entire session area) on the affected session, with a centred warning icon, a human-readable description of the error, and a "Reload Session" button.
- **FR-003**: When a webview becomes unresponsive, the system MUST display a non-blocking visual warning indicator (e.g., pulsing amber border or icon) that clears automatically when the webview recovers.
- **FR-004**: The "Reload Session" action MUST call `webview.reload()` and dismiss the error overlay upon successful page load.
- **FR-005**: Health monitoring MUST NOT add measurable overhead — all detection is event-driven (no polling).

#### Config Import/Export

- **FR-006**: The system MUST provide an "Export Config" button in a new dedicated **Backup tab** in the Settings window that serialises `sessionActions`, `keyBinds`, `keyBindProfiles`, and `activeKeyBindProfileId` into a JSON file.
- **FR-007**: The exported JSON MUST include a `schemaVersion` field (starting at `1`) and a `exportedAt` ISO timestamp.
- **FR-008**: The system MUST provide an "Import Config" button in the same **Backup tab** (alongside Export) that opens a native file picker for `.json` files.
- **FR-009**: On import, the system MUST validate the JSON structure against the expected schema before applying changes. Invalid files MUST be rejected with a descriptive error.
- **FR-010**: On valid import, the system MUST offer the user a choice between "Replace" (overwrite existing data entirely) and "Merge" (append non-duplicate entries). In Merge mode, any imported entry whose `id` matches an existing entry MUST be skipped — the existing entry is kept.
- **FR-011**: Imported config MUST be saved to disk immediately via the existing config persistence mechanism.
- **FR-012**: The export MUST NOT include any data beyond session actions and keybind configuration (no window dimensions, no sessions list, no chromium switches, no file paths).

#### Per-Session Zoom

- **FR-013**: The system MUST allow setting a zoom factor per session, ranging from 0.5x to 1.5x in 0.05 increments.
- **FR-014**: Zoom MUST be applied via the `<webview>` tag's `setZoomFactor()` API from the Renderer process.
- **FR-015**: The zoom level per session MUST be persisted in the config (keyed by session ID) and restored on app restart.
- **FR-016**: Zoom MUST be controllable from two places: (a) compact **+/− buttons with a current value label** on the session pane toolbar, positioned next to existing pane controls (e.g., the RadioTower button), for on-the-fly adjustments; and (b) a **precise slider** in the Session Settings tab for exact value entry.
- **FR-017**: A "Reset Zoom" control MUST be available to return to the 1.0x default.
- **FR-018**: Zoom changes MUST be applied instantly (no page reload required).
- **FR-019**: When a session reloads (manually or after a crash), the persisted zoom level MUST be re-applied after the page loads.

### ToS Compliance (NeuzOS-specific — mandatory)

**"One Input = One Action" declaration**:

> None of the three features in this spec synthesize or inject any game inputs.
> - **Health Monitor**: Reads webview status events (passive observation). The "Reload Session" button calls `webview.reload()` which reloads the page — it does not inject any in-game keypresses or actions.
> - **Config Import/Export**: Reads/writes config files via Main process IPC. No game interaction.
> - **Per-Session Zoom**: Calls `webview.setZoomFactor()` which is a browser-level visual transform. It does not inject inputs, modify game state, or affect `isTrusted` status of any events within the webview.

- Does this feature synthesize any game inputs? **No**
- Forbidden patterns checked: automated chains ✅ absent, image recognition ✅ absent, AFK loops ✅ absent — all absent.

**Verification plan for `isTrusted` inputs**:
- `setZoomFactor()` is a Chromium content-layer API that applies a CSS transform to the webview's viewport. It does not intercept, modify, or re-dispatch any DOM events within the webview. All keyboard and mouse events inside the game remain `isTrusted: true`.
- `webview.reload()` is equivalent to the user pressing F5 in a browser tab. It does not synthesize any input events.
- Config import/export operates entirely outside the webview DOM; no game-facing code path is involved.

---

## Key Entities

- **SessionHealthState**: A per-session runtime state object tracking the webview's health status (`healthy`, `crashed`, `load-failed`, `unresponsive`), the error details (reason, error code, description), and a timestamp. Not persisted — runtime only, resets on app start.
- **ConfigExportPayload**: A JSON structure containing `schemaVersion`, `exportedAt`, `sessionActions`, `keyBinds`, `keyBindProfiles`, and `activeKeyBindProfileId`. Used for import/export serialisation.
- **SessionZoomConfig**: A per-session zoom factor stored as a map of `{ [sessionId: string]: number }` within the persisted config. Default value is `1.0` for any session without an explicit entry.

---

## Success Criteria

- When a webview crashes, the user sees a clear error state and can recover with one click in under 3 seconds.
- Health monitoring adds zero measurable CPU overhead during normal operation (event-driven, no polling).
- A user can export their config, transfer the file to another machine, import it, and have all session actions and keybinds restored — total workflow under 60 seconds.
- Importing a corrupted or invalid file never modifies the existing config.
- A user can adjust the zoom on one session without affecting any other session.
- Per-session zoom levels survive an app restart.
- None of the three features affect the `isTrusted` property of any events inside game webviews.
- All three features work independently — shipping one does not require the other two.

---

## Clarifications

### Session 2026-04-20

- Q: When "Merge" import mode is chosen and an imported entry shares the same ID as an existing one, what should happen? → A: Skip the imported entry — keep the existing one (if the user wanted to overwrite, they'd choose Replace).
- Q: Where should the zoom control appear in the UI? → A: Both — compact +/− buttons on the session pane toolbar (next to existing controls) AND a precise slider in the Session Settings tab.
- Q: Should `did-fail-load` trigger the error overlay for all load failures including normal navigation aborts? → A: No — exclude `ERR_ABORTED` (error code −3); only genuine errors trigger the overlay.
- Q: Which Settings tab should host the Import/Export buttons? → A: A new dedicated "Backup" tab in the Settings window.
- Q: Should the health monitor error overlay cover the full session pane or appear as a partial banner? → A: Full-pane overlay covering the entire session area.

---

## Assumptions

- Health detection relies on Electron's `<webview>` tag events (`render-process-gone`, `did-fail-load`, `unresponsive`, `responsive`) which are available in the Renderer process without Main involvement. No new IPC channels are needed for detection itself.
- **Health state (`healthStatus`, `healthDetail`) MUST be stored in `mainWindowState.sessionsLayoutsRef[session.id]` (session-level shared state), not in local `$state` inside `NeuzClient.svelte`.** This is required so that acceptance scenario 5 is satisfied: when the user switches layout tabs and returns, the error overlay is still visible because `mainWindowState` survives component remounts. Initialise with `healthStatus: 'healthy'` and `healthDetail: ''` in the `onMount` block where `sessionsLayoutsRef[session.id]` is first populated.
- The "Reload Session" action calls `webview.reload()` directly from the Renderer — same process that owns the `<webview>` tag. No Main-side involvement needed.
- Config export/import uses Electron's `dialog.showSaveDialog` / `dialog.showOpenDialog` (Main process) + `fs.writeFile` / `fs.readFile` (Main process) via IPC, following the existing `config.save` / `config.load` pattern.
- The zoom config map is stored as a new top-level field `sessionZoomLevels: { [sessionId: string]: number }` on `NeuzConfig`, defaulting to `{}` (empty object). Sessions without an entry default to zoom factor `1.0`.
- The zoom range of 0.5x to 1.5x with 0.05 increments covers the practical range for game webviews without causing layout issues.
- Import validation checks for the presence and types of all 6 required top-level fields (`schemaVersion`, `exportedAt`, `sessionActions`, `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId`) but does not deeply validate individual action or keybind entries — those are validated at use-time by existing logic.
- Maximum import file size is capped at 5 MB to prevent memory issues.
- The three features are independent modules — they share no state and can be implemented, tested, and shipped in any order.
