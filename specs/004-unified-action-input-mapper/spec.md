# Feature Specification: Unified Action & Input Mapper

**Feature Branch**: `004-unified-action-input-mapper`
**Created**: 2026-04-20
**Status**: Draft

## Clarifications

### Session 2026-04-20
- Q: Which UI actions should be included in the initial registry? → A: All currently visible Taskbar/Panel toggles in `MainBar.svelte`, plus any future toggles added there — no fixed list hardcoded in spec.
- Q: How should Mouse/Gamepad bindings handle the "fires even when webview has focus" requirement? → A: Keyboard bindings use `globalShortcut` (always fires); Mouse 4/5/middle-click and Gamepad bindings use Renderer-only event listeners (fire only when neuzOS window has focus); a UI hint documents this limitation inline.
- Q: Where should UI-Action bindings be stored in `config.json`? → A: In the existing `keyBinds` arrays using a `ui.` prefix convention on the `event` field (e.g. `ui.toggle_quest_log`); no new Config key needed.
- Q: What is the scope of conflict detection? → A: Within the currently active keybind profile only, consistent with existing system behaviour.
- Q: How should `KeyBinder.svelte` integrate into the existing `KeybindsSettings.svelte` row? → A: Record mode opens as a Popover/Modal triggered by a "Click to Bind" button; existing modifier/key dropdowns remain unchanged and fully functional alongside it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Register a keyboard shortcut for a UI Action (Priority: P1)

A player wants to open the Quest Log with a single key press instead of clicking the Taskbar button. They navigate to Settings → Keybinds, find the action "Toggle Quest Log" in the action list, click its binding field, and press the desired key combination. The binding is saved and from that point on, pressing that shortcut opens or closes the Quest Log regardless of which layout is active.

**Why this priority**: This is the core value proposition of the feature. Without it no other stories are reachable.

**Independent Test**: Open Settings → Keybinds, bind F9 to "Toggle Quest Log", close Settings, press F9 — the Quest Log panel must open; press F9 again — it must close. No other story needs to be implemented first.

**Acceptance Scenarios**:

1. **Given** the user is on Settings → Keybinds, **When** they select "Toggle Quest Log" and press Ctrl+Q via the search/dropdown UI, **Then** the binding appears in the table and is persisted in `config.json`.
2. **Given** a binding for "Toggle Quest Log" is saved, **When** the user presses the bound key in the main window, **Then** the Quest Log opens or closes.
3. **Given** a binding already exists, **When** the user sets a new binding for the same action, **Then** the old binding is replaced and only the new binding is active.
4. **Given** two actions share the same key combination, **When** the user tries to save the second binding, **Then** a conflict warning is shown and the save is blocked until the conflict is resolved.

---

### User Story 2 — Record mode: press a physical key to bind it (Priority: P2)

Instead of picking a key from a dropdown, the player clicks a "Click to Bind" button for a specific action. The UI enters Record mode, displaying a clearly visible "Listening…" state with an overlay that prevents accidental input. They press any key (including Mouse 4, Mouse 5, or middle-click). The captured combination fills the binding field automatically.

**Why this priority**: Eliminates trial-and-error with the dropdown; significantly faster for uncommon keys. Depends on Story 1 (binding management must exist).

**Independent Test**: Trigger Record mode for any action, press Mouse 4 — the binding field must show "Mouse4". Cancel and press Escape — the field must revert to its previous value.

**Acceptance Scenarios**:

1. **Given** Record mode is active, **When** the user presses a keyboard key or modifier combination, **Then** the normalized key string is captured and shown in the binding field.
2. **Given** Record mode is active, **When** the user clicks Mouse 4, Mouse 5, or the scroll wheel button, **Then** the corresponding mouse button identifier is captured.
3. **Given** Record mode is active, **When** the user presses Escape, **Then** Record mode exits without changing the existing binding.
4. **Given** Record mode is active, **When** any key event fires, **Then** the event is NOT forwarded to other UI elements (search fields, scroll, etc.) and no navigation side-effects occur.

---

### User Story 3 — Gamepad / Keypad button binding via Web Gamepad API (Priority: P3)

A player who uses a controller or numeric keypad wants to bind gamepad buttons (A, B, X, Y, LB, RB, triggers) to neuzOS actions. When Record mode is active, the app polls the Web Gamepad API and captures the first pressed button. The button identifier (e.g. `Gamepad0:Button0`) is stored as the key for that action.

**Why this priority**: Enhancement for an audience subset. Depends on Story 2 (Record mode infrastructure).

**Independent Test**: Activate Record mode, press the A button on a connected controller — the binding field must show a gamepad button identifier. Without a gamepad connected, the Record mode UI must still work normally.

**Acceptance Scenarios**:

1. **Given** a gamepad is connected and Record mode is active, **When** the user presses any gamepad button, **Then** the button is captured and displayed as a binding.
2. **Given** a gamepad binding is saved, **When** the associated button is pressed during normal neuzOS use, **Then** the corresponding action fires.
3. **Given** no gamepad is connected while Record mode is active, **When** the UI is displayed, **Then** a "No gamepad detected" hint is shown and keyboard/mouse capture still works normally.

---

### Edge Cases

