# Feature Specification: Session Groups

**Feature Branch**: `005-session-groups`  
**Created**: 2026-04-24  
**Status**: Draft  
**Input**: User description: "Add a grouping system for sessions to improve clarity when managing large numbers of accounts (e.g. 80 battle pass sessions)."

## Clarifications

### Session 2026-04-24

- Q: What should happen when a group name is cleared during inline edit? → A: Restore the last valid name.
- Q: When importing `ui-layout` data in merge mode, how should matching session group ids be handled? → A: Match groups by id and update the existing group.
- Q: When the user clicks Add Group, where should the new group be inserted? → A: Append it to the end of the group list.
- Q: When a session is assigned to a group, where should it be placed within that group’s ordered sessionIds list? → A: Append it to the end.
- Q: When the last session is removed from a group, should that empty group remain in the UI or disappear automatically? → A: Keep the empty group visible.
- Q: What default name should a newly created group use? → A: New Group.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organize Sessions into Groups (Priority: P1)

A user with a large number of sessions (e.g. 80 battle pass accounts) wants to categorize them into named groups so they can quickly scan and manage sessions by purpose or character type instead of scrolling through a flat list.

**Why this priority**: This is the core value of the feature. Without the ability to create and assign groups, no other group-related behavior is useful. A user with even 2 groups receives immediate organizational benefit.

**Independent Test**: Create a group named "Battle Pass", assign 3 sessions to it in Settings > Sessions, verify the group renders as a collapsible section containing exactly those 3 sessions.

**Acceptance Scenarios**:

1. **Given** the Settings > Sessions tab is open, **When** the user clicks "Add Group" in the session card footer, **Then** a new group with a default editable name appears as a collapsible section above the ungrouped sessions list.
2. **Given** a group exists, **When** the user clicks the group's inline name, **Then** the name becomes editable and saves on blur or Enter.
3. **Given** a session row exists, **When** the user opens the group dropdown on that row and selects a group, **Then** the session moves into that group's section.
4. **Given** a session is assigned to a group, **When** the user selects "Unassign" from the row dropdown, **Then** the session moves back to the ungrouped section.
5. **Given** a group with sessions exists, **When** the user clicks the delete button for that group, **Then** the group is removed and all its sessions move to the ungrouped section.

---

### User Story 2 - Reorder Groups (Priority: P2)

A user wants to control the order in which groups appear in Settings > Sessions so that the most important groups stay at the top.

**Why this priority**: Ordering matters for scannability at scale. Without reorder controls, users must tolerate arbitrary group order. This does not block group creation.

**Independent Test**: Create two groups A and B. Use the reorder buttons to move B above A. Reopen the settings tab and verify B is still above A.

**Acceptance Scenarios**:

1. **Given** two or more groups exist, **When** the user clicks the up-reorder button on a group, **Then** that group moves one position up in the list.
2. **Given** a group is already at the top, **When** viewing its reorder controls, **Then** the up button is disabled or hidden.
3. **Given** a group is already at the bottom, **When** viewing its reorder controls, **Then** the down button is disabled or hidden.
4. **Given** groups have been reordered, **When** the settings window is closed and reopened, **Then** the order is persisted.

---

### User Story 3 - Session Launcher Shows Groups (Priority: P2)

A user opening the Session Launcher window wants to see sessions organized by their assigned groups as collapsible sections, matching the structure defined in Settings.

**Why this priority**: The Session Launcher is the primary way users launch sessions quickly. Without group visibility there, the organizational benefit does not carry over to the most-used workflow.

**Independent Test**: Assign sessions to a group in Settings. Open the Session Launcher. Verify the group name appears as a collapsible section header containing the correct sessions, that the section can be collapsed/expanded, and that changes made in Settings appear while the launcher stays open.

**Acceptance Scenarios**:

1. **Given** sessions are assigned to groups, **When** the Session Launcher window opens, **Then** sessions are rendered in collapsible sections labeled with their group name, followed by an "Ungrouped" section for unassigned sessions (if any exist), and the open window refreshes when Settings changes are saved.
2. **Given** a group section in the Session Launcher, **When** the user clicks the section header, **Then** the section collapses, hiding its session tiles, and a subsequent click expands it again.
3. **Given** all sessions are assigned to groups, **When** the Session Launcher opens, **Then** no "Ungrouped" section is shown.

---

### User Story 4 - Export and Import Group Configuration (Priority: P3)

A user who exports their UI layout configuration wants session group definitions to be included so that restoring from a backup or sharing config recreates the groups.

**Why this priority**: Config portability is a secondary concern — groups must work locally first. Including groups in export/import prevents data loss on restore but does not affect day-to-day use.

**Independent Test**: Create groups and assign sessions. Export config with the "UI Layout" category selected. Clear groups. Import the config. Verify all groups and their session assignments are restored.

**Acceptance Scenarios**:

1. **Given** the user exports config with the "UI Layout" category, **When** the export file is inspected, **Then** it contains the session groups array with all group ids, labels, and sessionIds.
2. **Given** a config file with session groups is imported in "replace" mode, **When** import completes, **Then** existing groups are replaced by the imported groups.
3. **Given** a config file with session groups is imported in "merge" mode, **When** import completes, **Then** groups from the file are merged with existing groups, new groups are added, and any matching group ids update the existing group label and session membership.
4. **Given** an imported config references a session id that no longer exists, **When** import completes, **Then** the orphaned session id is silently removed from the group's sessionIds list.

