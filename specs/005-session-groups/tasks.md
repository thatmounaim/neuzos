# Tasks: Session Groups

**Input**: Design documents from `/specs/005-session-groups/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the shared data model that every later story depends on.

- [X] T001 [P] Add `NeuzSessionGroup` and `sessionGroups` to `src/renderer/src/lib/types.ts`
- [X] T002 [P] Mirror `sessionGroups` on the main-process `ConfigExportPayloadV2` type in `src/main/index.ts`

**Checkpoint**: The new session-group shape is available across renderer and main-process types.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Normalize shared group access before the story-specific UI work begins.

- [X] T003 Add `?? []` fallback for `sessionGroups` access in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte` and `src/renderer/src/SessionLauncher.svelte` so both windows treat missing group data as an empty list

**Checkpoint**: Both windows can safely consume `sessionGroups ?? []` without special-casing absent config data.

---

## Phase 3: User Story 1 - Organize Sessions into Groups (Priority: P1) 🎯 MVP

**Goal**: Users can create named groups, edit them inline, assign sessions, and remove groups without losing sessions.

**Independent Test**: Create a group named "Battle Pass", assign 3 sessions to it in Settings > Sessions, and verify the group renders as a collapsible section containing exactly those 3 sessions.

- [X] T004 Add group collection helpers, derived grouped/ungrouped session views, and mutation helpers in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`, including removing deleted session ids from every group's `sessionIds` list when a session is deleted, and calling `config.save` IPC after in-memory state is updated so the deletion persists to disk (fixed — BUG-001)
- [X] T005 Render collapsible group sections with inline label editing and delete buttons in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`
- [X] T006 Add per-session group assignment dropdowns plus unassign handling in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`
- [X] T007 Add the Add Group footer action and preserve empty groups in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte` — "Add Group" button added to `Card.Footer` next to "Add Session" (fixed — BUG-002)

**Checkpoint**: Session groups can be created, renamed, assigned, unassigned, and deleted from Settings > Sessions.

**Bugfix**: 2026-04-25 — BUG-001 T004 reopened: config save call missing after session delete. BUG-002 T007 reopened: Add Group button absent from Card.Footer template.
**Bugfix**: 2026-04-25 — BUG-003 Fixed: partition path corrected to `Partitions/persist/<id>` and stop wait increased to 5 s in `src/main/index.ts`. BUG-004 Fixed: `addGroup()` now calls `startEditingGroup(newGroup)` for immediate inline rename. BUG-005 Fixed: mouse button binds now intercepted via `before-input-event` on registered session webview webContents; renderer sends `webview.register_mouse`/`webview.unregister_mouse` IPC from `NeuzClient.svelte`.

---

## Phase 4: User Story 2 - Reorder Groups (Priority: P2)

**Goal**: Users can control the order of groups in Settings > Sessions so important groups stay at the top.

**Independent Test**: Create two groups A and B, move B above A, reopen Settings, and verify B is still above A.

- [X] T008 Add up/down reorder controls and swap handlers for groups in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`
- [X] T009 Keep the saved `sessionGroups` order stable by writing reorder and delete mutations back through config save in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte`

**Checkpoint**: Group ordering is user-controlled and persists through settings reloads.

---

## Phase 5: User Story 3 - Session Launcher Shows Groups (Priority: P2)

**Goal**: The Session Launcher window mirrors the Settings grouping structure with collapsible grouped sections and an ungrouped fallback.

**Independent Test**: Assign sessions to a group in Settings, open the Session Launcher, and verify the group header contains the correct sessions, can be collapsed/expanded, and updates live while the window stays open.

- [X] T010 [P] Add the `session_launcher.get_groups` IPC handler in `src/main/index.ts`
- [X] T011 [P] Render grouped launcher sections, collapse toggles, and the trailing Ungrouped section in `src/renderer/src/SessionLauncher.svelte`, and subscribe to `event.config_changed` so the window re-fetches groups while open

**Checkpoint**: The Session Launcher reflects the current group structure without requiring a window restart.

---

## Phase 6: User Story 4 - Export and Import Group Configuration (Priority: P3)

**Goal**: Group definitions round-trip through config export/import under the existing `ui-layout` category.

**Independent Test**: Export UI Layout with groups present, clear them, import the file, and verify groups and session assignments are restored; repeat with merge mode to confirm matching group ids update in place.

- [X] T012 [P] Extend `src/renderer/src/lib/configExport.ts` so `ui-layout` export includes `sessionGroups` and the category preview/count logic reflects it
- [X] T013 [P] Update `src/main/index.ts` to pass `sessionGroups` through `config.import`, infer `ui-layout` when `sessionGroups` is present, and merge or replace groups in `applyUiLayout`

**Checkpoint**: Group data exports and imports correctly in both replace and merge modes.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finish UX details and validate the feature against the manual smoke test flow.

- [X] T014 Validate the feature against `specs/005-session-groups/quickstart.md`, including live Session Launcher refresh and collapse timing, and tighten any copy or spacing in `src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte` and `src/renderer/src/SessionLauncher.svelte`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies and can start immediately.
- Foundational (Phase 2) depends on Setup and should complete before story work.
- User Story phases (Phases 3-6) depend on Setup and Foundational.
- Polish (Phase 7) depends on the story phases you choose to ship.

### User Story Dependencies

- User Story 1 (P1) is the MVP and can start after Setup + Foundational.
- User Story 2 (P2) builds on the same Settings session grouping UI and is easiest to finish after User Story 1.
- User Story 3 (P2) can proceed once the shared types exist and the IPC contract is defined.
- User Story 4 (P3) can proceed once the shared types exist and the export/import plumbing is ready.

### Within Each User Story

- Keep each story independently testable.
- In Settings, group creation and assignment should land before reorder polish.
- In the Session Launcher, fetch groups from IPC before rendering collapsible sections.
- In export/import, update the renderer payload first, then the main-process apply/import path.

### Parallel Opportunities

- T001 and T002 can run in parallel because they touch different files.
- T010 and T011 can run in parallel because they touch different files.
- T012 and T013 can run in parallel because they touch different files.
- After Foundational completes, separate developers can work on different user stories in parallel.

---

## Parallel Example: User Story 3

```text
Task: T010 [P] Add the session_launcher.get_groups IPC handler in src/main/index.ts
Task: T011 [P] Render grouped launcher sections, collapse toggles, and the trailing ungrouped section in src/renderer/src/SessionLauncher.svelte
```

## Parallel Example: User Story 4

```text
Task: T012 [P] Extend src/renderer/src/lib/configExport.ts so ui-layout export includes sessionGroups and the category preview/count logic reflects it
Task: T013 [P] Update src/main/index.ts to pass sessionGroups through config.import, infer ui-layout when sessionGroups is present, and merge or replace groups in applyUiLayout
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate the Settings > Sessions workflow using `specs/005-session-groups/quickstart.md`.
5. Ship or demo the MVP if it is stable.

### Incremental Delivery

1. Deliver Setup + Foundational so the shared group model exists everywhere.
2. Deliver User Story 1 so users can actually create and manage groups.
3. Deliver User Story 2 so group ordering becomes controllable.
4. Deliver User Story 3 so the Session Launcher mirrors the grouped structure.
5. Deliver User Story 4 so group data round-trips through export/import.

### Parallel Team Strategy

1. One developer can work on the shared type setup while another prepares the settings UI.
2. Once the core settings behavior is in place, a second developer can tackle the launcher IPC/UI while a third handles export/import.
3. Finish with the manual smoke test in quickstart.md and any small UX polish.
