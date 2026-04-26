# Quickstart: Quest Log UX & Creation Flow Enhancement

**Phase**: 1 — Design
**Date**: 2026-04-22

---

## What this feature changes

Three targeted edits to `QuestPanel.svelte`, plus extraction of the shared icon list and shared icon picker component.

---

## Step 1 — Extract shared icon list

Create `src/renderer/src/lib/data/actionIcons.ts` and move the `actionIcons` constant out of `SessionActionsSettings.svelte`:

```ts
// src/renderer/src/lib/data/actionIcons.ts
export const actionIcons: string[] = [
  "skill/acrobat_aimed_shot",
  // ... full list from SessionActionsSettings.svelte lines 69-onwards
];
```

Then in `SessionActionsSettings.svelte`, replace the inline declaration with:
```ts
import { actionIcons } from '$lib/data/actionIcons';
```

Also extract the icon picker block into `src/renderer/src/components/Shared/IconPicker.svelte` so Settings and QuestPanel both reuse the exact same picker UI.

---

## Step 2 — Move TODO checklist to top of QuestPanel

In `QuestPanel.svelte`, move `<TodoChecklist />` from its current position (between character tabs and the quest list) to **above** the character tabs row:

```svelte
<!-- BEFORE (current order) -->
<div class="flex items-center gap-2 ...">  <!-- character tabs row -->
  ...
</div>
<TodoChecklist />       <!-- ← currently here -->
<!-- quest list below -->

<!-- AFTER (target order) -->
<TodoChecklist />       <!-- ← moved to top -->
<div class="flex items-center gap-2 ...">  <!-- character tabs row -->
  ...
</div>
<!-- quest list below -->
```

---

## Step 3 — Replace creation form with session+icon combobox form

In the `{:else}` block of the `{#if addingCharacter}` branch, replace the existing inline form with:

```svelte
{#if addingCharacter}
  <!-- Session pre-fill combobox -->
  <Popover.Root bind:open={sessionComboOpen}>
    <Popover.Trigger ...>
      {selectedSessionLabel ?? "Pre-fill from session…"}
    </Popover.Trigger>
    <Popover.Content ...>
      <Command.Root>
        <Command.Input placeholder="Search sessions…" />
        <Command.Empty>No sessions configured.</Command.Empty>
        <Command.List>
          <Command.Group>
            {#each mainWindowState.sessions as session (session.id)}
              <Command.Item
                value={session.label}
                onSelect={() => {
                  newCharName = session.label;
                  newCharIcon = session.icon ?? null;
                  sessionComboOpen = false;
                }}
              >
                <img src="icons/{session.icon.slug}.png" class="size-4 mr-2" />
                {session.label}
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>

  <!-- Name input (editable, pre-filled by session select) -->
  <Input bind:value={newCharName} placeholder="Name" class="h-6 w-20 text-xs" ... />

  <!-- Icon picker (shared component) -->
  <IconPicker bind:open={iconComboOpen} bind:selected={newCharIcon} />

  <!-- Class selector (unchanged) -->
  ...existing class buttons...

  <!-- Confirm / cancel -->
  <Button onclick={submitNewCharacter} disabled={!newCharName.trim() || !newCharClass}><Check /></Button>
{:else}
  <Button onclick={() => addingCharacter = true}><Plus /></Button>
{/if}
```

**Local state to add** at the top of `<script>`:
```ts
import type { MainWindowState, NeuzIcon } from '$lib/types';
let sessionComboOpen = $state(false);
let iconComboOpen = $state(false);
let newCharIcon = $state<NeuzIcon | null>(null);
```

**Context read to add**:
```ts
import { getContext } from 'svelte';
const mainWindowState = getContext<MainWindowState>('mainWindowState');
```

---

## Step 4 — Update submitNewCharacter

`submitNewCharacter` must now pass the selected icon to `questPanel.addCharacter(name, newCharClass, newCharIcon)` so the character icon is stored in `CharacterState` and restored after restart.

Reset `newCharIcon` and `sessionComboOpen` / `iconComboOpen` when the form is cancelled or submitted.

---

## Acceptance smoke test

1. Open the main window → open Quest Log panel.
2. **TODO at top**: verify TODO checklist renders above the character tabs.
3. **Session pre-fill**: click `+`, select any session from the dropdown → name and icon fields auto-fill with the session's label and icon.
4. **Editable pre-fill**: change the name or icon after pre-fill → confirm → new entry uses the modified values.
5. **Custom creation**: click `+`, skip the session combobox, type a name, pick an icon from the icon combobox, choose a class → confirm.
6. **Empty state**: if no sessions are configured, the session combobox shows "No sessions configured." and the form is still usable.
