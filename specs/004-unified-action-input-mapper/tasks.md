---
description: "Task list for feature 004 — Unified Action & Input Mapper"
---

# Tasks: Unified Action & Input Mapper

**Input**: `specs/004-unified-action-input-mapper/`  
**Branch**: `004-unified-action-input-mapper`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ipc.md ✅ quickstart.md ✅

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Task can run in parallel with other [P] tasks in the same phase (different files, no blocked deps)
- **[US1/2/3]**: Which user story this task belongs to
- File paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Add the shared type definitions that all subsequent phases depend on.

- [X] T001 Add `UIActionDescriptor` and `UIActionHandler` types to `src/renderer/src/lib/types.ts` — `UIActionDescriptor = { id: string; label: string; category: string; defaultKey?: string }`, `UIActionHandler = () => void`

**Checkpoint**: Type definitions available — all phases can now reference `UIActionDescriptor`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Main-process registry + IPC plumbing + renderer context. Must be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `allowedUiActionKeybinds: Record<string, UIActionDescriptor>` const to `src/main/index.ts` immediately after the existing `allowedEventKeybinds` object — initial entry: `'ui.toggle_quest_log': { id: 'ui.toggle_quest_log', label: 'Toggle Quest Log', category: 'Interface' }` with commented stubs for future wiki/bestiary entries
- [X] T003 Update `checkKeybinds()` in `src/main/index.ts` to build the allowed-key set from both `Object.keys(allowedEventKeybinds)` and `Object.keys(allowedUiActionKeybinds)` so `ui.*` keybinds survive the filter on config load
- [X] T004 [P] Add `ui.*` prefix branch to `dispatchKeybindEvent()` in `src/main/index.ts` — before the existing `switch` statement: `if (bind.event.startsWith('ui.')) { mainWindow?.webContents.send('event.ui_action_fired', { actionId: bind.event }); return; }`
- [X] T005 [P] Add `ipcMain.handle('config.get_available_ui_actions', () => Object.values(allowedUiActionKeybinds))` handler in `src/main/index.ts` alongside the existing `config.get_available_event_keybinds` handler
- [X] T006 [P] Create `src/renderer/src/lib/contexts/uiActionContext.svelte.ts` — Svelte 5 `$state` handler map (`Map<string, UIActionHandler>`), expose `register(actionId, handler)`, `unregister(actionId)`, `dispatch(actionId)` methods; export `createUIActionContext`, `setUIActionContext`, `getUIActionContext` following the exact pattern of `questPanelContext.svelte.ts`
- [X] T007 [P] Add `uiActions: { getRegistry(): Promise<UIActionDescriptor[]> }` invoke helper to `src/renderer/src/lib/core.ts` — wraps `electronApi?.invoke('config.get_available_ui_actions')`
- [X] T008 Initialize `uiActionContext` in `src/renderer/src/App.svelte` — call `setUIActionContext(createUIActionContext())` at component root (Svelte 5 `$effect` / init block), register `electronApi.on('event.ui_action_fired', (_, payload) => uiActionCtx.dispatch(payload.actionId))` on mount, remove listener on destroy

> T004 and T005 are [P] with each other (different functions in `index.ts`, both depend on T002/T003 being done first).  
> T006 and T007 are [P] with T002–T005 (different files, only depend on T001).  
> T008 depends on T006.

**Checkpoint**: Main process sends `event.ui_action_fired` for any `ui.*` keybind. Renderer context receives and dispatches it. `config.get_available_ui_actions` IPC handler is live.

---

## Phase 3: User Story 1 — Keyboard Shortcut Binding (Priority: P1) 🎯 MVP

**Goal**: User opens Settings → Keybinds, finds "Toggle Quest Log" in the Interface category, picks a key combo via the existing modifier+key dropdown UI, saves, and the shortcut fires globally.

**Independent Test**: Bind Ctrl+F9 to "Toggle Quest Log" via the dropdown UI → save → press Ctrl+F9 (even with game webview focused) → Quest Log opens. Press again → closes. No Record mode needed for this story.

- [X] T009 [US1] Fetch `UIActionDescriptor[]` from `uiActions.getRegistry()` in `src/renderer/src/components/SettingsWindow/Tabs/KeybindsSettings.svelte` on mount — store in `$state<UIActionDescriptor[]>`, alongside the existing `allowedEventKeybinds` fetch
- [X] T010 [US1] Render "Interface" category group in `src/renderer/src/components/SettingsWindow/Tabs/KeybindsSettings.svelte` — one row per `UIActionDescriptor` using the existing modifier-dropdown + key-dropdown row pattern; show current binding from the active profile's `keybinds` array where `bind.event === action.id`
- [X] T011 [US1] Implement save and remove for `ui.*` keybinds in `src/renderer/src/components/SettingsWindow/Tabs/KeybindsSettings.svelte` — write `{ key, event: action.id }` `NeuzKeybind` entries into the active profile's `keybinds` array via the existing save flow; remove entry on clear
- [X] T012 [US1] Register `ui.toggle_quest_log` UIAction handler in `src/renderer/src/components/MainWindow/MainBar.svelte` — inside a Svelte 5 `$effect`, call `getUIActionContext().register('ui.toggle_quest_log', () => questPanel.toggle())`; call `unregister` in the effect's cleanup function

