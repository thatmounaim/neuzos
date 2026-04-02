<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { getContext } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Globe, Eye, EyeOff, X } from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import type { MainWindowState } from '$lib/types';

  const FLOATING_SESSION_WIDGET_TYPE = 'widget.builtin.floating_session';

  const widgetsContext = getWidgetsContext();
  const mainWindowState = getContext<MainWindowState>('mainWindowState');

  function createWidget(sessionId: string) {
    const existing = widgets.find(widget => widget.data?.sessionId === sessionId);
    if (existing) {
      widgetsContext.showWidget(existing.id);
      return;
    }

    widgetsContext.createWidget(FLOATING_SESSION_WIDGET_TYPE, { sessionId });
  }

  function toggleWidget(id: string) {
    widgetsContext.toggleWidget(id);
  }

  function destroyWidget(id: string) {
    widgetsContext.destroyWidget(id);
  }

  const floatableSessions = $derived(
    mainWindowState.config.sessions
      .filter(session => session.floatable === true)
      .map(session => ({
      id: session.id,
      label: session.label,
      icon: session.icon?.slug || 'misc/browser'
    }))
  );

  const widgets = $derived(widgetsContext.getWidgetsByType(FLOATING_SESSION_WIDGET_TYPE));

  // One floating session widget per session: only show sessions that are not already instanced.
  const availableSessionsForFloating = $derived(
    floatableSessions.filter(sessionInfo => !widgets.some(widget => widget.data?.sessionId === sessionInfo.id))
  );
</script>

{#if floatableSessions.length > 0 || widgets.length > 0}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger>
      <Globe class="h-4 w-4 mr-2" />
      <span>Floating Sessions</span>
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent class="min-w-44">
      {#if availableSessionsForFloating.length > 0}
        {#each availableSessionsForFloating as sessionInfo}
          <DropdownMenu.Item onclick={() => createWidget(sessionInfo.id)}>
            <img class="w-4 h-4 mr-2" src="icons/{sessionInfo.icon}.png" alt="" />
            <span>{sessionInfo.label}</span>
          </DropdownMenu.Item>
        {/each}
      {:else}
        <div class="px-2 py-1.5 text-xs text-muted-foreground">
          {#if floatableSessions.length === 0}
            No floatable sessions configured
          {:else}
            All floatable sessions already have floating widgets
          {/if}
        </div>
      {/if}

      {#if widgets.length > 0}
        <DropdownMenu.Separator />
        <DropdownMenu.Label class="text-xs">Active Floating Sessions ({widgets.length})</DropdownMenu.Label>
        {#each widgets as widget}
          {@const sessionInfo = floatableSessions.find(s => s.id === widget.data?.sessionId)}
          <div class="flex items-center justify-between px-2 py-1.5 text-sm gap-2">
            <div class="flex items-center gap-2">
              <img class="w-4 h-4 mr-2" src="icons/{sessionInfo?.icon || 'misc/browser'}.png" alt="" />
              <span class="text-xs">{sessionInfo?.label || 'Unknown Session'}</span>
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
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
{/if}
