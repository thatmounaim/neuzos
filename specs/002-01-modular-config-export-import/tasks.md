# Tasks: Modular and Secure Configuration Export/Import

**Input**: Design documents from `specs/002-01-modular-config-export-import/`
**Branch**: `002-core-qol-features`
**Date**: 2026-04-21

> **Tests**: Manual only per `quickstart.md`. No automated tests were requested.
> **Format**: `- [ ] [ID] [P?] [Story?] Description - file path`
> - **[P]**: Parallelisable (different files, no incomplete dependencies)
> - **[Story]**: US1 / US2 / US3 / US4 - maps to user stories in `spec.md`
> - **[IPC]**: IPC channel definition or handler update
> - **[CONFIG]**: Config schema or export/import data shape change
> - **[CLEANUP]**: Listener removal or teardown path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared types and helper scaffolding that all user stories depend on.

- [ ] T001 [CONFIG] Add `ExportCategory`, `ConfigExportPayloadV2`, `ConfigApplyImportArgsV2`, `CategoryPreviewResult`, and `SanitizationResult` to `src/renderer/src/lib/types.ts`.
- [ ] T002 [P] [CONFIG] Create `src/renderer/src/lib/configExport.ts` with the shared helper implementations for `buildExportPayload`, `sanitizeConfigForExport`, and `computeCategoryPreview`.

**Checkpoint**: Shared data structures and helper module exist - feature work can now be wired to the UI and IPC layer.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Bridge the renderer and main process to the new payload shape before any user story work begins.

**Critical**: No user story work should start until this phase is complete.

- [ ] T003 [P] [IPC] Update `src/renderer/src/lib/core.ts` so `neuzosBridge.backup.export()` passes the selected export payload, and `neuzosBridge.backup.applyImport()` forwards the selected categories with the payload and mode.
- [ ] T004 [P] [IPC] Update `src/main/index.ts` so `config.export` accepts the renderer-built payload and `config.apply_import` accepts the category list while preserving schema v1 import compatibility.

**Checkpoint**: Renderer and main process can exchange the new export/import arguments.

---

## Phase 3: User Story 1 - Modular Category Selection for Export and Import (Priority: P1) MVP

**Goal**: The Backup tab shows one shared category checklist that controls both export and import.

**Independent Test**: Select only Keybinds and export the JSON. It should contain only keybind data. Select only UI Layout and export again. It should contain only layout data. Leaving all categories unchecked should disable export and apply actions.

- [ ] T005 [P] [US1] Define the shared export/import category list, labels, descriptions, default selection state (all exportable categories checked by default), local-count labels, and Quest Log placeholder state in `src/renderer/src/lib/configExport.ts`.
- [ ] T006 [US1] Render the shared category checklist, the local-count labels, and the explanatory note in `src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte`.
- [ ] T007 [US1] Build the v2 export payload with `buildExportPayload(currentConfig, selectedCategories)` before calling `backup.export()`, and disable export/apply when no exportable category is selected, in `src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte`.

**Checkpoint**: The Backup tab can scope export and import to the selected categories.

---

## Phase 4: User Story 2 - Security Sanitization for Export (Priority: P1)

**Goal**: Exported files are sanitized before they leave the renderer.

**Independent Test**: Export a config containing local paths or machine-specific session fields. The JSON should remove those values, set `_sanitized: true` when applicable, and show the safety notice in the UI.

- [ ] T008 [P] [US2] Implement `sanitizeConfigForExport` and the local-path stripping rules in `src/renderer/src/lib/configExport.ts`.
- [ ] T009 [US2] Show the sanitization notice and use the sanitized payload when exporting from `src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte`.

**Checkpoint**: Export payloads are sanitized and the user gets feedback when data was stripped.

---

## Phase 5: User Story 3 - Conflict-Aware Import Preview (Priority: P2)

**Goal**: Import preview shows per-category counts and conflict details for list-based categories.

**Independent Test**: Import a file with overlapping keybinds or session actions. The preview should show new vs conflict counts, and categories missing from the file should be marked as not found.

