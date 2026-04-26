# Feature Specification: Background Hotkey Routing — Sync-Caster

**Feature Branch**: `001-sync-caster`
**Created**: 2026-04-20
**Status**: Draft

---

## Existing Baseline (Must Read Before Planning)

> **The single-target background key injection infrastructure already exists.**
> The `send_session_action` keybind event type is fully implemented:
> `globalShortcut` → Main → `event.send_session_action` IPC → Renderer → `webviewElement.sendInputEvent()`.
> `webviewElement.sendInputEvent()` preserves `isTrusted: true` inside the game webview.
>
> **What does NOT yet exist (the actual scope of this feature):**
> - A **dynamic "Active Receiver"** — a runtime designation of which session receives routed keys, changeable without editing keybind configs.
> - A **session pane overlay toggle** to mark/unmark a session as the receiver.
> - A **`send_to_receiver` keybind event** that resolves the target session at dispatch time from the current receiver designation, rather than requiring a hardcoded `session_id` in the keybind config.
>
> This spec defines only the delta — do not re-implement `send_session_action` or the webview input pipeline.

---

## User Scenarios & Testing

### User Story 1 — Designate a Session as the Active Receiver (Priority: P1)

A player has multiple sessions open (e.g., main character and a Ringmaster/Healer). They want to quickly mark the Healer session as the "Sync Target" so that subsequent hotkeys route inputs there automatically, without opening Settings.

**Why this priority**: Without the receiver designation, the dynamic routing concept cannot function. All other stories depend on this.

**Independent Test**: Open NeuzOS with two sessions loaded in a layout. Find the session tab for the Healer. Activate the receiver toggle. Confirm a visual indicator appears on that tab and that only one session can be marked active at a time.

**Acceptance Scenarios**:

1. **Given** a layout with multiple running sessions, **When** the user clicks the "Set as Receiver" toggle on a session pane overlay, **Then** that session becomes the Active Receiver and a persistent visual indicator appears on the pane.
2. **Given** Session A is the Active Receiver, **When** the user activates the toggle on Session B, **Then** Session A loses receiver status and Session B becomes the new Active Receiver.
3. **Given** Session A is the Active Receiver, **When** the user clicks the toggle again on Session A, **Then** the receiver designation is cleared and no session is the active receiver.
4. **Given** the app is restarted, **When** the main window loads, **Then** the previously designated Active Receiver is restored from persisted config.

---

### User Story 2 — Route a Global Hotkey to the Active Receiver (Priority: P1)

A player presses a global hotkey (e.g., `Alt+F1`) and the mapped in-game key (e.g., `1`) is delivered directly to the Active Receiver's webview — without the player switching focus, moving the mouse, or Alt-Tabbing.

**Why this priority**: This is the core payoff of the feature; equally critical as Story 1 since both must work together to deliver value.

**Independent Test**: With a receiver designated, configure a `send_to_receiver` keybind mapping `Alt+F1` → in-game key `1`. Press `Alt+F1` while the main window or any other app has focus. Confirm key `1` arrives in the receiver session's webview (visually, via an on-screen skill bar animation) without any focus switch.

**Acceptance Scenarios**:

1. **Given** a session is the Active Receiver and a `send_to_receiver` keybind is configured, **When** the user presses the hotkey from any window context, **Then** the mapped in-game key is injected into the receiver's webview within 50 ms.
2. **Given** no session is designated as Active Receiver, **When** the user presses a `send_to_receiver` hotkey, **Then** no input is injected and no error is thrown.
3. **Given** the Active Receiver's session is stopped (webview not running), **When** the hotkey is pressed, **Then** the injection is silently skipped.
4. **Given** a `send_to_receiver` keybind is configured, **When** the user changes the Active Receiver to a different session, **Then** the next hotkey press routes to the new receiver without any keybind reconfiguration.

---

### User Story 3 — Configure Sync-Caster Keybinds in Settings (Priority: P2)

A player uses the existing Keybinds Settings tab to add, edit, and remove `send_to_receiver` keybind entries — each mapping a global hotkey to a specific in-game key string.

**Why this priority**: Config is required for the feature to be useful beyond the first session, but the designation and routing logic (Stories 1–2) can be partially tested without full Settings integration.

**Independent Test**: Open Settings → Keybinds. Add a new keybind with event type `Send to Active Receiver`. Set hotkey to `Alt+2` and in-game key to `2`. Save. Press `Alt+2` with a receiver designated. Confirm key `2` arrives in the receiver session.

**Acceptance Scenarios**:

1. **Given** the Keybinds Settings tab, **When** the user adds a `send_to_receiver` keybind, **Then** it appears in the keybind list with a label showing the hotkey and the mapped in-game key.
2. **Given** a `send_to_receiver` keybind is configured, **When** the user edits the in-game key, **Then** the change takes effect on the next hotkey press without restarting NeuzOS.
3. **Given** a `send_to_receiver` keybind exists, **When** the user deletes it, **Then** the hotkey no longer routes any input.

---

### Edge Cases

