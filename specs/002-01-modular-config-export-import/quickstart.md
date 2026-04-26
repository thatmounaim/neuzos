# Quickstart: Manual Test Guide — Modular Config Export/Import

**Feature**: `002-01-modular-config-export-import`

---

## Prerequisites

- App running (`bun dev`)
- At least one session configured with a custom keybind and a non-default zoom level
- Settings window open (accessible via the toolbar)

---

## Test 1 — Category-Filtered Export

1. Open Settings → Backup tab.
2. Check **only** "Keybinds & Hotkeys". Leave others unchecked.
3. Click **Export Config**.
4. Save as `test-keybinds-only.json`.
5. Open the file in a text editor.
6. **Expected**: File contains `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId`. Does NOT contain `window`, `sessionZoomLevels`, `fullscreen`, `autoSaveSettings`, etc.
7. The `categories` field should be `["keybinds"]`. `schemaVersion` should be `2`.

---

## Test 2 — UI Layout Export

1. In Backup tab, check **only** "UI Layout". Leave others unchecked.
2. Click **Export Config**.
3. Save as `test-ui-layout.json`.
4. Open in text editor.
5. **Expected**: File contains `window`, `sessionZoomLevels`, `fullscreen` (if present). No `keyBinds` or `sessionActions`.
6. `categories` should be `["ui-layout"]`.

---

## Test 3 — Sanitization

1. If a session has a local `srcOverwrite` path (e.g. `C:\Users\John\game.html`), export any category.
2. Open the exported file.
3. **Expected**: No `partitionOverwrite` fields visible. Any `C:\` value should be `""`. File should contain `"_sanitized": true`.
4. A toast notice "Some values were sanitized for safety" should appear after export.

---

## Test 4 — Import with Category Preview

1. Export a file with "Keybinds + Session Actions" selected.
2. Clear all keybinds locally (or use a fresh profile).
3. In Backup tab, check "Keybinds & Hotkeys" + "Session Actions".
4. Click **Import Config** and select the file.
5. **Expected preview**:
   - Keybinds row: shows `X new · Y conflicts`
   - Session Actions row: shows counts
   - UI Layout row: shows "Not found in file" (disabled)
   - General Settings row: shows "Not found in file" (disabled)

---

## Test 5 — Import v1 Legacy File

1. Export a config with the **old** app version (schemaVersion 1), or manually create a valid v1 JSON:
   ```json
   {
     "schemaVersion": 1,
     "exportedAt": "2026-01-01T00:00:00Z",
     "sessionActions": [],
     "keyBinds": [],
     "keyBindProfiles": [],
     "activeKeyBindProfileId": null
   }
   ```
2. Import this file.
3. **Expected**: Preview shows keybinds and session actions categories as present. UI Layout + General Settings show "Not found in file". No errors thrown.

---

## Test 6 — UI Layout Import with Orphaned Session IDs

1. Export UI Layout from Machine A (which has sessions A1, A2).
2. Import the file on a machine with only session B1.
3. **Expected**: Preview shows a warning "X session zoom levels could not be matched to local sessions and will be skipped". After applying, `sessionZoomLevels` does not contain keys A1 or A2.

---

## Test 7 — No Category Selected

1. Uncheck all categories in Backup tab.
2. **Expected**: Export button is disabled. Import button is disabled (or shows tooltip "Select at least one category").

---

## Test 8 — Full Replace for Object Categories

1. Set window sizes and zoom levels locally.
2. Export "UI Layout".
3. Manually edit the exported JSON to change zoom values.
4. Import the edited file with "UI Layout" checked.
5. Confirm the preview says "Will be replaced in full".
6. Apply (Replace mode).
7. **Expected**: Local config reflects the edited zoom values. No merge — the entire `sessionZoomLevels` object was replaced.
