# Quickstart: Background Hotkey Routing — Sync-Caster

**Feature**: `001-sync-caster` | For players and contributors

---

## What This Feature Does

Press a global hotkey (like `Alt+F1`) and a key is sent directly into a background game session — without switching focus, Alt-Tabbing, or clicking the game window.

One human keypress → one key injected into one specific session. Fully ToS-compliant.

---

## Setup (for players)

### Step 1 — Designate an Active Receiver

Open your layout with multiple sessions running. Hover over the session you want to be the "Sync Target" (e.g., your Healer). A small **receiver icon button** appears in the top-right corner of that session pane. Click it.

A badge indicator appears on that session — it is now the Active Receiver. Clicking the icon again clears it.

> Only one session can be the Active Receiver at a time. Activating a different session automatically clears the previous one.

### Step 2 — Configure a Hotkey

Open **Settings → Keybinds**. Add a new keybind:
- **Hotkey**: e.g. `Alt+F1`
- **Event**: `Send Key to Active Receiver`
- **Ingame Key**: e.g. `1` (the key that will be pressed inside the game)

Save. The hotkey is now live.

### Step 3 — Use It

While playing on your main character (or doing anything else), press `Alt+F1`. The key `1` fires inside your Healer session. No focus switch, no Alt-Tab.

To route to a different session — just click the receiver toggle on that session. No hotkey reconfiguration needed.

---

## Developer Notes

### Files modified by this feature

| File | Change |
|---|---|
| `src/main/index.ts` | Add `syncReceiverSessionId: null` to `defaultNeuzosConfig`; add `send_to_receiver` to `allowedEventKeybinds`; add `dispatchKeybindEvent` case; add `config.set_sync_receiver` IPC handler |
| `src/renderer/src/lib/types.ts` | Add `syncReceiverSessionId?: string \| null` to `NeuzConfig` |
| `src/renderer/src/lib/core.ts` | Add `sessions.setSyncReceiver()` to `neuzosBridge` |
| `src/renderer/src/App.svelte` | Add listeners for `event.send_to_receiver` and `event.sync_receiver_changed` |
| `src/renderer/src/components/Shared/NeuzClient.svelte` | Add receiver toggle button overlay; derive `isReceiver` from context |

### Key design invariants

- `NeuzClient.sendKey()` is called directly — reuses the existing, already-tested `webviewElement.sendInputEvent()` path
- No new Svelte store or context needed — `syncReceiverSessionId` lives in `mainWindowState.config`
- Keybinds Settings UI requires **zero changes** — `allowedEventKeybinds` drives the UI dynamically
