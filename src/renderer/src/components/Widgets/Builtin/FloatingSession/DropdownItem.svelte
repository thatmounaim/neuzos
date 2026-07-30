<script lang="ts">
  import {getContext} from 'svelte';
  import {Eye, EyeOff, PictureInPicture2, Settings, X} from '@lucide/svelte';
  import {Button} from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import {getWidgetsContext} from '$lib/contexts/widgetsContext.svelte';
  import type {MainWindowState} from '$lib/types';

  type Props = {
    onManageSessions?: () => void;
  };

  let {onManageSessions}: Props = $props();

  const FLOATING_SESSION_WIDGET_TYPE = 'widget.builtin.floating_session';

  const widgetsContext = getWidgetsContext();
  const mainWindowState = getContext<MainWindowState>('mainWindowState');

  const allSessions = $derived(
    mainWindowState.config.sessions.map(session => ({
      id: session.id,
      label: session.label,
      icon: session.icon?.slug || 'misc/browser'
    }))
  );

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

  const availableSessionsForFloating = $derived(
    floatableSessions.filter(sessionInfo => !widgets.some(widget => widget.data?.sessionId === sessionInfo.id))
  );

  function createWidget(sessionId: string) {
    const existing = widgets.find(widget => widget.data?.sessionId === sessionId);
    if (existing) {
      widgetsContext.showWidget(existing.id);
      return;
    }

    widgetsContext.createWidget(FLOATING_SESSION_WIDGET_TYPE, {sessionId});
  }

</script>

<DropdownMenu.Sub>
  <DropdownMenu.SubTrigger>
    <PictureInPicture2 class="mr-2 size-4" />
    <span>Floating Sessions</span>
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent side="right" class="min-w-44 overflow-visible">
    <DropdownMenu.Item onclick={() => onManageSessions?.()}>
      <Settings class="mr-2 size-4" />
      <span>Manage Sessions</span>
    </DropdownMenu.Item>
    {#if availableSessionsForFloating.length > 0}
      <DropdownMenu.Separator />
      {#each availableSessionsForFloating as sessionInfo}
        <DropdownMenu.Item onSelect={(event) => event.preventDefault()} onclick={() => createWidget(sessionInfo.id)}>
          <img class="mr-2 size-4" src="icons/{sessionInfo.icon}.png" alt="" />
          <span>{sessionInfo.label}</span>
        </DropdownMenu.Item>
      {/each}
    {/if}

    {#if widgets.length > 0}
      <DropdownMenu.Separator />
      <DropdownMenu.Label class="text-xs">Active Floating Sessions ({widgets.length})</DropdownMenu.Label>
      {#each widgets as widget}
        {@const sessionInfo = allSessions.find(session => session.id === widget.data?.sessionId)}
        <div class="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
          <div class="flex min-w-0 items-center gap-2">
            <img class="size-4" src="icons/{sessionInfo?.icon || 'misc/browser'}.png" alt="" />
            <span class="truncate text-xs">{sessionInfo?.label || 'Unknown Session'}</span>
          </div>
          <div class="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              class="size-6"
              onclick={() => widgetsContext.toggleWidget(widget.id)}
              title={widget.visible ? 'Hide' : 'Show'}
            >
              {#if widget.visible}
                <Eye class="size-3" />
              {:else}
                <EyeOff class="size-3" />
              {/if}
            </Button>
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
        </div>
      {/each}
    {/if}
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>
