<script lang="ts">
  import {getContext} from 'svelte';
  import {RadioTower, RotateCcw} from '@lucide/svelte';
  import {toast} from 'svelte-sonner';
  import {Button} from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import {Switch} from '$lib/components/ui/switch';
  import {getWidgetsContext} from '$lib/contexts/widgetsContext.svelte';
  import {neuzosBridge} from '$lib/core';
  import type {MainWindowState, NeuzSession} from '$lib/types';

  type Props = {
    open?: boolean;
  };

  let {open = $bindable(false)}: Props = $props();

  const FLOATING_SESSION_WIDGET_TYPE = 'widget.builtin.floating_session';
  const widgetsContext = getWidgetsContext();
  const mainWindowState = getContext<MainWindowState>('mainWindowState');

  const enabledSessions = $derived(mainWindowState.config.sessions.filter(session => session.floatable === true));
  const disabledSessions = $derived(mainWindowState.config.sessions.filter(session => session.floatable !== true));
  const widgets = $derived(widgetsContext.getWidgetsByType(FLOATING_SESSION_WIDGET_TYPE));

  function handleOpenChange(nextOpen: boolean) {
    open = nextOpen;
    if (nextOpen) {
      const receiverSession = mainWindowState.config.sessions.find(
        session => session.id === mainWindowState.config.syncReceiverSessionId
      );
      if (receiverSession?.floatable !== true && mainWindowState.config.syncReceiverSessionId) {
        mainWindowState.config.syncReceiverSessionId = null;
        neuzosBridge.sessions.setSyncReceiver(null);
        void neuzosBridge.config.saveSilent(mainWindowState.config);
      }
    }
  }

  function isActiveReceiver(sessionId: string) {
    return mainWindowState.config.syncReceiverSessionId === sessionId;
  }

  function toggleActiveReceiver(sessionId: string) {
    const nextReceiverId = isActiveReceiver(sessionId) ? null : sessionId;
    mainWindowState.config.syncReceiverSessionId = nextReceiverId;
    neuzosBridge.sessions.setSyncReceiver(nextReceiverId);
    void neuzosBridge.config.saveSilent(mainWindowState.config);
  }

  function setSessionFloatable(session: NeuzSession, enabled: boolean) {
    if (enabled) {
      session.floatable = true;
    } else {
      delete session.floatable;
      if (isActiveReceiver(session.id)) {
        mainWindowState.config.syncReceiverSessionId = null;
        neuzosBridge.sessions.setSyncReceiver(null);
      }
    }

    void neuzosBridge.config.saveSilent(mainWindowState.config);
  }

  function resetPosition(sessionId: string) {
    const widget = widgets.find(candidate => candidate.data?.sessionId === sessionId);

    widgetsContext.resetFloatingSessionPosition(sessionId);
    if (widget) widgetsContext.triggerWidgetReset(widget.id);
    toast.message('Position Reset', {
      description: 'Floating Session Position has been reset.'
    });
  }
</script>

{#snippet sessionRow(session: NeuzSession)}
  <div class="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
    <div class="flex min-w-0 items-center gap-2">
      <img class="size-5 shrink-0" src="icons/{session.icon?.slug || 'misc/browser'}.png" alt="" />
      <span class="truncate text-sm">{session.label}</span>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      {#if session.floatable === true}
        <Button
          size="icon"
          variant="ghost"
          class="size-8 border {isActiveReceiver(session.id) ? 'border-foreground bg-accent text-foreground' : 'border-transparent text-muted-foreground/40 hover:text-muted-foreground/70'}"
          onclick={() => toggleActiveReceiver(session.id)}
          title={isActiveReceiver(session.id) ? 'Active Receiver Session' : 'Set as Active Receiver Session'}
        >
          <RadioTower class="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          class="size-8"
          onclick={() => resetPosition(session.id)}
          title="Reset Position"
        >
          <RotateCcw class="size-4" />
        </Button>
      {/if}
      <Switch
        checked={session.floatable ?? false}
        onCheckedChange={(checked) => setSessionFloatable(session, checked)}
      />
    </div>
  </div>
{/snippet}

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="w-[calc(100%-2rem)] sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Manage Floating Sessions</Dialog.Title>
      <Dialog.Description>
        Select which Sessions are allowed to be opened in a Floating Window.
      </Dialog.Description>
    </Dialog.Header>

    <div class="max-h-[min(28rem,60vh)] overflow-y-auto rounded-md border">
      {#if mainWindowState.config.sessions.length === 0}
        <div class="px-4 py-8 text-center text-sm text-muted-foreground">No Sessions Configured.</div>
      {:else}
        {#if enabledSessions.length > 0}
          <div class="border-b bg-muted/35 px-3 py-2 text-xs font-medium text-muted-foreground">
            Active Floating Sessions
          </div>
          {#each enabledSessions as session, index (session.id)}
            <div class:border-b={index < enabledSessions.length - 1 || disabledSessions.length > 0}>
              {@render sessionRow(session)}
            </div>
          {/each}
        {/if}

        {#if disabledSessions.length > 0}
          {#if enabledSessions.length > 0}
            <div class="border-b bg-muted/35 px-3 py-2 text-xs font-medium text-muted-foreground">
              Available Sessions
            </div>
          {/if}
          {#each disabledSessions as session, index (session.id)}
            <div class:border-b={index < disabledSessions.length - 1}>
              {@render sessionRow(session)}
            </div>
          {/each}
        {/if}
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
