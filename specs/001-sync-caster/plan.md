# Implementation Plan: Background Hotkey Routing — Sync-Caster

**Branch**: `001-sync-caster` | **Date**: 2026-04-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-sync-caster/spec.md`

## Summary

Adds a **dynamic Active Receiver** concept: the user designates one session as the routing target at runtime via a hover overlay toggle. A new `send_to_receiver` keybind event type fires via `globalShortcut` (Main) → IPC → Renderer, which resolves the current receiver and calls the existing `NeuzClient.sendKey()` / `webviewElement.sendInputEvent()` path. The receiver session ID is persisted in `config.json` via a new dedicated `config.set_sync_receiver` IPC handler. **The existing `send_session_action` infrastructure is reused entirely — this feature adds 5 targeted file changes.**

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode), Svelte 5 (runes API)
**Primary Dependencies**: Electron 38, electron-vite 4, @electron-toolkit/preload 3, Tailwind CSS v4
**Storage**: Local JSON — `userData/neuzos_config/config.json` (managed exclusively by Main process)
**Testing**: No automated test framework present in the project; manual integration testing via `bun dev`
**Target Platform**: Windows / macOS / Linux desktop (Electron)
**Project Type**: Desktop app
**Performance Goals**: < 16 ms hotkey-press-to-webview-input-injection per constitution (Principle V); measured path is 2–14 ms (see research.md D-06)
**Constraints**: `isTrusted: true` on all game inputs; no `nodeIntegration`; no `contextIsolation: false`; all config persisted to JSON (no localStorage for global state)
**Scale/Scope**: 5 files modified; ~120 lines of new code total; zero new dependencies

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Answer each gate with ✅ Pass, ❌ Fail (blocker), or N/A:

| # | Gate | Status |
|---|------|--------|
| 1 | **Scope**: Feature stays within session/layout management, UI overlays, input routing, or configurable shortcuts | ✅ Pass |
| 2 | **One Input = One Action**: Every in-game action requires a direct human trigger — no automated chains, timers, or image recognition | ✅ Pass — one human keypress triggers exactly one `sendInputEvent` per session |
| 3 | **Input Authenticity**: Any input forwarding uses `webContents.sendInputEvent()` (not JS-injected `dispatchEvent`) | ✅ Pass — reuses existing `NeuzClient.sendKey()` path which calls `webviewElement.sendInputEvent()` |
| 4 | **Process Boundary**: No `nodeIntegration`, no `contextIsolation: false`, no `fs`/`child_process` from renderer | ✅ Pass — Main handles `globalShortcut`; Renderer handles webview injection via tag API |
| 5 | **Stack Fidelity**: No new UI framework introduced; Svelte 5 runes used for new state | ✅ Pass — `$derived` rune used for `isReceiver`; no new dependencies |
| 6 | **Config-driven**: Any new user settings persisted to config JSON, not hard-coded | ✅ Pass — `syncReceiverSessionId` written to config.json via `config.set_sync_receiver` |
| 7 | **No memory leaks**: IPC listeners have paired removal; webview cleanup path exists | ✅ Pass — new `electronApi.on` listeners in App.svelte follow same pattern as existing ones (no webviews added) |

> ✅ All gates pass. No complexity violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-sync-caster/
├── plan.md              ← this file
├── spec.md              ← feature specification
├── research.md          ← Phase 0: 6 decisions, all NEEDS CLARIFICATION resolved
├── data-model.md        ← Phase 1: NeuzConfig extension + NeuzKeybind new variant
├── quickstart.md        ← Phase 1: player + developer setup guide
├── contracts/
│   └── ipc-channels.md  ← Phase 1: 3 new/modified IPC channels documented
└── checklists/
    └── requirements.md  ← spec quality checklist (all pass)
```

### Source Code (files modified by this feature)

```text
src/
  main/
    index.ts              ← [IPC] add config.set_sync_receiver handler
                          ← [IPC] add send_to_receiver to allowedEventKeybinds
                          ← [IPC] add dispatchKeybindEvent case
                          ← [CONFIG] add syncReceiverSessionId: null to defaultNeuzosConfig

  renderer/src/
    lib/
      types.ts            ← [CONFIG] add syncReceiverSessionId?: string | null to NeuzConfig
      core.ts             ← [IPC] add neuzosBridge.sessions.setSyncReceiver()

    App.svelte            ← [IPC] listen for event.send_to_receiver
                          ← [IPC] listen for event.sync_receiver_changed

    components/
      Shared/
        NeuzClient.svelte  ← [WIDGET] add receiver toggle overlay button
                           ← derive isReceiver from mainWindowState.config
```

**Structure Decision**: Single-project layout. All changes are within the existing `src/main/` and `src/renderer/src/` tree. No new files, directories, or packages are needed.

## Complexity Tracking

No constitution violations — this section is N/A.

---

## UI Design: Receiver Toggle in NeuzClient

### Current NeuzClient DOM structure

```
<div class="w-full h-full relative">         ← outer wrapper (becomes "group")
  <!-- KR Fix button: absolute bottom-2 right-2 — only when needed -->
  <webview …/>                               ← game, fills 100% of pane
  <!-- OR: "Start Session" placeholder when stopped -->
</div>
```

### What gets added

A single small icon button (`RadioTower` from `@lucide/svelte`) is placed at **`absolute top-2 right-2`** — opposite corner from the KR Fix button, no conflict.

**Two visual states:**

| State | Visibility | Appearance |
|---|---|---|
| Not the receiver | Hidden by default, revealed on pane hover | Semi-transparent, muted color |
| Active Receiver | Always visible | Solid `bg-primary text-primary-foreground`, subtle shadow |

**Behaviour:**
- Click when not receiver → calls `neuzosBridge.sessions.setSyncReceiver(session.id)` → this session becomes the receiver; any previous receiver loses its status automatically (handled server-side)
- Click when already receiver → calls `neuzosBridge.sessions.setSyncReceiver(null)` → receiver is cleared

**Svelte sketch:**

```svelte
<!-- outer div: add "group" class -->
<div class="w-full h-full relative group" …>

  <!-- Receiver toggle — always in DOM, visibility controlled by CSS -->
  <button
    class="absolute top-2 right-2 z-50 p-1 rounded cursor-pointer transition-opacity
           {isReceiver
             ? 'opacity-100 bg-primary text-primary-foreground shadow-md'
             : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 bg-background/60 text-muted-foreground'}"
    onclick={toggleReceiver}
    title={isReceiver ? 'Active Receiver — click to clear' : 'Set as Active Receiver'}
  >
    <RadioTower size={14} />
  </button>

  <!-- existing KR Fix button, webview, placeholder — unchanged -->
```

**Derived state (Svelte 5 runes):**

```typescript
const mainWindowState = getContext<MainWindowState>('mainWindowState')

const isReceiver = $derived(
  mainWindowState.config.syncReceiverSessionId === session.id
)

function toggleReceiver() {
  neuzosBridge.sessions.setSyncReceiver(isReceiver ? null : session.id)
}
```

### Why top-right, not top-left

- Top-left is used by the browser's native webview controls (back/forward arrows visible in dev mode)
- Top-right matches the visual weight of the KR Fix button at bottom-right and creates a consistent "utility corner" pattern
- The indicator is always visible when active and does not overlap HP/MP bars (which are typically in the bottom portion of the Flyff HUD)
