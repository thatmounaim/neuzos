# Tasks: Background Hotkey Routing — Sync-Caster

**Input**: Design documents from `/specs/001-sync-caster/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ipc-channels.md ✅, quickstart.md ✅
**Branch**: `001-sync-caster`
**Total Tasks**: 11 | **No new files** | **No new dependencies**

**Organization**: Grouped by user story — each phase is independently testable.

---

## Phase 1: Setup

**Purpose**: Confirm baseline — no project initialization required. Feature is a pure modification to 5 existing files.

- [X] T001 Confirm branch `001-sync-caster` is active via `git branch --show-current`; verify all 5 target files exist: `src/renderer/src/lib/types.ts`, `src/main/index.ts`, `src/renderer/src/lib/core.ts`, `src/renderer/src/App.svelte`, `src/renderer/src/components/Shared/NeuzClient.svelte`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type and config baseline — ALL user story tasks depend on these two fields existing. Must complete before Phase 3+.

**⚠️ CRITICAL**: T002 and T003 must both be done before any user story work begins.

- [X] T002 [P] [CONFIG] Add `syncReceiverSessionId?: string | null` to the `NeuzConfig` type in `src/renderer/src/lib/types.ts` — append after the last field in the type definition (see data-model.md for exact field spec)
- [X] T003 [P] [CONFIG] Add `syncReceiverSessionId: null` to `defaultNeuzosConfig` in `src/main/index.ts` — append beside the other session-related defaults (see data-model.md for placement guidance)

**Checkpoint**: TypeScript compiler accepts the new field; `defaultNeuzosConfig` includes `syncReceiverSessionId: null`.

---

## Phase 3: User Story 1 — Designate a Session as the Active Receiver (Priority: P1) 🎯 MVP

**Goal**: User can hover a session pane, click a `RadioTower` icon button to mark it as the Active Receiver, and see a persistent visual indicator. Toggling again clears it. Designation persists across restarts.

**Independent Test**: `bun dev` → open two sessions in a layout → hover the second session → click the toggle icon → confirm it turns highlighted → click again → confirm it clears → restart app → confirm the previously designated receiver is restored.

- [X] T004 [P] [US1] [IPC] Add `ipcMain.handle("config.set_sync_receiver", ...)` handler in `src/main/index.ts` — updates `neuzosConfig.syncReceiverSessionId`, calls `saveConfig()`, and broadcasts `event.sync_receiver_changed` to the main window; wrap in `try/catch` per constitution Principle VI (full signature in contracts/ipc-channels.md). Simple assignment handles single-receiver invariant — no separate clear step needed.
- [X] T005 [P] [US1] [IPC] Add `setSyncReceiver(sessionId: string | null): Promise<void>` to the `sessions` namespace of `neuzosBridge` in `src/renderer/src/lib/core.ts` — calls `electronApi?.invoke("config.set_sync_receiver", sessionId)` (same pattern as other `sessions.*` methods)
- [X] T006 [US1] [IPC] Add `electronApi.on("event.sync_receiver_changed", ...)` listener in `src/renderer/src/App.svelte` — handler sets `mainWindowState.config.syncReceiverSessionId = sessionId` (follow existing listener pattern, e.g. `event.config_changed`)
- [X] T007 [US1] [WIDGET] Add receiver toggle overlay button and `isReceiver` derived state to `src/renderer/src/components/Shared/NeuzClient.svelte`:
  - Add `group` CSS class to the outer `<div class="w-full h-full relative">` wrapper
  - Add `const isReceiver = $derived(mainWindowState.config.syncReceiverSessionId === session.id)` using Svelte 5 runes
  - Add `function toggleReceiver() { neuzosBridge.sessions.setSyncReceiver(isReceiver ? null : session.id) }`
  - Add `<button>` at `absolute top-2 right-2 z-50` with `RadioTower` icon from `@lucide/svelte`; active state: `bg-primary text-primary-foreground`; inactive state: `opacity-0 group-hover:opacity-60` (see UI Design section in plan.md for full Tailwind class sketch)
  - Import `RadioTower` from `@lucide/svelte`

**Checkpoint**: US1 fully functional. Toggle icon appears on hover, turns solid when active, single session active at a time, persists on restart.

---

## Phase 4: User Story 2 — Route a Global Hotkey to the Active Receiver (Priority: P1)

**Goal**: A `send_to_receiver` global hotkey (registered by the user in Settings) injects the mapped in-game key into the Active Receiver's webview from any OS context, within 50 ms.

**Independent Test**: With a receiver designated (from US1), hard-code a `send_to_receiver` keybind in `config.json` (`"event": "send_to_receiver", "args": ["1"]`) → press the hotkey → confirm key `1` fires in the receiver session without focus switch.

- [X] T008 [P] [US2] [IPC] Add `case "send_to_receiver":` to the `dispatchKeybindEvent` switch in `src/main/index.ts` — sends `event.send_to_receiver` with `bind.args[0]` (the ingameKey) to the main window via `mainWindow?.webContents.send(...)` (see contracts/ipc-channels.md for the dispatch sketch)
- [X] T009 [US2] [IPC] [INPUT] Add `electronApi.on("event.send_to_receiver", ...)` listener in `src/renderer/src/App.svelte` — reads `mainWindowState.config.syncReceiverSessionId`; if null, returns silently; otherwise resolves `mainWindowState.sessionsLayoutsRef[receiverId]?.layouts` and calls `sendKey(ingameKey)` on the matching NeuzClient ref (see contracts/ipc-channels.md for the full resolver pattern)

**Checkpoint**: US2 fully functional. Hotkey press routes key to designated receiver. Silent no-op when no receiver set or session stopped.

---

## Phase 5: User Story 3 — Configure Sync-Caster Keybinds in Settings (Priority: P2)

**Goal**: The Keybinds Settings tab automatically shows `Send Key to Active Receiver` as a selectable event type with an `ingame_key` text input, requiring zero changes to `KeybindsSettings.svelte`.

**Independent Test**: Open Settings → Keybinds → Add keybind → confirm `Send Key to Active Receiver` appears in the event dropdown with one argument field labelled `ingame_key` → configure `Alt+F1` → `1` → save → test via US2 checkpoint flow.

- [X] T010 [US3] [IPC] Add `"send_to_receiver": { label: "Send Key to Active Receiver", args: ["ingame_key"] }` to the `allowedEventKeybinds` constant in `src/main/index.ts` — this object is returned by the existing `config.get_available_event_keybinds` handle and drives the Keybinds UI dynamically (no changes to `KeybindsSettings.svelte` needed)

**Checkpoint**: US3 fully functional. Keybinds Settings UI shows the new event type without any Svelte changes.

---

## Phase 6: Polish & Validation

**Purpose**: End-to-end validation across all three user stories.

- [ ] T011 Manual integration test per `specs/001-sync-caster/quickstart.md`: run `bun dev`, open 2+ sessions in a layout, designate a receiver (US1), configure a `send_to_receiver` keybind in Settings (US3), press the hotkey (US2), verify key injects in the background session without focus switch; restart app and verify receiver persists

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: No dependencies — start immediately (parallel with Phase 1)
- **US1 (Phase 3)**: Depends on Phase 2 completion (**T002 + T003 must be done**)
- **US2 (Phase 4)**: Depends on Phase 2 completion; T009 depends on T008
- **US3 (Phase 5)**: Independent of US1/US2 — can start after Phase 2
- **Polish (Phase 6)**: Depends on all of Phase 3, 4, 5

### User Story Dependencies

| Story | Depends On | Independently Testable |
|---|---|---|
| US1 — Designate Receiver | Phase 2 (T002, T003) | ✅ Yes — toggle UI works without US2/US3 |
| US2 — Route Hotkey | Phase 2 (T002, T003) + T008 | ✅ Yes — test via manual config.json edit |
| US3 — Settings UI | Phase 2 (T002, T003) | ✅ Yes — Settings UI appears without US1/US2 |

### Intra-Phase Dependencies (Phase 3 / US1)

```
T002 ──┐
       ├──► T004 (independent of T005/T006)