**Checkpoint**: Full keyboard → globalShortcut → IPC → renderer → QuestLog.toggle() round-trip works. US1 independently testable and deliverable.

---

## Phase 4: User Story 2 — Record Mode Binding (Priority: P2)

**Goal**: User clicks "Click to Bind" on an action row, the UI enters "Listening…" state, and the next physical key press or mouse button click (Mouse 4, Mouse 5, middle-click) is captured and fills the binding field. Escape cancels. Duplicate-key assignments show an inline conflict warning.

**Independent Test**: Open Record mode → press Mouse4 → field shows "Mouse4" → Cancel → field reverts. Assign the same key to two actions → red conflict warning appears, Save is disabled.

- [X] T013 [US2] Create `src/renderer/src/components/Shared/KeyBinder.svelte` — bits-ui `Popover.Root` wrapping a "Click to Bind" trigger button and a Popover Content pane; `$props(): { actionId: string; currentKey: string; onBind: (key: string) => void; onCancel: () => void }`; internal `$state`: `isRecording = false`, `capturedKey: string | null = null`; "Listening…" pulsing indicator visible when `isRecording`
- [X] T014 [US2] Add keyboard capture to `src/renderer/src/components/Shared/KeyBinder.svelte` — `window.addEventListener('keydown', handler, { capture: true })` active only while `isRecording`; normalise modifier order to `Ctrl+Alt+Shift+Key` using `event.code`; Escape key triggers `onCancel()` and closes Popover; any other key sets `capturedKey` and exits Record mode for confirmation
- [X] T015 [US2] Add mouse button capture to `src/renderer/src/components/Shared/KeyBinder.svelte` — `mousedown` listener with `{ capture: true }` active while `isRecording`; map `event.button`: `1 → "Middle"`, `3 → "Mouse4"`, `4 → "Mouse5"`; call `event.preventDefault()` + `event.stopPropagation()` to satisfy FR-007; set `capturedKey` and exit Record
- [X] T016 [US2] Integrate `KeyBinder.svelte` into each UIAction row in `src/renderer/src/components/SettingsWindow/Tabs/KeybindsSettings.svelte` — add "Click to Bind" button per row that renders `KeyBinder.svelte`; wire `onBind(key)` to update the row's pending binding and trigger conflict check; wire `onCancel()` to revert
- [X] T017 [US2] Implement inline conflict detection in `src/renderer/src/components/SettingsWindow/Tabs/KeybindsSettings.svelte` — on each bind attempt compare `newKey` (case-insensitive) against all binds in the active profile; if a different `event` matches, set `$state conflictWarning: string` to the conflicting action's label and disable the row's Save button; clear on key change

**Checkpoint**: Record mode captures keyboard + mouse buttons. Conflict detection blocks saves. US2 independently testable.

---

## Phase 5: User Story 3 — Gamepad Button Binding (Priority: P3)

**Goal**: Pressing a gamepad button during Record mode captures it as `Gamepad{index}:Button{i}`. Saved gamepad binds fire the associated action when the button is pressed during normal neuzOS use.

**Independent Test**: Record mode + connected controller → press A button → field shows "Gamepad0:Button0". Without controller → "No gamepad detected" hint visible. Keyboard/mouse capture still works.

- [X] T018 [US3] Add gamepad `requestAnimationFrame` poll to `src/renderer/src/components/Shared/KeyBinder.svelte` — start poll when `isRecording` becomes `true`, call `navigator.getGamepads()` each frame, on first button with `pressed === true` build identifier `Gamepad${gamepad.index}:Button${buttonIndex}`, set `capturedKey`, stop poll; also stop poll in cancel/cleanup path
- [X] T019 [US3] Add "No gamepad detected" hint to `KeyBinder.svelte` Popover content — show when `isRecording === true` and `navigator.getGamepads().filter(Boolean).length === 0`; hint text: "No gamepad detected — keyboard and mouse capture still active"
- [X] T020 [US3] Add `startGamepadPoll(binds: NeuzKeybind[])` / `stopGamepadPoll()` to `src/renderer/src/lib/contexts/uiActionContext.svelte.ts` — persistent `rAF` loop (separate from Record mode) that polls `navigator.getGamepads()` and calls `dispatch(bind.event)` when a pressed button's identifier matches a bind's `key`; takes only binds where `bind.key.startsWith('Gamepad')` and `bind.event.startsWith('ui.')`; tracks last-pressed state to fire once per press, not continuously
- [X] T021 [US3] Wire gamepad dispatch in `src/renderer/src/App.svelte` — in the `$effect` that processes loaded config, filter the active profile's `keybinds` for gamepad-ui binds and call `uiActionCtx.startGamepadPoll(gamepadBinds)`; call `stopGamepadPoll()` in effect cleanup

