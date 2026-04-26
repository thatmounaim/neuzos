# Tasks: Quest Log UX & Creation Flow Enhancement

**Input**: Design docs from `/specs/003-01-questlog-ux-creation-flow/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
**Tests**: Not included — no automated tests were requested for this feature.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extract shared data needed by both the Settings icon picker and the Quest Log icon picker.

- [X] T001 [P] Create `src/renderer/src/lib/data/actionIcons.ts` by moving the `actionIcons` array out of `src/renderer/src/components/SettingsWindow/Tabs/SessionActionsSettings.svelte`
- [X] T002 [P] Update `src/renderer/src/components/SettingsWindow/Tabs/SessionActionsSettings.svelte` to import `actionIcons` from `src/renderer/src/lib/data/actionIcons.ts` and remove the inline constant

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Prepare the Quest Log panel for the shared session pre-fill and persisted icon flow.

- [X] T003 [P] Add `mainWindowState` context access and creation-form state scaffolding to `src/renderer/src/components/QuestLog/QuestPanel.svelte` for `sessionComboOpen`, `iconComboOpen`, `newCharIcon`, and reset helpers
- [X] T004 [P] Update `src/renderer/src/lib/contexts/questPanelContext.svelte.ts` so Quest Log characters persist an optional `icon` field, load legacy entries safely, and accept the selected icon when creating a new character
- [X] T005 [P] Extract the existing icon picker markup from `src/renderer/src/components/SettingsWindow/Tabs/SessionActionsSettings.svelte` into `src/renderer/src/components/Shared/IconPicker.svelte` and switch Settings to use it

## Phase 3: User Story 1 - TODO Section Stays at the Top (Priority: P1) 🎯 MVP

**Goal**: Keep the TODO checklist above the character tabs so the panel no longer splits navigation and quest content.

**Independent Test**: Open the Quest Log panel and verify that the TODO checklist renders above the character tabs and never between the tab row and the quest list.

- [X] T006 [US1] Move `<TodoChecklist />` above the character tabs row in `src/renderer/src/components/QuestLog/QuestPanel.svelte` and preserve the existing panel spacing and layout

## Phase 4: User Story 2 - One-Click Quest Log Entry via Session Pre-fill (Priority: P1)

**Goal**: Let users choose any configured session and pre-fill the new Quest Log name and icon before confirming.

**Independent Test**: Click `+`, choose a session from the combobox, and confirm that the name and icon are pre-filled and still editable before submit.

- [X] T007 [US2] Add the session-selection combobox UI to the add-character form in `src/renderer/src/components/QuestLog/QuestPanel.svelte` using `mainWindowState.sessions` as the item source
- [X] T008 [US2] Wire session selection to pre-fill `newCharName` and `newCharIcon` in `src/renderer/src/components/QuestLog/QuestPanel.svelte`, while keeping both fields editable before submit and passing the selected icon to `questPanel.addCharacter()`
- [X] T009 [US2] Handle the empty-session state and reset/cancel behavior in `src/renderer/src/components/QuestLog/QuestPanel.svelte` so custom creation remains available when no sessions exist

## Phase 5: User Story 3 - Visual Icon-Selector for Custom Quest Log Creation (Priority: P2)

**Goal**: Replace manual icon slug typing with the shared icon picker component used by Settings.

**Independent Test**: Open the icon field, search icons, pick one, and confirm the preview updates using the same picker behavior as Settings.

- [X] T010 [US3] Replace the manual icon slug input in `src/renderer/src/components/QuestLog/QuestPanel.svelte` with `src/renderer/src/components/Shared/IconPicker.svelte`
- [X] T011 [US3] Connect the shared icon picker in `src/renderer/src/components/QuestLog/QuestPanel.svelte` to `newCharIcon` so selection, search, and preview behavior match `src/renderer/src/components/SettingsWindow/Tabs/SessionActionsSettings.svelte`

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation for the combined Quest Log UX flow.

- [X] T012 Update `specs/003-01-questlog-ux-creation-flow/quickstart.md` to reflect the final shared component, persisted character icon, and QuestPanel flow
- [X] T013 Validate the Quest Log smoke path described in `specs/003-01-questlog-ux-creation-flow/quickstart.md` and fix any regressions in `src/renderer/src/components/QuestLog/QuestPanel.svelte`

## Post-Smoke Fixes (user feedback)

- [X] T014 Replace `<IconPicker>` (300+ skill icons) + 4 inline class buttons with a single class combobox dropdown in `QuestPanel.svelte` — selecting a class sets `newCharClass` and closes the dropdown
- [X] T015 Add an X/clear button next to the session combobox in `QuestPanel.svelte` so a pre-filled session can be deselected without cancelling the entire form
- [X] T016 Remove the `characters.length > 1` guard from the ContextMenu Delete item so any character (including the last one) can be removed from the Quest Log

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — blocks all user story work
- **Phase 3+ (User Stories)**: Depend on Phase 2 completion
- **Phase 6 (Polish)**: Depends on the requested user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — independent of the other stories
- **User Story 2 (P1)**: Can start after Phase 2 — independent of User Story 1 and User Story 3
- **User Story 3 (P2)**: Can start after Phase 2 — depends on the shared icon picker component extraction, but not on User Story 1 or User Story 2

### Within Each User Story

- `T006` is the only User Story 1 task and completes that slice on its own
- `T007` should land before `T008`, and `T008` before `T009`
- `T010` should land before `T011`
- Keep each story independently demoable before moving to the next story

### Parallel Opportunities

- `T002`, `T003`, and `T004` can be split across teammates once `T001` is in place because they touch different files
- After Phase 2, User Story 1, User Story 2, and User Story 3 can be implemented in parallel
- Within User Story 2, the UI wiring and reset handling can be reviewed independently once the combobox shell is in place
- Within User Story 3, the shared component extraction and QuestPanel wiring can be coordinated separately if needed

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2
2. Complete User Story 1 (`T006`) to lock in the panel layout improvement
3. If you want the highest-value UX increment next, complete User Story 2 (`T007`-`T009`)
4. Add User Story 3 (`T010`-`T011`) for the custom icon picker refinement
5. Finish with the polish tasks (`T012`-`T013`)

### Incremental Delivery

1. Shared icon data is extracted first so both components can use the same source
2. QuestPanel state is prepared next so the creation form can accept pre-filled values
3. TODO placement is fixed as a standalone visible improvement
4. Session pre-fill is added as the core creation flow improvement
5. Shared icon picker reuse lands last so custom creation matches the Settings UX

### Parallel Team Strategy

1. One developer can own the Settings icon-data extraction (`T001`-`T002`)
2. Another can prepare `QuestPanel.svelte` for the new creation flow (`T003`)
3. A third can extract the shared icon picker component (`T004`)
4. Once the foundation is in place, the three user stories can proceed independently
