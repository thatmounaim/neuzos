<script lang="ts">
  import {getContext} from 'svelte';
  import {Settings, Swords, X} from '@lucide/svelte';
  import {Button} from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import {getWidgetsContext} from '$lib/contexts/widgetsContext.svelte';
  import type {MainWindowState} from '$lib/types';

  type Props = {
    onManagePins?: () => void;
  };

  let {onManagePins}: Props = $props();

  const ACTION_PIN_WIDGET_TYPE = 'widget.builtin.action_pin';
  const widgetsContext = getWidgetsContext();
  const mainWindowState = getContext<MainWindowState>('mainWindowState');

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

  const allSessionsWithPinnedActions = $derived(
    managedSessionActions
      .map(sessionInfo => ({
        id: sessionInfo.id,
        label: sessionInfo.label,
        icon: sessionInfo.icon,
        actionsCount: sessionInfo.actions.filter(action => action.pinned).length
      }))
      .filter(sessionInfo => sessionInfo.actionsCount > 0)
  );

  const widgets = $derived(widgetsContext.getWidgetsByType(ACTION_PIN_WIDGET_TYPE));

  const availableSessionsForActionPin = $derived(
    allSessionsWithPinnedActions.filter(sessionInfo => {
      const existingPin = widgets.find(widget => widget.data?.sessionId === sessionInfo.id);
      return !existingPin;
    })
  );
</script>

<DropdownMenu.Sub>
  <DropdownMenu.SubTrigger>
    <Swords class="mr-2 size-4" />
    <span>Action Pins</span>
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent side="right" class="min-w-44">
    <DropdownMenu.Item onclick={() => onManagePins?.()}>
      <Settings class="mr-2 size-4" />
      <span>Manage Pins</span>
    </DropdownMenu.Item>
    {#if availableSessionsForActionPin.length > 0}
      <DropdownMenu.Separator />
      {#each availableSessionsForActionPin as sessionInfo}
        <DropdownMenu.Item
          onSelect={(event) => event.preventDefault()}
          onclick={() => widgetsContext.createWidget(ACTION_PIN_WIDGET_TYPE, {sessionId: sessionInfo.id})}
        >
          <img class="mr-2 size-4" src="icons/{sessionInfo.icon}.png" alt="" />
          <span>{sessionInfo.label}</span>
          <span class="ml-auto text-[10px] opacity-50">({sessionInfo.actionsCount})</span>
        </DropdownMenu.Item>
      {/each}
    {/if}

    {#if widgets.length > 0}
      <DropdownMenu.Separator />
      <DropdownMenu.Label class="text-xs">Active Action Pins ({widgets.length})</DropdownMenu.Label>
      {#each widgets as widget}
        {@const sessionInfo = managedSessionActions.find(session => session.id === widget.data?.sessionId)}
        <div class="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
          <div class="flex min-w-0 items-center gap-2">
            <img class="size-4" src="icons/{sessionInfo?.icon || 'misc/browser'}.png" alt="" />
            <span class="truncate text-xs">{sessionInfo?.label || 'Unknown Session'}</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            class="size-6 hover:bg-destructive hover:text-destructive-foreground"
            onclick={() => widgetsContext.destroyWidget(widget.id)}
            title="Close"
          >
            <X class="size-3" />
          </Button>
        </div>
      {/each}
    {/if}
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>