T003 ──┘
       ├──► T005 (independent of T004/T006)
       ├──► T006 (independent of T004/T005 — only sets mainWindowState directly)
              └──► T007 (needs T005 for setSyncReceiver call)
```

---

## Parallel Opportunities

### Phase 2 — Run simultaneously (different files, no deps):
```
T002 — src/renderer/src/lib/types.ts
T003 — src/main/index.ts
```

### Phase 3 (US1) — T004 and T005 can start in parallel after Phase 2:
```
T004 — src/main/index.ts         (config.set_sync_receiver handler)
T005 — src/renderer/src/lib/core.ts  (neuzosBridge.sessions.setSyncReceiver)
```
Then in parallel: T005 (core.ts) + T006 (App.svelte listener — no T005 dependency); then T007 (NeuzClient.svelte — needs T005's bridge method)

### Phase 4 (US2) — Can start after Phase 2, parallel with US1:
```
T008 — src/main/index.ts         (dispatchKeybindEvent case)
```
Then: T009 (App.svelte, needs T008 to fire the IPC event)

### Phase 5 (US3) — Fully independent after Phase 2:
```
T010 — src/main/index.ts         (allowedEventKeybinds entry)
```

---

## Implementation Strategy

**MVP Scope (deliver value fastest)**: Complete US1 first (T001–T007). This alone gives the player the visual receiver toggle and persistence — the most visible new capability.

**Increment 2**: Complete US2 (T008–T009). Hotkey routing now works end-to-end.

**Increment 3**: Complete US3 (T010). Keybinds Settings UI surfaces the new type — no more manual config.json editing.

**Recommended execution order** (single developer):
```
T001 → T002+T003 (parallel) → T004+T005 (parallel) → T006 → T007 → T008 → T009 → T010 → T011
```

**~120 lines of new code total** across 5 existing files. No new files, no new dependencies.
