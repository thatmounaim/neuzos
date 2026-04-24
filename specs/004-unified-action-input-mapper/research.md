# Phase 0 Research: Unified Action & Input Mapper

**Branch**: `004-unified-action-input-mapper` | **Date**: 2026-04-20

---

## 1. UIAction Registry — Baseline Scope

**Decision**: The initial registry contains exactly **one** UIAction: `ui.toggle_quest_log`.

**Rationale**: `MainBar.svelte` is the authoritative source of visible toggles. Codebase inspection of `src/renderer/src/components/MainWindow/MainBar.svelte` on branch `004` (cut from `main` at `v2.2.0`) confirms only one panel toggle is present: the Quest Log button at line 423, which calls `questPanel.toggle()`. The `WidgetsButton` opens a dropdown — it is not a toggleable panel and is out of scope.  

Features named in the spec as examples (`toggle_wiki`, `toggle_bestiary`, `toggle_flyffpedia`) exist only on branch `origin/003-integrated-wiki-sheet-viewer`, which has **not** been merged into `main`. Those `ui.*` action IDs will be added to `allowedUiActionKeybinds` when branch 003 is integrated — no spec change required because FR-001 mandates an open registry.

**Alternatives considered**: Hard-coding a fixed list in spec — rejected because FR-001 explicitly requires the registry to be open-ended.

---

## 2. allowedEventKeybinds Extension Pattern

**Decision**: Introduce a parallel `allowedUiActionKeybinds` registry object in `index.ts`. Update `checkKeybinds()` to accept keys from either registry. Update `dispatchKeybindEvent()` with a prefix check for `ui.`.

**Rationale**: Code inspection of `src/main/index.ts`:
- `allowedEventKeybinds` (line 149): a `Record<string, string>` where key = event identifier, value = human-readable label. Used by `checkKeybinds()` to whitelist bindable events and returned via IPC `config.get_available_event_keybinds`.
- `checkKeybinds()` (line 582): filters `neuzosConfig.keyBinds` and each profile's `keybinds` array to only binds whose `event` key exists in `allowedEventKeybinds`. **If `ui.*` events are not added here, they will be stripped on load.** 
- `dispatchKeybindEvent(bind)` (line 614): switch statement on `bind.event`. Falls through to no-op for unknown events.
- `registerKeybinds()` (line 641): registers all surviving binds as `globalShortcut` entries — **no changes needed here** since it operates generically over any surviving bind.

Keeping `allowedUiActionKeybinds` separate from `allowedEventKeybinds` lets the IPC handler `config.get_available_event_keybinds` continue returning only the existing system events, while a new handler `config.get_available_ui_actions` returns the fuller `UIActionDescriptor` shape needed by the Settings UI.

**Alternatives considered**:
- Add `ui.*` keys directly to `allowedEventKeybinds` — rejected because it would conflate system-event keybinds (which fire arbitrary actions) with UI-action keybinds (which all go through one IPC dispatch path), making the Settings UI harder to group by category.
- Prefix check in `checkKeybinds()` alone (no registry) — rejected because it bypasses the human-readable label and category data needed by FR-003.

---

## 3. IPC Dispatch: Main → Renderer

**Decision**: `dispatchKeybindEvent()` handles `ui.*` events with a prefix check: `bind.event.startsWith('ui.')`. It sends `mainWindow?.webContents.send('event.ui_action_fired', { actionId: bind.event })` to the renderer.

**Rationale**: The renderer cannot call `globalShortcut` handlers directly (cross-process boundary). The main process must relay the trigger. Using a single `event.ui_action_fired` channel with `{ actionId }` payload keeps the main process decoupled from any knowledge of what the action does — the renderer's `uiActionContext` owns the handler registry.

**Alternatives considered**: One dedicated channel per action (e.g., `event.toggle_quest_log`) — rejected; does not scale and violates Electron Boundary Discipline by pushing UI knowledge into main process.

---

## 4. Renderer UIAction Context

**Decision**: A new `uiActionContext.svelte.ts` file under `src/renderer/src/lib/contexts/` provides `createUIActionContext()`, `setUIActionContext()`, and `getUIActionContext()`, following the exact naming pattern of `questPanelContext.svelte.ts`.

The context exposes:
- `register(actionId: string, handler: () => void)` — called once per feature component on mount
- `dispatch(actionId: string)` — called by the IPC listener
- `registeredActions: string[]` — derived list for internal use

The IPC listener is registered once in `App.svelte` (the context provider site) on mount, forwarding `event.ui_action_fired` payloads to `dispatch`.

