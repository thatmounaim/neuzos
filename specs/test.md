# NeuzOS Beta Test Guide

**Version coverage**: PRs 001 – 006  
**Platform**: Windows (primary test target)  
**Date**: 2026-04-26

---

## How to Use This Guide

- Work through each section in order. Each section maps to one feature PR.
- **PASS** = the app behaves exactly as described in the "Expected" line.
- **FAIL** = anything else. Note what actually happened when you report.
- You do not need to be a developer. All steps use the NeuzOS UI only.
- Start the app fresh (fully closed, then relaunched) before beginning each major section unless
  the steps say otherwise.
- The word "partition" means the saved login and cache data for a session. You do not need to touch
  files directly — instructions will tell you when to check the filesystem.

---

## Quick-Reference: What Each PR Added

| PR  | Name                         | Short Summary                                                   |
|-----|------------------------------|-----------------------------------------------------------------|
| 001 | Sync Caster                  | Broadcast key inputs from one session to a designated receiver  |
| 002 | Core QoL Features            | Session health overlays, per-session zoom, config backup        |
| 003 | Integrated Wiki/Sheet Viewer | In-app Flyffipedia and NaviGuide browser window                 |
| 004 | Unified Action & Input Mapper| Keybind profiles, session key macros, mouse/gamepad bindings    |
| 005 | Session Groups               | Named collapsible groups in Settings and Session Launcher       |
| 006 | Session Management           | Safe delete, clone, auto-delete cache, startup cache clear      |

---

## Prerequisites

Before starting the tests, ensure you have:

- At least **3 sessions** configured in **Settings → Sessions**. Name them:
  - `TestA`, `TestB`, `TestC`
- At least **2 layouts** configured in Settings, each containing some sessions.
- The app fully launched with no sessions currently running (all stopped).

---

## PR 001 — Sync Caster (Active Receiver)

**What it does**: You can mark one session as the "Active Receiver". Any key inputs sent via the
Sync Caster action will be forwarded to that session's game window, in addition to whoever normally
receives them.

### Setup

1. Open **Settings → Keybinds**.
2. Verify a keybind exists (or create one) for the action **"Send to Receiver"**.
   - If no such action exists under Session Actions, you may skip the live-key tests and only check
     the receiver toggle.

### Test 1-A — Set Active Receiver

1. Start session `TestA` in a layout.
2. In the main window, find the **receiver toggle button** (antenna/signal icon) in the session
   panel for `TestA`.
3. Click it.

**Expected**: The button becomes highlighted/active. `TestA` is now the Active Receiver.

4. Click it again.

**Expected**: The button returns to its default (inactive) state. No session is the receiver.

### Test 1-B — Receiver Persists to Another Session