---

### Edge Cases

- What happens when a group name is left empty after editing? The last valid name is restored.
- What happens if all sessions are deleted while groups remain? Groups persist (empty) and are shown with no session rows inside them.
- What happens when the only session in a group is deleted? The group remains but is empty; the user can delete the group or add other sessions to it.
- What happens when the last session is removed from a group? The group remains visible and empty until the user deletes it.
- What happens when a session is deleted while groups exist? The session is removed from `sessions` and from every `sessionIds` list in `sessionGroups`, and the updated config is immediately saved to disk so the deletion persists after restart.
- How does the system handle duplicate group names? Duplicate names are allowed — groups are identified by their unique id, not their label.
- What happens when a group's sessionIds references a session that was deleted? The orphaned id is silently ignored when rendering; it is removed on next config save.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The configuration MUST support a `sessionGroups` list where each group has a unique id, a user-editable label, and an ordered list of session ids.
- **FR-002**: Settings > Sessions MUST display each group as a collapsible section with an inline-editable name, reorder buttons (up/down), and a delete button.
- **FR-003**: Deleting a group MUST move all of its assigned sessions to the ungrouped section rather than deleting the sessions.
- **FR-004**: Each session row in Settings > Sessions MUST include a dropdown control to assign that session to a group or remove it from its current group.
- **FR-005**: Settings > Sessions MUST include an "Add Group" button (in the session card footer) that creates a new empty group with a default name and appends it to the end of the group list.
- **FR-006**: The Session Launcher window MUST render sessions inside collapsible sections corresponding to their assigned groups, with ungrouped sessions in a trailing ungrouped section.
- **FR-007**: Group data MUST be included in config export and import under the existing `ui-layout` category.
- **FR-008**: Partition folder paths MUST remain flat; group names MUST NOT be used as filesystem folder names or influence any file path.
- **FR-009**: Group order MUST be user-controlled via reorder buttons, and the order MUST persist across application restarts.
- **FR-010**: A session MUST belong to at most one group at a time; assigning to a new group automatically removes the session from its previous group.
- **FR-011**: When a session is assigned to a group, it MUST be appended to the end of that group’s sessionIds list.
- **FR-012**: A group with zero sessions MUST remain visible in the UI until the user explicitly deletes the group.
- **FR-013**: After a session is successfully deleted, the renderer MUST persist the updated `sessions` list and `sessionGroups` arrays to disk (via `config.save`) so the deletion survives application restart.

**Bugfix**: 2026-04-25 — BUG-001 Added FR-013: session delete must trigger a config save to persist the removal.
**Bugfix**: 2026-04-25 — BUG-002 No spec gap; FR-005 was explicit. Implementation drift confirmed patched — "Add Group" button now present in `Card.Footer`.
**Bugfix**: 2026-04-25 — BUG-003 Corrected implicit assumption in FR-013: the `session.delete` handler MUST target `Partitions/persist/<sessionId>` (Electron's actual layout) and MUST allow sufficient time for Chromium handle release before folder removal. FR-013 still holds; the underlying delete path is now reliable.
**Bugfix**: 2026-04-25 — BUG-004 Amended User Story 1 Scenario 1 implied UX contract: after clicking "Add Group", the new group's name field MUST be auto-focused so the user can type the desired name immediately without a second click.
**Bugfix**: 2026-04-25 — BUG-005 Cross-cutting keybind spec gap: Mouse button binds (Middle, Mouse4, Mouse5) MUST fire when the bound button is pressed while focus is inside any session webview, equivalent to keyboard binds. Implemented via `webContents.on('before-input-event')` in main process, registered per active session webview.

### Key Entities

- **NeuzSessionGroup**: Represents a named grouping of sessions. Attributes: `id` (unique string), `label` (user-visible name), `sessionIds` (ordered array of session ids belonging to the group).
- **NeuzConfig**: The root configuration object. Gains a new optional `sessionGroups: NeuzSessionGroup[]` list (empty array when no groups exist).
- **Ungrouped sessions**: Any session whose id does not appear in any group's `sessionIds`. This is a derived concept, not stored explicitly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with 80 sessions can create, name, and populate 10 groups in under 5 minutes without leaving the Settings > Sessions tab.
- **SC-002**: Collapsing a group section in Settings or the Session Launcher takes effect immediately (under 200 ms perceived delay), with no page reload required.
- **SC-003**: All group data present at export time is fully restored after a config import with zero manual correction required.
- **SC-004**: Deleting a group leaves all formerly-grouped sessions visible and accessible in the ungrouped section with no data loss.
- **SC-005**: Session Launcher correctly reflects the current group structure after any group change made in Settings, even when the launcher window remains open.

## Assumptions

- Groups are a purely organizational layer; they do not affect session launch behavior, partition storage, or any browser-level isolation.
- The "Ungrouped" section in the Session Launcher is shown only when at least one unassigned session exists; otherwise it is omitted.
- The `id` for each new group is generated as a random UUID at creation time and never shown to the user.
- Group collapse state (expanded/collapsed) in the Session Launcher and Settings is ephemeral — it does not need to persist between window openings.
- The existing `NeuzConfig` schema version and export format are extended (not replaced); existing config files without `sessionGroups` are treated as having an empty groups list for full backward compatibility.
- The `ui-layout` export category is the correct home for session groups because groups are a display/organizational concern, not a session identity or keybind concern.
