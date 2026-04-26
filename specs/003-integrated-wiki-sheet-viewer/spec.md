# Feature Specification: Integrated Wiki & Sheet Viewer

**Feature Branch**: `003-integrated-wiki-sheet-viewer`
**Created**: 2026-04-20
**Status**: Draft

---

## Clarifications

### Session 2026-04-20

- Q: Should the viewer windows be always-on-top of all other OS windows? → A: Always-on-top enabled by default, with a toggle in the custom titlebar to disable per-window.
- Q: What is the correct URL for Flyffipedia? → A: https://flyffipedia.com (confirmed).
- Q: Where should the sidebar left/right position control be accessible? → A: Inline toggle/button on the sidebar panel header itself.
- Q: Should the floating viewer windows be user-resizable, with width/height also persisted? → A: Resizable; width & height persisted alongside x/y.
- Q: Should the always-on-top toggle state be remembered per window across app restarts? → A: Yes — persist per-window always-on-top state across restarts.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Navi's Bestiary Guide in a Floating Window (Priority: P1)

A Flyff player wants to consult Navi's Bestiary (a Google Sheet-based monster leveling guide) while actively running sessions in neuzOS, without leaving the application or opening an external browser.

**Why this priority**: The guide viewer is the central deliverable. Without it the entire feature has no value. All other stories extend this capability.

**Independent Test**: Click "Open Navi's Guide" from the main window toolbar. A new frameless floating window opens, loads the published Google Sheet, hides Google's UI chrome, and displays only the table grid. The window can be moved by dragging its titlebar and closed via its close button.

**Acceptance Scenarios**:

1. **Given** neuzOS is running, **When** the user clicks "Open Navi's Guide" in the main window toolbar, **Then** a new floating window opens displaying the Bestiary Info sheet with no Google header, footer, or "Published by Google" banner visible.
2. **Given** the floating window is open, **When** the user drags the custom titlebar, **Then** the window repositions on screen and the new position is saved to persistent config.
3. **Given** the app is restarted after the window was previously opened, **When** the user opens the guide again, **Then** the window appears at the previously saved screen position.
4. **Given** the guide window is open, **When** the user clicks the close button on the custom titlebar, **Then** the window closes without affecting the main window.
5. **Given** the guide window is already open, **When** the user clicks "Open Navi's Guide" again, **Then** the existing window is focused/brought to front rather than creating a duplicate.
6. **Given** the guide window opens for the first time, **When** it appears, **Then** it is always-on-top of all OS windows by default; a toggle button in the custom titlebar allows the user to disable always-on-top for that window independently.

---

### User Story 2 — Navigate Between Bestiary Sheets (Priority: P1)

A player wants to switch between the 11 area-specific sheets (Flaris, Saint Morning, Darkon 1, etc.) to look up monsters for different regions without opening a browser.

**Why this priority**: Equal priority to Story 1 — a viewer locked to a single sheet would not satisfy the use case since the guide spans 11 tabs.

**Independent Test**: With the guide window open, click any sheet tab in the neuzOS tab bar. The webview content updates to show that area's sheet, preserving the CSS injection (no Google chrome visible).

**Acceptance Scenarios**:

1. **Given** the guide window is open showing the Info sheet, **When** the user clicks the "Darkon 1" tab, **Then** the webview loads and displays the Darkon 1 sheet with Google chrome hidden.
2. **Given** a sheet is loading, **When** the navigation is in progress, **Then** a loading indicator is visible in the custom titlebar until the content renders.
3. **Given** the user navigates to a different sheet, **When** the webview becomes ready, **Then** CSS injection is re-applied so Google's header and footer remain hidden.
4. **Given** the network is unavailable, **When** a sheet fails to load, **Then** a user-friendly error message is shown inside the window (not a raw browser error page).

