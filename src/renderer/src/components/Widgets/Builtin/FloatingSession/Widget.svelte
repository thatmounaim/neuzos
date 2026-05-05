<script lang="ts">
  import FloatingWindow from '../../../Shared/FloatingWindow.svelte';
  import NeuzClient from '../../../Shared/NeuzClient.svelte';
  import { Globe } from '@lucide/svelte';
  import { getContext } from 'svelte';
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import type { MainWindowState } from '$lib/types';

  interface Props {
    widgetId?: string;
    visible?: boolean;
    onClose?: () => void;
    onHide?: () => void;
    data?: { sessionId?: string };
  }

  let { widgetId, visible = true, onClose, onHide, data }: Props = $props();
  let windowRef: FloatingWindow;

  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  const widgetsContext = getWidgetsContext();

  const sessionId = $derived(data?.sessionId);
  const session = $derived(mainWindowState.sessions.find(s => s.id === sessionId));
  const sessionLabel = $derived(session?.label || 'Unknown Session');
  const sessionIcon = $derived(session?.icon?.slug || 'misc/browser');
  const layoutId = $derived(`floating-session-${sessionId || 'unknown'}`);

  function handleClientUpdate(_sessionId: string) {
    // Floating widget does not need to update outer state on client events.
  }

  export function reset() {
    windowRef?.reset();
  }

  // Watch for reset signals
  $effect(() => {
    if (widgetsContext.widgetResetSignal.value === widgetId) {
      reset();
    }
  });
</script>

<div style="display: {visible ? 'block' : 'none'};">
  <FloatingWindow
    bind:this={windowRef}
    persistId={sessionId ? `widget.builtin.floating_session.session-${sessionId}` : undefined}
    defaultX={150}
    defaultY={100}
    defaultWidth={500}
    defaultHeight={760}
    minWidth={360}
    minHeight={480}
    onClose={onClose}
    onHide={onHide}
  >
    {#snippet titleSnippet()}
      <div class="flex items-center gap-2 min-w-0">
        <img class="w-4 h-4 shrink-0" src="icons/{sessionIcon}.png" alt="" />
        <span class="truncate">{sessionLabel}</span>
      </div>
    {/snippet}

    <div class="h-full -m-3 bg-background">
      {#if session}
        <NeuzClient
          layoutId={layoutId}
          autofocusEnabled={true}
          {session}
          onUpdate={handleClientUpdate}
          src={session.srcOverwrite || 'https://universe.flyff.com/play'}
          userAgent={mainWindowState.config.userAgent}
        />
      {:else}
        <div class="h-full w-full flex items-center justify-center text-sm text-muted-foreground gap-2">
          <Globe class="h-4 w-4" />
          <span>Session not found</span>
        </div>
      {/if}
    </div>
  </FloatingWindow>
</div>