1. Set `TestA` as Active Receiver (click its receiver button until it's active).
2. Click the receiver button on `TestB`.

**Expected**: `TestB` becomes the receiver and `TestA`'s receiver button goes inactive. Only one
session can be the receiver at a time.

### Test 1-C — Receiver Clears on Stop

1. Set `TestA` as the Active Receiver.
2. Stop `TestA` (right-click layout tab → stop, or use the session action button).
3. Check whether `TestA` is still shown as the receiver.

**Expected**: The receiver assignment either clears automatically or `TestA` is no longer running
(the receiver button is no longer visible). No crash.

---

## PR 002 — Core QoL Features

### 2.1 Per-Session Zoom

#### Test 2-A — Zoom Toolbar Appears on Hover

1. Start session `TestA` in a layout so the game webview is visible.
2. Move your mouse over the session pane and hover near the **bottom-right corner**.

**Expected**: A zoom toolbar fades in with Zoom In (+), Zoom Out (−), and Reset buttons.

3. Move the mouse away.

**Expected**: The toolbar fades out.

#### Test 2-B — Zoom In / Out / Reset

1. With `TestA` running, hover the zoom toolbar.
2. Click Zoom In three times.

**Expected**: The game view visibly enlarges.

3. Click Reset.

**Expected**: Zoom returns to 100%. The game fills the pane normally.

#### Test 2-C — Zoom Persists After Restart

1. Set `TestA` zoom to something other than 100% (e.g., zoom in twice).
2. Fully close NeuzOS.
3. Reopen NeuzOS and start `TestA`.
4. Hover to reveal the zoom toolbar.

**Expected**: Zoom level is the same non-default value you set before closing.

#### Test 2-D — Zoom via Settings

1. Open **Settings → Sessions**.
2. Find `TestA` in the table.
3. Locate the zoom control in that row (or a zoom field in the session's detail).
4. Change the zoom to 75%.
5. Return to the main window and start `TestA`.

**Expected**: The game renders at 75% scale.

---

### 2.2 Session Health Monitor

#### Test 2-E — Load-Failure Overlay

1. In **Settings → Sessions**, temporarily set `TestA`'s Launch URL to an invalid URL
   (e.g., `https://this.domain.does.not.exist.invalid`).
2. Start `TestA`.
3. Wait up to 15 seconds for the page to fail.

**Expected**: A full-pane overlay appears with:
- A warning icon
- Text saying "Load failed"
- The HTTP error code or description
- A **Retry** button

4. Restore the correct URL in Settings.
5. Click **Retry** on the overlay.

**Expected**: The game page loads normally and the overlay disappears.

#### Test 2-F — Unresponsive Indicator

> This test is harder to trigger intentionally. If you cannot trigger it, mark as N/A.

1. Start `TestA` with the game running.
2. Open Windows Task Manager and suspend the `NeuzOS` renderer process briefly, then resume it.
   Alternatively, cause a very heavy CPU spike on the machine.

**Expected**: An amber pulsing ring border appears around the session pane while it is unresponsive.
Once the session recovers, the ring disappears.

---

### 2.3 Config Import / Export (Backup)

#### Test 2-G — Export Config

1. Open **Settings → Backup**.
2. Select the categories you want to export (e.g., Sessions, Keybinds).
3. Click **Export**.

**Expected**: A native Save dialog opens. Save the file as `neuzos-backup.json` to your Desktop.

4. Open `neuzos-backup.json` in a text editor.

**Expected**: It is valid JSON containing the categories you selected.

#### Test 2-H — Import Preview Shows Correct Counts

1. Still in **Settings → Backup**, click **Import**.
2. Select the `neuzos-backup.json` file you just exported.

**Expected**: A preview is shown before anything is applied, listing item counts per category
(e.g., "3 sessions, 5 keybinds"). No data is changed yet.

#### Test 2-I — Import Merge Mode (Non-Destructive)

1. In the import dialog, choose **Merge** mode.
2. Click **Apply Import**.

**Expected**: Existing sessions and keybinds are unchanged. Only items not already present are
added (in this case, nothing should change since you are importing your own current data).
No sessions or keybinds are deleted.

#### Test 2-J — Import Replace Mode

> **Warning**: This will replace your current keybinds. Export first (you already did in Test 2-G).

1. In **Settings → Backup**, import your backup with **Replace** mode.
2. Click **Apply Import**.

**Expected**: Sessions, keybinds, and profiles are replaced with the imported values. The app
reflects the imported state immediately.

---

## PR 003 — Integrated Wiki / Sheet Viewer

**What it does**: A dedicated viewer window opens in-app for Flyffipedia (item/skill wiki) and
NaviGuide (leveling guide sheet). No external browser needed.

### Test 3-A — Open Viewer Window

1. Look for a **Viewer** or **Wiki** button in the main window's top bar (toolbar icon that looks
   like a book or external link).
2. Click it.

**Expected**: A separate NeuzOS viewer window opens. It contains navigation options for
**Flyffipedia** and **NaviGuide** (or similar tab/sidebar).

### Test 3-B — Flyffipedia Navigation

1. In the viewer window, select or click **Flyffipedia**.

**Expected**: The Flyffipedia content loads inside the viewer window without opening an external
browser.

2. Search for an item (e.g., type "Cardigan" in the Flyffipedia search if available).

**Expected**: Results appear inside the viewer. No external browser tab opens.

### Test 3-C — NaviGuide

1. In the viewer window, switch to **NaviGuide**.

**Expected**: The NaviGuide spreadsheet/viewer loads. You can scroll and interact with it.

### Test 3-D — Viewer Window Independence

1. While the viewer window is open, switch between layouts in the main window.

**Expected**: The viewer window stays open and does not close or reload when you switch layouts.

2. Close the viewer window.

**Expected**: Only the viewer window closes. The main app is unaffected.

---

## PR 004 — Unified Action & Input Mapper

**What it does**: You can bind keyboard shortcuts, mouse buttons, and gamepad buttons to actions
like switching layouts, toggling fullscreen, sending keys to sessions, and more. Multiple keybind
profiles can be created and switched at runtime.

### 4.1 Keybind Profiles

#### Test 4-A — Create a New Profile

1. Open **Settings → Keybinds**.
2. Find the **Profiles** section (dropdown or list at the top of the page).
3. Create a new profile named `TestProfile`.

**Expected**: A new empty profile called `TestProfile` is created and selected.

#### Test 4-B — Switch Profile at Runtime

1. Open the main window.
2. Use the profile switcher (in Settings or a shortcut/dropdown in the main bar) to switch
   between profiles.

**Expected**: Switching profiles is instant and does not require restarting the app.

#### Test 4-C — Profile Persists After Restart

1. Select `TestProfile` as the active profile.
2. Fully close and reopen NeuzOS.

**Expected**: `TestProfile` is still the active profile after restart.

---

### 4.2 Session Actions (Key Macros)

#### Test 4-D — Create a Session Action

1. Open **Settings → Session Actions** (may be a sub-tab under Keybinds or its own tab).
2. Click **Add Action**.
3. Give it a name (e.g., `Test Macro`).
4. Assign a key sequence (e.g., press `F1`).
5. Assign it to session `TestA`.

**Expected**: The action is saved and appears in the list.

#### Test 4-E — Trigger a Session Action from UI

1. Return to the main window with `TestA` running.
2. Find the session action buttons in the main bar (icons near `TestA`'s layout row).
3. Click your `Test Macro` button.

**Expected**: The key `F1` is sent to `TestA`'s game window. No crash. If the game is logged in,
F1 may open a menu (this is expected game behavior, not a bug).

#### Test 4-F — Bind a Session Action to a Hotkey

1. Open **Settings → Keybinds**.
2. Bind a global shortcut (e.g., `Ctrl+1`) to trigger `Test Macro`.
3. Return to the main window with `TestA` running.
4. Press `Ctrl+1`.

**Expected**: The macro fires and `F1` is sent to `TestA`.

---

### 4.3 Mouse Button Bindings

#### Test 4-G — Bind a Mouse Side Button

1. Open **Settings → Keybinds**.
2. Click the bind button for any action and press a mouse side button (Mouse4 or Mouse5).

**Expected**: The keybind field shows the mouse button name (e.g., `MouseForward`). No error.

3. Save and trigger the action by pressing the mouse button.

**Expected**: The bound action fires.

---

### 4.4 Conflict Detection

#### Test 4-H — Duplicate Keybind Warning

1. Open **Settings → Keybinds**.
2. Assign the same key (e.g., `F5`) to two different actions.

**Expected**: The UI shows a warning or highlights the conflicting binds. It does not silently
allow both.

---

## PR 005 — Session Groups

**What it does**: Sessions in Settings and Session Launcher can be organized into named, collapsible
groups. Groups can be reordered and are preserved in config export/import.

### 5.1 Create and Manage Groups

#### Test 5-A — Create a Group

1. Open **Settings → Sessions**.
2. Scroll to the bottom of the session list.
3. Click **Add Group**.

**Expected**: A new group section appears above the ungrouped sessions list with a default name
like `New Group` and an editable name field.

#### Test 5-B — Rename a Group

1. Click directly on the group name text.

**Expected**: The name becomes editable (inline text input).

2. Type `Battle Pass` and press Enter (or click elsewhere).

**Expected**: The group is renamed to `Battle Pass`. The name persists if you scroll away and back.

#### Test 5-C — Assign a Session to a Group

1. Find session `TestA` in the ungrouped section.
2. Locate the **Group dropdown** in that row (a dropdown or selector showing "Ungrouped").
3. Select `Battle Pass`.

**Expected**: `TestA` moves immediately into the `Battle Pass` group section. It no longer appears
in the ungrouped section.

#### Test 5-D — Unassign a Session from a Group

1. In the `TestA` row inside `Battle Pass`, open the group dropdown.
2. Select **Ungrouped** (or "None").

**Expected**: `TestA` moves back to the ungrouped section. The `Battle Pass` group remains (even
if now empty).

#### Test 5-E — Delete a Group

1. Assign `TestB` to `Battle Pass`.
2. Click the **delete** button on the `Battle Pass` group header.
3. Confirm the deletion if prompted.

**Expected**: The `Battle Pass` group is removed. `TestB` moves to the ungrouped section. No
session data is lost.

---

### 5.2 Reorder Groups

#### Test 5-F — Move a Group Up/Down

1. Create two groups: `GroupA` and `GroupB` (in that order).
2. Click the **Move Down** arrow on `GroupA`.

**Expected**: `GroupA` appears below `GroupB`.

3. Click the **Move Up** arrow on `GroupA`.

**Expected**: `GroupA` is back above `GroupB`.

#### Test 5-G — Edge Buttons Disabled at Boundaries

1. With `GroupA` at the top, check its **Move Up** button.

**Expected**: The Move Up button is disabled or hidden (cannot move past the top).

2. With the last group, check its **Move Down** button.

**Expected**: The Move Down button is disabled or hidden.

#### Test 5-H — Order Persists After Close/Reopen

1. Set a specific group order (e.g., `GroupB` above `GroupA`).
2. Close and reopen **Settings**.

**Expected**: The group order is the same as when you left.

---

### 5.3 Session Launcher Groups

#### Test 5-I — Groups Appear in Session Launcher

1. Make sure at least one group exists with sessions assigned (e.g., `Battle Pass` with `TestA`).
2. Open the **Session Launcher** window (from the main bar or via `--mode=session_launcher`).

**Expected**: Sessions are shown in collapsible sections matching the group names. `TestA` appears
under `Battle Pass`. Ungrouped sessions appear below all groups.

#### Test 5-J — Collapse / Expand Group in Launcher

1. Click the `Battle Pass` group header in Session Launcher.

**Expected**: The sessions inside collapse (hide). The header remains visible.

2. Click the header again.

**Expected**: The sessions expand back.

#### Test 5-K — No "Ungrouped" Section When All Are Grouped

1. Assign all sessions to groups (move `TestB` and `TestC` to groups too).
2. Open (or refresh) the Session Launcher.

**Expected**: No "Ungrouped" section is shown. Only group sections are visible.

---

### 5.4 Export / Import Groups

#### Test 5-L — Groups Included in Export

1. Create groups with session assignments.
2. Open **Settings → Backup**, select **UI Layout** category, and export.
3. Open the exported JSON in a text editor.

**Expected**: The JSON contains a `groups` array (or similar key) with your group names and
session assignments.

#### Test 5-M — Groups Restored on Import

1. Export the config (as above).
2. Delete all groups in Settings.
3. Import the backup.

**Expected**: Groups and their session assignments are restored exactly.

---

## PR 006 — Session Management Improvements

### 6.1 Safe Session Deletion

#### Test 6-A — Delete a Stopped Session (Normal Flow)

1. Make sure `TestC` is **not** running.
2. Open **Settings → Sessions**.
3. Click the **Delete** button (trash icon) for `TestC`.

**Expected**: A confirmation dialog appears asking you to confirm deletion. It does NOT warn about
the session being running (because it isn't).

4. Confirm the deletion.

**Expected**:
- `TestC` disappears from the session list immediately.
- No error dialog appears.
- *(Advanced check)*: After ~15 seconds, navigate to
  `%APPDATA%\neuzos\Partitions\persist\` in File Explorer and verify `TestC`'s folder is gone.

#### Test 6-B — Delete a Running Session (Running Warning)

1. Start `TestA` in a layout.
2. Open **Settings → Sessions**.
3. Click the **Delete** button for `TestA`.

**Expected**: A confirmation dialog appears that explicitly **warns you that the session is
currently running and will be stopped before deletion**. The dialog text or appearance should be
different from a stopped-session delete.

4. Confirm the deletion.

**Expected**:
- `TestA` stops (the game webview disappears from the layout).
- `TestA` disappears from the session list.
- After ~15 seconds, its partition folder is gone from disk.

#### Test 6-C — Delete Cancelled

1. Click Delete on any session.
2. Click **Cancel** (or close the dialog).

**Expected**: Nothing changes. The session is still in the list and still running if it was before.

#### Test 6-D — Delete Non-Existent Partition (Edge Case)

1. Pick a session that has **never been launched** (was just created, never opened in a layout).
2. Delete it.

**Expected**: Deletion completes successfully with no error, even though no partition folder
existed on disk to delete.

---

### 6.2 Session Cloning

#### Test 6-E — Clone a Stopped Session

1. Make sure `TestB` is **not** running.
2. In **Settings → Sessions**, click the **Clone** button (copy icon) for `TestB`.

**Expected**:
- A new session appears immediately below `TestB` in the list.
- The clone has a label like `TestB (copy)` or similar.
- No error dialog appears.

#### Test 6-F — Clone a Running Session

1. Start `TestB`.
2. Click the **Clone** button for `TestB`.

**Expected**:
- A dialog or toast informs you that the source session will be stopped first.
- `TestB` stops.
- The clone appears in the list.

#### Test 6-G — Clone Contains Login Data

> This test requires `TestB` to be logged in to the game.

1. Ensure `TestB` is logged in and you can see your character selection or in-game view.
2. Stop `TestB`.
3. Clone `TestB`.
4. Start the cloned session.

**Expected**: The cloned session opens to the same login state (character select or in-game) as
`TestB` had before cloning. Login/state data was copied.

---

### 6.3 Auto-Delete Cache Per Session

**What it does**: When this is enabled for a session, its HTTP cache (temp files, images) is
automatically deleted every time that session stops. Login data and game state are **not** affected.

#### Test 6-H — Enable Auto-Delete Cache

1. Open **Settings → Sessions**.
2. Locate the **Auto-Delete Cache** column in the sessions table (there is a switch/toggle per row).
3. Turn **on** the switch for `TestA`.

**Expected**: The switch turns on and the setting is immediately saved (no separate Save button
needed — or use Save if the UI has one).

#### Test 6-I — Cache Is Cleared on Stop

1. With Auto-Delete Cache enabled for `TestA`, start `TestA` in a layout.
2. Let the game load fully (so some cache is accumulated).
3. Stop `TestA` (right-click → stop or via session action button).
4. Wait 5 seconds.

**Expected**: No error appears. *(Advanced check)*: Navigate to
`%APPDATA%\neuzos\Partitions\persist\<TestA-ID>\Cache\` in File Explorer and verify the cache
folder is absent or empty.

#### Test 6-J — Login Data Not Affected

1. After Test 6-I, restart `TestA`.

**Expected**: You are taken directly to the character select or in-game view (you are still logged
in). The cache deletion did **not** log you out.

#### Test 6-K — Disabled Session Skips Cache Clear

1. Ensure Auto-Delete Cache is **off** for `TestB`.
2. Start and then stop `TestB`.

**Expected**: No cache clear happens for `TestB`. *(Advanced check)*: The cache folder for `TestB`
remains present and unchanged after the stop.

---

### 6.4 Clear All Caches on App Startup

#### Test 6-L — Enable Global Startup Cache Clear

1. Open **Settings → General** (or **Settings → Launch Settings**).
2. Find the toggle **"Clear all caches on app startup"** and turn it **on**.
3. Close the settings panel.

**Expected**: The setting is saved.

#### Test 6-M — All Caches Cleared on Next Launch

1. Start a session or two so they accumulate cache.
2. Fully close NeuzOS.
3. Reopen NeuzOS.

**Expected**:
- The app starts normally with no confirmation dialog or loading delay related to cache clearing.
- *(Advanced check)*: Navigate to `%APPDATA%\neuzos\Partitions\persist\` and verify that `Cache\`
  folders inside each session's partition are absent or empty.

#### Test 6-N — Login Data Survives Startup Cache Clear

1. While "Clear all caches on startup" is on, close and reopen NeuzOS.
2. Start any session.

**Expected**: You are still logged in. Only cache was cleared, not your session/login data.

---

### 6.5 Action Tooltips in Session Table

#### Test 6-O — Hover Each Action Icon

1. Open **Settings → Sessions**.
2. Hover over each icon in the **Actions** column for any session row:
   - Clear Cache icon
   - Clear Storage icon
   - Clone icon
   - Delete icon

**Expected**: A tooltip appears for each icon explaining what it does. No icon is unlabeled.

---

## Regression / Stability Checks

These tests are quick sanity checks to confirm that existing features still work after the new
changes.

### Test R-1 — App Starts Without Errors

1. Fully close NeuzOS.
2. Reopen it.

**Expected**: The app loads to the main window without any error dialogs or console crashes.

### Test R-2 — Sessions Still Launch

1. Start `TestA` in a layout.

**Expected**: The game loads normally in the webview.

### Test R-3 — Config Is Intact After All Tests

1. Open **Settings → Sessions**.

**Expected**: All sessions you created for testing are present (minus those you deleted
intentionally in the delete tests).

### Test R-4 — Layouts Still Work

1. Switch between layouts.

**Expected**: Layout switching works with no crashes or missing sessions.

### Test R-5 — Pop-Out Session Window

1. Right-click a layout tab or use the session context menu.
2. Choose **Pop Out** (or the equivalent option to open a session in its own window).

**Expected**: The session opens in a separate window. Closing it does not crash the main app.

---

## Known Issues (Do Not Report as New Bugs)

| Issue | Status |
|-------|--------|
| After deleting a running session, the partition folder on disk may still be present for ~15 seconds or longer while Electron finishes releasing file handles. This is a known timing issue under investigation (BUG-011). | Open — investigation in progress |
| The "Clear Storage" action in the session Actions column may not delete the partition folder (it only clears in-memory storage data). This is a secondary issue under the same BUG-011 investigation. | Open |

---

## How to Report a Bug

Please include:
1. Which test step failed (e.g., "Test 6-B, step 4")
2. What you expected to happen
3. What actually happened (screenshot or screen recording if possible)
4. Your Windows version
5. Whether you were running a fresh install or upgrading from a previous version
