# Contract: Type Changes

**Feature**: `005-session-groups`  
**Files affected**: `src/renderer/src/lib/types.ts`, `src/main/index.ts` (local type)

---

## 1. New export — `NeuzSessionGroup`

**File**: `src/renderer/src/lib/types.ts`  
**Change type**: Addition (non-breaking)

```ts
export type NeuzSessionGroup = {
  id: string;
  label: string;
  sessionIds: string[];
}
```

---

## 2. `NeuzConfig` — new optional field

**File**: `src/renderer/src/lib/types.ts`  
**Change type**: Additive — optional field, backward compatible

```diff
  sessionActions: SessionActions[];
+ sessionGroups?: NeuzSessionGroup[];
  sessionZoomLevels?: { [sessionId: string]: number };
```

---

## 3. `ConfigExportPayloadV2` (renderer) — new optional field

**File**: `src/renderer/src/lib/types.ts`  
**Change type**: Additive — optional field, backward compatible

```diff
  questLogTemplates?: never[];
+ sessionGroups?: NeuzSessionGroup[];
}
```

---

## 4. `ConfigExportPayloadV2` (main) — new optional field

**File**: `src/main/index.ts` — local inline type definition  
**Change type**: Additive — optional field, backward compatible

```diff
  questLogTemplates?: never[];
+ sessionGroups?: any[];
};
```

---

## Backward Compatibility

All fields are `optional`. Existing config files without `sessionGroups` are treated as having an empty group list. No migration or schema-version bump is required. The main-process `loadConfig` spread-merge already handles new optional fields correctly.
