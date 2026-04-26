# IPC Channel Contracts: Integrated Wiki & Sheet Viewer

**Phase 1 — Electron IPC Interface**
**Date**: 2026-04-20

All channels follow the project's `<scope>.<action>` snake_case convention.
All channels MUST be registered in `src/main/index.ts` with `try/catch` error boundaries.
All channels MUST have paired removal paths (via `ipcMain.removeHandler` / `ipcMain.removeAllListeners` on app quit).

---

## New Channels

### `viewer_window.open`
**Direction**: Renderer → Main (fire-and-forget: `ipcRenderer.send`)
**Description**: Opens or focuses the viewer window of the given type.

**Arguments**:
```typescript
type: ViewerWindowType  // 'navi_guide' | 'flyffipedia'
```

**Main behaviour**:
1. Check the viewer window map for an existing open window of this type.
2. If exists and not destroyed → call `win.focus()` and return.
3. If not exists → call `createViewerWindow(type)`.
4. Load persisted `ViewerWindowConfig` from `neuzosConfig.window.viewers[type]` (or defaults).
5. Apply `setAlwaysOnTop(config.alwaysOnTop, 'screen-saver')`.

**Returns**: Nothing (fire-and-forget).

---

### `viewer_window.close`
**Direction**: Viewer Renderer → Main (fire-and-forget: `ipcRenderer.send`)
**Description**: Closes the calling viewer window.

**Arguments**: None

**Main behaviour**:
1. Identify the calling window via `BrowserWindow.fromWebContents(event.sender)`.
2. Call `win.close()`.

**Returns**: Nothing.

---

### `viewer_window.minimize`
**Direction**: Viewer Renderer → Main (fire-and-forget: `ipcRenderer.send`)
**Description**: Minimises the calling viewer window.

**Arguments**: None

**Main behaviour**:
1. Identify the calling window via `BrowserWindow.fromWebContents(event.sender)`.
2. Call `win.minimize()`.

**Returns**: Nothing.

---

### `viewer_window.set_always_on_top`
**Direction**: Viewer Renderer → Main (fire-and-forget: `ipcRenderer.send`)
**Description**: Toggles always-on-top for the calling viewer window and persists the new state.

**Arguments**:
```typescript
alwaysOnTop: boolean
```

**Main behaviour**:
1. Identify the calling window and its registered type.
2. Call `win.setAlwaysOnTop(alwaysOnTop, 'screen-saver')` if `true`; `win.setAlwaysOnTop(false)` if `false`.
3. Update `neuzosConfig.window.viewers[type].alwaysOnTop = alwaysOnTop`.
4. Call `saveConfig(neuzosConfig)`.

**Returns**: Nothing.

---

### `viewer_window.get_config`
**Direction**: Viewer Renderer → Main (request/response: `ipcRenderer.invoke`)
**Description**: Fetches the persisted config for the calling viewer window at startup.

**Arguments**: None (the window type is resolved server-side from `event.sender`)

**Returns**:
```typescript
{
  type: ViewerWindowType;
  config: ViewerWindowConfig;  // Current persisted values (x, y, width, height, alwaysOnTop)
}
```

**Error response**:
```typescript
{ error: string }
```

---

## Window State Auto-Save (no explicit IPC channel)

The Main process saves viewer window position and size automatically using BrowserWindow events — no IPC call is needed from the renderer:

```typescript
// In createViewerWindow():
const saveBoundsDebounced = debounce(() => {
  const bounds = win.getBounds();
  neuzosConfig.window.viewers[type] = {
    ...neuzosConfig.window.viewers[type],
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
  saveConfig(neuzosConfig);
}, 500);

win.on('move', saveBoundsDebounced);
win.on('resize', saveBoundsDebounced);
```

---

## Summary Table

| Channel | Direction | Type | Sender |
|---|---|---|---|
| `viewer_window.open` | Renderer → Main | `send` (one-way) | Main window renderer |
| `viewer_window.close` | Viewer → Main | `send` (one-way) | Viewer renderer |
| `viewer_window.minimize` | Viewer → Main | `send` (one-way) | Viewer renderer |
| `viewer_window.set_always_on_top` | Viewer → Main | `send` (one-way) | Viewer renderer |
| `viewer_window.get_config` | Viewer → Main | `invoke` (request/reply) | Viewer renderer |

---

## Existing Channels Used (no changes)

| Channel | Usage in this feature |
|---|---|
| `config.load` | Already used; viewer config read via `neuzosConfig` directly in Main at window creation |
| `config.save` | Reused via `saveConfig()` internal call; no new channel needed |
