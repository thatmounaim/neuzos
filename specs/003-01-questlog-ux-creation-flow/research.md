# Research: Quest Log UX & Creation Flow Enhancement

**Phase**: 0 — Outline & Research
**Date**: 2026-04-22
**Feature**: [spec.md](spec.md)

---

## Decision 1: Session data access from QuestPanel

**Question**: How does `QuestPanel.svelte` read the list of all configured sessions without a new IPC call?

**Decision**: Use `getContext<MainWindowState>('mainWindowState')` directly inside `QuestPanel.svelte`. The `mainWindowState` object (which contains `sessions: NeuzSession[]`) is already placed into Svelte context by `App.svelte` at line 316:
```ts
setContext('mainWindowState', mainWindowState)
```
This is reactive (`$state`), so `sessions` is always up to date — no IPC, no polling, no new channels required.

**Rationale**: The context is already available to all descendant components of `App.svelte`. `QuestPanel` is rendered inside `MainSectionsContainer` which is a child of `App.svelte`, so the context is in scope.

**Alternatives considered**:
- New IPC channel `quest_panel.get_sessions` — rejected; unnecessary when the data is already in-process.
- Prop-drilling `sessions` down from `App → MainSectionsContainer → QuestPanel` — rejected; adds coupling. Context access is the established pattern.

---

## Decision 2: Icon picker reuse strategy

**Question**: How exactly is the icon picker implemented in `SessionActionsSettings.svelte`, and can the same markup block be dropped into `QuestPanel.svelte`?

**Decision**: The icon picker is a `Popover.Root` + `Command.Root` inline block (lines ~698–725 of `SessionActionsSettings.svelte`). It uses:
- `Popover.Root` with an `open` boolean + `onOpenChange` handler
- `Popover.Trigger` — a button showing the current icon preview
- `Popover.Content` containing a `Command.Root` with `Command.Input`, `Command.Empty`, `Command.List`, `Command.Group`, and `Command.Item` entries
- `actionIcons: string[]` — a locally defined constant array listing all icon slugs

The same pattern can be placed in `QuestPanel.svelte` directly. The `actionIcons` array must be imported or duplicated — since it's a module-level `const` (not exported), the cleanest approach is to extract it to a shared utility file `src/renderer/src/lib/data/actionIcons.ts` and import it in both files. This avoids duplication without creating a new component.

**Rationale**: Extracting `actionIcons` to a shared module is a minimal, zero-risk change. No new component abstraction is needed — the Popover+Command markup is compact enough to inline.

**Alternatives considered**:
- Copy-paste the `actionIcons` array into `QuestPanel.svelte` — rejected; duplicated data that would drift out of sync if the icon library expands.
- Extract the entire icon picker into a shared `IconPicker.svelte` component — not required for this spec (FR-007 says "reuse the exact existing component"); would be a valid future refactor.

---

## Decision 3: TODO checklist repositioning

**Question**: What is the current render order in `QuestPanel.svelte` and what is the minimal change to move TODO to the top?

**Decision**: In the current `QuestPanel.svelte` template:
1. Character tabs row (with inline add form)
2. `<TodoChecklist />` ← currently here
3. Filtered quest list

The fix is to move the `<TodoChecklist />` line above the character tabs row. `TodoChecklist.svelte` has no knowledge of its position — it reads from `todoContext` only — so no internal changes are needed.

**Rationale**: Single-line move in the template. Zero risk of state or reactivity issues.

**Alternatives considered**: None — this is the unambiguous minimal change satisfying FR-001.

---

## Decision 4: Creation form layout

**Question**: What is the minimal creation form structure that satisfies FR-002 through FR-008?

**Decision**: The existing inline creation form (currently a name `Input` + hardcoded class icon buttons) is replaced with:

```
[Session combobox — "Pre-fill from session…" placeholder]
[Name text input — editable, pre-filled on session select]
[Icon picker (Popover+Command) — visual, pre-filled on session select]
[✓ confirm button]  [✕ cancel button]
```

- Session combobox: a second `Popover.Root` + `Command.Root` block, items sourced from `mainWindowState.sessions`.
- When a session is selected: write its `label` into the name field and its `icon.slug` into the icon state variable.
- The confirm button calls the existing `submitNewCharacter()` function (no signature change needed).
- Flyff class selector (Mercenary / Assist / Magician / Acrobat) remains unchanged below the name field.

**Rationale**: Minimal delta on existing form. No new context APIs, no new IPC. All clarifications (pre-fill only, combobox-only icon, confirm step, all sessions, component reuse) are satisfied.

**Alternatives considered**: Replacing the inline form with a modal/dialog — rejected; the maintainer asked for the existing inline approach with improved controls.

---

## Summary: No NEEDS CLARIFICATION remain

All five clarification questions from the spec session are resolved by the four decisions above. The plan can proceed to Phase 1 with no open unknowns.
