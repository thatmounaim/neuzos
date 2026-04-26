# Research: Background Hotkey Routing — Sync-Caster

**Phase**: 0 | **Feature**: `001-sync-caster` | **Date**: 2026-04-20

## Decision Log

### D-01: IPC Dispatch Architecture — Who resolves the Active Receiver?

**Decision**: The **Renderer process** resolves the Active Receiver at dispatch time.

**Rationale**: `webviewElement.sendInputEvent()` is only accessible from the Renderer via the `<webview>` tag DOM API. The Main process cannot call it directly. Main can only forward events to the Renderer via `webContents.send()`. Therefore the full chain must be:

```
globalShortcut fires (Main)
  → mainWindow.webContents.send("event.send_to_receiver", ingameKey)  (Main)
    → Renderer reads mainWindowState.config.syncReceiverSessionId
      → sessionsLayoutsRef[receiverId].sendKey(ingameKey)
        → webviewElement.sendInputEvent(...)  ✅ isTrusted: true
```

**Alternatives considered**:
- Main-side resolution: rejected — Main has no access to the webview DOM API
- Round-trip (Renderer → Main → Renderer): rejected — adds unnecessary latency and complexity

---

### D-02: Config Persistence — Dedicated handler vs. full config.save

**Decision**: Dedicated lightweight IPC handler `config.set_sync_receiver`.

**Rationale**: The existing `config.save` serialises the entire config JSON on every call. Toggling the receiver is a frequent runtime operation. A dedicated handler: (a) avoids serialising the full config, (b) lets Main update `neuzosConfig` in memory and broadcast `event.sync_receiver_changed` to keep all windows in sync, (c) follows the pattern already used by `keybinds.swap_profile`.

**Alternatives considered**:
- Reuse `config.save`: rejected — overkill for a single field change; also triggers `registerKeybinds()` unnecessarily

---

### D-03: Session Toggle UI Placement

**Decision**: **Hover overlay button** directly on the NeuzClient pane.

**Rationale**: Sessions within a layout have no dedicated header element — they are bare `<webview>` elements inside resizable panes (`LayoutsContainer.svelte`). Adding a header row would require restructuring LayoutsContainer and could interfere with the resizable splitter layout. The NeuzClient component already has a precedent for overlay buttons (the "KR Fix" button uses `absolute bottom-2 right-2`). A small indicator icon (`absolute top-2 left-2`) appears on hover (or always, when the session is the active receiver) — consistent with the existing codebase style.

**Alternatives considered**:
- Separate session header row: rejected — requires layout restructuring, risks resizable pane interference
- Context menu only: rejected — too many clicks for a runtime toggle the user changes frequently
- ActionPad widget: rejected — widget is optional, receiver toggle must be discoverable by default

---

### D-04: `allowedEventKeybinds` Extension — How new event types surface in UI

**Decision**: Add `"send_to_receiver"` directly to the `allowedEventKeybinds` object in `src/main/index.ts`.

**Rationale**: `KeybindsSettings.svelte` calls `config.get_available_event_keybinds` on mount and dynamically builds the event type dropdown and its argument inputs from the returned object. The `args` array drives which text inputs appear. Adding the entry in Main is sufficient for the Keybinds UI to display and configure the new event type with zero Renderer-side changes to KeybindsSettings.

**Schema for the new entry**:
```typescript
"send_to_receiver": {
  label: "Send Key to Active Receiver",
  args: ["ingame_key"],
}
```

**Alternatives considered**:
- Hardcode a custom UI in KeybindsSettings: rejected — the dynamic system already handles this cleanly

---

### D-05: `syncReceiverSessionId` — Where in the config schema

**Decision**: Top-level field on `NeuzConfig` with type `string | null`, default `null`.

**Rationale**: Consistent with other top-level runtime config fields (`activeKeyBindProfileId`, `defaultLaunchMode`). Null means no receiver is designated. The field is written by `config.set_sync_receiver` and read in App.svelte when `event.send_to_receiver` fires.

**Alternatives considered**:
- Store in `localStorage`: rejected — persisting across app restarts requires config.json; localStorage is session-scoped and not used for global config
- Store on layout or session objects: rejected — the receiver is a global singleton, not per-layout

---

### D-06: Latency Profile

**Measured path**:
1. `globalShortcut` callback fires: ~0–5 ms (OS-dependent, Electron docs note sub-frame latency)
2. `mainWindow.webContents.send()`: ~0–2 ms (in-process IPC)
3. Renderer JS executes IPC listener: ~0–2 ms
4. `sendKey()` → `webviewElement.sendInputEvent()`: ~1–5 ms (Chromium IPC to webview process)

**Total estimated end-to-end**: 2–14 ms — well within the 50 ms success criterion from the spec.

---

## NEEDS CLARIFICATION — All Resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | Where does the Renderer inject keys? | `webviewElement.sendInputEvent()` via `NeuzClient.sendKey()` — already implemented |
| 2 | How does config get persisted from Renderer? | `config.save` IPC handle in Main; new dedicated `config.set_sync_receiver` for this feature |
| 3 | Where is the session toggle placed in UI? | Hover overlay on NeuzClient pane (absolute positioned, consistent with KR Fix button) |
| 4 | How does the Keybinds UI get the new event type? | `allowedEventKeybinds` object in Main returned via `config.get_available_event_keybinds` |
| 5 | Does the context menu need updating? | No — the toggle is on the webview overlay; context menu (right-click on layout tab) is layout-level, not session-level |