- [ ] T010 [P] [US3] Implement `computeCategoryPreview` for list-based categories and missing-category detection in `src/renderer/src/lib/configExport.ts`, using the current local-config snapshot to compute baseline counts.
- [ ] T011 [US3] Render per-category preview counts, conflict states, missing-file messages, and the apply-item count in `src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte`.

**Checkpoint**: The import preview explains what will be added, skipped, or overwritten for list-based categories.

---

## Phase 6: User Story 4 - Object-Based Categories Use Full Replace Semantics (Priority: P2)

**Goal**: UI Layout and General Settings import as full-replace categories, with skipped session-ID warnings where needed.

**Independent Test**: Import UI Layout on another machine. The preview should explain that the category is replaced as a whole, not merged item-by-item, and unmatched session IDs should be reported as skipped.

- [ ] T012 [P] [US4] Extend `computeCategoryPreview` to mark object-based categories as full replace and collect skipped session IDs in `src/renderer/src/lib/configExport.ts`; keep Quest Log Templates as a disabled placeholder with no preview rows in v2.
- [ ] T013 [IPC] [US4] Implement category-aware full replace handling for UI Layout and General Settings in `src/main/index.ts`, including skipped session-zoom IDs and category filtering.
- [ ] T014 [US4] Add full-replace badges, replace-mode explanations, and skipped session-ID warning copy in `src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte`.

**Checkpoint**: Object-based categories import with explicit full-replace semantics and safe skipping of unmatched session IDs.

---

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Final copy, validation, and consistency pass across all user stories.

- [ ] T015 [P] Validate the manual scenarios in `specs/002-01-modular-config-export-import/quickstart.md` against the final UI copy and adjust wording if needed.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Stories (Phase 3+)**: Depend on the Foundational phase.
- **Polish (Final Phase)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after the Foundational phase. This is the MVP slice.
- **User Story 2 (P1)**: Can start after the Foundational phase and the export payload path exists.
- **User Story 3 (P2)**: Can start after the Foundational phase.
- **User Story 4 (P2)**: Can start after the Foundational phase and builds on the preview/export data model.

### Within Each Story

- Shared helpers before UI wiring.
- Preview/data logic before final UI copy.
- Main-process handling before end-to-end validation.
- Complete one story before moving to the next priority if working solo.

### Parallel Opportunities

- `T002` can run in parallel with the rest of Phase 1 follow-up work once `T001` is done.
- `T003` and `T004` can run in parallel because they touch different files and only depend on the shared types.
- `T005` and `T006` can be developed independently after the shared category model exists.
- `T008` and `T009` can be developed independently after the export path is wired.
- `T010` and `T011` can be developed independently after the category preview model exists.
- `T012` can run in parallel with `T013` because one is renderer-side preview logic and the other is main-process import handling.
- `T014` can be finished after `T012` and `T013` settle the final semantics.

---

## Parallel Example: User Story 3

```bash
# Renderer preview logic and UI can be split across two people:
Task: "Implement computeCategoryPreview for list-based categories and missing-category detection in src/renderer/src/lib/configExport.ts"
Task: "Render per-category preview counts, conflict states, missing-file messages, and the apply-item count in src/renderer/src/components/SettingsWindow/Tabs/BackupSettings.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate the category checklist flow before expanding to sanitization or preview detail work.

### Incremental Delivery

1. Ship category selection first so users can scope export and import.
2. Add sanitization so exported files are safe to share.
3. Add conflict-aware preview so users can inspect what will happen before applying.
4. Finish object-based full-replace handling and skipped session-ID warnings.

### Parallel Team Strategy

1. One developer can own the shared types and config export helpers.
2. A second developer can wire the main-process IPC changes.
3. A third developer can focus on the Backup tab UI and preview states.
4. The final polish pass can align the UI copy with `quickstart.md`.

---

## Notes

- Keep task scope aligned to the existing Backup tab and IPC flow.
- Avoid adding new dependencies or new IPC channels.
- The quest log category remains a stub in v2.
- The user-visible checklist is shared between export and import.
- v1 files remain importable as keybinds plus session actions only.
