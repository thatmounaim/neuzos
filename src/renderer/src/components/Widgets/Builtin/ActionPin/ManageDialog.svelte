<script lang="ts">
  import {getContext, onMount} from 'svelte';
  import {ChevronDown} from '@lucide/svelte';
  import {Checkbox} from '$lib/components/ui/checkbox';
  import * as Dialog from '$lib/components/ui/dialog';
  import {Switch} from '$lib/components/ui/switch';
  import {getWidgetsContext} from '$lib/contexts/widgetsContext.svelte';
  import {neuzosBridge} from '$lib/core';
  import {readActionPinsAutoLoadLatest, writeActionPinsAutoLoadLatest} from '$lib/localStorageStores';
  import type {MainWindowState} from '$lib/types';

  type Props = {
    open?: boolean;
  };

  let {open = $bindable(false)}: Props = $props();

  const ACTION_PIN_WIDGET_TYPE = 'widget.builtin.action_pin';
  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  const widgetsContext = getWidgetsContext();

  let autoLoadLatestPins = $state(false);
  let didInitAutoLoadPreference = false;
  let didInitExpandedSessions = false;
  let expandedSessionIds = $state<string[]>([]);

  const managedSessionActions = $derived(
    (mainWindowState.config.sessionActions ?? []).map(sessionActions => {
      const session = mainWindowState.config.sessions.find(candidate => candidate.id === sessionActions.sessionId);
      return {
        id: sessionActions.sessionId,
        label: session?.label || 'Unknown Session',
        icon: session?.icon?.slug || 'misc/browser',
        actions: sessionActions.actions ?? []
      };
    })
  );

  const actionPinWidgets = $derived(widgetsContext.getWidgetsByType(ACTION_PIN_WIDGET_TYPE));

  function handleOpenChange(nextOpen: boolean) {
    open = nextOpen;
    if (nextOpen && !didInitExpandedSessions) {
      expandedSessionIds = managedSessionActions.map(session => session.id);
      didInitExpandedSessions = true;
    }
  }

  function toggleSessionExpanded(sessionId: string) {
    expandedSessionIds = expandedSessionIds.includes(sessionId)
      ? expandedSessionIds.filter(id => id !== sessionId)
      : [...expandedSessionIds, sessionId];
  }

  function setActionPinned(sessionId: string, actionId: string, pinned: boolean) {
    const action = mainWindowState.config.sessionActions
      ?.find(sessionActions => sessionActions.sessionId === sessionId)
      ?.actions.find(candidate => candidate.id === actionId);

    if (!action) return;
    action.pinned = pinned;
    void neuzosBridge.config.saveSilent(mainWindowState.config);
  }

  function isSessionPinned(sessionId: string) {
    return actionPinWidgets.some(widget => widget.data?.sessionId === sessionId);
  }

  function setSessionPinned(sessionId: string, pinned: boolean) {
    const existingWidgets = actionPinWidgets.filter(widget => widget.data?.sessionId === sessionId);
    if (pinned && existingWidgets.length === 0) {
      widgetsContext.createWidget(ACTION_PIN_WIDGET_TYPE, {sessionId});
    } else if (!pinned) {
      existingWidgets.forEach(widget => widgetsContext.destroyWidget(widget.id));
    }
  }

  onMount(() => {
    autoLoadLatestPins = readActionPinsAutoLoadLatest();
    didInitAutoLoadPreference = true;
  });

  $effect(() => {
    if (!didInitAutoLoadPreference) return;
    writeActionPinsAutoLoadLatest(autoLoadLatestPins);
  });
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="w-[calc(100%-2rem)] sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Manage Action Pins</Dialog.Title>
      <Dialog.Description>
        Select which Session Actions are Pinned to the Mainbar.
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex items-center justify-between gap-4 rounded-md border p-3">
      <div class="min-w-0 space-y-1">
        <div class="text-sm font-medium">Save Action Pins</div>
        <p class="text-xs text-muted-foreground">Pinned Actions persist after restarting NeuzOS</p>
      </div>
      <Switch bind:checked={autoLoadLatestPins} />
    </div>

    <div class="max-h-[min(28rem,55vh)] overflow-y-auto rounded-md border">
      {#if managedSessionActions.length === 0}
        <div class="px-4 py-8 text-center text-sm text-muted-foreground">No Session Actions Configured.</div>
      {:else}
        {#each managedSessionActions as sessionInfo, sessionIndex (sessionInfo.id)}
          {@const expanded = expandedSessionIds.includes(sessionInfo.id)}
          <div class:border-b={sessionIndex < managedSessionActions.length - 1}>
            <div class="flex min-h-11 items-center transition-colors hover:bg-muted/50">
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                onclick={() => toggleSessionExpanded(sessionInfo.id)}
                aria-expanded={expanded}
              >
                <ChevronDown class="size-4 shrink-0 transition-transform {expanded ? '' : '-rotate-90'}" />
                <img class="size-5 shrink-0" src="icons/{sessionInfo.icon}.png" alt="" />
                <span class="truncate text-sm font-medium">{sessionInfo.label}</span>
              </button>
              <Checkbox
                class="mr-3"
                checked={isSessionPinned(sessionInfo.id)}
                disabled={!isSessionPinned(sessionInfo.id) && !sessionInfo.actions.some(action => action.pinned)}
                onCheckedChange={(checked) => setSessionPinned(sessionInfo.id, checked)}
                aria-label="Pin {sessionInfo.label} Actions to the Mainbar"
              />
            </div>

            {#if expanded}
              <div class="border-t bg-muted/15">
                {#if sessionInfo.actions.length > 0}
                  {#each sessionInfo.actions as action, actionIndex (action.id)}
                    <div class="flex min-h-11 items-center justify-between gap-3 px-4 py-2 pl-10" class:border-b={actionIndex < sessionInfo.actions.length - 1}>
                      <div class="flex min-w-0 items-center gap-2">
                        <img class="size-5 shrink-0" src="icons/{action.icon?.slug || 'neuzos_pang'}.png" alt="" />
                        <span class="truncate text-sm">{action.label}</span>
                      </div>
                      <Switch
                        checked={action.pinned ?? false}
                        onCheckedChange={(checked) => setActionPinned(sessionInfo.id, action.id, checked)}
                      />
                    </div>
                  {/each}
                {:else}
                  <div class="px-4 py-4 pl-10 text-xs text-muted-foreground">No Actions Configured.</div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
