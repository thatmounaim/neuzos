# Implementation Plan: Unified Action & Input Mapper

**Branch**: `004-unified-action-input-mapper` | **Date**: 2026-04-20 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/004-unified-action-input-mapper/spec.md`

## Summary

Extend neuzOS with a bidirectional input-to-UIAction system. A registry of named UI actions (derived from visible `MainBar.svelte` toggles) stores bindings inside the existing `NeuzKeybind` config arrays using a `ui.` event-prefix convention — no new config key. Keyboard bindings flow through the existing `globalShortcut`/`registerKeybinds` path in `index.ts`; mouse-button and gamepad bindings fire via Renderer-only event listeners. A new `KeyBinder.svelte` Popover provides Record mode (keyboard + Mouse 4/5/middle-click + Gamepad API) as a supplement to the existing modifier/key dropdown UI in `KeybindsSettings.svelte`. Conflict detection runs within the active profile only.

## Technical Context

**Language/Version**: TypeScript 5.9 / Svelte 5.x  
**Primary Dependencies**: Electron 38 (`globalShortcut`, `ipcMain`), electron-vite 4, bits-ui (Popover), Web Gamepad API  
**Storage**: `config.json` via existing `saveConfig`/`loadConfig` in `src/main/index.ts`; `NeuzKeybind` shape unchanged  
**Testing**: None — project has no test framework  
**Target Platform**: Windows 10+ (primary), macOS 13+, Ubuntu 22+ LTS  
**Project Type**: Desktop Electron application  
**Performance Goals**: `<2 MB` RAM increase on idle; gamepad poll at native `requestAnimationFrame` cadence (~16 ms)  
**Constraints**: No new `config.json` root key; `NeuzKeybind = { key, event, args? }` shape unchanged; Svelte 5 runes only (no `export let`, no legacy stores)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Svelte 5 Runes Only | ✅ PASS | `KeyBinder.svelte` and `uiActionContext.svelte.ts` use `$state`, `$props`, `$effect`, `$derived` exclusively |
| Electron Boundary Discipline | ✅ PASS | `globalShortcut` in main; mouse/gamepad captured in renderer; IPC payload is `{ actionId: string }` — no DOM from main |
| Type-Safe Performant Runtime | ✅ PASS | `UIActionDescriptor` typed in `types.ts`; all IPC payloads typed; no new idle allocations; poll only during Record mode |
| Spec-First Feature Delivery | ✅ PASS | Spec + clarifications completed before this plan; no implementation has started |
| Quality/Release/UX Discipline | ✅ PASS | Inline conflict warning (FR-009); focus-scope hint (FR-012); cancellable Record mode (FR-008); no net-new external dependencies |

**Post-Phase 1 re-check**: All gates continue to pass. The design stays within constitution boundaries.

## Project Structure

### Documentation (this feature)

```text
specs/004-unified-action-input-mapper/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (/speckit.plan output)
├── data-model.md        # Phase 1 output (/speckit.plan output)
├── quickstart.md        # Phase 1 output (/speckit.plan output)
├── contracts/
│   └── ipc.md           # Phase 1 output (/speckit.plan output)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main/
│   └── index.ts                              # extend: allowedUiActionKeybinds registry,
│                                             #         checkKeybinds + dispatchKeybindEvent logic
├── renderer/src/
│   ├── lib/
│   │   ├── types.ts                          # add UIActionDescriptor type
│   │   ├── core.ts                           # add uiActions.getRegistry invoke helper
│   │   └── contexts/
│   │       └── uiActionContext.svelte.ts     # NEW: UIAction registry + IPC listener + dispatch
│   └── components/
│       ├── Shared/
│       │   └── KeyBinder.svelte              # NEW: Record mode Popover component
│       └── SettingsWindow/
│           └── Tabs/
│               └── KeybindsSettings.svelte   # extend: "UI Actions" section + KeyBinder rows + conflict UI
```

**Structure Decision**: Single Electron project. Minimal new files — `uiActionContext.svelte.ts` and `KeyBinder.svelte` only. All other changes are in-place extensions of existing files.
