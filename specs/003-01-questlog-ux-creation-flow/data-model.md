# Data Model: Quest Log UX & Creation Flow Enhancement

**Phase**: 1 — Design
**Date**: 2026-04-22

---

## Entities

### CharacterState (existing — extended)

Persisted to `localStorage` under the key `questPanel`. This feature adds a persisted icon field so a Quest Log entry keeps its chosen icon after restart.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID-like, generated at creation |
| `name` | `string` | Display name — pre-filled from session label if session selected |
| `icon` | `NeuzIcon \| null` | Visual icon shown in the tab row and persisted across restart |
| `flyffClass` | `FlyffClassName \| null` | Unchanged; still selected manually via class buttons |
| `level` | `number \| null` | Set post-creation |
| `completedQuests` | `string[]` | Quest tracking state |
| `hiddenQuests` | `string[]` | Quest tracking state |
| `expandedQuestlines` | `string[]` | UI state |

**Schema migration note**: Existing saved Quest Log entries without `icon` should continue to load. When `icon` is absent, the UI may fall back to the existing class-based icon until the entry is edited or recreated.

---

### NeuzIcon (existing — used for pre-fill and persisted character icon)

| Field | Type | Notes |
|-------|------|-------|
| `slug` | `string` | Icon file path without extension (e.g. `skill/acrobat_aimed_shot`) |
| `filter` | `IconFilter \| null \| undefined` | Optional CSS filter for tinting |

**Note**: The icon picker introduced by this feature provides a `NeuzIcon.slug` that is stored on the character entry and reloaded after restart. The existing `flyffClass` remains for quest-filtering and other class-based logic.

---

### NeuzSession (existing — read-only source for pre-fill)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Session identifier |
| `label` | `string` | Used to pre-fill creation form name |
| `icon` | `NeuzIcon` | Used to pre-fill creation form icon |
| `floatable` | `boolean \| undefined` | Not used by this feature |
| `srcOverwrite` | `string \| undefined` | Not used by this feature |
| `partitionOverwrite` | `string \| undefined` | Not used by this feature |

Sessions are read from `getContext<MainWindowState>('mainWindowState').sessions` — reactive, no IPC needed.

---

## State Additions (local `$state` in QuestPanel.svelte — not persisted)

| Variable | Type | Purpose |
|----------|------|---------|
| `sessionComboOpen` | `boolean` | Controls session combobox open/close |
| `iconComboOpen` | `boolean` | Controls icon picker open/close |
| `newCharIcon` | `string` | Tracks selected icon slug during creation and is written into the persisted `CharacterState.icon` field on confirm |

These replace the existing `newCharClass` partial state in the creation form path. `newCharClass` may be retained if class selection is still required after icon selection, or deprecated if the icon combobox fully replaces it.

---

## Validation Rules

- `name` field: must be non-empty (trim check) before `submitNewCharacter()` — existing rule, unchanged.
- `flyffClass` field: currently required. The spec does not change this constraint; the class buttons remain.
- Icon slug: must be a non-empty string from `actionIcons[]`; enforced implicitly by the combobox (only valid items are selectable) and persisted as `CharacterState.icon`.

---

## State Transitions

```
Panel idle
  └─[+ button]──► Creation form open
                    │
                    ├─[select session]──► name + icon auto-filled (editable)
                    │
                    ├─[pick icon manually]──► icon state updated
                    │
                    ├─[confirm + valid]──► addCharacter(name, flyffClass, icon) called → panel idle
                    │
                    └─[cancel / Escape]──► panel idle (state reset)
```
