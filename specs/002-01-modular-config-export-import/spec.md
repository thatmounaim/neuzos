# Feature Specification: Modular & Secure Configuration Export/Import System

**Parent Branch**: `002-core-qol-features`
**Spec Directory**: `specs/002-01-modular-config-export-import`
**Created**: 2026-04-21
**Status**: Draft

---

## Existing Baseline (Must Read Before Planning)

> **A basic export/import system already exists in `BackupSettings.svelte` and `src/main/index.ts`.**
>
> Current capabilities:
> - `config.export` IPC — opens a native Save dialog and writes `sessionActions`, `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId` to a versioned JSON file.
> - `config.import` IPC — opens a native Open dialog, validates the JSON schema, and returns a preview result with counts.
> - `config.apply_import` IPC — applies the import payload in `replace` or `merge` mode (merge adds only entries with IDs not already present).
> - Schema version field (`schemaVersion: 1`) to detect future incompatibility.
> - Orphaned session-ID warning (when imported actions reference sessions not in the local config).
> - File size limit (5 MB) to prevent memory issues.
> - Basic preview UI in `BackupSettings.svelte` with counters for actions, keybinds, profiles.
>
> **What does NOT yet exist (the scope of this feature):**
> - **Modular category selection**: users cannot choose which categories (e.g. only keybinds, only UI layout) to export or import.
> - **UI Layout export/import**: window sizes, zoom levels, sidebar positions, and other display preferences cannot be exported at all.
> - **Quest Log template export/import**: questline templates are not part of the current export.
> - **Security sanitization**: there is no sanitization layer to strip local filesystem paths or session-specific identifiers before export.
> - **Import conflict preview**: the preview shows counts but does not list individual conflicts or which keys would be overwritten.
>
> This spec defines only the delta on top of the existing system.

---

## Storage Workflow Clarification

**Current write path:**

1. The renderer calls `buildExportPayload(currentConfig, selectedCategories)` to assemble a v2 payload from the current local config snapshot, then runs `sanitizeConfigForExport(payload, selectedCategories)` before passing the result to `config.export`.
2. `config.export` reads from the already-filtered payload in Main → writes it to disk via `fs.promises.writeFile`.
3. `config.apply_import` mutates `neuzosConfig` in Main → calls `saveConfig(neuzosConfig)` to write `config.json` to disk → sends `event.config_changed` to the renderer. The renderer's `App.svelte` handler then updates `mainWindowState.config.*`, triggering Svelte reactivity.

**Implication:** Import changes are written directly to `config.json` on disk immediately after the user confirms. There is no intermediate "pending in RAM" state that requires a manual Save click. A full app reload (via the "Reload" button in the main toolbar) applies the changes to all open sessions.

## Clarifications

### Session 2026-04-21

- Q: Which side filters export categories before `config.export`? → A: The renderer filters the payload and sends only the selected categories.
- Q: How are object-based categories handled for import conflicts? → A: UI Layout and General Settings are full replace categories; the window explains this to the user.
- Q: What happens to session-ID-based values that do not match a local session? → A: They are skipped on import and shown as a warning/info, not imported.
- Q: Should the export/import selection be shared? → A: Yes, one checklist controls both export and import.
- Q: How should legacy v1 files behave with the new category UI? → A: Treat them as Keybinds + Session Actions only; other categories stay unavailable.
- Q: What is the default checklist state? → A: All exportable categories start checked by default; Quest Log Templates is shown as a disabled placeholder in v2.
- Q: Where do the category counts come from? → A: They are derived from the current local config snapshot in the renderer.

---

## User Scenarios & Testing

### User Story 1 — Modular Category Selection for Export & Import (Priority: P1)

A community manager wants to share a set of keybind profiles with guild members. They do not want to share their personal UI layout (window sizes, zoom levels) or session-specific data. They need to select only the keybinds category before exporting.

**Independent Test**: Open Settings → Backup. Check only "Keybinds & Hotkeys". Click Export. Open the resulting JSON. Confirm it contains `keyBinds` and `keyBindProfiles` but does not contain `window`, `sessionZoomLevels`, or `questLog` data.

**Acceptance Scenarios**:

1. **Given** the Backup settings page, **When** the user opens it, **Then** a list of export/import categories is shown as checkboxes, each with a label and a brief description of what it includes, plus a short explanation that the same selection controls both export and import.
2. **Given** the category selection, **When** the user checks "Keybinds & Hotkeys" only and clicks Export, **Then** the resulting JSON file contains only `keyBinds`, `keyBindProfiles`, and `activeKeyBindProfileId`. All other top-level keys are absent.
3. **Given** the category selection, **When** the user checks "UI Layout" only and clicks Export, **Then** the resulting JSON file contains only `window` config, `sessionZoomLevels`, and sidebar/positioning preferences (if present). No keybinds or session actions are included.
4. **Given** an import file that contains only keybind data, **When** the user imports it with "UI Layout" checked, **Then** the import preview warns the user that the selected category is not present in the file, and the apply button for that category is disabled.
5. **Given** no category checked, **When** the user attempts to click Export or Apply Import, **Then** both buttons are disabled with a tooltip explaining at least one category must be selected.
6. **Given** the Backup settings page opens, **When** the user sees the checklist, **Then** all exportable categories start checked by default and Quest Log Templates appears as a disabled placeholder row.

