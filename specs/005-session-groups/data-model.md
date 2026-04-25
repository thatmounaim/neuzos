# Data Model: Session Groups

**Feature**: `005-session-groups`  
**Date**: 2026-04-25

## New Type: `NeuzSessionGroup`

**File**: `src/renderer/src/lib/types.ts`

```ts
export type NeuzSessionGroup = {
  id: string;        // UUID generated at creation time, never shown to user
  label: string;     // User-visible name, editable inline; non-empty
  sessionIds: string[]; // Ordered list of session ids belonging to this group
}
```

### Validation rules

- `id`: must be a non-empty string; generated as `crypto.randomUUID()` at creation time.
- `label`: must not be empty after trim; if cleared during edit, the last valid label is restored (not saved).
- `sessionIds`: ordered array; may be empty (empty group is valid and persists); no duplicates within a group; each id must belong to at most one group (enforced by the assignment logic — removing from the previous group before adding to the new one).

### State transitions

```
[ungrouped] --assign to group--> [in group G]
[in group G] --unassign----------> [ungrouped]
[in group G] --assign to group H-> [in group H]   (implicitly removed from G first)
```

Group itself:
```
[non-existent] --Add Group button--> [empty group]
[empty group]  --delete button-----> [removed]
[group with sessions] --delete----> [removed; sessions become ungrouped]
```

---

## Modified Type: `NeuzConfig`

**File**: `src/renderer/src/lib/types.ts`

Add one optional field:

```ts
sessionGroups?: NeuzSessionGroup[];
```

**Default when absent**: treated as `[]` everywhere (backward compatible — existing configs without this field work without migration).

**Position in file**: after `sessionActions: SessionActions[];` and before `sessionZoomLevels`.

---

## Modified Type: `ConfigExportPayloadV2`

**File**: `src/renderer/src/lib/types.ts`

Add one optional field:

```ts
sessionGroups?: NeuzSessionGroup[];
```

**Export category**: `ui-layout`  
**Present when**: `ui-layout` category is selected for export.  
**Absent in older exports**: treated as `[]` during import — no migration needed.

---

## Modified Local Type in Main Process: `ConfigExportPayloadV2`

**File**: `src/main/index.ts` (local inline type, not imported from renderer types)

Add one optional field to the local type definition:

```ts
sessionGroups?: any[];
```

---

## `defaultNeuzosConfig` in Main Process

**File**: `src/main/index.ts`

No change needed. `sessionGroups` is optional on `NeuzConfig` and defaults to `[]` via the spread-merge in `loadConfig`. The `neuzosConfig = {...defaultNeuzosConfig, ...neuzosConfig}` pattern already handles new optional fields safely since `undefined` on the loaded config will fall back to the default config's value. However, since `defaultNeuzosConfig` does not define `sessionGroups`, the loaded value takes priority — configs without `sessionGroups` will have `neuzosConfig.sessionGroups === undefined` after load. All consumers must use `neuzosConfig.sessionGroups ?? []`.

---

## Derived Concept: Ungrouped Sessions

Not stored. Derived at render time:

```ts
const groupedSessionIds = new Set(
  (neuzosConfig.sessionGroups ?? []).flatMap(g => g.sessionIds)
);
const ungroupedSessions = neuzosConfig.sessions.filter(s => !groupedSessionIds.has(s.id));
```

---

## Config JSON Shape Example

```json
{
  "sessionGroups": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "label": "Battle Pass",
      "sessionIds": ["1700000001", "1700000002", "1700000003"]
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "label": "Farming",
      "sessionIds": []
    }
  ]
}
```
