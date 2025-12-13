<script lang="ts">
  import FloatingWindow from '../../Shared/FloatingWindow.svelte';
  import { Swords } from '@lucide/svelte';
  import { getContext } from 'svelte';
  import type { MainWindowState, SessionAction } from '$lib/types';

  interface Props {
    visible?: boolean;
    onClose?: () => void;
    onHide?: () => void;
    data?: { sessionId?: string };
  }

  let { visible = true, onClose, onHide, data }: Props = $props();

  const mainWindowState = getContext<MainWindowState>('mainWindowState');

  // Get the session ID from data
  const sessionId = data?.sessionId;

  // Get session info
  const session = $derived(mainWindowState.config.sessions.find(s => s.id === sessionId));
  const sessionLabel = $derived(session?.label || 'Unknown Session');

  // Get session actions
  const sessionActionsData = $derived(
    mainWindowState.config.sessionActions?.find(sa => sa.sessionId === sessionId)
  );
  const actions = $derived(sessionActionsData?.actions || []);

  // Edit mode state
  let isEditMode = $state(false);

  // Row structure: { rowId: string, actionIds: string[] }
  const WIDGET_IDENTIFIER = 'widget.builtin.action_pad';
  const STORAGE_KEY = WIDGET_IDENTIFIER + `rows-${sessionId}`;
  const PERSIST_ID = WIDGET_IDENTIFIER + 'session-' + sessionId;
  let rows = $state<{ id: string; actionIds: string[] }[]>(loadRowsFromStorage());

  function loadRowsFromStorage(): { id: string; actionIds: string[] }[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that stored rows still have valid actions
        return parsed.filter((row: any) =>
          row.actionIds && Array.isArray(row.actionIds)
        );
      }
    } catch (e) {
      console.error('Failed to load rows:', e);
    }
    // Default: all actions in one row
    return [{ id: 'default', actionIds: [] }];
  }

  function saveRowsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (e) {
      console.error('Failed to save rows:', e);
    }
  }

  // Get actions organized by rows
  const organizedActions = $derived.by(() => {
    const organized = rows.map(row => ({
      ...row,
      actions: row.actionIds
        .map(id => actions.find(a => a.id === id))
        .filter(Boolean) as SessionAction[]
    }));

    // Add unassigned actions to default row
    const assignedIds = new Set(rows.flatMap(r => r.actionIds));
    const unassignedActions = actions.filter(a => !assignedIds.has(a.id));

    if (unassignedActions.length > 0) {
      const defaultRow = organized.find(r => r.id === 'default');
      if (defaultRow) {
        defaultRow.actions = [...defaultRow.actions, ...unassignedActions];
      } else {
        organized.unshift({
          id: 'default',
          actionIds: unassignedActions.map(a => a.id),
          actions: unassignedActions
        });
      }
    }

    // In edit mode, show all rows including empty ones
    // In normal mode, only show rows with actions
    return isEditMode ? organized : organized.filter(row => row.actions.length > 0);
  });

  function addRow() {
    rows = [...rows, { id: `row-${Date.now()}`, actionIds: [] }];
    saveRowsToStorage();
  }

  function deleteRow(rowId: string) {
    if (rowId === 'default') return; // Can't delete default row
    rows = rows.filter(r => r.id !== rowId);
    saveRowsToStorage();
  }

  function moveActionToRow(actionId: string, targetRowId: string) {
    // Remove from all rows
    rows = rows.map(row => ({
      ...row,
      actionIds: row.actionIds.filter(id => id !== actionId)
    }));

    // Add to target row
    const targetRow = rows.find(r => r.id === targetRowId);
    if (targetRow) {
      targetRow.actionIds = [...targetRow.actionIds, actionId];
    }

    rows = [...rows]; // Trigger reactivity
    saveRowsToStorage();
  }

  // Track cooldown state for each action
  let actionStates = $state<{ [actionId: string]: { isCasting: boolean; cooldownProgress: number; cooldownEndTime: number } }>({});

  // Initialize action states
  $effect(() => {
    actions.forEach(action => {
      if (!actionStates[action.id]) {
        actionStates[action.id] = { isCasting: false, cooldownProgress: 0, cooldownEndTime: 0 };
      }
    });
  });

  // Function to trigger an action
  function triggerAction(action: SessionAction) {
    console.log('Triggering action:', action.label, 'for session:', sessionId);

    // Check if action is on cooldown
    const state = actionStates[action.id];
    if (state && (state.isCasting || state.cooldownProgress > 0)) {
      console.log('Action on cooldown, ignoring');
      return;
    }

    // Set casting state
    if (action.castTime > 0) {
      actionStates[action.id] = { ...actionStates[action.id], isCasting: true };

      // After cast time, send the key and start cooldown
      setTimeout(() => {
        sendActionKey(action);
        startCooldown(action);
      }, action.castTime * 1000);
    } else {
      // No cast time, send immediately and start cooldown
      sendActionKey(action);
      startCooldown(action);
    }
  }

  function sendActionKey(action: SessionAction) {
    actionStates[action.id] = { ...actionStates[action.id], isCasting: false };

    // Send the action key to all neuz clients for this session across all layouts
    const sessionLayouts = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts;
    if (sessionLayouts) {
      Object.keys(sessionLayouts).forEach(layoutId => {
        const neuzClient = sessionLayouts[layoutId] as any;
        if (neuzClient && neuzClient.sendKey && action.ingameKey) {
          console.log('Sending key', action.ingameKey, 'to session', sessionId, 'in layout', layoutId);
          neuzClient.sendKey(action.ingameKey);
        }
      });
    }
  }

  function startCooldown(action: SessionAction) {
    if (action.cooldown <= 0) return;

    const endTime = Date.now() + (action.cooldown * 1000);
    actionStates[action.id] = { ...actionStates[action.id], cooldownEndTime: endTime, cooldownProgress: 1 };

    // Update cooldown progress every 0.2 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        actionStates[action.id] = { ...actionStates[action.id], cooldownProgress: 0, cooldownEndTime: 0 };
        clearInterval(interval);
      } else {
        const progress = remaining / (action.cooldown * 1000);
        actionStates[action.id] = { ...actionStates[action.id], cooldownProgress: progress };
      }
    }, 200); // 0.2 second ticks
  }

