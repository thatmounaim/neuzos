# Tasks: Integrated Wiki & Sheet Viewer

**Input**: Design documents from `specs/003-integrated-wiki-sheet-viewer/`
**Branch**: `003-integrated-wiki-sheet-viewer`
**Date**: 2026-04-20

---

## Phase 1: Setup

**Purpose**: Add the new `viewer.html` entry point and wire the build system.

- [X] T001 [CONFIG] Add `viewer` entry to `rollupOptions.input` in `electron.vite.config.ts` (`viewer: path.resolve(__dirname, 'src/renderer/viewer.html')`)
- [X] T002 Create `src/renderer/viewer.html` mirroring the structure of `src/renderer/session.html` (script src points to `./src/viewer.ts`)
- [X] T003 Create `src/renderer/src/viewer.ts` and a minimal `src/renderer/src/Viewer.svelte` shell mirroring `src/renderer/src/session.ts`; mount the shell on `#app` so later phases can extend it without build-order issues

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, config schema, and IPC bridge that ALL user stories depend on. Must be complete before any story can be built.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [CONFIG] Add `ViewerWindowType` and `ViewerWindowConfig` types to `src/renderer/src/lib/types.ts` per `data-model.md`; extend `NeuzConfig.window` with `viewers?: { navi_guide?: ViewerWindowConfig; flyffipedia?: ViewerWindowConfig }`
- [X] T005 [CONFIG] Add `viewers` defaults to `defaultNeuzosConfig.window` in `src/main/index.ts` (both `navi_guide` and `flyffipedia` with `x:null, y:null, width:1100, height:700, alwaysOnTop:true`)
- [X] T006 [CONFIG] Extend the `loadConfig` deep-merge block in `src/main/index.ts` to include `window.viewers` so persisted viewer state survives config reloads without clobbering new fields
- [X] T007 [IPC] Add `viewerWindows: Map<string, BrowserWindow>` module-level variable and `createViewerWindow(type)` function in `src/main/index.ts`; function creates frameless `BrowserWindow` with `contextIsolation:true`, `webviewTag:true`, loads `viewer.html?type=<type>`, applies persisted `x`/`y`/`width`/`height` plus `setAlwaysOnTop(alwaysOnTop, 'screen-saver')` before show, and registers debounced `move`/`resize` handlers that save bounds to `neuzosConfig.window.viewers[type]`
- [X] T008 [IPC] Register `viewer_window.open` handler in `src/main/index.ts`: checks `viewerWindows` map, focuses existing window or calls `createViewerWindow(type)`; wrapped in try/catch
- [X] T009 [IPC] Register `viewer_window.close` and `viewer_window.minimize` handlers in `src/main/index.ts`: resolve `BrowserWindow.fromWebContents(event.sender)` and call `win.close()`/`win.minimize()`; wrapped in try/catch
- [X] T010 [IPC] Register `viewer_window.set_always_on_top` handler in `src/main/index.ts`: resolves window + type from sender, calls `win.setAlwaysOnTop(value, 'screen-saver')`, persists to `neuzosConfig.window.viewers[type].alwaysOnTop`, calls `saveConfig()`; wrapped in try/catch
- [X] T011 [IPC] Register `viewer_window.get_config` handler (`ipcMain.handle`) in `src/main/index.ts`: resolves window type from sender via reverse lookup on `viewerWindows` map, returns `{ type, config: neuzosConfig.window.viewers[type] }`; wrapped in try/catch returning `{ error }` on failure
- [X] T012 [CLEANUP] In `createViewerWindow` `closed` event handler in `src/main/index.ts`: remove the window entry from `viewerWindows`, clear the webview `src`, and remove the `move`/`resize` bound-save listeners
- [X] T013 [P] Add `viewerWindow` namespace to `neuzosBridge` in `src/renderer/src/lib/core.ts` with methods: `open(type)` → `send('viewer_window.open', type)`, `close()` → `send('viewer_window.close')`, `minimize()` → `send('viewer_window.minimize')`, `setAlwaysOnTop(value)` → `send('viewer_window.set_always_on_top', value)`

