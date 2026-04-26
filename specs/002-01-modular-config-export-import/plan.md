# Implementation Plan: Modular & Secure Configuration Export/Import

**Branch**: `002-core-qol-features` | **Date**: 2026-04-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-01-modular-config-export-import/spec.md`

---

## Summary

Extends the existing `BackupSettings.svelte` + `config.export/import/apply_import` IPC system with:

1. **Modular category selection** — one shared checklist (keybinds, session actions, UI layout, general settings, quest log stub) controls both export and import.
2. **Security sanitization** — renderer-side `sanitizeConfigForExport()` strips local paths, `partitionOverwrite`, and `srcOverwrite` before any payload leaves the renderer.
3. **Conflict-aware preview** — per-category counts (`new`, `conflict`, `total`) for list-based categories; full-replace badge for object-based categories; session-ID skip warning for `sessionZoomLevels`.
4. **Schema v2** — `ConfigExportPayloadV2` with optional category fields + `categories[]` + `_sanitized` flag.
5. **v1 backwards compatibility** — v1 files are imported as "keybinds + session actions" implicitly.
6. **Explicit payload assembly** — `BackupSettings.svelte` builds the v2 payload from the current local config snapshot via `buildExportPayload(currentConfig, selectedCategories)` before export.

No new npm dependencies. Extends existing patterns; does not replace them.

---

## Technical Context

**Language/Version**: TypeScript 5.9 strict + Svelte 5 (runes API)
**Primary Dependencies**: Electron 38, electron-vite 4, Tailwind CSS v4, bits-ui, lucide-svelte (all existing)
**Storage**: `userData/neuzos_config/config.json` — exclusively owned by Main process
**Testing**: Manual only (`bun dev` + Electron DevTools)
**Target Platform**: Electron desktop app (Windows primary)
**Project Type**: Desktop application — extending existing Settings → Backup tab
**Performance Goals**: Sanitization + conflict diff < 200 ms for ≤ 5 MB config
**Constraints**: No new npm dependencies. No new IPC channels (modify existing). No new windows.
**Scale/Scope**: Config files typically < 100 KB; up to 5 MB limit enforced.

---

## Constitution Check

| # | Gate | Status | Notes |
|---|------|--------|-------|
| 1 | **Scope**: Feature stays within session/layout management, UI overlays, input routing, or configurable shortcuts | ✅ Pass | Config backup is a direct QoL extension of the existing backup system |
| 2 | **One Input = One Action** | ✅ N/A | No in-game inputs synthesized; file I/O only |
| 3 | **Input Authenticity** | ✅ N/A | No input forwarding involved |
| 4 | **Process Boundary**: No `nodeIntegration`, no `contextIsolation: false`, no `fs`/`child_process` from renderer | ✅ Pass | `fs` calls remain in Main IPC handlers. Renderer only builds the payload object. |
| 5 | **Stack Fidelity**: Svelte 5 runes for new state | ✅ Pass | All new state uses `$state`. No new framework. |
| 6 | **Config-driven** | ✅ Pass | No new persisted settings; category selection is ephemeral UI state only |
| 7 | **No memory leaks** | ✅ Pass | No new IPC listeners. Existing cleanup paths unchanged. |

> ✅ All gates pass.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-01-modular-config-export-import/
├── plan.md              ← this file
├── spec.md              ← feature specification (clarified)
├── research.md          ← Phase 0 decisions
├── data-model.md        ← Phase 1 entities and type definitions
├── quickstart.md        ← manual test guide
├── contracts/
│   └── ipc-channels.md  ← modified IPC channel contracts (v2)
├── checklists/
│   └── requirements.md  ← spec quality checklist
└── tasks.md             ← Phase 2 output (via /speckit.tasks)
```

### Source Code Changes

