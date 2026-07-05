<script lang="ts">
  import FloatingWindow from '../../../Shared/FloatingWindow.svelte';
  import {Check, EyeOff, GripVertical, Plus, Settings, Swords, Trash2} from '@lucide/svelte';
  import {getContext} from 'svelte';
  import type {MainWindowState, SessionAction} from '$lib/types';
  import {getCooldownsContext} from '$lib/contexts/cooldownsContext';

  type ActionPadRow = {
    id: string;
    actionIds: string[];
    name?: string;
  };

  type OrganizedActionPadRow = ActionPadRow & {
    actions: SessionAction[];
  };

  interface Props {
    visible?: boolean;
    onClose?: () => void;
    data?: { sessionId?: string };
  }

  let {visible = true, onClose, data}: Props = $props();

  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  const cooldownsContext = getCooldownsContext();

  // Force reactivity for cooldown updates
  let cooldownTrigger = $state(0);
  $effect(() => {
    const unsubscribe = cooldownsContext.subscribe(() => {
      cooldownTrigger++;
    });
    return () => unsubscribe();
  });

  // Get the session ID from data
  const sessionId = (() => data?.sessionId)();

  // Helper to get action state that depends on cooldownTrigger for reactivity
  function getActionStateReactive(actionId: string) {
    // Access cooldownTrigger to make this reactive
    cooldownTrigger;
    if (!sessionId) return {
      isCasting: false,
      cooldownProgress: 0,
      cooldownEndTime: 0,
      castStartTime: 0
    };
    return cooldownsContext.getActionState(sessionId, actionId);
  }

  // Helper to format cooldown time in mm:ss
  function formatCooldownTime(cooldownEndTime: number): string {
    if (!cooldownEndTime) return '';
    const remaining = Math.max(0, cooldownEndTime - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function formatActionTooltip(action: SessionAction): string {
    const key = action.ingameKey ? action.ingameKey.toUpperCase() : 'Not set';
    return `${action.label} | Key: ${key} | Casttime: ${action.castTime}s | Cooldown: ${action.cooldown}s`;
  }

  // Get session info
  const session = $derived(mainWindowState.config.sessions.find(s => s.id === sessionId));
  const sessionLabel = $derived(session?.label || 'Unknown Session');
  const sessionIcon = $derived(session?.icon?.slug || 'misc/browser');
  const sessionRunning = $derived(Boolean(sessionId && mainWindowState.sessionsLayoutsRef[sessionId]?.layouts && Object.keys(mainWindowState.sessionsLayoutsRef[sessionId].layouts).length > 0));

  // Get session actions
  const sessionActionsData = $derived(
    mainWindowState.config.sessionActions?.find(sa => sa.sessionId === sessionId)
  );
  const actions = $derived(sessionActionsData?.actions || []);

  // Edit mode state
  let isEditMode = $state(false);

  // Row structure: { rowId: string, actionIds: string[], name?: string }
  const WIDGET_IDENTIFIER = 'widget.builtin.action_pad';
  const STORAGE_KEY = WIDGET_IDENTIFIER + `rows-${sessionId}`;
  const PERSIST_ID = WIDGET_IDENTIFIER + 'session-' + sessionId;
  const TRANSPARENCY_STORAGE_KEY = `${PERSIST_ID}-background-transparency`;
  const DEFAULT_BACKGROUND_TRANSPARENCY = 100;
  const HIDDEN_ROW_ID = '__hidden';
  const HIDDEN_ROW_NAME = 'Hidden Actions';

  let rows = $state<ActionPadRow[]>(loadRowsFromStorage());
  let backgroundTransparency = $state(loadBackgroundTransparency());
  let draggedActionId = $state<string | null>(null);
  let draggedSourceRowId = $state<string | null>(null);
  let activeDropTarget = $state<{ rowId: string; index: number } | null>(null);

  function sanitizeTransparency(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_BACKGROUND_TRANSPARENCY;
    return Math.max(0, Math.min(100, Math.round(parsed)));
  }

  function loadBackgroundTransparency(): number {
    try {
      const stored = localStorage.getItem(TRANSPARENCY_STORAGE_KEY);
      if (stored !== null) {
        return sanitizeTransparency(stored);
      }
    } catch (e) {
      console.error('Failed to load Action Pad transparency:', e);
    }
    return DEFAULT_BACKGROUND_TRANSPARENCY;
  }

  function saveBackgroundTransparency(value: number) {
    try {
      localStorage.setItem(TRANSPARENCY_STORAGE_KEY, String(sanitizeTransparency(value)));
    } catch (e) {
      console.error('Failed to save Action Pad transparency:', e);
    }
  }

  function updateBackgroundTransparency(value: string) {
    backgroundTransparency = sanitizeTransparency(value);
    saveBackgroundTransparency(backgroundTransparency);
  }

  function normalizeRow(row: any): ActionPadRow | null {
    if (!row || !row.id || !Array.isArray(row.actionIds)) {
      return null;
    }

    return {
      id: String(row.id),
      actionIds: row.actionIds.filter((id: unknown): id is string => typeof id === 'string'),
      name: typeof row.name === 'string' ? row.name : undefined
    };
  }

  function loadRowsFromStorage(): ActionPadRow[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map(normalizeRow)
            .filter((row): row is ActionPadRow => row !== null);

          if (normalized.length > 0) {
            return normalized.map(row =>
              row.id === HIDDEN_ROW_ID ? {...row, name: HIDDEN_ROW_NAME} : row
            );
          }
        }
      }
    } catch (e) {
      console.error('Failed to load rows:', e);
    }
    // Default: all actions in one row
    return [{id: 'default', actionIds: []}];
  }

  function saveRowsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (e) {
      console.error('Failed to save rows:', e);
    }
  }

  // Get actions organized by rows
  const organizedActions = $derived.by<OrganizedActionPadRow[]>(() => {
    const organized = rows.map(row => ({
      ...row,
      name: row.id === HIDDEN_ROW_ID ? HIDDEN_ROW_NAME : row.name,
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

    const visibleRows = organized.filter(row => row.id !== HIDDEN_ROW_ID);
    const hiddenRow = organized.find(row => row.id === HIDDEN_ROW_ID);

    // In edit mode, show all normal rows and the hidden row when it contains actions.
    // In normal mode, hide the hidden row completely.
    if (isEditMode) {
      return hiddenRow && hiddenRow.actions.length > 0
        ? [...visibleRows, hiddenRow]
        : visibleRows;
    }

    return visibleRows.filter(row => row.actions.length > 0);
  });

  function addRow() {
    const hiddenRow = rows.find(row => row.id === HIDDEN_ROW_ID);
    const visibleRows = rows.filter(row => row.id !== HIDDEN_ROW_ID);
    const newRow = {id: `row-${Date.now()}`, actionIds: []};

    rows = hiddenRow ? [...visibleRows, newRow, hiddenRow] : [...visibleRows, newRow];
    saveRowsToStorage();
  }

  function deleteRow(rowId: string) {
    if (rowId === 'default' || rowId === HIDDEN_ROW_ID) return; // Can't delete default or hidden row
    rows = rows.filter(r => r.id !== rowId);
    saveRowsToStorage();
  }

  function updateRowName(rowId: string, name: string) {
    if (rowId === HIDDEN_ROW_ID) return;
    rows = rows.map(row => row.id === rowId ? {...row, name} : row);
    saveRowsToStorage();
  }

  function getRowDisplayName(row: ActionPadRow, index: number): string {
    if (row.id === HIDDEN_ROW_ID) return HIDDEN_ROW_NAME;

    const name = row.name?.trim();
    return name || `Row ${index + 1}`;
  }

  function shouldShowRowTitle(row: ActionPadRow): boolean {
    return Boolean(row.name?.trim());
  }

  function isHiddenRow(rowId: string): boolean {
    return rowId === HIDDEN_ROW_ID;
  }

  function moveActionToSpecialRow(actionId: string, targetRow: ActionPadRow) {
    const nextRows = rows.map(row => ({
      ...row,
      actionIds: row.actionIds.filter(id => id !== actionId)
    }));

    const existingTargetRow = nextRows.find(row => row.id === targetRow.id);
    if (existingTargetRow) {
      existingTargetRow.actionIds = [...existingTargetRow.actionIds, actionId];
    } else {
      nextRows.push({...targetRow, actionIds: [actionId]});
    }

    rows = nextRows;
    saveRowsToStorage();
  }

  function hideAction(actionId: string) {
    moveActionToSpecialRow(actionId, {
      id: HIDDEN_ROW_ID,
      actionIds: [],
      name: HIDDEN_ROW_NAME
    });
  }

  function restoreAction(actionId: string) {
    const defaultRow = rows.find(row => row.id === 'default');
    moveActionToSpecialRow(actionId, defaultRow ?? {id: 'default', actionIds: []});
  }

  function moveDraggedAction(targetRowId: string, targetIndex: number) {
    if (!draggedActionId) return;

    const nextRows = rows.map(row => ({
      ...row,
      actionIds: row.actionIds.filter(actionId => actionId !== draggedActionId)
    }));

    const targetRow = nextRows.find(row => row.id === targetRowId);
    if (!targetRow) return;

    const sourceRow = rows.find(row => row.id === draggedSourceRowId);
    const sourceIndex = sourceRow?.actionIds.indexOf(draggedActionId) ?? -1;
    const adjustedTargetIndex =
      draggedSourceRowId === targetRowId && sourceIndex >= 0 && sourceIndex < targetIndex
        ? targetIndex - 1
        : targetIndex;
    const insertIndex = Math.max(0, Math.min(adjustedTargetIndex, targetRow.actionIds.length));

    targetRow.actionIds = [
      ...targetRow.actionIds.slice(0, insertIndex),
      draggedActionId,
      ...targetRow.actionIds.slice(insertIndex)
    ];

    rows = nextRows;
    saveRowsToStorage();
  }

  function handleActionDragStart(event: DragEvent, rowId: string, actionId: string) {
    if (!isEditMode) return;

    draggedActionId = actionId;
    draggedSourceRowId = rowId;
    event.dataTransfer?.setData('text/plain', actionId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleDragOver(event: DragEvent) {
    if (!isEditMode || !draggedActionId) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDropZoneDragOver(event: DragEvent, rowId: string, index: number) {
    handleDragOver(event);
    if (!isEditMode || !draggedActionId) return;

    activeDropTarget = {rowId, index};
  }

  function handleActionDragOver(event: DragEvent, rowId: string, index: number) {
    handleDragOver(event);
    if (!isEditMode || !draggedActionId) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const isAfter = event.clientX > rect.left + rect.width / 2;
    activeDropTarget = {rowId, index: isAfter ? index + 1 : index};
  }

  function handleDropZoneDragLeave(rowId: string, index: number) {
    if (activeDropTarget?.rowId === rowId && activeDropTarget.index === index) {
      activeDropTarget = null;
    }
  }

  function isDropTarget(rowId: string, index: number): boolean {
    return activeDropTarget?.rowId === rowId && activeDropTarget.index === index;
  }

  function handleDropOnZone(event: DragEvent, rowId: string, index: number) {
    if (!isEditMode || !draggedActionId) return;

    event.preventDefault();
    event.stopPropagation();
    moveDraggedAction(rowId, index);
    activeDropTarget = null;
  }

  function handleActionDragEnd() {
    draggedActionId = null;
    draggedSourceRowId = null;
    activeDropTarget = null;
  }

  function handleActionContextMenu(event: MouseEvent, rowId: string, actionId: string) {
    if (!isEditMode) return;

    event.preventDefault();
    event.stopPropagation();
    if (isHiddenRow(rowId)) {
      restoreAction(actionId);
      return;
    }

    hideAction(actionId);
  }

  // Function to trigger an action
  function triggerAction(action: SessionAction) {
    if (!sessionId) return;

    console.log('Triggering action:', action.label, 'for session:', sessionId);

    // Check if action is ready (not casting or on cooldown)
    if (!cooldownsContext.canUseAction(sessionId, action.id)) {
      console.log('Action on cooldown, ignoring');
      return;
    }

    // Start cast FIRST to mark action as "in use" and prevent double-triggering
    if (action.castTime > 0) {
      cooldownsContext.startCast(sessionId, action.id, action.castTime);
    }

    // Send the key immediately to buffer/queue the action in-game
    sendActionKey(action);

    // After cast time, start cooldown
    if (action.castTime > 0) {
      setTimeout(() => {
        if (action.cooldown > 0) {
          cooldownsContext.startCooldown(sessionId, action.id, action.cooldown);

          // Trigger cooldowns for all actions in the same category
          if (action.cooldownCategory && action.cooldownCategory.trim() !== '') {
            triggerCategoryCooldowns(sessionId, action.cooldownCategory, action.cooldown, action.id);
          }
        }
      }, action.castTime * 1000);
    } else {
      // No cast time, start cooldown immediately
      if (action.cooldown > 0) {
        cooldownsContext.startCooldown(sessionId, action.id, action.cooldown);

        // Trigger cooldowns for all actions in the same category
        if (action.cooldownCategory && action.cooldownCategory.trim() !== '') {
          triggerCategoryCooldowns(sessionId, action.cooldownCategory, action.cooldown, action.id);
        }
      }
    }
  }

  function triggerCategoryCooldowns(sessionId: string, category: string, cooldown: number, excludeActionId: string) {
    // Find the session actions for this session
    const sessionActionsData = mainWindowState.config.sessionActions?.find(sa => sa.sessionId === sessionId);
    if (!sessionActionsData) return;

    // Find all actions with the same category (excluding the one that was just triggered)
    const categoryActions = sessionActionsData.actions.filter(
      a => a.id !== excludeActionId &&
        a.cooldownCategory &&
        a.cooldownCategory.trim() === category.trim()
    );

    // Start cooldown for each action in the category
    categoryActions.forEach(categoryAction => {
      cooldownsContext.startCooldown(sessionId, categoryAction.id, cooldown);
    });
  }

  function sendActionKey(action: SessionAction) {
    if (!sessionId) return;

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


</script>

{#snippet customTitleSnippet()}
  <div class="flex items-center gap-3">
    <div class="flex min-w-0 items-center gap-2">
      <img class="h-4 w-4 shrink-0" src="icons/{sessionIcon}.png" alt="" />
      <span class="truncate">{sessionLabel}</span>
    </div>
    <div class="ml-auto mr-1 flex items-center gap-2">
      <button
        class="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border transition-colors hover:border-input hover:bg-background dark:hover:bg-input/30"
        onclick={() => { isEditMode = !isEditMode; }}
        onmousedown={(e) => e.stopPropagation()}
        title={isEditMode ? 'Done' : 'Edit'}
      >
        {#if isEditMode}
          <Check class="h-3.5 w-3.5" />
        {:else}
          <Settings class="h-3.5 w-3.5" />
        {/if}
      </button>
    </div>
  </div>
{/snippet}

<div style="display: {visible ? 'block' : 'none'};">
  <FloatingWindow
    persistId={PERSIST_ID}
    title="Action Pad - {sessionLabel}"
    defaultWidth={280}
    defaultHeight={360}
    minWidth={250}
    minHeight={110}
    {onClose}
    resizable={true}
    titleSnippet={customTitleSnippet}
    backgroundTransparency={backgroundTransparency}
  >
    <div class="w-full">
      {#if actions.length === 0}
        <div class="flex flex-col items-center justify-center h-full text-center gap-2">
          <Swords class="h-12 w-12 text-muted-foreground opacity-50"/>
          <p class="text-sm text-muted-foreground">No actions configured</p>
          <p class="text-xs text-muted-foreground">
            Configure actions in Settings → Session Actions
          </p>
        </div>
      {:else}
        {#if isEditMode}
          <div class="mb-3 rounded-md border border-border bg-background/40 p-3">
            <div class="mb-2 flex items-center justify-between text-xs">
              <span class="font-medium">Opacity</span>
              <span class="text-muted-foreground" role="presentation" onmousedown={(e) => e.stopPropagation()}>
                {backgroundTransparency}%
              </span>
            </div>
            <div class="flex items-center">
              <input
                id="action-pad-transparency"
                type="range"
                min="0"
                max="100"
                step="1"
                value={backgroundTransparency}
                class="w-full accent-primary"
                onmousedown={(e) => e.stopPropagation()}
                oninput={(e) => updateBackgroundTransparency(e.currentTarget.value)}
              />
            </div>
          </div>
          <p class="mb-3 text-[11px] text-muted-foreground">
            Drag and Drop Actions to reorder them. Right-Click to Hide Actions.
          </p>

        {/if}
        <div class="flex flex-col gap-3">
          {#each organizedActions as row, rowIndex (row.id)}
            <div class="action-row">
              {#if isEditMode}
                {#if isHiddenRow(row.id)}
                  <div class="mb-2 text-xs font-medium text-muted-foreground">
                    {HIDDEN_ROW_NAME}
                  </div>
                {:else}
                  <div class="flex items-center gap-2 mb-2">
                    <input
                      class="h-6 min-w-0 flex-1 rounded border border-border bg-background/40 px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-background/60 focus:border-primary dark:border-input"
                      value={row.name ?? ''}
                      placeholder={getRowDisplayName(row, rowIndex)}
                      onmousedown={(e) => e.stopPropagation()}
                      oninput={(e) => updateRowName(row.id, e.currentTarget.value)}
                    />
                    {#if row.id !== 'default'}
                      <button
                        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-destructive/60 bg-destructive/10 text-destructive transition-colors hover:border-destructive hover:bg-destructive/20"
                        onclick={() => deleteRow(row.id)}
                        title="Delete Row"
                        aria-label="Delete Row"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </button>
                    {/if}
                  </div>
                {/if}
              {:else if shouldShowRowTitle(row)}
                <div class="mb-1 text-xs font-medium text-muted-foreground">
                  {row.name}
                </div>
              {/if}

              <div
                class="relative flex flex-wrap gap-2 min-h-12"
              >
                {#if row.actions.length === 0 && isEditMode}
                  <div
                    class="empty-row-placeholder text-xs text-muted-foreground italic px-3 py-2 border border-dashed rounded transition-colors {isDropTarget(row.id, 0) ? 'border-primary bg-primary/10' : 'border-border'}"
                    ondragover={(event) => handleDropZoneDragOver(event, row.id, 0)}
                    ondragleave={() => handleDropZoneDragLeave(row.id, 0)}
                    ondrop={(event) => handleDropOnZone(event, row.id, 0)}
                    role="button"
                    tabindex="0"
                  >
                    Empty Row - Drag Actions here.
                  </div>
                {/if}
                {#each row.actions as action, actionIndex (action.id)}
                  {#if sessionId}
                    {@const state = getActionStateReactive(action.id)}
                    {@const isOnCooldown = state.cooldownProgress > 0 || state.isCasting}
                    {@const cooldownAngle = (1 - state.cooldownProgress) * 360}

                    {#if isEditMode}
                      <div
                        class="action-drop-zone {actionIndex === 0 ? 'first-drop-zone' : ''} {isDropTarget(row.id, actionIndex) ? 'active' : ''}"
                        ondragover={(event) => handleDropZoneDragOver(event, row.id, actionIndex)}
                        ondragleave={() => handleDropZoneDragLeave(row.id, actionIndex)}
                        ondrop={(event) => handleDropOnZone(event, row.id, actionIndex)}
                        aria-label="Drop action here"
                        role="button"
                        tabindex="0"
                      ></div>
                    {/if}

                    <div
                      class="action-container {draggedActionId === action.id ? 'opacity-40' : ''}"
                      role="presentation"
                      ondragover={(event) => handleActionDragOver(event, row.id, actionIndex)}
                      ondrop={(event) => handleDropOnZone(event, row.id, activeDropTarget?.rowId === row.id ? activeDropTarget.index : actionIndex)}
                    >
                      <button
                        class="action-button relative w-12 h-12 p-0 rounded-md border-2 border-border hover:border-primary transition-all overflow-hidden {!sessionRunning && !isEditMode ? 'session-not-running' : ''}"
                        onclick={() => !isEditMode && sessionRunning && !isOnCooldown && triggerAction(action)}
                        oncontextmenu={(event) => handleActionContextMenu(event, row.id, action.id)}
                        title={formatActionTooltip(action)}
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
                          <Swords class="h-8 w-8 {state.isCasting ? 'brightness-150' : ''}"/>
                        {/if}

                        {#if isEditMode}
                          <div
                            class="absolute left-0.5 top-0.5 cursor-grab rounded bg-black/60 p-0.5 text-white active:cursor-grabbing"
                            draggable="true"
                            ondragstart={(event) => handleActionDragStart(event, row.id, action.id)}
                            ondragend={handleActionDragEnd}
                            role="button"
                            tabindex="0"
                            aria-label="Drag Action"
                          >
                            <GripVertical class="h-3 w-3" />
                          </div>
                          <span
                            class="absolute right-0.5 top-0.5 rounded bg-black/70 p-0.5 text-white hover:bg-primary transition-colors"
                            role="button"
                            tabindex="0"
                            title={isHiddenRow(row.id) ? 'Add Action' : 'Hide Action'}
                            aria-label={isHiddenRow(row.id) ? 'Add Action' : 'Hide Action'}
                            onmousedown={(event) => event.stopPropagation()}
                            onclick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (isHiddenRow(row.id)) {
                                restoreAction(action.id);
                              } else {
                                hideAction(action.id);
                              }
                            }}
                            onkeydown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              event.stopPropagation();
                              if (isHiddenRow(row.id)) {
                                restoreAction(action.id);
                              } else {
                                hideAction(action.id);
                              }
                            }}
                          >
                            {#if isHiddenRow(row.id)}
                              <Plus class="h-3 w-3" />
                            {:else}
                              <EyeOff class="h-3 w-3" />
                            {/if}
                          </span>
                        {/if}

                        <!-- Radial cooldown overlay -->
                        {#if state.cooldownProgress > 0}
                          <div class="absolute inset-0 pointer-events-none">
                            <svg class="w-full h-full" viewBox="0 0 48 48">
                              <defs>
                                <mask id="cooldown-mask-{action.id}">
                                  <rect width="48" height="48" fill="white"/>
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

                        <!-- Cooldown Timer Display - positioned above overlays -->
                        {#if state.cooldownProgress > 0 && state.cooldownEndTime > 0}
                          <div
                            class="absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold text-white bg-black/60 px-0.5 pointer-events-none leading-tight z-10">
                            {formatCooldownTime(state.cooldownEndTime)}
                          </div>
                        {/if}
                      </button>
                    </div>
                  {/if}
                {/each}
                {#if isEditMode && row.actions.length > 0}
                  <div
                    class="action-drop-zone {isDropTarget(row.id, row.actions.length) ? 'active' : ''}"
                    ondragover={(event) => handleDropZoneDragOver(event, row.id, row.actions.length)}
                    ondragleave={() => handleDropZoneDragLeave(row.id, row.actions.length)}
                    ondrop={(event) => handleDropOnZone(event, row.id, row.actions.length)}
                    aria-label="Drop action here"
                    role="button"
                    tabindex="0"
                  ></div>
                {/if}
              </div>
            </div>
          {/each}

          {#if isEditMode}
            <button
              class="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-border px-3 text-xs transition-colors hover:border-input hover:bg-background dark:hover:bg-input/30"
              onclick={addRow}
            >
              <Plus class="h-3.5 w-3.5" />
              Add Row
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

  .action-drop-zone {
    width: 0.5rem;
    min-height: 3rem;
    border-radius: 9999px;
    border: 1px dashed transparent;
    overflow: hidden;
    transition: background-color 120ms ease, border-color 120ms ease, width 120ms ease;
  }

  .action-drop-zone.first-drop-zone {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 1;
    width: 0;
    min-width: 0.75rem;
    opacity: 0;
    pointer-events: none;
  }

  .action-drop-zone.first-drop-zone.active {
    position: static;
    min-width: 0;
    pointer-events: auto;
  }

  .action-drop-zone.active {
    width: 1rem;
    border-color: hsl(var(--primary));
    background-color: hsl(var(--primary) / 0.18);
    opacity: 1;
  }

  .action-row {
    display: flex;
    flex-direction: column;
  }

</style>