- What happens when the app loses focus during Record mode (e.g. game window jumps to front)? Record mode must cancel cleanly and revert the binding field.
- What happens when the same key combination is already registered as a global system shortcut (OS-level)? The save must warn the user but still allow overriding.
- How does the system handle a key that is valid on one keyboard layout but not on another (e.g. AltGr combos)? The raw `code` value is captured, not the character, so the binding remains stable across layouts.
- What happens if `config.json` is corrupt or missing the `uiActions` field? The main process must fall back to the default empty map without crashing.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a registry of named UI actions covering all currently visible Taskbar/Panel toggles in `MainBar.svelte` (e.g. `toggle_quest_log`, `toggle_wiki`, `toggle_bestiary`) and any future toggles added there. The registry is open — adding a new toggle to `MainBar.svelte` makes it automatically available for binding without a spec change.
- **FR-002**: Each UI action in the registry MUST be bindable to exactly one key combination at a time per active keybind profile; multiple profiles can each carry their own binding.
- **FR-003**: The Settings → Keybinds tab MUST display all registered UI actions alongside the existing global event keybinds, grouped by category.
- **FR-004**: Users MUST be able to assign a binding via the existing Search UI (modifier dropdown + key dropdown — existing logic, extended for new actions).
- **FR-005**: Users MUST be able to assign a binding via Record mode: a "Click to Bind" button on each action row opens a Popover/Modal. The Popover hosts the `KeyBinder.svelte` component in Recording state and captures the next physical input, filling the binding field on confirm. The existing modifier/key dropdowns remain fully functional alongside it.
- **FR-006**: Record mode MUST capture standard keyboard keys, modifier combinations, Mouse 4, Mouse 5, and middle-click (scroll button).
- **FR-007**: During Record mode an `isRecording` state MUST prevent all key events from propagating to other UI elements (search fields, shortcuts, form inputs).
- **FR-008**: Record mode MUST be cancellable at any time by pressing Escape or clicking outside the binding field, reverting the field to its previous value.
- **FR-009**: The system MUST detect conflict when a new binding would duplicate an existing binding within the currently active keybind profile. It MUST show a visible inline conflict warning naming the conflicting action and block saving until resolved. Other profiles are not checked.
- **FR-010**: The Web Gamepad API MUST be polled during Record mode to capture gamepad button presses and map them to a stable identifier string.
- **FR-011**: All bindings MUST be stored in the existing `config.json` under the relevant `keyBinds` / `keyBindProfiles` arrays using the unchanged `NeuzKeybind` shape (`key`, `event`, `args?`). UI action bindings use a `ui.` prefix on the `event` field (e.g. `{ key: "f9", event: "ui.toggle_quest_log" }`) to distinguish them from global system keybinds without requiring a new Config key.
- **FR-012**: Keyboard-based UI action bindings MUST be registered as Electron `globalShortcut` entries so they fire even when a game session webview has keyboard focus. Mouse-button (Mouse 4/5/middle-click) and Gamepad bindings operate via Renderer-only event listeners and therefore only fire when the neuzOS window has focus. The UI MUST display a persistent hint noting this distinction on affected binding rows.
- **FR-013**: When a registered UI action shortcut fires, the main process MUST send an IPC message to the renderer which dispatches the corresponding action.

### Key Entities

- **UIAction**: Named, human-readable action descriptor. Fields: `id` (e.g. `toggle_quest_log`), `label`, `category`, `defaultKey?`. Derived from all visible Taskbar/Panel toggles in `MainBar.svelte`. Lives in main process registry alongside `allowedEventKeybinds`.
- **NeuzKeybind** *(existing)*: `{ key: string; event: string; args?: string[] }` — unchanged shape, `event` field maps to `UIAction.id`.
- **RecordSession**: Ephemeral renderer state tracking `{ isRecording: boolean; targetActionId: string | null; previousKey: string }`. Scoped to the `KeyBinder.svelte` Popover instance. Never persisted.
- **InputCapture**: Renderer-side abstraction for capturing keyboard, mouse-button, and gamepad input during Record mode. Normalises raw browser events into a `key` string compatible with the existing `allowedKeys` list.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can bind any registered UI action to a keyboard or mouse-button shortcut in under 10 seconds using Record mode.
- **SC-002**: All bindings fire correctly (action executes) in 100% of test cases when the game webview has keyboard focus, confirming global shortcut registration works.
- **SC-003**: Conflict detection triggers within one interaction (immediate inline feedback, no form submission required) for all tested duplicate-binding attempts.
- **SC-004**: Record mode captures Mouse 4, Mouse 5, and middle-click correctly on all common Windows pointer configurations.
- **SC-005**: No regression in the existing keybind search UI — all modifier/key combinations that work today continue to work after the feature is merged.
- **SC-006**: The neuzOS process RAM footprint does not increase by more than 2 MB on idle after the feature is active, measured with a standard 4-session layout open.

---

## Assumptions

- The existing `KeybindsSettings.svelte` search UI (modifier dropdown + key dropdown) is reused and extended; a "Click to Bind" button is added per row as a supplementary input method opening a Popover — no redesign of the full keybinds page is in scope.
- Keyboard UI action bindings are registered as Electron `globalShortcut` entries; Mouse-button and Gamepad bindings are Renderer-only listeners. The difference is surfaced to users via an inline hint on affected rows.
- UI action `event` identifiers use a `ui.` prefix (e.g. `ui.toggle_quest_log`) stored in the existing `keyBinds` / `keyBindProfiles` arrays — no new Config key is introduced.
- Conflict detection covers the active keybind profile only; other profiles are not validated at bind time.
- Gamepad support is a best-effort enhancement; if detection fails the UI hints about it and keyboard/mouse capture continues normally.
- Scroll wheel rotation (up/down scroll) is out of scope; only the scroll-wheel-click button (middle-click) is in scope.
- UI actions are limited to Taskbar/Panel-level toggles in the MainWindow. In-game key forwarding (existing `sendKey` / `session_action` system) is out of scope for this feature.
- Config persistence uses the existing `saveConfig` / `loadConfig` path in `index.ts`; no new storage layer is introduced.