```text
src/
├── main/
│   └── index.ts
│       MODIFY config.export handler:
│         - Accept pre-built payload argument (ConfigExportPayloadV2)
│         - No longer reads neuzosConfig directly; just writes what it receives
│       MODIFY config.apply_import handler:
│         - Accept ConfigApplyImportArgsV2 (adds categories: ExportCategory[])
│         - Apply ui-layout and general-settings as full replace
│         - Skip sessionZoomLevels entries whose IDs are not in local config.sessions
│         - Skip any category not in args.categories
│
├── renderer/src/
│   ├── lib/
│   │   ├── types.ts
│   │   │   ADD: ExportCategory, ConfigExportPayloadV2, ConfigApplyImportArgsV2,
│   │   │        CategoryPreviewResult, SanitizationResult
│   │   │
│   │   ├── configExport.ts  (NEW FILE)
│   │   │   ADD: sanitizeConfigForExport(payload): SanitizationResult
│   │   │   ADD: buildExportPayload(config, categories): ConfigExportPayloadV2
│   │   │   ADD: computeCategoryPreview(payload, categories, currentConfig): CategoryPreviewResult[]
│   │   │
│   │   └── core.ts
│   │       MODIFY backup.export: pass payload argument to config.export IPC
│   │       MODIFY backup.applyImport: pass ConfigApplyImportArgsV2
│   │
│   └── components/SettingsWindow/Tabs/
│       └── BackupSettings.svelte
│           MODIFY: Add category checklist UI (checkboxes per ExportCategory)
│           MODIFY: Default all exportable categories to checked; show Quest Log Templates as a disabled placeholder row in v2
│           MODIFY: Show local-config item counts next to each category label (derived from the current config snapshot)
│           MODIFY: Build payload via buildExportPayload before calling backup.export
│           MODIFY: Run sanitizeConfigForExport before export; show notice if _sanitized
│           MODIFY: Compute CategoryPreviewResult[] after import and display per-category preview
│           MODIFY: Pass categories to backup.applyImport
│           ADD: explanatory note "same selection controls export & import"
│           ADD: full-replace badge for object-based categories
│           ADD: skipped session IDs warning in preview
```

---

## Phase 0: Research Summary

All NEEDS CLARIFICATION resolved. See [research.md](research.md).

Key decisions:
- Renderer filters + sanitizes; Main receives ready-to-write payload (**Decision 1**)
- Object-based categories (ui-layout, general-settings) are always Full Replace (**Decision 2**)
- Session IDs not in local config are skipped during UI Layout import (**Decision 3**)
- One shared checklist for export and import (**Decision 4**)
- v1 files = implicit "keybinds + session-actions" (**Decision 5**)

---

## Phase 1: Design Summary

See [data-model.md](data-model.md) and [contracts/ipc-channels.md](contracts/ipc-channels.md).

**New types**: `ExportCategory`, `ConfigExportPayloadV2`, `ConfigApplyImportArgsV2`, `CategoryPreviewResult`, `SanitizationResult`

**New utilities**: `sanitizeConfigForExport`, `buildExportPayload`, `computeCategoryPreview` in `src/renderer/src/lib/configExport.ts`

**Modified IPC channels**:
- `config.export`: now receives pre-built payload from renderer (no longer reads `neuzosConfig` directly)
- `config.apply_import`: extended with `categories` parameter; new handling for object-based categories

**Unchanged IPC channels**: `config.import`, `config.load`, `config.save`, `config.set_session_zoom`

---

## Implementation Order

1. `src/renderer/src/lib/types.ts` — add new types
2. `src/renderer/src/lib/configExport.ts` — implement 3 utility functions
3. `src/main/index.ts` — update `config.export` + `config.apply_import` handlers
4. `src/renderer/src/lib/core.ts` — update `backup.export` + `backup.applyImport` bridge methods
5. `src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte` — update UI

> Dependencies: 1 → 2 → 3+4 (parallel) → 5

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| v1 import broken by type changes | Low | `config.import` handler unchanged; v1 payload still validates against existing schema |
| `config.export` handler receiving unexpected payload shape | Low | Strict TypeScript types + existing JSON validation in apply handler |
| Object-based category "full replace" overwrites user data unexpectedly | Medium | Preview explicitly says "will be replaced in full" before user confirms |
| Session zoom levels with orphaned IDs accumulating | Low | Skip + warn logic prevents import of unmatched IDs |