**Rationale**: Reusing the established context pattern keeps code consistent with `questPanelContext.svelte.ts`, `widgetsContext.svelte.ts`, etc. Each feature component (`QuestPanel`, future wiki panel) self-registers its handler when mounted, so the context is automatically open-ended — no central handler table to maintain.

**Alternatives considered**: A static import map in `index.ts` (main) — rejected; violates Electron Boundary rules. A single Svelte store with a switch-case — rejected; requires updating a central file for every new action, which contradicts FR-001's open-registry requirement.

---

## 5. Mouse Button & Gamepad Capture in Record Mode

**Decision**: 
- **Mouse**: `KeyBinder.svelte` listens to `mousedown` on a wrapper element with `capture: true`. Buttons mapped: `button === 1` → `"Middle"`, `button === 3` → `"Mouse4"`, `button === 4` → `"Mouse5"`. `event.preventDefault()` + `event.stopPropagation()` to satisfy FR-007.
- **Gamepad**: `requestAnimationFrame` poll active only while `isRecording === true`. On first button with `pressed === true`, captures `Gamepad${gamepad.index}:Button${buttonIndex}`. Poll stops immediately after capture or on cancel.
- **Keyboard**: `keydown` on `window` with `capture: true`. Normalises modifier order: `Ctrl+Alt+Shift+Key`. Escape → cancel (FR-008).

**Rationale**: Renderer-only input is the only viable path for Mouse 4/5 and Gamepad, since Electron's `globalShortcut` does not support these input types. The `capture: true` listener phase ensures the Record mode intercepts events before any other UI elements (satisfying FR-007 no-propagation requirement).

**Alternatives considered**: Electron's `session.setKeyboardShortcuts` — macOS only, not cross-platform. Using `uIOhook` for global mouse — rejected; requires native module, adds >5 MB binary weight, violates SC-006.

---

## 6. Conflict Detection Strategy

**Decision**: Conflict detection runs **in the renderer** (`KeybindsSettings.svelte`) at bind-time, comparing the new key combo against all existing binds in the currently active profile. No main-process involvement.

A bind is a conflict if: another bind in the same profile's `keybinds` array has `bind.key === newKey` (case-insensitive) AND `bind.event !== currentActionId`.

Conflict warning: inline red text below the binding row, naming the conflicting action's label. Save button for the row is disabled until resolved. Scope: active profile only (clarification Q4).

**Rationale**: All profile data is already in the renderer's settings state at the time of editing. Moving conflict detection to main would require an extra round-trip IPC call on every keystroke in Record mode — unnecessary latency.

**Alternatives considered**: Server-side validation in `checkKeybinds()` on save — rejected; provides feedback too late (only at app restart/reload), violating FR-009's "immediate inline" requirement.

---

## 7. KeyBinder.svelte Popover Integration

**Decision**: `KeyBinder.svelte` is a self-contained bits-ui `Popover.Root` component. Props (Svelte 5 `$props()`): `{ actionId: string; currentKey: string; onBind: (key: string) => void; onCancel: () => void }`. The Popover trigger is the "Click to Bind" button on each action row. The Popover content shows "Listening…" with a visual pulse and instruction text. Clicking outside or pressing Escape cancels.

**Rationale**: bits-ui `Popover` is already used in `KeybindsSettings.svelte` for modifier dropdowns. Reusing the same library component avoids introducing a new UI primitive. The Popover's `onOpenChange` event handles focus-loss cancel (satisfying the edge case of losing focus during Record mode).

---

## Summary Table

| Unknown | Resolution | Source |
|---------|-----------|--------|
| Initial UIAction count on main | 1 (`ui.toggle_quest_log`) | `MainBar.svelte:423` inspection |
| How `checkKeybinds` handles `ui.*` | New `allowedUiActionKeybinds` parallel registry | `index.ts:582` analysis |
| How main dispatches UIAction to renderer | `webContents.send('event.ui_action_fired', { actionId })` | IPC pattern in `index.ts` |
| Renderer UIAction handler ownership | `uiActionContext.svelte.ts` + per-component `register()` | `questPanelContext` pattern |
| Mouse 4/5 in Record mode | `mousedown` listener, `button === 3/4`, renderer-only | Browser event spec |
| Gamepad poll lifecycle | `rAF` active only while `isRecording === true` | Web Gamepad API |
| Conflict detection location | Renderer, active profile only, bind-time | Clarification Q4 |
| PopoverUI library | bits-ui (already used in `KeybindsSettings.svelte`) | Codebase scan |