**Checkpoint**: Foundation ready — all 5 IPC channels registered, config schema extended, bridge updated. User story work can begin.

---

## Phase 3: User Story 1 — View Navi's Bestiary Guide in a Floating Window (Priority: P1) 🎯 MVP

**Goal**: A frameless floating window opens from the main toolbar, loads the Navi's Bestiary Info sheet, hides Google's chrome via CSS injection, persists position/size/always-on-top, and supports duplicate-open prevention.

**Independent Test**: Click "Open Navi's Guide" in the main toolbar → window opens, Info sheet visible with no Google header/footer, window is draggable by titlebar, always-on-top is active (a browser window behind it stays behind it), close button closes it cleanly.

- [X] T014 [P] [US1] Create `src/renderer/src/components/ViewerWindow/ViewerTitleBar.svelte`: custom drag bar (`-webkit-app-region: drag` on drag area), window title prop, always-on-top toggle button (Pin/PinOff lucide icon), minimize button, close button; buttons use `neuzosBridge.viewerWindow.*` calls; toggle emits `ontogglealwaysontop` event to parent
- [X] T015 [P] [US1] Create `src/renderer/src/components/ViewerWindow/ViewerWebview.svelte`: renders a `<webview>` tag with `src` prop; on `dom-ready` calls `webviewEl.insertCSS(SHEETS_HIDE_CSS)` where `SHEETS_HIDE_CSS` hides `[role="banner"], header, footer, .publish-mode-footer, [class*="footer"], #footer` and zeroes `body`/`html` margin; re-applies on `did-navigate`; sets `isLoading=$state(true)` on `will-navigate`, false on `dom-ready`; on `did-fail-load` sets `loadError` state and shows an inline error message; on `new-window` calls `event.preventDefault()` to block new OS windows; exposes `src` and `isLoading` props; cleans up all event listeners in `onDestroy`
- [X] T016 [US1] Create `src/renderer/src/components/ViewerWindow/NaviGuideViewer.svelte`: renders `ViewerWebview` with `NAVI_BESTIARY_BASE_URL + '?gid=' + activeGid`; default `activeGid` = `'1445446233'` (Info); passes `isLoading` to parent via prop or event for titlebar indicator
- [X] T017 [US1] Create `src/renderer/src/Viewer.svelte`: reads `?type` from `new URLSearchParams(window.location.search)`; on mount calls `window.electron.ipcRenderer.invoke('viewer_window.get_config')` to load `ViewerWindowConfig`; initialises `alwaysOnTop` $state from config; renders `ViewerTitleBar` + `NaviGuideViewer` when `type=navi_guide`, or a direct `ViewerWebview` pointed at `https://flyffipedia.com` when `type=flyffipedia` so this phase does not depend on later Flyffipedia-specific components; passes `alwaysOnTop` state to titlebar; on titlebar toggle calls `neuzosBridge.viewerWindow.setAlwaysOnTop(value)` and updates local state
- [X] T018 [US1] Add "Open Navi's Guide" toolbar button to `src/renderer/src/components/MainWindow/MainBar.svelte` near the Quest toggle: uses `BookOpen` (or equivalent) lucide icon, `onclick` calls `neuzosBridge.viewerWindow.open('navi_guide')`

**Checkpoint**: US1 is independently testable. Open guide window, verify chrome-hidden sheet, drag titlebar, close.

---

## Phase 4: User Story 2 — Navigate Between Bestiary Sheets (Priority: P1)

**Goal**: The viewer window shows an 11-tab bar; clicking any tab loads the corresponding sheet GID with CSS injection re-applied.

**Independent Test**: With guide window open, click "Darkon 1" tab → sheet updates, Google chrome stays hidden; click "Kaillun" → same. Disconnect network, click a tab → error message shown (no raw browser error page).