### Available Export/Import Categories

| Category | Config Keys Covered |
|---|---|
| Keybinds & Hotkeys | `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId` |
| Session Actions | `sessionActions` |
| UI Layout | `window` (sizes, zoom), `sessionZoomLevels`, `fullscreen` |
| General Settings | `autoSaveSettings`, `defaultLaunchMode`, `userAgent`, `titleBarButtons` |
| Quest Log Templates | reserved placeholder; shown disabled in v2 and omitted from payload until a separate feature enables it |

---

### User Story 2 — Security Sanitization (Export Blacklist) (Priority: P1)

A user wants to share their profile on the NeuzOS Discord. They are concerned that the export might accidentally include their Windows username (e.g. from `C:/Users/John/AppData/...`) or a session partition ID that could be used to identify them.

**Independent Test**: Open Settings → Backup. Export all categories. Open the JSON in a text editor. Confirm: no string matches `C:\\|/home/|/Users/` (local path pattern), no field named `partition`, `partitionOverwrite`, or `srcOverwrite` with a local path is present in the export.

**Acceptance Scenarios**:

1. **Given** a config where `session.srcOverwrite` is set to a local file path, **When** the user exports that session's data, **Then** the `srcOverwrite` field is stripped from every session entry in the export.
2. **Given** a config containing any string value matching a local filesystem path pattern (`C:\`, `/home/`, `/Users/`), **When** the export is prepared, **Then** those values are replaced with an empty string and the export file contains a `_sanitized: true` flag at the top level, and the Export/Import window shows a brief explanation that some values were sanitized for safety.
3. **Given** a config where a session has a `partitionOverwrite`, **When** the export runs, **Then** the `partitionOverwrite` field is stripped from all session entries — session partition state is machine-local and must not be shared.
4. **Given** any export, **Then** the following fields are NEVER present in the output regardless of category selection: `partitionOverwrite`, any value containing a Windows drive letter path (`X:\`), any value containing a Unix home path (`/home/`, `/Users/`).

---

### User Story 3 — Import Preview with Conflict Details (Priority: P2)

A user imports a shared community profile. Before confirming, they want to see exactly which of their existing keybinds would be overwritten, so they can decide between "replace" and "merge" modes.

**Independent Test**: Set up 3 keybinds locally. Import a file that has 2 of the same keys and 1 new key. In the preview, confirm: the 2 conflicting keys are listed under "Conflicts (will be overwritten in Replace mode)", and the 1 new key is listed under "New entries (added in both modes)".

**Acceptance Scenarios**:

1. **Given** a valid import file, **When** the user selects it, **Then** the preview shows per-category breakdowns for list-based categories: new items (safe to add), and conflicting items (already exist, will be overwritten in Replace mode).
2. **Given** an import file with 5 keybinds where 2 conflict with local keybinds, **When** the user views the preview, **Then** a summary reads: "2 conflicts · 3 new entries" for the Keybinds category.
3. **Given** the import preview, **When** the user selects "Merge" mode, **Then** a note clarifies that only the 3 new entries will be added and the 2 conflicting ones will be skipped.
4. **Given** the import preview, **When** the user selects "Replace" mode, **Then** a warning clarifies that all 5 entries will replace existing keybinds, including the 2 conflicting ones.
5. **Given** the import file contains entries for a category the user has not selected, **Then** those entries are excluded from the preview entirely.
6. **Given** a selected category contains session IDs that do not exist locally, **When** the user imports the file, **Then** those entries are skipped, the preview shows a warning or info message, and the unmatched entries are not written.

### User Story 4 — Object-Based Categories Use Full Replace Semantics (Priority: P2)

A user exports UI Layout and General Settings so they can move their setup to another machine. Those categories are structured as objects, not lists, so merge-by-item would be unclear and risky.

**Independent Test**: Export only UI Layout. Import it into another install that already has different window and sidebar values. Confirm the preview explains that the category will be replaced as a whole, not merged key-by-key.

**Acceptance Scenarios**:

1. **Given** UI Layout or General Settings is selected, **When** the user imports the file, **Then** the preview explains that the category uses full replace semantics.
2. **Given** a UI Layout import that contains session-specific IDs that are not present locally, **When** the user applies the import, **Then** only locally matchable values are kept and unmatched session-ID entries are skipped with a warning.
3. **Given** a full-replace category in Replace mode, **When** the user confirms the import, **Then** the existing category data is overwritten as a whole rather than merged per key.

---

### Edge Cases

- **Category mismatch**: A file exported with only Keybinds is then imported with UI Layout selected. The system must warn "No UI Layout data found in this file" per-category, not fail silently.
- **Partial sanitization**: If a config value partially matches a path pattern (e.g., `https://example.com/home/user/profile`), it must NOT be stripped — only bare filesystem paths trigger sanitization.
- **Empty categories**: Exporting a category with zero entries (e.g., no Session Actions) produces a valid JSON with an empty array, not an omitted key.
- **Version skew**: If the import file has `schemaVersion > 1`, each category is imported on a best-effort basis and warnings are shown per-category, not as a single global block.
- **Legacy import**: If the import file has `schemaVersion = 1`, only Keybinds & Hotkeys and Session Actions are considered present; all other categories remain unavailable and are shown as not found.
- **Large conflict list**: If there are more than 20 conflicts in a category, the preview shows the first 20 and a "+N more" label. The full list can be scrolled inside an expandable panel.

---

## Functional Requirements

### FR-1: Category Selection UI

| ID | Requirement |
|---|---|
| FR-1.1 | The Backup tab renders one shared checklist of export/import categories before the Export and Import buttons. |
| FR-1.2 | Each category has a label, a one-line description, and an item count derived from the current local config snapshot (e.g. "3 keybinds, 2 profiles"). |
| FR-1.3 | At least one category must be selected to enable the Export button. |
| FR-1.4 | Selecting categories for Import filters the preview to show only data from those categories. |
| FR-1.5 | The panel includes a short explanatory note stating that the same category selection controls both export and import, and that object-based categories use full replace semantics. |
| FR-1.6 | All exportable categories start checked by default when the Backup tab opens; Quest Log Templates is shown as a disabled placeholder row in v2. |

### FR-2: Sanitization

| ID | Requirement |
|---|---|
| FR-2.1 | A `sanitizeConfigForExport(payload, categories)` utility function runs on the payload before the file is written. |
| FR-2.2 | Fields `partitionOverwrite` and `srcOverwrite` (when matching a local path pattern) are removed from all session entries. |
| FR-2.3 | Any string value matching the regex `^[A-Za-z]:\\|^/home/|^/Users/` is replaced with `""`. |
| FR-2.4 | If any value was sanitized, the exported JSON includes `"_sanitized": true` at the top level. |
| FR-2.5 | Sanitization is applied silently; the user sees a small notice "Some values were sanitized for safety" if `_sanitized` is true. |

### FR-3: Conflict-Aware Import Preview

| ID | Requirement |
|---|---|
| FR-3.1 | After loading an import file, the preview shows per-category counts: `new`, `conflict`, `total` for list-based categories. |
| FR-3.2 | In Replace mode, conflicting items in list-based categories are shown with a warning colour. In Merge mode, they are greyed out with a "will be skipped" label. |
| FR-3.3 | If a selected category is not present in the import file, the category row shows "Not found in file" and is disabled. |
| FR-3.4 | The Apply button is labelled with the count of items that will actually be written (e.g., "Apply — 3 items"). |
| FR-3.5 | UI Layout and General Settings use full replace semantics; the preview states that these categories are overwritten as a whole and do not support item-level merge. |
| FR-3.6 | Imported session-scoped entries whose session IDs do not exist locally are skipped, counted as unmatched, and surfaced as a warning or info message. |

### FR-4: Schema Extension

| ID | Requirement |
|---|---|
| FR-4.1 | The export JSON gains a `categories` array listing which categories are present (e.g., `["keybinds", "ui-layout"]`). |
| FR-4.2 | The `schemaVersion` field increments to `2` to differentiate from the current v1 format. Importing v1 files remains supported. |

---

## Non-Functional Requirements

- **Security**: No local filesystem paths, partition IDs, or user-specific tokens may appear in exported files.
- **Backwards compatibility**: v1 export files must still be importable. The system treats all top-level keys in a v1 file as belonging to the "Keybinds & Session Actions" category.
- **Performance**: Sanitization and conflict detection must complete in < 200 ms for a config file up to 5 MB.
- **UI responsiveness**: The import preview renders within one render cycle after the file is selected (no additional loading spinners beyond the initial file dialog).

---

## Success Criteria

- A user can export only their keybind profiles and import them on a different machine, with no window size or session-specific data leaking into the file.
- A user receives a clear, per-category conflict summary before confirming an import in Replace mode.
- Any export file is free of local filesystem paths, verified by checking the exported JSON for the regex `^[A-Za-z]:\\|^/home/|^/Users/`.
- Importing a v1 file on the updated app works without errors.

---

## Assumptions

- The Quest Log export category is listed in the UI but implemented as a stub (empty array) in v2, with full implementation deferred to a separate feature.
- "General Settings" category exports do not include `sessions` or `layouts` arrays, as those are machine-specific.
- The existing `schemaVersion: 1` format is treated as implicitly covering Keybinds + Session Actions only.
- The sanitization regex targets only bare path roots, not URL paths, to avoid stripping legitimate web URLs.
- The same category checklist is used for both export and import actions.
