# Quickstart: Unified Action & Input Mapper

**Branch**: `004-unified-action-input-mapper` | **Date**: 2026-04-20

This guide walks through the end-to-end development workflow and the primary manual test for the feature.

---

## Prerequisites

- Node.js 22+ installed
- Bun installed (`bun --version` should print a version number)
- On the correct branch: `git branch --show-current` → `004-unified-action-input-mapper`

---

## Dev Server

```powershell
# From project root
bun run dev
```

This starts the Electron app in development mode via electron-vite with HMR. The main window opens automatically.

---

## Primary Manual Test: Bind F9 to Toggle Quest Log

This test exercises the full stack: Record mode → config persistence → globalShortcut dispatch → renderer UIAction handler.

### Step 1 — Open Settings

Click the **Settings** gear icon in the MainBar, or use the existing global shortcut if configured.

### Step 2 — Navigate to Keybinds tab

In Settings, click the **Keybinds** tab in the left sidebar.

### Step 3 — Find the UI Actions section

Scroll to the **Interface** category group (below the existing global event keybinds). You should see:

| Action | Current Binding | |
|--------|----------------|---|
| Toggle Quest Log | *(none)* | Click to Bind |

### Step 4 — Enter Record mode

Click **Click to Bind** on the "Toggle Quest Log" row. A Popover opens with a pulsing "Listening…" indicator.

### Step 5 — Press F9

Physical key press. The Popover should immediately capture it and show `"f9"` in the field. Click **Confirm**.

### Step 6 — Verify persistence

The binding row should now show `f9`. Close Settings. Open `%APPDATA%/neuzos_config/config.json` (or `~/Library/Application Support/neuzos_config/config.json` on macOS) and confirm the active profile's `keybinds` array contains an entry like:

```json
{ "key": "f9", "event": "ui.toggle_quest_log" }
```

appears in the active profile's `keybinds` array.

### Step 7 — Test the shortcut fires

With the main neuzOS window focused (or with a game session webview focused), press **F9**. The Quest Log panel must open.  
Press **F9** again — it must close.

### Step 8 — Verify conflict detection

While still in Keybinds → Interface, attempt to bind another action (or any existing bind) to `f9`. The row should show a red inline warning: *"Conflicts with: Toggle Quest Log"* and the Confirm/Save button should be disabled.

### Step 9 — Test Record mode cancel

Open Record mode on any row, then press **Escape**. The Popover should close and the binding field should revert to its previous value (unchanged).

---

## Mouse Button Capture Test (FR-006)

1. Open Record mode for "Toggle Quest Log" (remove the F9 binding first).
2. Press **Mouse 4** (the forward thumb button on a standard mouse).
3. The field should show `"Mouse4"`.
4. Confirm. The Quest Log must toggle when Mouse 4 is pressed **while the neuzOS window has focus**.
5. The row should display a hint: *"Fires only when neuzOS window has focus"* (because mouse bindings are renderer-only).

---

## Gamepad Capture Test (FR-010, P3)

1. Connect a standard controller.
2. Open Record mode.
3. Press the **A button** (or equivalent button 0).
4. Field should show `"Gamepad0:Button0"`.
5. Without a controller: open Record mode — a *"No gamepad detected"* hint should be visible and keyboard/mouse capture should still work normally.

---

## Build for Release

```powershell
bun run build:win   # Windows NSIS installer
bun run build:mac   # macOS DMG (requires macOS host)
bun run build:linux # Linux AppImage
```

Artefacts land in `dist/`.
