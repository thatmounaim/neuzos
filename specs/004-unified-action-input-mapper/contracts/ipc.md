# IPC Contracts: Unified Action & Input Mapper

**Branch**: `004-unified-action-input-mapper` | **Date**: 2026-04-20

---

## Overview

This feature adds one new IPC channel (invoke) and one new IPC event (send). All existing channels remain unchanged.

---

## New: Invoke — `config.get_available_ui_actions`

**Direction**: Renderer → Main  
**Type**: `ipcMain.handle` (request/response)

### Request

No payload. Called once on `KeybindsSettings.svelte` mount, alongside the existing `config.get_available_event_keybinds` call.

```typescript
// Renderer call site (core.ts addition)
uiActions: {
  getRegistry: (): Promise<UIActionDescriptor[]> => {
    return electronApi?.invoke('config.get_available_ui_actions') ?? Promise.resolve([]);
  },
},
```

### Response

```typescript
// Main process handler return type
UIActionDescriptor[]

// Example response payload
[
  {
    id: 'ui.toggle_quest_log',
    label: 'Toggle Quest Log',
    category: 'Interface',
    defaultKey: undefined,
  }
  // Future entries added as MainBar toggles are implemented
]
```

### Main Process Handler Location

`src/main/index.ts` — add alongside the existing `config.get_available_event_keybinds` handler:

```typescript
ipcMain.handle('config.get_available_ui_actions', () => {
  return Object.values(allowedUiActionKeybinds);
});
```

---

## New: Event — `event.ui_action_fired`

**Direction**: Main → Renderer (via `webContents.send`)  
**Type**: One-way push (no reply)  
**Trigger**: `dispatchKeybindEvent()` when `bind.event.startsWith('ui.')`

### Payload

```typescript
type UIActionFiredPayload = {
  /** The fully-qualified action id, including the "ui." prefix. e.g. "ui.toggle_quest_log" */
  actionId: string;
};
```

### Main Process Send Site

```typescript
// In dispatchKeybindEvent(), before the switch statement:
if (bind.event.startsWith('ui.')) {
  mainWindow?.webContents.send('event.ui_action_fired', { actionId: bind.event } satisfies UIActionFiredPayload);
  return;
}
```

### Renderer Listener Site

Registered once in `App.svelte` on mount, using `electronApi.on`:

```typescript
// App.svelte (onMount or $effect)
const removeListener = electronApi.on('event.ui_action_fired', (_event, payload: UIActionFiredPayload) => {
  uiActionCtx.dispatch(payload.actionId);
});
// cleanup on component destroy
```

---

## Unchanged Channels

| Channel | Type | Status |
|---------|------|--------|
| `config.get_available_event_keybinds` | invoke | Unchanged — returns existing `allowedEventKeybinds` only |
| `config.save` / `config.load` | invoke | Unchanged |
| `main_window.*` | send | Unchanged |
| `event.keybind_fired` (if present) | send | Unchanged |

---

## Preload Surface

No changes to `src/preload/index.ts`. The existing `contextBridge.exposeInMainWorld('electronAPI', ipcRenderer)` already exposes `invoke` and `on` — sufficient for both new channels.

---

## Security Notes

- `event.ui_action_fired` payload is `{ actionId: string }`. The renderer must look up the handler by `actionId` from its own `register()` map — it does not eval or exec the `actionId` string. No injection surface.
- `config.get_available_ui_actions` returns a static server-side list. No user input is reflected back.
