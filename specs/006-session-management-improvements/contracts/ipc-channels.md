# IPC Contracts: Session Management Improvements

**Phase**: 1 — Design  
**Date**: 2026-04-26  
**Feature**: [spec.md](spec.md)

This file documents the two new IPC channels introduced by this feature. All other channels used (`session.clear_cache`, `session.delete`, `session.start`, `session.stop`) are unchanged from the base branch.

---

## `session.clone`

| Property | Value |
|----------|-------|
| **Direction** | Renderer → Main |
| **Method** | `ipcMain.handle` (invoke — returns a Promise) |
| **Caller** | `SessionSettings.svelte` via `neuzosBridge.sessions.clone()` |
| **Handler location** | `src/main/index.ts` |

### Request

```typescript
type SessionCloneArgs = {
  sourceId: string;   // ID of the session to clone. Must match /^[a-zA-Z0-9_\-]+$/
};
```

The renderer sends only `sourceId`. The main process derives all paths from `app.getPath("userData")`.

### Response

```typescript
type SessionCloneResult =
  | { success: true;  stoppedBeforeClone: boolean }
  | { success: false; error: string };
```

- `stoppedBeforeClone: true` — the source session was running; it was stopped before the copy ran.
- `success: false` — validation failed, source partition missing, copy failed, or path check failed. `error` is a human-readable message surfaced to the user.

### Main-process behaviour (ordered steps)

1. Validate `sourceId` against `/^[a-zA-Z0-9_\-]+$/`. Return error if invalid.
2. Check `runningSessionIds.has(sourceId)`. If true:
   a. Send `event.stop_session` to `mainWindow`.
   b. Await 5 000 ms (same as `session.delete`).
   c. Set `stoppedBeforeClone = true`.
3. Compute paths:
   - `partitionsBase = path.resolve(join(app.getPath("userData"), "Partitions", "persist"))`
   - `srcPath = path.resolve(partitionsBase, sourceId)`
   - Generate `newId = Date.now().toString()` in the **main process**.
   - `destPath = path.resolve(partitionsBase, newId)`

   > **Security note**: Both `srcPath` and `destPath` must start with `partitionsBase + path.sep`. Reject with error if either check fails.

4. For each entry in `["IndexedDB", "Local Storage", "Cookies"]`:
   - Construct `src = join(srcPath, entry)` and `dest = join(destPath, entry)`.
   - If `src` does not exist, skip silently.
   - Call `await fs.promises.cp(src, dest, { recursive: true })`.
5. Return `{ success: true, stoppedBeforeClone }`.

### Renderer behaviour after success

1. Read `newId` from `result.newId` (generated and returned by the main process — do **not** generate a new one in the renderer).
2. Build clone config object from source session, applying:
   - `id: newId`
   - `label: generateCloneLabel(source.label, existingLabels)`
   - `partitionOverwrite: undefined` (cleared per Q1 clarification)
   - All other fields copied from source.
3. Insert clone immediately after source in `neuzosConfig.sessions`.
4. If `stoppedBeforeClone === true`, show informational message: *"Session was stopped to allow cloning."*
5. Call `neuzosBridge.config.save(neuzosConfig)`.

> **Note on ID coordination**: The main process generates the destination folder name (`newId`) independently using `Date.now().toString()` and returns it as part of `SessionCloneResult`. The renderer uses this same returned ID when constructing the config entry so both sides refer to the same partition folder.

Updated response shape to include `newId`:

```typescript
type SessionCloneResult =
  | { success: true;  stoppedBeforeClone: boolean; newId: string }
  | { success: false; error: string };
```

---

## `session.get_running_ids`

| Property | Value |
|----------|-------|
| **Direction** | Renderer → Main |
| **Method** | `ipcMain.handle` (invoke — returns a Promise) |
| **Caller** | `SessionSettings.svelte` via `neuzosBridge.sessions.getRunningIds()` |
| **Handler location** | `src/main/index.ts` |

### Request

No arguments.

### Response

```typescript
type GetRunningIdsResult = string[];  // Array of currently running session IDs
```

Returns the current contents of `runningSessionIds` as a plain array. May be empty if no sessions are running.

### Main-process state management

The `runningSessionIds: Set<string>` module-level Set is updated by two existing handlers:

```typescript
// Add on start
ipcMain.on("session.start", (event, sessionId: string, layoutId: string) => {
  runningSessionIds.add(sessionId);          // NEW LINE
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.webContents.send("event.start_session", sessionId, layoutId);
});

// Remove on stop
ipcMain.on("session.stop", (event, sessionId: string) => {
  runningSessionIds.delete(sessionId);       // NEW LINE
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.webContents.send("event.stop_session", sessionId);
});
```

### Renderer usage (SessionSettings.svelte)

Called once when the delete button is clicked (before the dialog opens) to determine which dialog variant to show:

```typescript
const runningIds = await neuzosBridge.sessions.getRunningIds();
const isRunning = runningIds.includes(session.id);
// show running-warning dialog if isRunning, else standard dialog
```
