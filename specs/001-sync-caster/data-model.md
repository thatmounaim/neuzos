# Data Model: Background Hotkey Routing — Sync-Caster

**Phase**: 1 | **Feature**: `001-sync-caster` | **Date**: 2026-04-20

---

## Modified Entities

### NeuzConfig (extended)

**File**: `src/renderer/src/lib/types.ts`

Adds one new optional field:

```typescript
export type NeuzConfig = {
  // ... all existing fields unchanged ...

  // NEW — ID of the session currently designated as the Active Receiver.
  // null means no receiver is designated; hotkeys with event "send_to_receiver"
  // are silently skipped.
  syncReceiverSessionId?: string | null;
}
```

**Default value** (in `src/main/index.ts` → `defaultNeuzosConfig`):
```typescript
syncReceiverSessionId: null,
```

**Validation rules**:
- Must be either `null` or a string matching an existing `session.id` in `config.sessions`
- If the referenced session ID no longer exists (session was deleted), treated as `null` at dispatch time — no error thrown

**State transitions**:
```
null → string   : user clicks toggle on a session (session becomes receiver)
string → null   : user clicks toggle on current receiver (receiver cleared)
string → string : user clicks toggle on a different session (receiver swapped)
```

---

### NeuzKeybind (new variant, no schema change)

**File**: `src/renderer/src/lib/types.ts` — type unchanged, new usage pattern documented.

New valid combination:

```typescript
{
  key: string;           // e.g. "Alt+F1"
  event: "send_to_receiver";
  args: [ingameKey: string]; // e.g. ["1"], ["f5"], ["ctrl+2"]
}
```

The `args[0]` value is passed verbatim to `NeuzClient.sendKey()`, which accepts the same key format as `SessionAction.ingameKey`.

---

## New Runtime State (Svelte / in-memory)

No new Svelte context or store is created. The Active Receiver session ID is read directly from `mainWindowState.config.syncReceiverSessionId` — it is already part of the config reactive state that flows through the existing `event.config_changed` / `config.load` pipeline.

The NeuzClient component reads the receiver status via:
```svelte
const mainWindowState = getContext<MainWindowState>('mainWindowState')
const isReceiver = $derived(
  mainWindowState.config.syncReceiverSessionId === session.id
)
```

---

## No New Entities

This feature does not introduce any new top-level entity types, database tables, or independent data structures. All changes are additive extensions to existing types.
