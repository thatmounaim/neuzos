# Quickstart: Session Groups

**Feature**: `005-session-groups`  
**Date**: 2026-04-25

## Dev environment setup

No new dependencies. The feature uses only existing packages already in `package.json`.

```powershell
# Install (if not already done)
bun install

# Start dev server
bun run dev
```

---

## Manual smoke-test checklist

Run these checks in dev mode and again on a release build (`bun run build`).

### 1. Create a group (FR-005, FR-001)
1. Open Settings > Sessions.
2. Click **Add Group** in the session card footer.
3. Verify a new collapsible section appears at the **end** of the group list with a default name.
4. Click the group name — verify it becomes an `<input>`.
5. Type a new name and press **Enter** — verify the name saves.
6. Click the group name again, clear it, and blur — verify the **last valid name is restored** (not saved as empty).

### 2. Assign and unassign sessions (FR-004, FR-010, FR-011)
1. On a session row, open the group dropdown.
2. Select a group — verify the session moves into that group's collapsible section.
3. Assign the same session to a **second** group — verify it disappears from the first group.
4. Open the dropdown and select **Unassign** — verify the session moves to the Ungrouped section.

### 3. Reorder groups (FR-009)
1. Create two groups A and B.
2. Use the **down** arrow on A — verify B is now above A.
3. Close and reopen Settings — verify the order is persisted.
4. Verify the **up** button on the topmost group is disabled and the **down** button on the bottommost group is disabled.

### 4. Delete a group (FR-003)
1. Assign a session to a group.
2. Click the group's **delete** button.
3. Verify the group is gone and the session appears in Ungrouped.

### 5. Empty group persists (FR-012)
1. Assign a session to a group.
2. Unassign that session.
3. Verify the group section is still visible (empty).
4. Delete the session entirely — verify the group is still visible.

### 6. Session Launcher groups (FR-006)
1. Assign sessions to groups in Settings.
2. Open the Session Launcher.
3. Verify sessions appear inside collapsible sections labeled with their group name.
4. Verify the **Ungrouped** section appears only if at least one session is unassigned.
5. Click a group header — verify the section collapses and expands with no visible lag.
6. Leave the Session Launcher open, change a group in Settings, save, and verify the launcher updates without reopening the window.

### 7. Export and import — replace mode (FR-007)
1. Create groups with assigned sessions.
2. Export config with **UI Layout** selected.
3. Delete all groups.
4. Import the file, select **UI Layout**, mode **Replace**.
5. Verify all groups and session assignments are restored.

### 8. Export and import — merge mode (FR-007)
1. Create group A (with sessions) and export.
2. Create group B locally.
3. Import the file with mode **Merge**.
4. Verify group A is updated from the import and group B is still present.

### 9. Backward compatibility
1. Manually edit `<userData>/neuzos_config/config.json` and remove the `sessionGroups` key.
2. Restart the app — verify it loads without error and Sessions tab shows an empty Ungrouped section.

### 10. Filesystem flatness
1. Create a group with a distinctive name.
2. Verify the app does not create any new partition folder or path that uses that group name.

---

## Key files reference

| File | Change |
|------|--------|
| [src/renderer/src/lib/types.ts](../../../src/renderer/src/lib/types.ts) | `NeuzSessionGroup` type, `NeuzConfig.sessionGroups`, `ConfigExportPayloadV2.sessionGroups` |
| [src/renderer/src/lib/configExport.ts](../../../src/renderer/src/lib/configExport.ts) | Export, infer, preview for `ui-layout` |
| [src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte](../../../src/renderer/src/components/SettingsWindow/Tabs/SessionSettings.svelte) | Group sections, inline edit, reorder, delete, group dropdown, Add Group button |
| [src/renderer/src/SessionLauncher.svelte](../../../src/renderer/src/SessionLauncher.svelte) | Collapsible group sections |
| [src/main/index.ts](../../../src/main/index.ts) | `session_launcher.get_groups` IPC, `applyUiLayout`, `inferPayloadCategories`, `config.import` passthrough |
