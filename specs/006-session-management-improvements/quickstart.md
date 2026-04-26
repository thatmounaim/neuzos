# Quickstart: Session Management Improvements

**Phase**: 1 — Design  
**Date**: 2026-04-26  
**Feature**: [spec.md](spec.md)

---

## Prerequisites

- NeuzOS built and running from the `006-add-session-groups` branch (`npm run dev` or a production build).
- At least two sessions configured in Settings > Sessions, one of them actively running in the main window.

---

## Smoke Test 1 — Running-session delete warning (BUG FIX / FR-002)

1. Start a session in the main window so it is actively loading a page.
2. Open Settings > Sessions.
3. Click the delete (trash) icon on that running session.
4. **Expected**: Dialog shows an explicit warning that the session is currently running and will be stopped before deletion. Wording is visually distinct from the standard delete dialog.
5. Click Cancel. Session remains unchanged.
6. Click delete again, then confirm.
7. **Expected**: Session stops, partition is deleted, session is removed from the list. No silent failure.

---

## Smoke Test 2 — Delete failure shows error dialog (FR-005)

1. In a file explorer, open `%APPDATA%\neuzos\Partitions\persist\<sessionId>\` and lock a file (e.g., open it in a text editor that holds a handle).
2. Attempt to delete that session from Settings.
3. **Expected**: After the retry window, a visible error dialog appears describing the failure. Session config is NOT removed from the list.

---

## Smoke Test 3 — Session clone (stopped source) (FR-007 to FR-016)

1. Ensure the source session is NOT running.
2. Click the clone icon button on a session row.
3. **Expected**:
   - A new session appears immediately after the source.
   - Label is `<source label> (Copy)` (or `(Copy) (2)` etc. if a collision exists).
   - In Settings, verify that `partitionOverwrite` is absent on the clone (it should not have one).
4. Launch the cloned session.
5. **Expected**: The cloned session logs in automatically (same account as source), confirming IndexedDB / Local Storage / Cookies were copied.
6. In File Explorer, verify `%APPDATA%\neuzos\Partitions\persist\<cloneId>\` exists and contains `IndexedDB/`, `Local Storage/`, `Cookies` but NOT `Cache/`, `Code Cache/`, `GPUCache/`.

---

## Smoke Test 4 — Session clone (running source) (FR-008)

1. Start the source session in the main window.
2. Click the clone icon on that session in Settings.
3. **Expected**: An informational message/toast appears: *"Session was stopped to allow cloning."*
4. Clone appears after source with correct label.
5. Repeat Smoke Test 3 steps 4–6.

---

## Smoke Test 5 — Per-session Auto-Delete Cache (FR-017 to FR-020)

1. In Settings > Sessions, enable the **Auto-Delete Cache** toggle for one session (Session A). Leave it off for Session B.
2. Start Session A in the main window, let it load.
3. Stop Session A (click Stop in the session bar).
4. **Expected**: `Cache/` directory under `%APPDATA%\neuzos\Partitions\persist\<sessionA-id>\` is emptied or removed.
5. Verify Session A still logs in automatically on next launch (login state preserved).
6. Repeat with Session B — **Expected**: cache is NOT cleared on stop.

---

## Smoke Test 6 — Global startup cache clear (FR-021 to FR-022)

1. In Settings > General, enable **Clear all caches on app startup**.
2. Save and close NeuzOS.
3. Reopen NeuzOS.
4. **Expected**: App opens without any blocking confirmation dialog. Cache directories for all sessions are emptied.
5. Launch any session — **Expected**: user is still logged in (state preserved).
6. Disable the toggle and restart — **Expected**: caches are NOT cleared on this restart.

---

## Smoke Test 7 — Action-button tooltips (FR-032, FR-033)

1. Open Settings > Sessions.
2. Hover each icon in the Actions column for any session row.
3. **Expected**: Tooltip appears for each: "Clear Cache", "Clear Session Data", "Clone Session", "Delete Session".
4. Hover the **Auto-Delete Cache** column header.
5. **Expected**: Tooltip appears describing the column purpose.

---

## Regression: Session Groups (FR-023 to FR-031)

These features are implemented in the base branch. Run a brief regression check:

1. Create a group, assign sessions to it, rename it, reorder it.
2. Open Session Launcher — groups appear in the same order as Settings.
3. Export UI layout to a file. Import it on a clean config. Groups are restored.
4. Delete a group — sessions become ungrouped, no sessions deleted.