- What happens when two keybinds map to the same hotkey for `send_to_receiver`? The existing keybind registration prevents this; behavior should match other duplicate hotkey handling.
- What if the Active Receiver session is in a layout that is not currently visible? The key injection must still succeed (webview is running in background).
- What if the Active Receiver tab is in a separate session window (detached)? The receiver designation must still resolve correctly via the cross-window session registry.
- What if the user configures both a `send_session_action` and a `send_to_receiver` on the same hotkey? The existing duplicate-key prevention guard applies.

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST allow the user to designate exactly one session as the "Active Receiver" at any given time.
- **FR-002**: The Active Receiver designation MUST be accessible via a toggle control visible as an overlay button on the session pane within a layout view (top-right corner, revealed on hover; always visible when active).
- **FR-003**: Only one session can hold Active Receiver status at a time; designating a new receiver MUST automatically clear the previous one.
- **FR-004**: The Active Receiver designation MUST be persisted to the local config file so it survives application restarts.
- **FR-005**: The session pane MUST display a distinct visual indicator (highlighted `RadioTower` icon in the top-right overlay button) when that session is the Active Receiver.
- **FR-006**: A new keybind event type (`send_to_receiver`) MUST be available in the keybind configuration system, accepting one argument: the in-game key string to inject.
- **FR-007**: When a `send_to_receiver` hotkey fires and an Active Receiver is designated, the system MUST inject the mapped key into that session's webview using the existing `webviewElement.sendInputEvent()` path (preserving `isTrusted: true`).
- **FR-008**: If no Active Receiver is designated when a `send_to_receiver` hotkey fires, the system MUST silently skip the injection with no error.
- **FR-009**: If the Active Receiver's webview is not running (session stopped), the system MUST silently skip the injection.
- **FR-010**: The `send_to_receiver` keybind type MUST appear alongside `send_session_action` in the Keybinds Settings tab with a descriptive label and in-game key input field.
- **FR-011**: The Active Receiver designation MUST be changeable at runtime without requiring a keybind reconfiguration or application restart.

### ToS Compliance (NeuzOS-specific — mandatory)

**"One Input = One Action" declaration**:

Each press of a `send_to_receiver` hotkey constitutes exactly one human input event. The system delivers exactly one mapped in-game key to exactly one background session per press. No chains, loops, timers, or conditional sequences are triggered by a single hotkey press.

- Does this feature synthesize any game inputs? **Yes**
- Inputs are triggered by: human global hotkey keypress, dispatched via `webviewElement.sendInputEvent()` (the existing, already-approved `sendKey` path in `NeuzClient.svelte`).
- Forbidden patterns checked: automated chains ✅ absent, image recognition ✅ absent, AFK loops ✅ absent.

**Alt+Tab bypass verification**: Yes — by routing via the webview's `sendInputEvent` API the user never needs to switch OS focus. The game webview receives the key while the user retains focus on whatever window they are using. This is equivalent to how a hardware multi-keyboard device would work — human-driven, not automated.

---

## Key Entities

- **Active Receiver**: A runtime singleton (one session ID or `null`) stored in config and reflected in the Main Window's Svelte state. Indicates which session receives `send_to_receiver` dispatches.
- **SyncCasterKeybind**: A `NeuzKeybind` with `event: "send_to_receiver"` and `args: [ingameKey]`. Stored in the existing `keyBinds` / `keyBindProfiles` config arrays.
- **Receiver Indicator**: A UI icon button (`RadioTower`) on the session pane overlay (top-right corner) reflecting the Active Receiver state. Purely presentational — derives from the Active Receiver value via `$derived`.

---

## Success Criteria

- A player can change the Active Receiver session by clicking a tab toggle in under 2 seconds, without opening Settings.
- Pressing a configured `send_to_receiver` hotkey while any window has OS focus delivers the key to the background session in under 50 ms end-to-end.
- The Active Receiver designation survives an application restart.
- The Keybinds Settings tab supports adding, editing, and removing `send_to_receiver` keybinds with the same UX as existing keybind types.
- At no point does the player need to perform an Alt+Tab, mouse click on the game window, or any other focus-switching action to trigger the routed key.
- The feature has zero impact on the existing `send_session_action` flow — both coexist independently.

---

## Assumptions

- The Active Receiver is stored as a `syncReceiverSessionId: string | null` field added to `NeuzConfig`. Default is `null` (no receiver).
- The `send_to_receiver` event type requires one arg: the raw in-game key string (same format accepted by `NeuzClient.sendKey`).
- The receiver toggle is implemented as a small overlay icon button (`RadioTower` from `@lucide/svelte`) at `absolute top-2 right-2` on the session pane — opposite corner from the existing KR Fix button at `bottom-2 right-2`. The button is `opacity-0 group-hover:opacity-60` when inactive and `opacity-100 bg-primary` when active.
- The dispatch of `send_to_receiver` in the Main process follows the same `globalShortcut` registration path as `send_session_action`; Main emits a new IPC event to the Renderer which resolves the current receiver and calls the existing `sendKey` path.
- No new IPC round-trip from Renderer to Main is needed for the actual key injection — `webviewElement.sendInputEvent()` is already called directly from the Renderer process via the `<webview>` tag API.
