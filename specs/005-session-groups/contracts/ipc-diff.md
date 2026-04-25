# Contract: IPC Changes

**Feature**: `005-session-groups`  
**Files affected**: `src/main/index.ts`

---

## New Handler: `session_launcher.get_groups`

**Type**: `ipcMain.handle` (renderer → main, with response)

**Purpose**: Return the current list of session groups so the Session Launcher window can render collapsible group sections.

**Request**: No arguments.

**Response**:
```ts
NeuzSessionGroup[]   // neuzosConfig.sessionGroups ?? []
```

**Usage in renderer** (`SessionLauncher.svelte`):
```ts
const groups = await electronApi.invoke("session_launcher.get_groups");
```

**Live refresh requirement**: The Session Launcher should also listen for the existing `event.config_changed` broadcast and re-fetch groups whenever Settings saves a change, so an already-open launcher stays in sync without requiring a reopen.

**Security**: Read-only, returns plain data from already-loaded config. No input validation required.

---

## Modified Handler: `config.import`

**File**: `src/main/index.ts`  
**Change type**: Additive passthrough — new field included in parsed payload

The schema-v2 payload construction block gains one line:

```diff
  ...(Array.isArray(parsed.questLogTemplates) ? {questLogTemplates: parsed.questLogTemplates} : {}),
+ ...(Array.isArray(parsed.sessionGroups) ? {sessionGroups: parsed.sessionGroups} : {}),
```

No validation is done on the group contents at parse time — validation (orphan removal, merge logic) happens in `applyUiLayout`.

---

## Modified Function: `inferPayloadCategories` (main)

Adds detection of `sessionGroups` as a `ui-layout` signal:

```diff
- if (payload?.window !== undefined || payload?.sessionZoomLevels !== undefined || payload?.fullscreen !== undefined) {
+ if (payload?.window !== undefined || payload?.sessionZoomLevels !== undefined || payload?.fullscreen !== undefined || Array.isArray(payload?.sessionGroups)) {
    categories.push('ui-layout');
  }
```

---

## Modified Function: `applyUiLayout` (main)

Adds session group apply logic inside the existing `applyUiLayout` inner function. Both `replace` and `merge` modes are handled:

**Replace mode**: overwrite the entire groups list.
```ts
if (Array.isArray(incomingPayload.sessionGroups)) {
  const knownSessionIds = new Set((neuzosConfig.sessions ?? []).map((s: any) => s.id));
  neuzosConfig.sessionGroups = cloneData(incomingPayload.sessionGroups)
    .map((g: any) => ({
      ...g,
      sessionIds: (g.sessionIds ?? []).filter((id: string) => knownSessionIds.has(id)),
    }));
  didModify = true;
}
```

**Merge mode**: update-by-id (per clarification Q2).
```ts
if (Array.isArray(incomingPayload.sessionGroups)) {
  const knownSessionIds = new Set((neuzosConfig.sessions ?? []).map((s: any) => s.id));
  const existingGroups: any[] = [...(neuzosConfig.sessionGroups ?? [])];
  const existingGroupMap = new Map(existingGroups.map((g: any) => [g.id, g]));
  for (const importGroup of incomingPayload.sessionGroups) {
    if (!importGroup?.id) continue;
    const filteredIds = (importGroup.sessionIds ?? []).filter((id: string) => knownSessionIds.has(id));
    const existing = existingGroupMap.get(importGroup.id);
    if (!existing) {
      existingGroups.push(cloneData({ ...importGroup, sessionIds: filteredIds }));
      existingGroupMap.set(importGroup.id, importGroup);
    } else {
      existing.label = importGroup.label ?? existing.label;
      existing.sessionIds = filteredIds;
    }
    didModify = true;
  }
  neuzosConfig.sessionGroups = existingGroups;
}
```

> Note: In both modes, orphaned session ids (pointing to deleted sessions) are silently removed during apply, matching the existing `sessionZoomLevels` pattern.
