<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { getContext } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Swords, Eye, EyeOff, X } from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import type { MainWindowState } from '$lib/types';

  const widgetsContext = getWidgetsContext();
  const mainWindowState = getContext<MainWindowState>('mainWindowState');

  function createWidget(sessionId: string) {
    widgetsContext.createWidget('widget.builtin.action_pad', { sessionId });
  }

  function toggleWidget(id: string) {
    widgetsContext.toggleWidget(id);
  }

  function destroyWidget(id: string) {
    widgetsContext.destroyWidget(id);
  }

  // Get all sessions that have actions configured
  const allSessionsWithActions = $derived(
    mainWindowState.config.sessionActions
      ?.filter(sa => sa.actions && sa.actions.length > 0)
      .map(sa => {
        const session = mainWindowState.config.sessions.find(s => s.id === sa.sessionId);
        return {
          id: sa.sessionId,
          label: session?.label || 'Unknown Session',
          icon: session?.icon?.slug || 'misc/browser',
          actionsCount: sa.actions.length
        };
      }) || []
  );

  const widgets = $derived(widgetsContext.getWidgetsByType('widget.builtin.action_pad'));

  // Get sessions that don't already have an action pad (for the creation dropdown)
  const availableSessionsForActionPad = $derived(
    allSessionsWithActions.filter(sessionInfo => {
      const existingPad = widgets.find(w => w.data?.sessionId === sessionInfo.id);
      return !existingPad;
    })
  );
</script>

{#if allSessionsWithActions.length > 0}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger>
      <Swords class="h-4 w-4 mr-2" />
      <span>Action Pad</span>
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent>
      {#if availableSessionsForActionPad.length > 0}
        {#each availableSessionsForActionPad as sessionInfo}
          <DropdownMenu.Item onclick={() => createWidget(sessionInfo.id)}>
            <img class="w-4 h-4 mr-2" src="icons/{sessionInfo.icon}.png" alt="" />
            <span>{sessionInfo.label}</span>
            <span class="ml-auto text-[10px] opacity-50">({sessionInfo.actionsCount})</span>
          </DropdownMenu.Item>
        {/each}
      {:else}
        <div class="px-2 py-1.5 text-xs text-muted-foreground">
          All sessions have action pads
        </div>
      {/if}
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>

  <!-- Show active action pad instances -->
  {#if widgets.length > 0}
    <DropdownMenu.Separator />
    <DropdownMenu.Label class="text-xs">Active Action Pads ({widgets.length})</DropdownMenu.Label>
    {#each widgets as widget}
      {@const sessionInfo = allSessionsWithActions.find(s => s.id === widget.data?.sessionId)}
      <div class="flex items-center justify-between px-2 py-1.5 text-sm gap-2">
        <div class="flex items-center gap-2">
          <Swords class="h-4 w-4" />
          <span class="text-xs">{sessionInfo?.label || 'Unknown'}</span>
        </div>
        <div class="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            class="h-6 w-6"
            onclick={() => toggleWidget(widget.id)}
            title={widget.visible ? 'Hide' : 'Show'}
          >
            {#if widget.visible}
              <Eye class="h-3 w-3" />
            {:else}
              <EyeOff class="h-3 w-3" />
            {/if}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            class="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
            onclick={() => destroyWidget(widget.id)}
            title="Close"
          >
            <X class="h-3 w-3" />
          </Button>
        </div>
      </div>
    {/each}
  {/if}
{/if}