- [X] T019 [US2] Extend `src/renderer/src/components/ViewerWindow/NaviGuideViewer.svelte` with a scrollable horizontal tab bar: renders all 11 `NAVI_BESTIARY_SHEETS` entries (from `data-model.md` constants defined inline or in a `src/renderer/src/lib/utils/viewerConstants.ts` file); clicking a tab sets `activeGid`, updating the webview `src`; active tab is visually highlighted using Tailwind classes; tab bar is not draggable (`-webkit-app-region: no-drag` on the tab strip)
- [X] T020 [P] [US2] Create `src/renderer/src/lib/utils/viewerConstants.ts` with `NAVI_BESTIARY_BASE_URL`, `FLYFFIPEDIA_URL`, and `NAVI_BESTIARY_SHEETS` constant array (all 11 sheets per `data-model.md`)
- [X] T021 [US2] Update `src/renderer/src/components/ViewerWindow/ViewerWebview.svelte` to re-apply `insertCSS` on the `did-navigate` event (already planned in T015 — confirm the `did-navigate` handler is present and correctly injects CSS after each GID navigation, not only on initial `dom-ready`)
- [X] T022 [US2] Verify the `did-fail-load` error overlay in `ViewerWebview.svelte` shows a user-friendly message (e.g., "Could not load sheet. Check your internet connection.") rather than a raw browser error; ensure the overlay is styled with Tailwind and does not break the window layout

**Checkpoint**: US2 fully functional. All 11 tabs navigate correctly, CSS stays hidden, error state handled.

---

## Phase 5: User Story 3 — View Flyffipedia in a Separate Floating Window (Priority: P2)

**Goal**: A second independent floating window opens `https://flyffipedia.com`; in-page links work; no new OS browser windows open; position/size/always-on-top persisted independently of Navi's Guide window.

**Independent Test**: Click "Open Flyffipedia" → separate window opens, flyffipedia.com loads, click an internal link → navigates in-place, click "Open Flyffipedia" again → focuses existing window (no duplicate).

- [X] T023 [P] [US3] Create `src/renderer/src/components/ViewerWindow/FlyffipediaViewer.svelte`: renders `ViewerWebview` with `src=FLYFFIPEDIA_URL`; no CSS injection (not needed for Flyffipedia — pass empty CSS string or omit `insertCSS` call via prop `injectCss={false}`); no tab bar
- [X] T024 [US3] Add "Open Flyffipedia" toolbar button to `src/renderer/src/components/MainWindow/MainBar.svelte` near the "Open Navi's Guide" button: uses `Globe` (or equivalent) lucide icon, `onclick` calls `neuzosBridge.viewerWindow.open('flyffipedia')`
- [X] T025 [US3] Confirm `ViewerWebview.svelte` `new-window` handler (from T015) also applies when `injectCss` is false (Flyffipedia context) — in-page navigation is allowed, only `window.open()` / `_blank` target clicks are blocked by `event.preventDefault()`

**Checkpoint**: US3 independently testable. Flyffipedia window opens, navigates in-place, duplicate prevention works, position persists.

---

## Phase 6: User Story 4 — Reposition the Quest/Tool Sidebar Panel (Priority: P2)

**Goal**: Inline toggle button on the QuestPanel header moves the panel left↔right; preference persists in the config JSON and restores on restart.

**Independent Test**: Click the toggle button → panel moves to opposite side. Restart app → panel stays on chosen side.

- [X] T026 [CONFIG] Add `sidebarSide` to `defaultNeuzosConfig.window` in `src/main/index.ts` (default `'left'`) and extend the config deep-merge so the value persists in `userData/neuzos_config/config.json`; register `sidebar_panel.get_side` and `sidebar_panel.set_side` IPC handlers in `src/main/index.ts` to read/write the config value
- [X] T027 [P] Add `sidebarPanel` methods to `src/renderer/src/lib/core.ts` (`getSide()` and `setSide(side)`) and update `src/renderer/src/lib/contexts/questPanelContext.svelte.ts` to initialize `sidebarSide` from IPC, expose the reactive getter, and call the bridge setter when the user changes sides
- [X] T028 [US4] Add inline side-toggle button to `src/renderer/src/components/QuestLog/QuestPanel.svelte` panel header: uses `PanelLeft`/`PanelRight` lucide icons; `onclick` calls `questPanel.setSidebarSide(questPanel.sidebarSide === 'left' ? 'right' : 'left')`; button has `-webkit-app-region: no-drag` if parent has drag enabled, and `src/renderer/src/components/MainWindow/MainSectionsContainer.svelte` should apply `flex-row-reverse` when `sidebarSide === 'right'` on the outer flex container