**Sheet registry (Navi's Bestiary)**:

| Tab Label         | GID          |
|-------------------|--------------|
| Info              | 1445446233   |
| Flaris            | 847581642    |
| Saint Morning     | 1302951859   |
| Garden of Rhisis  | 401038439    |
| Darkon 1          | 1370974934   |
| Darkon 2          | 490029852    |
| Darkon 3          | 1680017461   |
| Deadwalderness    | 723316797    |
| Azria             | 588348548    |
| Coral Island      | 1664847440   |
| Kaillun           | 657250296    |

Base pubhtml URL: `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8eNyPRo38JZA7ACZbCNJ1MYsW1nqhVnV8pHWv-GBEx7W8jf2-UGwWr6QCEwUBr5QmCj12_wKxtE9v/pubhtml`

---

### User Story 3 — View Flyffipedia in a Separate Floating Window (Priority: P2)

A player wants to open Flyffipedia (the Flyff wiki website) as an in-app floating panel alongside active sessions — useful for looking up item stats, skill descriptions, and quest details.

**Why this priority**: Secondary to Navi's Guide but the same UX pattern applies. Valuable because the wiki is frequently referenced by players.

**Independent Test**: Click "Open Flyffipedia" from the main window toolbar. A separate frameless floating window opens loading the Flyffipedia URL (assumed: `https://flyffipedia.com`). The window is independently movable and persists its position.

**Acceptance Scenarios**:

1. **Given** neuzOS is running, **When** the user clicks "Open Flyffipedia" in the main window toolbar, **Then** a new floating window opens displaying the Flyffipedia website.
2. **Given** both the Navi's Guide and Flyffipedia windows are open simultaneously, **When** the user moves one window, **Then** the other window is unaffected.
3. **Given** the Flyffipedia window is open, **When** the user navigates within the webview (follows links), **Then** in-page navigation is allowed but no new native browser windows are opened.
4. **Given** the Flyffipedia window is already open, **When** the user clicks "Open Flyffipedia" in the main window again, **Then** the existing window is focused rather than creating a duplicate.

---

### User Story 4 — Reposition the Quest/Tool Sidebar Panel (Priority: P2)

A player wants to move the Quest/Tool sidebar panel (currently always on the left or right) to the opposite side of the main window, matching their preferred screen layout.

**Why this priority**: Usability improvement for multi-monitor or ultrawide setups. Independent of the sheet viewer but requested in the same feature scope.

**Independent Test**: Open Settings (or a panel preference control). Switch the sidebar from its current side to the opposite. The panel visually moves and the preference persists after restarting the app.

**Acceptance Scenarios**:

1. **Given** the sidebar panel is on the left side, **When** the user selects "Right" in the panel position setting, **Then** the sidebar immediately moves to the right side of the main window.
2. **Given** the sidebar position has been changed to "Right", **When** the app is restarted, **Then** the sidebar renders on the right side on load.
3. **Given** the sidebar panel is on either side, **When** the user opens a guide window (Story 1 or Story 3), **Then** the sidebar position is unaffected.

---

### Edge Cases

- What happens when the Google Sheet's published URL changes or becomes unavailable? → Show a user-friendly error within the viewer window; the app must not crash.
- What happens if the user moves the floating window off-screen and then changes display configuration? → On next open, if the saved position is outside all displays, default to centered on the primary display.
- What happens when the CSS injection targets are updated by Google (class/ID changes)? → The table content remains visible but Google chrome may reappear. A graceful degradation — not a crash.
- What happens when two identical guide windows are triggered (e.g., rapid double-click)? → Only one window is created; a second click focuses the existing window.
- What happens when the webview navigates away from the pubhtml URL? → External link navigation should be blocked/redirected to keep the experience within neuzOS.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST open a dedicated floating window displaying Navi's Bestiary Google Sheet when the user triggers "Open Navi's Guide" from the main toolbar.
- **FR-002**: The floating viewer window MUST be frameless (no native OS title bar), MUST include a custom draggable titlebar for window movement, and MUST be always-on-top of all OS windows by default. The custom titlebar MUST include a toggle control to disable always-on-top for that window independently.
- **FR-003**: After the sheet webview content loads, the system MUST inject CSS to hide Google's native header, navigation bar, and "Published by Google" footer, leaving only the table grid visible.
- **FR-004**: CSS injection MUST be re-applied each time the webview navigates to a new sheet GID.
- **FR-005**: The viewer window MUST display a tab bar listing all 11 Bestiary sheets by name; clicking a tab MUST load the corresponding sheet GID in the webview.
- **FR-006**: The viewer window position (x, y), size (width, height), and always-on-top toggle state MUST be persisted to the app's local configuration store and restored on the next open.
- **FR-007**: If a viewer window is already open when its trigger is activated again, the existing window MUST be brought to focus rather than creating a new instance.
- **FR-008**: The system MUST open a separate dedicated floating window displaying the Flyffipedia website when the user triggers "Open Flyffipedia" from the main toolbar.
- **FR-009**: The Flyffipedia viewer window MUST follow the same frameless, draggable titlebar, and position-persistence requirements as the Navi's Guide window (FR-002, FR-006, FR-007).
- **FR-010**: The main window toolbar MUST expose two additional entry points: "Open Navi's Guide" and "Open Flyffipedia", positioned near the existing "Quest" tool toggle.
- **FR-011**: In-page navigation within the Flyffipedia webview MUST be allowed; attempts to open new native browser windows from within the webview MUST be suppressed.
- **FR-012**: The Quest/Tool sidebar panel MUST support a user-configurable position preference: "left" or "right" side of the main window. The control MUST be an inline toggle button on the sidebar panel header.
- **FR-013**: The sidebar position preference MUST be persisted and restored on application restart.
- **FR-014**: The Svelte renderer MUST communicate with the Electron main process via IPC to trigger window creation/focus for both guide types.

### ToS Compliance (NeuzOS-specific — mandatory)

**"One Input = One Action" declaration**:

> This feature involves no in-game input. The Wiki & Sheet Viewer is a read-only reference tool. No game inputs are synthesized, injected, or automated by this feature. The webviews load external websites and display their content. All user interactions (tab clicks, window moves) affect only the neuzOS UI.

- Does this feature synthesize any game inputs? **No**
- Forbidden patterns checked: automated chains ☑ (absent), image recognition ☑ (absent), AFK loops ☑ (absent) — all absent.

### Key Entities

- **ViewerWindow**: A named floating Electron window (e.g., `navi-guide`, `flyffipedia`) with a frameless frame, custom titlebar, and an embedded webview. Tracks: `name`, `url`, `windowState` (position, size), `isOpen`.
- **SheetTab**: A single sheet entry in the Navi's Bestiary registry. Attributes: `label` (display name), `gid` (Google Sheet GID). Derived URL: `baseUrl + "?gid=" + gid`.
- **SidebarPanelPreference**: A persisted config value stored in `NeuzConfig.window.sidebarSide` representing the user's preferred sidebar position. Values: `"left"` | `"right"`. Default: `"left"`.
- **ViewerWindowConfig**: Persisted window state per viewer. Attributes: `x`, `y`, `width`, `height`, `alwaysOnTop`. Stored in app's config store keyed by window name.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Navi's Guide floating window opens and displays the first sheet with no visible Google UI chrome within 5 seconds of a click on a standard broadband connection.
- **SC-002**: Switching between any two sheet tabs takes under 4 seconds to fully render on a standard broadband connection.
- **SC-003**: Both viewer windows (Navi's Guide and Flyffipedia) can be open simultaneously without any increase in main window input latency or session degradation.
- **SC-004**: 100% of window positions (x, y), sizes (width, height), and always-on-top toggle states saved are correctly restored on the next application launch (persistence is lossless).
- **SC-005**: A user can change the sidebar panel side and confirm the change takes effect without restarting the application.
- **SC-006**: No duplicate viewer windows are created regardless of how many times the trigger button is clicked in succession.

---

## Assumptions

- Flyffipedia's URL is `https://flyffipedia.com` (confirmed by user).
- Google's published sheet URL structure (`/pubhtml?gid=...`) remains stable. The spec does not mandate polling for URL changes.
- The 11 GIDs listed in this spec correspond to the full set of sheets in Navi's Bestiary as of the spec date; additional sheets discovered later can be added to the registry config without a spec revision.
- CSS injection targets are defined by the current Google Sheets `pubhtml` markup at spec authoring time. The injection logic may need maintenance if Google changes its markup.
- The floating viewer windows do NOT embed or replicate game sessions; they load external web content only.
- Window size (width × height) defaults to a reasonable full-content size (e.g., 1100×700) if not previously persisted.
- The sidebar position preference is stored in the JSON config file, not localStorage.
- The sidebar repositioning (FR-012/FR-013) applies to the Quest/Tool panel in the main window layout; other panels are not in scope.
- Flyffipedia external navigation (opening links in new OS windows) is blocked to keep content contained. Users who want full browser navigation can open their OS browser separately.
- No CSV parsing, no data extraction from the sheets — the visual layout is rendered as-is via the webview.
