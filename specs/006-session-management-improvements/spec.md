# Feature Specification: Session Management Improvements

**Feature Branch**: 006-add-session-groups  
**Created**: 2026-04-26  
**Status**: Draft  
**Input**: User description: "Create a specification for a new feature bundle called Session Management Improvements for the NeuzOS Electron desktop app."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Safe Session Deletion and Cloning (Priority: P1)

As a user managing multiple game sessions, I can safely delete or clone a session from Settings without data corruption, silent failures, or accidental destructive actions.

**Why this priority**: Deletion and cloning affect persistent user state and can cause data loss or trust issues if unreliable.

**Independent Test**: Can be fully tested by deleting a running session and cloning both running and stopped sessions, then verifying expected dialogs, resulting session list changes, and source/clone partition outcomes.

**Acceptance Scenarios**:

1. **Given** a session is running, **When** the user chooses delete, **Then** the system warns that the session will be stopped first and requires explicit confirmation before deletion proceeds.
2. **Given** a confirmed delete request for a running session, **When** stop completes and the session webview unloads, **Then** the partition deletion is attempted only after the renderer confirms `stopClient()` finished, the webview is torn down, and a short final grace delay has elapsed; any queued cache-clear action for the same session is ignored so the partition folder is not recreated.
3. **Given** deletion still fails after stop and unload, **When** the operation completes, **Then** the user sees a visible failure dialog with clear error feedback.
4. **Given** a source session is running, **When** the user clones it, **Then** the source is stopped first and the user is informed that cloning required a stop.
5. **Given** cloning succeeds, **When** the clone is created, **Then** the clone appears immediately after the source session with a unique label and copied persistent login/state data only.

---

### User Story 2 - Automatic Cache Lifecycle Controls (Priority: P2)

As a user, I can choose cache-clearing behavior per session and globally on app startup so storage can be managed without losing login or game state.

**Why this priority**: This is a frequent maintenance task that should be automated safely while preserving critical session state.

**Independent Test**: Can be fully tested by enabling/disabling per-session and global cache toggles, stopping sessions, restarting the app, and verifying only cache folders are cleared.

**Acceptance Scenarios**:

1. **Given** a session has Auto-Delete Cache enabled, **When** that session stops, **Then** its HTTP cache is cleared automatically while login/state data remains.
2. **Given** a session has Auto-Delete Cache disabled, **When** that session stops, **Then** no automatic cache-clearing action runs for that session.
3. **Given** Clear all caches on app startup is enabled, **When** the app starts, **Then** all session caches are cleared silently without blocking startup with confirmation dialogs.
4. **Given** existing configurations created before this feature, **When** they are loaded, **Then** per-session auto-delete defaults remain disabled unless explicitly enabled by the user.

---

### User Story 3 - Organize Sessions with Groups Across Surfaces (Priority: P3)

As a user with many sessions, I can organize sessions into named, collapsible groups in both Settings and Session Launcher while preserving ungrouped behavior.

**Why this priority**: Improves usability and session discoverability, especially for larger session sets.

**Independent Test**: Can be fully tested by creating, renaming, collapsing, reordering, deleting groups, assigning sessions to groups, and verifying the same grouped order appears in Session Launcher and after export/import.

**Acceptance Scenarios**:

1. **Given** groups exist, **When** the user views Settings > Sessions, **Then** sessions are rendered under collapsible groups in configured order and ungrouped sessions appear below all groups.
2. **Given** a session assignment is changed to a group or to ungrouped, **When** the change is saved, **Then** the session belongs to at most one group and renders in the expected section.
3. **Given** a group is deleted, **When** the user confirms deletion, **Then** the group is removed and its sessions are moved to ungrouped without deleting any sessions.
4. **Given** grouped sessions are configured, **When** the Session Launcher opens, **Then** the same group ordering, collapsible headers, and ungrouped tail section are shown.
5. **Given** config export/import is performed with UI layout data, **When** import completes, **Then** session groups are preserved and restored.

---

### User Story 4 - Clear Action Discoverability in Session Rows (Priority: P4)

As a user, I can understand every icon action in the session Actions column through consistent hover tooltips.

**Why this priority**: Reduces mistakes and improves usability for icon-only controls.

**Independent Test**: Can be tested by hovering each action icon in a session row and verifying tooltip text for cache clear, session data clear, clone, and delete actions.

**Acceptance Scenarios**:

1. **Given** the session table is visible, **When** the user hovers each action icon, **Then** a descriptive tooltip is shown for that action.
2. **Given** the clone action is available, **When** the user hovers the clone icon, **Then** tooltip text clearly identifies the cloning behavior.

### Edge Cases

