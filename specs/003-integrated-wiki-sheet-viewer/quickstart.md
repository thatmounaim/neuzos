# Quickstart: Integrated Wiki & Sheet Viewer

**Manual Test Guide**
**Date**: 2026-04-20

---

## Prerequisites

```bash
# From repo root
bun install
bun dev
```

App launches in development mode. All renderer HMR is active.

---

## Test 1 — Open Navi's Guide (Happy Path)

1. Launch neuzOS main window.
2. Find the toolbar (top bar). Locate the "Open Navi's Guide" button (near the Quest toggle).
3. Click it.
4. **Expected**: A new floating window opens. Custom titlebar visible (no OS native titlebar). The window shows the Bestiary "Info" sheet. Google's navigation header and "Published by Google" footer are NOT visible — only the table grid.
5. Verify the window is on top of other OS windows (drag a browser window in front; the viewer should remain visible).
6. Click the window's close button in the custom titlebar.
7. **Expected**: Window closes. Main window unaffected.

---

## Test 2 — Duplicate Open Prevention

1. Open Navi's Guide (see Test 1).
2. With the viewer window open, click "Open Navi's Guide" again in the main toolbar.
3. **Expected**: No second window opens. The existing viewer window flashes/focuses.

---

## Test 3 — Sheet Tab Navigation

1. Open Navi's Guide.
2. Click the "Darkon 1" tab in the viewer's tab bar.
3. **Expected**: A loading indicator appears briefly; then the Darkon 1 sheet loads. Google chrome is still hidden (CSS re-injected after navigation).
4. Click "Kaillun" tab.
5. **Expected**: Kaillun sheet loads correctly.

---

## Test 4 — Always-on-Top Toggle

1. Open Navi's Guide.
2. Click the always-on-top toggle button in the custom titlebar (pin icon). Toggle to OFF.
3. Open a browser window and move it in front of the viewer.
4. **Expected**: The viewer window is now hidden behind the browser. Toggle back to ON.
5. **Expected**: Viewer is back on top.
6. Close and reopen Navi's Guide.
7. **Expected**: The toggle state (OFF) is restored from config.

---

## Test 5 — Window Position Persistence

1. Open Navi's Guide.
2. Drag the viewer window to a corner of the screen.
3. Close the viewer (custom titlebar close button).
4. Reopen via "Open Navi's Guide".
5. **Expected**: Window reopens at the corner position. Not centred.

---

## Test 6 — Window Resize Persistence

1. Open Navi's Guide. Resize it (drag bottom-right corner).
2. Close and reopen.
3. **Expected**: Window reopens at the saved size.

---

## Test 7 — Open Flyffipedia

1. Click "Open Flyffipedia" in the main toolbar.
2. **Expected**: A separate floating window opens loading `https://flyffipedia.com`.
3. **Expected**: The Navi's Guide window (if open) is unaffected.
4. Navigate within Flyffipedia by clicking internal links.
5. **Expected**: Navigation works. No new OS-native browser windows open.

---

## Test 8 — Sidebar Side Toggle

1. In the main window, locate the sidebar panel header (Quest Log panel).
2. Find the inline side-toggle button on the panel header.
3. Click it.
4. **Expected**: The Quest panel moves from left to right (or right to left).
5. Close and reopen neuzOS.
6. **Expected**: Panel appears on the last-chosen side.

---

## Test 9 — Off-Screen Recovery

1. Using DevTools console in the viewer window, call:
   ```javascript
   window.electron.ipcRenderer.send('viewer_window.set_position', -9999, -9999)
   ```
   *(Or manually edit config.json `window.viewers.navi_guide.x` to `-9999`)*
2. Close and reopen the viewer.
3. **Expected**: Window appears centered on the primary display (off-screen position rejected).

---

## Test 10 — Network Error Handling

1. Disconnect from the internet (or use DevTools → Network → Offline).
2. Open Navi's Guide.
3. **Expected**: A user-friendly error message appears inside the viewer. No raw browser error page. App does not crash.

---

## Quality Gates (run before PR)

```bash
bun run typecheck   # Must pass with 0 errors
bun run lint        # Must pass with 0 warnings
bun run format      # Auto-fix; commit result
```
