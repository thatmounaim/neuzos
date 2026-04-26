# Research: Modular & Secure Configuration Export/Import

**Feature**: `002-01-modular-config-export-import`
**Date**: 2026-04-21

---

## Decision 1 — Category Filtering Location (Renderer vs. Main)

**Decision**: Renderer filters the payload before IPC; `config.export` receives the already-filtered object.

**Rationale**: The `config.export` IPC handler currently accepts no arguments (reads `neuzosConfig` directly). Changing it to accept a `categories` parameter would require significant refactoring of the Main-side handler. Renderer-side filtering is simpler, keeps Main dumb about categories, and avoids a new IPC contract change for the export channel. The renderer already has access to `neuzosConfig` via the config-changed event, so it can build the filtered payload itself.

**Alternatives considered**:
- Pass `categories: string[]` to `config.export` → rejected (unneeded Main complexity)
- A new `config.export_modular` IPC channel → rejected (violates "extend don't replace")

---

## Decision 2 — Conflict Handling for Object-Based Categories (UI Layout, General Settings)

**Decision**: Object-based categories (UI Layout, General Settings) are always Full Replace. No item-level merge is offered. The import preview panel explains this.

**Rationale**: These categories are structured objects with no stable IDs. Key-level diffing would require deep-traversal equality checks, produce confusing UI ("key `window.main.width` will be overwritten"), and provide little real-world value. A flat "overwrite the whole thing" is safe, predictable, and easy to explain.

**Alternatives considered**:
- Key-level diff + merge → rejected (complex to implement, confusing to explain)
- Omit these categories entirely from import → rejected (limits feature value)

---

## Decision 3 — Session-ID Portability for UI Layout Import

**Decision**: When importing `sessionZoomLevels`, entries whose session IDs do not exist in the current local config are skipped and a warning is shown in the preview. They are not imported.

**Rationale**: Importing zoom levels for sessions that do not exist locally is useless and would silently grow `sessionZoomLevels` with dead entries. Skipping with a warning is consistent with the existing orphaned-session-ID behavior in `config.import` for session actions.

**Alternatives considered**:
- Import all entries including unmatched IDs → rejected (dead data accumulation)
- Reject the entire import if any IDs are unmatched → rejected (too strict, breaks portability for partial configs)

---

## Decision 4 — Shared Category Checklist for Export and Import

**Decision**: One checklist controls both export and import. A short note in the UI explains this.

**Rationale**: Users who export a set of categories typically import the same set. Duplicate controls would confuse users and double the UI surface without benefit. The preview step (after import file is selected) already provides category-level feedback about what the file actually contains.

**Alternatives considered**:
- Separate export/import category checklists → rejected (unnecessary UI duplication)
- Contextual (show checklist only when user clicks Export or Import) → rejected (less discoverable)

---

## Decision 5 — Legacy v1 File Handling

**Decision**: A `schemaVersion: 1` file is treated as implicitly covering "Keybinds + Session Actions" only. Other categories remain unavailable and are shown as "Not found in file" in the preview.

**Rationale**: v1 files contain only `sessionActions`, `keyBinds`, `keyBindProfiles`, `activeKeyBindProfileId`. Treating them as "legacy keybind backup" is the most accurate interpretation. No new validation errors are thrown; the behavior is informational.

**Alternatives considered**:
- Reject v1 files → rejected (breaks existing backups)
- Treat v1 as "all categories" → rejected (inaccurate; v1 has no UI Layout data)

---

## Decision 6 — Sanitization Architecture

**Decision**: A `sanitizeConfigForExport(payload)` utility function runs on the renderer side before the payload is serialised for `config.export`. It strips `partitionOverwrite`, replaces local path strings, and sets `_sanitized: true` if anything was removed.

**Rationale**: Since the renderer now builds the filtered payload (Decision 1), it is the natural place for sanitization. Main would need to inspect every string value recursively if done there. Doing it in the renderer means the sanitized payload is what gets written to disk — no unsanitized data ever leaves the renderer.

**Regex used**: `/^[A-Za-z]:\\|^\/home\/|^\/Users\//` — matches only bare path roots, not URLs.

**Alternatives considered**:
- Sanitize in Main IPC handler → rejected (Main should be dumb about categories/structure)
- Server-side sanitization (not applicable)

---

## Decision 7 — Schema Version Bump

**Decision**: `schemaVersion` increments to `2`. The `categories` field is added to the export payload. v1 import remains supported via the existing validation path.

**Rationale**: v2 introduces new optional fields (`categories`, `window`, `fullscreen`, `sessionZoomLevels`, `autoSaveSettings`, `defaultLaunchMode`, `userAgent`, `titleBarButtons`). Bumping the version signals to older versions that this file may contain fields they cannot handle, without blocking import. The `schemaVersion > 1` warning path in `config.import` already handles this gracefully.

---

## Decision 8 — Import Apply Path (new categories)

**Decision**: Extend `config.apply_import` to handle the new categories. Replace mode for object-based categories is a direct assignment. Merge mode for list-based categories follows the existing ID-based deduplication. A `categories` parameter is added to `ConfigApplyImportArgs`.

**Rationale**: The existing apply handler already has correct replace/merge logic for list-based categories. Extending it with `categories` filtering avoids a new IPC channel and keeps the apply path centralised.

---

## Existing Infrastructure Summary

| Capability | Status | Location |
|---|---|---|
| Native file dialogs (save/open) | ✅ Exists | `config.export` / `config.import` handlers |
| Import validation (JSON schema, 5 MB cap) | ✅ Exists | `config.import` handler |
| Import preview UI (counts) | ✅ Exists | `BackupSettings.svelte` |
| Replace/merge apply logic | ✅ Exists | `config.apply_import` |
| Orphaned session-ID warning | ✅ Exists | `config.import` |
| Schema version field | ✅ Exists | `ConfigExportPayload.schemaVersion` |
| Category selection | ❌ Missing | New in v2 |
| UI Layout / General Settings in export | ❌ Missing | New in v2 |
| Sanitization layer | ❌ Missing | New in v2 |
| Per-category conflict counts in preview | ❌ Missing | New in v2 |
| Session-ID skip on UI Layout import | ❌ Missing | New in v2 |