- Deleting a session whose partition folder is already absent still completes without false success messaging.
- Deleting a running session where stop succeeds but partition deletion fails must return a user-visible error and keep config/session state consistent.
- Deleting a session with Auto-Delete Cache enabled must not recreate the partition folder after a successful delete; any queued cache-clear IPC for that session is suppressed during deletion.
- Cloning a session when the source partition is missing or partially present returns a visible error and does not create a broken clone entry.
- Cloning handles repeated copy naming without collisions for labels like X, X (Copy), X (Copy) (2), and beyond.
- Group assignment remains valid if sessions referenced by groups were removed earlier.
- Export/import payloads lacking group data continue to load safely, with sessions treated as ungrouped.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require explicit confirmation before deleting any session.
- **FR-002**: System MUST show an additional warning when deleting a currently running session that the session will be stopped before deletion.
- **FR-003**: System MUST stop a running session, await an explicit renderer acknowledgement that `stopClient()` finished and the webview was torn down, then wait a fixed 2-second grace period before attempting deletion of that session's partition data. The delete handler MUST NOT call `clearStorageData()` or access `session.fromPartition()` between the acknowledgement/grace phase and the rimraf call — doing so on Windows re-opens Electron's session object and causes the partition folder to reappear or become locked, defeating the wait (see BUG-006). The delete flow MUST also suppress any queued `session.clear_cache` IPC for the same session while deletion is in progress, because a late cache-clear call can recreate the folder after rimraf (see BUG-010).
- **FR-004**: System MUST attempt partition deletion only after the stop-acknowledgement/grace phase completes; if deletion fails it MUST retry up to 5 times with 800 ms gaps before reporting failure to the user.
- **FR-005**: System MUST show a visible deletion error dialog when partition deletion fails after stop/unload.
- **FR-006**: System MUST use the existing confirmation/dialog interaction pattern already used in session settings for destructive operations.
- **FR-007**: System MUST provide a clone action in each session row Actions column.
- **FR-008**: System MUST stop a running source session before cloning and present an informational message that stop was required for cloning.
- **FR-009**: System MUST create cloned sessions with a newly generated unique session identifier matching the same ID strategy as manual session creation.
- **FR-010**: System MUST copy all session configuration fields from source to clone (label, icon, floatable setting, and launch overwrite); `partitionOverwrite` MUST be cleared on the clone so the clone always uses its own new session ID as its partition key.
- **FR-011**: System MUST generate a unique cloned label using this sequence: X (Copy), then X (Copy) (2), then X (Copy) (3), incrementing until unique.
- **FR-012**: System MUST copy only persistent session data needed for login and game state (IndexedDB, Local Storage, Cookies) and MUST NOT copy cache directories (Cache, Code Cache, GPUCache).
- **FR-013**: System MUST perform partition clone operations in the privileged process and derive source/destination paths from the application data root rather than renderer-provided paths.
- **FR-014**: System MUST validate clone source/destination paths remain within the application data root before reading, copying, or deleting.
- **FR-015**: System MUST insert the cloned session immediately after the source session in session ordering.
- **FR-016** *(planning-time, fulfilled — `contracts/ipc-channels.md` exists)*: System MUST define and document a dedicated session cloning IPC contract in `specs/006-session-management-improvements/contracts/ipc-channels.md`.
- **FR-017**: System MUST add a per-session Auto-Delete Cache boolean setting that defaults to disabled for existing and new sessions unless explicitly enabled.
- **FR-018**: System MUST expose per-session Auto-Delete Cache as a table column toggle in Settings > Sessions.
- **FR-019**: System MUST clear cache automatically on session stop only when that session's Auto-Delete Cache setting is enabled.
- **FR-020**: System MUST preserve login and game state when automatic cache delete runs.
- **FR-021**: System MUST add a global Clear all caches on app startup setting persisted in app configuration.
- **FR-022**: System MUST clear cache for all configured sessions during startup when the global startup setting is enabled, without blocking startup behind user dialogs. Failures are logged silently per session; startup continues normally with no user-facing error.
- **FR-023**: System MUST store session groups in configuration as a list of objects containing group ID, label, and ordered session IDs.
- **FR-024**: System MUST enforce that each session belongs to at most one group.
- **FR-025**: System MUST show grouped sessions as collapsible sections in Settings > Sessions with ungrouped sessions rendered below all groups.
- **FR-026**: System MUST support group creation, inline rename, relative reorder, and deletion with confirmation.
- **FR-027**: System MUST move group members to ungrouped when a group is deleted, without deleting the sessions themselves.
- **FR-028**: System MUST provide per-session group assignment controls supporting assignment to a specific group or ungrouped.
- **FR-029**: System MUST render the same group structure and order in Session Launcher, including collapsible group headers and ungrouped sessions at the end.
- **FR-030**: System MUST include session group data in UI layout export/import so grouping survives a round trip.
- **FR-031**: System MUST keep session partition folder layout flat by session ID; group labels MUST NOT affect filesystem paths.
- **FR-032**: System MUST provide hover tooltips for every icon action in the session row Actions column, including cache clear, session data clear, clone, and delete.
- **FR-033**: System MUST provide a tooltip for the Auto-Delete Cache column header.
- **FR-034**: System MUST apply the defined stop-wait mechanism (5-second initial timeout followed by up to 5 retry attempts at 800 ms intervals) before any partition mutation, whether for session deletion or cloning. *(Generalizes FR-003 and FR-004 to cover cloning in addition to deletion; the mechanism details are authoritative in FR-003/FR-004.)*
- **FR-035**: System MUST NOT send a `session.stop` IPC message from within the `event.start_session` renderer handler. The pre-start local cleanup MUST call `stopClient()` directly on each layout without going through IPC, to preserve the `runningSessionIds` Set state in the main process. *(Clarification added after BUG-007 — the original `sessions.stop()` IPC call inside `event.start_session` immediately removed the session from `runningSessionIds`, making the running-session delete warning never appear.)*