**Checkpoint**: US4 independently testable. Toggle moves panel, restart preserves side.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: QoL polish, edge cases, and final validation.

- [X] T029 [P] Add off-screen recovery to `createViewerWindow` in `src/main/index.ts`: before applying saved `x`/`y`, call `screen.getAllDisplays()` and check bounds; if the saved position falls outside all display rectangles, reset `x`/`y` to `null` (centered)
- [X] T030 [P] Add `injectCss` boolean prop to `ViewerWebview.svelte` (default `true`) so Flyffipedia can opt out of Google-chrome CSS injection without duplicating the component
- [X] T031 Add `isLoading` visual indicator to `ViewerTitleBar.svelte`: a small spinner or animated dot near the title, shown when `isLoading` prop is `true` (passed from `NaviGuideViewer` or `FlyffipediaViewer`)
- [X] T032 [P] Run `bun run typecheck` — fix any TypeScript errors introduced by new types, new Svelte component props, and `NeuzConfig` extension
- [ ] T033 [P] Run `bun run lint` and `bun run format` — fix all ESLint warnings and Prettier formatting across all new/modified files
- [ ] T034 Run through all 10 test scenarios in `specs/003-integrated-wiki-sheet-viewer/quickstart.md` and confirm each passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS Phases 3–6**
- **Phase 3 (US1)**: Depends on Phase 2 — no dependencies on US2, US3, US4
- **Phase 4 (US2)**: Depends on Phase 3 (T016 — NaviGuideViewer must exist before extending it)
- **Phase 5 (US3)**: Depends on Phase 2 — independent of US1/US2/US4
- **Phase 6 (US4)**: Depends on Phase 2 — independent of US1/US2/US3
- **Phase 7 (Polish)**: Depends on all desired phases being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no other story dependencies
- **US2 (P1)**: Depends on US1 (extends `NaviGuideViewer.svelte` created in T016)
- **US3 (P2)**: Can start after Phase 2 — fully independent of US1/US2
- **US4 (P2)**: Can start after Phase 2 — fully independent of all viewer stories

### Parallel Opportunities

- T014 and T015 (US1 component shells) can be written in parallel
- T020 (`viewerConstants.ts`) can be written in parallel with any US2 work
- T023 (`FlyffipediaViewer`) and T026 (sidebar context) can be worked in parallel after Phase 2
- T032, T033 (typecheck + lint) are always parallel to each other

---

## Parallel Example: Phase 2 (Foundational)

```
T004 [types.ts types]          — can start immediately
T005 [config defaults]         — can start immediately
T006 [config deep-merge]       — can start immediately after T005
T013 [core.ts bridge]          — can start immediately after T004
T007 [createViewerWindow fn]   — needs T004 + T005
T008–T012 [IPC handlers]       — need T007
```

## Parallel Example: After Phase 2

```
Developer A: T014 → T015 → T016 → T017 → T018 (US1) → T019 → T021 → T022 (US2)
Developer B: T023 → T024 → T025 (US3) in parallel with Developer A
Developer C: T026 → T027 → T028 (US4) in parallel
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 — the full guide viewer)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T013) — **required before anything else**
3. Complete Phase 3: US1 (T014–T018) — guide window opens with CSS injection
4. Complete Phase 4: US2 (T019–T022) — all 11 tabs navigable
5. **STOP and VALIDATE**: Run quickstart tests 1–6

### Incremental Delivery

1. Phase 1 + 2 → infrastructure ready
2. Phase 3 + 4 → **Navi's Guide fully functional** (MVP, all P1 stories done)
3. Phase 5 → Flyffipedia viewer added
4. Phase 6 → Sidebar side toggle added
5. Phase 7 → Polish + full quickstart validation
