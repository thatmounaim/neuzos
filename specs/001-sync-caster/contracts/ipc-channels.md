# IPC Contracts: Background Hotkey Routing — Sync-Caster

**Phase**: 1 | **Feature**: `001-sync-caster` | **Date**: 2026-04-20

---

## New IPC Channels

### `config.set_sync_receiver` (invoke)

**Direction**: Renderer → Main  
**Type**: `ipcMain.handle` (returns Promise)  
**File**: `src/main/index.ts`

Sets or clears the Active Receiver session. Persists to config.json and broadcasts the change to the main window renderer.

**Request**:
```typescript
electronApi.invoke("config.set_sync_receiver", sessionId: string | null)
```

| Argument | Type | Description |
|---|---|---|
| `sessionId` | `string \| null` | ID of the session to designate as receiver, or `null` to clear |

**Response**: `void` (no return value needed)

**Side effects**:
1. Updates `neuzosConfig.syncReceiverSessionId` in Main memory
2. Calls `saveConfig(neuzosConfig)` to persist to disk
3. Calls `mainWindow?.webContents.send("event.sync_receiver_changed", sessionId)` to notify Renderer

**Main implementation sketch**:
```typescript
ipcMain.handle("config.set_sync_receiver", async (_, sessionId: string | null) => {
  try {
    neuzosConfig.syncReceiverSessionId = sessionId ?? null;
    saveConfig(neuzosConfig);
    mainWindow?.webContents.send("event.sync_receiver_changed", sessionId ?? null);
  } catch (err) {
    console.error("[config.set_sync_receiver] Failed:", err);
  }
});
```

---

### `event.sync_receiver_changed` (push)

**Direction**: Main → Renderer  
**Type**: `webContents.send`  
**File**: Sent from Main `config.set_sync_receiver` handler; received in `src/renderer/src/App.svelte`

Notifies the Renderer that the Active Receiver has changed so reactive UI updates correctly.

**Payload**:
```typescript
electronApi.on("event.sync_receiver_changed", (_, sessionId: string | null) => { ... })
```

| Argument | Type | Description |
|---|---|---|
| `sessionId` | `string \| null` | New receiver session ID, or `null` if cleared |

**Renderer handler** (in `App.svelte`):
```typescript
electronApi.on("event.sync_receiver_changed", (_, sessionId: string | null) => {
  mainWindowState.config.syncReceiverSessionId = sessionId;
});
```

---

### `event.send_to_receiver` (push)

**Direction**: Main → Renderer  
**Type**: `webContents.send`  
**File**: Sent from Main `dispatchKeybindEvent`; received in `src/renderer/src/App.svelte`

Fired when a `send_to_receiver` hotkey is pressed. Renderer resolves the current receiver and injects the key.

**Payload**:
```typescript
electronApi.on("event.send_to_receiver", (_, ingameKey: string) => { ... })
```

| Argument | Type | Description |
|---|---|---|
| `ingameKey` | `string` | The in-game key to inject (e.g. `"1"`, `"f5"`, `"Alt+2"`) |

**Renderer handler** (in `App.svelte`):
```typescript
electronApi.on("event.send_to_receiver", (_, ingameKey: string) => {
  const receiverId = mainWindowState.config.syncReceiverSessionId;
  if (!receiverId) return; // no receiver — silent skip
  const sessionLayouts = mainWindowState.sessionsLayoutsRef[receiverId]?.layouts;
  if (!sessionLayouts) return;
  const activeClient = Object.values(sessionLayouts).find((client: any) => client?.isStarted?.() && client?.sendKey);
  if (!activeClient) return;
  activeClient.sendKey(ingameKey);
});
```

---

## Modified: `allowedEventKeybinds` (Main)

**File**: `src/main/index.ts`  
**Change**: Add new entry to the existing `allowedEventKeybinds` constant.

```typescript
const allowedEventKeybinds = {
  // ... existing entries ...
  "send_to_receiver": {
    label: "Send Key to Active Receiver",
    args: ["ingame_key"],
  },
}
```

This entry is returned by the existing `config.get_available_event_keybinds` IPC handle and causes the Keybinds Settings UI to automatically expose the new event type with a single text input for the `ingame_key` argument. **No changes required to `KeybindsSettings.svelte`.**

---

## Modified: `dispatchKeybindEvent` switch (Main)

**File**: `src/main/index.ts`  
**Change**: Add `"send_to_receiver"` case.

```typescript
case "send_to_receiver":
  if (bind.args?.length > 0)
    mainWindow?.webContents.send("event.send_to_receiver", bind.args[0]);
  break;
```

---

## `neuzosBridge` Extension (Renderer)

**File**: `src/renderer/src/lib/core.ts`  
**Change**: Add `setSyncReceiver` method to the sessions namespace (or a new `syncCaster` namespace).

```typescript
neuzosBridge.sessions.setSyncReceiver = (sessionId: string | null) => {
  electronApi?.invoke("config.set_sync_receiver", sessionId);
};
```