### Key Entities *(include if feature involves data)*

- **Session**: A launchable game profile with identity, display metadata, launch options, and per-session behavior toggles.
- **Session Group**: A named ordered container of session IDs used only for UI organization and launcher presentation.
- **Session Clone Request**: A user-triggered operation referencing a source session and producing a new session plus copied persistent state subset.
- **Session Cache Policy**: Per-session and global startup settings controlling when cache-only cleanup is automatically executed.
- **Session Partition Data**: Persistent web session artifacts associated with a session ID, with cache folders explicitly separated from login/state artifacts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempted session deletions from Settings present an explicit confirmation step, with running sessions showing a stop-before-delete warning.
- **SC-002**: In manual validation across at least 20 delete attempts on running sessions, partition deletion succeeds without silent failure in at least 95% of attempts, the partition folder remains absent after successful delete, and all failures show visible user error messaging.
- **SC-003**: In manual validation across at least 20 clone attempts, 100% of successful clones appear immediately after the source and preserve login/game state while excluding cache folders. State preservation is verified by re-launching the cloned session and confirming the user remains logged in without re-entering credentials.
- **SC-004**: With per-session Auto-Delete Cache enabled, cache cleanup is triggered on 100% of session stop events for enabled sessions and 0% for disabled sessions.
- **SC-005**: With global startup cache cleanup enabled, all configured sessions receive startup cache cleanup within one startup cycle without any blocking confirmation dialog.
- **SC-006**: In usability checks, users identify the purpose of each session-row icon action via tooltip on first hover for at least 90% of attempts.
- **SC-007**: After exporting and re-importing UI layout data, session group structure and order are preserved exactly for 100% of tested configurations.

## Assumptions

- Existing dialog and tooltip primitives currently used in Session Settings remain available for reuse in this feature bundle.
- Existing session cache-clear behavior already preserves login and game state when clearing cache-only directories.
- Config export/import support for UI layout remains the canonical place for persisting session group metadata.
- Current Windows behavior remains the primary validation target for partition lock timing, with Linux behavior treated as secondary compatibility validation.

## Clarifications

### Session 2026-04-26

- Q: Clone config inheritance — should `partitionOverwrite` be inherited by the clone? → A: Clear `partitionOverwrite` on the clone; clone always uses its own new session ID as its partition key.
- Q: Stop completion signal for delete and clone — what mechanism defines "session is fully stopped"? → A: Main process waits a fixed 5-second timeout then retries partition mutation up to 5 times with 800 ms gaps (matching the existing `session.delete` handler pattern).
- Q: IPC contract document location for `session.clone` → A: New file at `specs/006-session-management-improvements/contracts/ipc-channels.md`.
- Q: Startup cache clear failure handling → A: Log the error silently per session, continue startup normally, no user-facing error.
- Q: Measurable verification for "login/game state preserved" after cache clear → A: Re-launch the session after cache clear and confirm the user remains logged in without re-entering credentials.
- Q: Stop-state observability — keep as assumption or promote to requirement? → A: Promoted to FR-034 using the Q2 stop-wait mechanism; removed from Assumptions.

**Bugfix**: 2026-04-26 — BUG-006/BUG-007/BUG-008/BUG-009: FR-003 clarified that `clearStorageData()` MUST NOT be called between the stop-wait and rimraf (causes partition folder to reappear on Windows). FR-035 added — `event.start_session` must use local `stopClient()` calls instead of the `sessions.stop()` IPC to preserve `runningSessionIds` tracking.
**Bugfix**: 2026-04-26 — BUG-010: FR-003 further clarified that queued `session.clear_cache` IPC must be suppressed during delete so the partition folder cannot be recreated after rimraf on Windows.
**Bugfix**: 2026-04-26 — BUG-011: FR-003/FR-004 updated to require an explicit renderer stop acknowledgement plus a final grace delay before rimraf, because a blind timeout alone was still insufficient and the partition folder could still persist after delete on Windows.
