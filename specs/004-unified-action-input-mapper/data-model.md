# Data Model: Unified Action & Input Mapper

**Branch**: `004-unified-action-input-mapper` | **Date**: 2026-04-20

---

## New Types (`src/renderer/src/lib/types.ts`)

```typescript
/**
 * Descriptor for a bindable UI action in neuzOS.
 * Lives in the main process registry (allowedUiActionKeybinds) and is sent
 * to the renderer via IPC for display in KeybindsSettings.
 */
export type UIActionDescriptor = {
  /** Fully-qualified event identifier, including ui. prefix. e.g. "ui.toggle_quest_log" */
  id: string;
  /** Human-readable label shown in the Settings UI. e.g. "Toggle Quest Log" */
  label: string;
  /** Grouping category shown in the Settings UI. e.g. "Interface" */
  category: string;
  /** Optional default key combo. undefined = no default binding. */
  defaultKey?: string;
};

/**
 * Handler function type for UIAction dispatch in uiActionContext.
 */
export type UIActionHandler = () => void;
```

---

## Main Process Registry Addition (`src/main/index.ts`)

Add alongside the existing `allowedEventKeybinds` object:

```typescript
/**
 * Registry of UI actions that can be bound to keys via the unified action mapper.
 * Keys use the "ui." prefix to distinguish them from system event keybinds.
 * Added incrementally as MainBar toggles are implemented.
 */
const allowedUiActionKeybinds: Record<string, UIActionDescriptor> = {
  'ui.toggle_quest_log': {
    id: 'ui.toggle_quest_log',
    label: 'Toggle Quest Log',
    category: 'Interface',
  },
  // Future additions (added when branch 003 merges):
  // 'ui.toggle_wiki': { id: 'ui.toggle_wiki', label: 'Toggle Wiki', category: 'Interface' },
  // 'ui.toggle_bestiary': { ... },
};
```

### Logic Changes in `checkKeybinds()`

Current: filters binds by `Object.keys(allowedEventKeybinds)`.  
After: also passes binds whose `event` key exists in `Object.keys(allowedUiActionKeybinds)`.

```typescript
// Pseudocode for updated filter condition:
const allowedKeys = new Set([
  ...Object.keys(allowedEventKeybinds),
  ...Object.keys(allowedUiActionKeybinds),
]);
// filter: bind.event is in allowedKeys
```

### Logic Changes in `dispatchKeybindEvent(bind)`

Add before the existing switch statement:

```typescript
// UI action bindings — relay to renderer
if (bind.event.startsWith('ui.')) {
  mainWindow?.webContents.send('event.ui_action_fired', { actionId: bind.event });
  return;
}
// ... existing switch statement below
```

---

## Renderer Context (`src/renderer/src/lib/contexts/uiActionContext.svelte.ts`)

```typescript
// Shape — implemented with Svelte 5 $state inside createUIActionContext()
interface UIActionContext {
  /** Register a handler for a specific action id. Called on mount by each feature component. */
  register: (actionId: string, handler: UIActionHandler) => void;
  /** Unregister a handler (called on unmount). */
  unregister: (actionId: string) => void;
  /** Dispatch an action by id (called by the IPC listener in App.svelte). */
  dispatch: (actionId: string) => void;
}
```

Exported functions (matching questPanelContext pattern):
- `createUIActionContext(): UIActionContext`
- `setUIActionContext(context: UIActionContext): void`
- `getUIActionContext(): UIActionContext`

---

## Ephemeral Record Mode State (inside `KeyBinder.svelte`)

This state is **never persisted**. It exists only within the Popover's lifetime.

```typescript
// Svelte 5 $state — local to KeyBinder component
let isRecording = $state(false);
let capturedKey = $state<string | null>(null);
let previousKey: string; // snapshot of currentKey at Popover open time
let gamepadPollId = $state<number | null>(null); // rAF handle
```

### Key Normalisation Rules

The `InputCapture` normalisation produces a `key` string compatible with the existing `allowedKeys` list format used by `KeybindsSettings.svelte`:

| Input source | Raw value | Normalised `key` string |
|-------------|-----------|------------------------|
| Keyboard single | `event.code = "KeyF"` | `"f"` |
| Keyboard with modifier | `Ctrl + event.code = "KeyQ"` | `"ctrl+q"` |
| Mouse middle button | `event.button === 1` | `"Middle"` |
| Mouse 4 | `event.button === 3` | `"Mouse4"` |
| Mouse 5 | `event.button === 4` | `"Mouse5"` |
| Gamepad button 0 | `gamepad.index=0, buttonIndex=0` | `"Gamepad0:Button0"` |

Modifier order (when multiple): `Ctrl` → `Alt` → `Shift` → key. This prevents `Ctrl+Shift+A` and `Shift+Ctrl+A` from being treated as different bindings.

---

## Conflict Detection Model

A conflict exists when:

```
newKey === existingBind.key  (case-insensitive)
AND existingBind.event !== currentActionId
AND existingBind is in the currently active profile's keybinds array
```

On detection: display inline warning `"Conflicts with: <label of conflicting action>"`. Disable the "Save" / confirm action until the conflict is cleared (either by choosing a different key or removing the conflicting bind).

---

## Unchanged Entities

| Entity | Location | Change |
|--------|----------|--------|
| `NeuzKeybind` | `types.ts` | None — `{ key, event, args? }` shape unchanged |
| `allowedEventKeybinds` | `index.ts:149` | None — existing system events untouched |
| `NeuzConfig` | `types.ts` | None — no new root key |
| `keyBinds` / `keyBindProfiles` | `config.json` | Structure unchanged — `ui.*` binds are stored as regular `NeuzKeybind` entries in the active profile's `keybinds` array |
| `registerKeybinds()` | `index.ts:641` | No change — already iterates all surviving binds generically |

---

## State Transition: Record Mode

```
Idle
  │  user clicks "Click to Bind"
  ▼
Popover opens → snapshot previousKey → isRecording = true
  │
  ├─ keydown / mousedown / gamepad press
  │     │  → normalise input
  │     │  → capturedKey = normalised string
  │     │  → isRecording = false
  │     ▼
  │   Captured
  │     │  user clicks "Confirm"
  │     │    → onBind(capturedKey)
  │     │    → Popover closes
  │     │
  │     │  user clicks "Retry"
  │     │    → isRecording = true  (return to listening)
  │     ▼
  │  (loop)
  │
  └─ Escape / click-outside / focus-loss
        → capturedKey = null
        → isRecording = false
        → onCancel() → Popover closes → field reverts to previousKey
```