**Checkpoint**: Full gamepad → renderer poll → `uiActionCtx.dispatch()` path works. US3 independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UX hints, edge-case handling, and end-to-end validation.

- [X] T022 [P] Add focus-scope hint to mouse and gamepad binding rows in `src/renderer/src/components/SettingsWindow/Tabs/KeybindsSettings.svelte` — display per-row inline note "Fires only when neuzOS window has focus" for any bind whose `key` starts with `Mouse` or `Gamepad` (per FR-012)
- [X] T023 [P] Handle Record mode focus-loss in `src/renderer/src/components/Shared/KeyBinder.svelte` — hook bits-ui Popover's `onOpenChange(false)` event to cancel Record mode (`isRecording = false`, `capturedKey = null`, call `onCancel()`) so the binding field reverts cleanly if the neuzOS window loses focus mid-recording
- [ ] T024 Run the quickstart.md end-to-end validation — bind F9 to "Toggle Quest Log" using both dropdown UI (US1) and Record mode (US2), confirm the active profile contains `{ key: "f9", event: "ui.toggle_quest_log" }` in its `keybinds` array, confirm shortcut fires with game webview focused, confirm conflict detection triggers on duplicate key attempt

**Checkpoint**: Feature complete. All FRs satisfied. Ready for integration branch merge.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └─► Phase 2 (Foundational) — BLOCKS everything
        ├─► Phase 3 (US1 — P1) 🎯 MVP
        ├─► Phase 4 (US2 — P2)   — integrates with US1 UI rows
        └─► Phase 5 (US3 — P3)   — extends KeyBinder.svelte from US2
              └─► Phase 6 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|-----------|----------------|
| US1 (P1) | Foundational (T001–T008) | T008 complete |
| US2 (P2) | Foundational + US1 row UI (T010) | T010 complete |
| US3 (P3) | Foundational + KeyBinder.svelte (T013) | T013 complete |
| Polish | All stories at desired scope | US1 minimum |

### Within Foundational Phase

```
T001
  ├─► T002 → T003 → T004 [P]
  │                 T005 [P]
  ├─► T006 [P]
  └─► T007 [P]
T006 → T008
```

---

## Parallel Opportunities

### Phase 2 — Foundational

```
# After T001, these can run in parallel:
[Main process track]    T002 → T003 → { T004 [P], T005 [P] }
[Renderer lib track]    T006, T007  (independently, concurrently)

# After T006:
T008
```

### Phase 3 — US1

```
# T009 → T010 → T011 (sequential, same file)
# T012 is independent (different file — MainBar.svelte)
[Settings track]  T009 → T010 → T011
[MainBar track]   T012           (parallel with T009–T011)
```

### Phase 4 — US2

```
# KeyBinder.svelte creation is sequential (T013 → T014 → T015)
# Integration into settings comes after
T013 → T014 → T015 → T016 → T017
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. ✅ Complete Phase 1: Setup (T001)
2. ✅ Complete Phase 2: Foundational (T002–T008)
3. ✅ Complete Phase 3: User Story 1 (T009–T012)
4. **STOP and VALIDATE**: Bind a key via dropdown → shortcut fires → Quest Log toggles
5. Merge as MVP if Record mode (US2) is not yet needed

### Incremental Delivery

- **v0.1** — US1 only: keyboard binding via existing dropdown, Quest Log toggle working
- **v0.2** — US1 + US2: Record mode added, conflict detection, Mouse 4/5 capture
- **v0.3** — Full feature: Gamepad support (US3) + all polish tasks

---

## Task Summary

| Phase | Tasks | Count |
|-------|-------|-------|
| Phase 1: Setup | T001 | 1 |
| Phase 2: Foundational | T002–T008 | 7 |
| Phase 3: US1 (P1) | T009–T012 | 4 |
| Phase 4: US2 (P2) | T013–T017 | 5 |
| Phase 5: US3 (P3) | T018–T021 | 4 |
| Phase 6: Polish | T022–T024 | 3 |
| **Total** | | **24** |

| Story | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| US1 (P1) | T009–T012 | T012 parallel with T009–T011 |
| US2 (P2) | T013–T017 | — |
| US3 (P3) | T018–T021 | T020 parallel with T018–T019 |
| Polish | T022–T024 | T022, T023 parallel |

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 3 (US1) = **12 tasks**
