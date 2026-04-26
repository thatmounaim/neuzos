# Implementation Plan: Core QoL — Health Monitor, Config Portability & Per-Session Zoom

**Branch**: `002-core-qol-features` | **Date**: 2026-04-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-core-qol-features/spec.md`

## Summary

Three independent QoL features for NeuzOS:

1. **Session Health Monitor** — Event-driven webview crash/error/unresponsive detection in `NeuzClient.svelte`. Full-pane overlay on crash/load-failure; amber indicator on unresponsive. One-click `webview.reload()` recovery. Zero polling, zero Main process involvement. Purely Renderer-side `$state` + webview DOM events.

2. **Config Import/Export** — New `Backup` tab in Settings. Main process IPC handlers (`config.export`, `config.import`, `config.apply_import`) for file dialogs, 5 MB guard, structural validation, and Replace/Merge apply logic. New `BackupSettings.svelte` component. No new dependencies.

3. **Per-Session Zoom** — Per-webview `setZoomFactor()` controlled via compact toolbar buttons on the session pane and a slider in Session Settings. Persisted as `sessionZoomLevels: { [sessionId]: number }` on `NeuzConfig` via `config.set_session_zoom` IPC handler. Re-applied on `did-finish-load` (integrates with Health Monitor reload).

## Technical Context

**Language/Version**: TypeScript 5.9 strict + Svelte 5 (runes API)
**Primary Dependencies**: Electron 38, electron-vite 4, Tailwind CSS v4, bits-ui, lucide-svelte (all existing — no new packages)
**Storage**: `userData/neuzos_config/config.json` — exclusively owned by Main process, accessed via IPC
**Testing**: Manual only — `bun dev` + Electron DevTools (no automated test framework in this project)
**Target Platform**: Electron desktop app (Windows primary; macOS/Linux secondary)
**Project Type**: Desktop application
**Performance Goals**: Health event detection latency: event-driven (< 1 frame). Zoom apply: synchronous (`setZoomFactor` is instant). Export/import: file I/O only, acceptable < 1 s for typical config sizes.
**Constraints**: No new npm dependencies. No IPC for zoom application. File size cap 5 MB on import.
**Scale/Scope**: Per-session state (N sessions per layout). Config file typically < 100 KB.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Gate | Status | Notes |
|---|------|--------|-------|
| 1 | **Scope**: Feature stays within session/layout management, UI overlays, input routing, or configurable shortcuts | ✅ Pass | Health overlays, config backup, visual zoom — all within scope |
| 2 | **One Input = One Action**: Every in-game action requires a direct human trigger — no automated chains, timers, or image recognition | ✅ Pass | No in-game inputs synthesized. `webview.reload()` is a page reload. `setZoomFactor()` is visual only. |
| 3 | **Input Authenticity**: Any input forwarding uses `webContents.sendInputEvent()` (not JS-injected `dispatchEvent`) | ✅ N/A | This feature does not forward any inputs |
| 4 | **Process Boundary**: No `nodeIntegration`, no `contextIsolation: false`, no `fs`/`child_process` from renderer | ✅ Pass | `fs` and `dialog` calls are in Main IPC handlers only. Renderer uses `ipcRenderer.invoke`. |
| 5 | **Stack Fidelity**: No new UI framework introduced; Svelte 5 runes used for new state | ✅ Pass | All new `$state` uses Svelte 5 runes. No new framework. |
| 6 | **Config-driven**: Any new user settings persisted to config JSON, not hard-coded | ✅ Pass | `sessionZoomLevels` persisted via `config.set_session_zoom`. Import/export flows through `saveConfig()`. |
| 7 | **No memory leaks**: IPC listeners have paired removal; webview cleanup path exists | ✅ Pass | Webview event listeners added in `startClient()` and removed via `onDestroy` + named handler references. |

> ✅ All gates pass. No blockers.

**Post-design re-check**: Constitution Check re-evaluated after Phase 1 design — all gates remain ✅ Pass. The `did-fail-load` subframe filter (`!isMainFrame`) is an additional improvement that reduces noise. No new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/002-core-qol-features/
├── plan.md              ← this file
├── spec.md              ← feature specification
├── research.md          ← Phase 0 research decisions
├── data-model.md        ← Phase 1 entities and type definitions
├── quickstart.md        ← manual test guide
├── contracts/
│   └── ipc-channels.md  ← new IPC channel contracts
├── checklists/
│   └── requirements.md  ← spec quality checklist
└── tasks.md             ← Phase 2 output (via /speckit.tasks)
```

### Source Code Changes

```text
src/
├── main/
│   └── index.ts                    ← MODIFY: 3 new ipcMain.handle() for config.export,
│                                              config.import, config.apply_import,
│                                              config.set_session_zoom;
│                                              defaultNeuzosConfig gains sessionZoomLevels: {}
│
├── renderer/src/
│   ├── Settings.svelte              ← MODIFY: add Backup tab trigger + content;
│   │                                           loadConfig() loads sessionZoomLevels;
│   │                                           setContext('loadConfig', loadConfig) so child
│   │                                           components (BackupSettings) can trigger a reload
│   │
│   ├── lib/
│   │   ├── types.ts                 ← MODIFY: add SessionHealthStatus, ConfigExportPayload,
│   │   │                                       ConfigImportResult, ConfigApplyImportArgs types;
│   │   │                                       add sessionZoomLevels? to NeuzConfig;
│   │   │                                       extend sessionsLayoutsRef session-level type with
│   │   │                                       healthStatus?: SessionHealthStatus and healthDetail?: string
│   │   └── core.ts                  ← MODIFY: add neuzosBridge.sessions.setZoom();
│   │                                           add neuzosBridge.backup.* namespace
│   │
│   └── components/
│       ├── Shared/
│       │   └── NeuzClient.svelte    ← MODIFY: read/write healthStatus and healthDetail via
│       │                                       mainWindowState.sessionsLayoutsRef[session.id]
│       │                                       (NOT local $state) so overlay survives remounts;
│       │                                       event listeners in startClient();
│       │                                       onDestroy cleanup;
│       │                                       health overlay UI;
│       │                                       zoomLevel $state + toolbar;
│       │                                       did-finish-load zoom re-apply
│       │
│       └── SettingsWindow/Tabs/
│           ├── BackupSettings.svelte ← CREATE: new Backup tab component;
│           │                                    calls getContext('loadConfig')() after apply
│           └── SessionSettings.svelte ← MODIFY: add zoom slider per session row
```

## Complexity Tracking

> No Constitution violations. No complexity justifications needed.