</script>

<div style="display: {visible ? 'block' : 'none'};">
  <FloatingWindow
    persistId={PERSIST_ID}
    title="Action Pad - {sessionLabel}"
    defaultWidth={280}
    defaultHeight={360}
    minWidth={280}
    minHeight={200}
    {onClose}
    {onHide}
    resizable={true}
  >
    {#snippet titleSnippet()}
      <div class="flex items-center gap-2">
        <span>Action Pad - {sessionLabel}</span>
        <button
          class="ml-auto text-xs px-2 py-0.5 rounded border border-border hover:bg-accent transition-colors"
          onclick={() => { isEditMode = !isEditMode; }}
          onmousedown={(e) => e.stopPropagation()}
        >
          {isEditMode ? 'Done' : 'Edit'}
        </button>
      </div>
    {/snippet}

    <div class="h-full w-full p-3 overflow-auto">
      {#if actions.length === 0}
        <div class="flex flex-col items-center justify-center h-full text-center gap-2">
          <Swords class="h-12 w-12 text-muted-foreground opacity-50" />
          <p class="text-sm text-muted-foreground">No actions configured</p>
          <p class="text-xs text-muted-foreground">
            Configure actions in Settings → Session Actions
          </p>
        </div>
      {:else}
        <div class="flex flex-col gap-3">
          {#each organizedActions as row (row.id)}
            <div class="action-row">
              {#if isEditMode}
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs text-muted-foreground">
                    {row.id === 'default' ? 'Default Row' : 'Row'}
                  </span>
                  {#if row.id !== 'default'}
                    <button
                      class="text-xs px-1 py-0.5 rounded border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onclick={() => deleteRow(row.id)}
                    >
                      Delete Row
                    </button>
                  {/if}
                </div>
              {/if}

              <div class="flex flex-wrap gap-2">
                {#if row.actions.length === 0 && isEditMode}
                  <div class="empty-row-placeholder text-xs text-muted-foreground italic px-3 py-2 border border-dashed border-border rounded">
                    Empty row - assign actions using the dropdown below each skill
                  </div>
                {/if}
                {#each row.actions as action (action.id)}
                  {@const state = actionStates[action.id] || { isCasting: false, cooldownProgress: 0, cooldownEndTime: 0 }}
                  {@const isOnCooldown = state.cooldownProgress > 0 || state.isCasting}
                  {@const cooldownAngle = (1 - state.cooldownProgress) * 360}

                  <div class="action-container">
                    <button
                      class="action-button relative w-12 h-12 p-0 rounded-md border-2 border-border hover:border-primary transition-all overflow-hidden"
                      onclick={() => !isEditMode && triggerAction(action)}
                      title="{action.label}\nKey: {action.ingameKey || 'Not set'}\nCast: {action.castTime}s | CD: {action.cooldown}s"
                      disabled={isEditMode ? false : isOnCooldown}
                      class:edit-mode={isEditMode}
                    >
                      {#if action.icon?.slug}
                        <img
                          src="icons/{action.icon.slug}.png"
                          alt={action.label}
                          class="w-full h-full object-contain p-1 {state.isCasting ? 'brightness-150' : ''}"
                        />
                      {:else}
                        <Swords class="h-8 w-8 {state.isCasting ? 'brightness-150' : ''}" />
                      {/if}

                      <!-- Radial cooldown overlay -->
                      {#if state.cooldownProgress > 0}
                        <div class="absolute inset-0 pointer-events-none">
                          <svg class="w-full h-full" viewBox="0 0 48 48">
                            <defs>
                              <mask id="cooldown-mask-{action.id}">
                                <rect width="48" height="48" fill="white" />
                                <path
                                  d="M24,24 L24,0 A24,24 0 {cooldownAngle > 180 ? '1' : '0'},1 {24 + 24 * Math.sin(cooldownAngle * Math.PI / 180)},{24 - 24 * Math.cos(cooldownAngle * Math.PI / 180)} Z"
                                  fill="black"
                                />
                              </mask>
                            </defs>
                            <rect
                              width="48"
                              height="48"
                              fill="rgba(0, 0, 0, 0.6)"
                              mask="url(#cooldown-mask-{action.id})"
                            />
                          </svg>
                        </div>
                      {/if}

                      <!-- Casting overlay -->
                      {#if state.isCasting}
                        <div class="absolute inset-0 bg-white/30 pointer-events-none"></div>
                      {/if}
                    </button>

                    {#if isEditMode}
                      <select
                        class="text-[10px] px-1 py-0.5 rounded border border-border bg-background mt-1"
                        onchange={(e) => moveActionToRow(action.id, e.currentTarget.value)}
                      >
                        {#each rows as selectRow}
                          <option value={selectRow.id} selected={selectRow.id === row.id}>
                            {selectRow.id === 'default' ? 'Default' : `Row ${rows.indexOf(selectRow)}`}
                          </option>
                        {/each}
                      </select>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}

          {#if isEditMode}
            <button
              class="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent transition-colors"
              onclick={addRow}
            >
              + Add Row
            </button>
          {/if}
        </div>
      {/if}
  </div>
  </FloatingWindow>
</div>

<style>
  .action-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .action-button {
    background-color: hsl(var(--background));
    cursor: pointer;
  }

  .action-button.edit-mode {
    cursor: default;
  }

  .action-button:hover:not(:disabled):not(.edit-mode) {
    background-color: hsl(var(--accent));
  }

  .action-button:active:not(:disabled):not(.edit-mode) {
    transform: scale(0.95);
  }

  .action-button:disabled:not(.edit-mode) {
    cursor: not-allowed;
    opacity: 0.9;
  }

  .action-row {
    display: flex;
    flex-direction: column;
  }
</style>


