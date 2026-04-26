# Implementation Plan: Quest Log UX & Creation Flow Enhancement

**Branch**: `003-integrated-wiki-sheet-viewer` | **Date**: 2026-04-22 | **Spec**: [spec.md](spec.md)

## Summary

Refine the Quest Log sidebar panel with three targeted UI changes:

1. Move the TODO checklist above the character tabs (top of panel).
2. Add a session-selection combobox to the creation form that pre-fills name and icon from any configured session.
3. Replace the manual icon slug input with a shared icon picker component extracted from `SessionActionsSettings.svelte` and reused in QuestPanel.

All changes are pure Svelte renderer-side — no new IPC channels, no Main process involvement.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode)
**Primary Dependencies**: Svelte 5 (runes), Tailwind CSS v4, bits-ui (Popover/Command primitives), lucide-svelte
**Storage**: `localStorage` via `questPanelContext` — persisted Quest Log character icons added in this feature
**Testing**: Manual smoke test (no automated test suite for renderer UI)
**Target Platform**: Electron 38 desktop app, renderer process only
**Project Type**: Desktop app — Electron + Svelte renderer
**Performance Goals**: Panel re-render on session combobox open must stay within one frame (16 ms); icon list scroll must be smooth (existing constraint from `SessionActionsSettings`)
**Constraints**: No new IPC channels; no new npm dependencies; icon picker must be shared between Settings and QuestPanel
**Scale/Scope**: 3 Svelte component edits; 2 new support files (`src/renderer/src/lib/data/actionIcons.ts`, `src/renderer/src/components/Shared/IconPicker.svelte`)

### Key files affected

| File | Role |
|------|------|
| `src/renderer/src/components/QuestLog/QuestPanel.svelte` | Main panel — TODO position + creation form |
| `src/renderer/src/components/QuestLog/TodoChecklist.svelte` | Moved to top; no internal changes needed |
| `src/renderer/src/components/SettingsWindow/Tabs/SessionActionsSettings.svelte` | Read-only reference for icon picker markup |
| `src/renderer/src/components/Shared/IconPicker.svelte` | Shared icon picker component reused by Settings and QuestPanel |
| `src/renderer/src/lib/data/actionIcons.ts` | Shared icon source list used by both pickers |
| `src/renderer/src/lib/contexts/questPanelContext.svelte.ts` | Read sessions via `getContext`; no new exported API needed |
| `src/renderer/src/App.svelte` | Already exposes `mainWindowState` (with `sessions`) via `setContext('mainWindowState', ...)` |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Answer each gate with ✅ Pass, ❌ Fail (blocker), or N/A:

| # | Gate | Status |
|---|------|--------|
| 1 | **Scope**: Feature stays within session/layout management, UI overlays, input routing, or configurable shortcuts | ✅ Pass — pure Quest Log panel UI change |
| 2 | **One Input = One Action**: Every in-game action requires a direct human trigger | ✅ Pass — no in-game input synthesized |
| 3 | **Input Authenticity**: Input forwarding uses `webContents.sendInputEvent()` | ✅ Pass — N/A (UI only) |
| 4 | **Process Boundary**: No `nodeIntegration`, no `contextIsolation: false`, no `fs`/`child_process` from renderer | ✅ Pass — renderer only |
| 5 | **Stack Fidelity**: No new UI framework; Svelte 5 runes used for new state | ✅ Pass — `$state`, `$derived` throughout |
| 6 | **Config-driven**: Any new user settings persisted to config JSON, not hard-coded | ✅ Pass — no new settings introduced; character state stays in `localStorage` as before |
| 7 | **No memory leaks**: IPC listeners have paired removal; webview cleanup path exists | ✅ Pass — no new IPC listeners; no webview lifecycle involvement |

> All gates pass. No blockers.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
specs/003-01-questlog-ux-creation-flow/
├── plan.md          ← this file
├── research.md      ← Phase 0 output
├── data-model.md    ← Phase 1 output
├── quickstart.md    ← Phase 1 output
└── contracts/
  └── ipc-channels.md   ← Phase 1 output (documents that no new channels are needed)
```

### Source Code (affected files only)

```text
src/renderer/src/
  components/
    QuestLog/
      QuestPanel.svelte          ← FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008
      TodoChecklist.svelte       ← no internal changes (repositioned in QuestPanel template only)
    SettingsWindow/Tabs/
      SessionActionsSettings.svelte  ← read-only reference for icon picker markup block
    Shared/
      IconPicker.svelte          ← new shared component extracted from Settings
  lib/
    data/
      actionIcons.ts             ← new shared icon slug list
    contexts/
      questPanelContext.svelte.ts    ← read sessions via getContext('mainWindowState') and persist optional character icon
```

**Structure Decision**: Single project, renderer-only. Two shared support files are added for the icon picker reuse, and the feature logic remains localized to `QuestPanel.svelte` plus `questPanelContext.svelte.ts`.

> No complexity violations — Constitution Check has no failures.
