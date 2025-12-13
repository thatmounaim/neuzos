<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Coins, X, Eye, EyeOff, StickyNote, Globe, Swords } from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { getContext } from 'svelte';
  import type { MainWindowState } from '$lib/types';

  const widgetsContext = getWidgetsContext();
  const mainWindowState = getContext<MainWindowState>('mainWindowState');

  function createFCoinCalculator() {
    // Check if one already exists
    const existing = widgetsContext.getWidgetsByType('widget.builtin.fcoin_calculator');
    if (existing.length > 0) {
      // Show the existing one if hidden
      widgetsContext.showWidget(existing[0].id);
      return;
    }
    widgetsContext.createWidget('widget.builtin.fcoin_calculator');
  }

  function createNotepad() {
    // Check if one already exists
    const existing = widgetsContext.getWidgetsByType('widget.builtin.notepad');
    if (existing.length > 0) {
      // Show the existing one if hidden
      widgetsContext.showWidget(existing[0].id);
      return;
    }
    widgetsContext.createWidget('widget.builtin.notepad');
  }

  function createMiniBrowser() {
    // Instanced widget - find the first available instance number
    const currentBrowsers = widgetsContext.getWidgetsByType('widget.builtin.mini_browser');
    const usedNumbers = new Set(currentBrowsers.map(w => w.data?.instanceNumber).filter(n => n));

    // Find the first free number starting from 1
    let instanceNumber = 1;
    while (usedNumbers.has(instanceNumber)) {
      instanceNumber++;
    }

    widgetsContext.createWidget('widget.builtin.mini_browser', { instanceNumber });
  }

  function createActionPad(sessionId: string) {
    widgetsContext.createWidget('widget.builtin.action_pad', { sessionId });
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

  // Get sessions that don't already have an action pad (for the creation dropdown)
  const availableSessionsForActionPad = $derived(
    allSessionsWithActions.filter(sessionInfo => {
      const existingPad = actionPads.find(w => w.data?.sessionId === sessionInfo.id);
      return !existingPad;
    })
  );

  function toggleWidget(id: string) {
    widgetsContext.toggleWidget(id);
  }

  function destroyWidget(id: string) {
    widgetsContext.destroyWidget(id);
  }

  const fcoinCalculators = $derived(widgetsContext.getWidgetsByType('widget.builtin.fcoin_calculator'));
  const notepads = $derived(widgetsContext.getWidgetsByType('widget.builtin.notepad'));
  const miniBrowsers = $derived(widgetsContext.getWidgetsByType('widget.builtin.mini_browser'));
  const actionPads = $derived(widgetsContext.getWidgetsByType('widget.builtin.action_pad'));
</script>

<DropdownMenu.Group>
  <!-- FCoin Calculator -->
  {#if fcoinCalculators.length === 0}
    <DropdownMenu.Item onclick={createFCoinCalculator}>
      <Coins class="h-4 w-4 mr-2" />
      <span>FCoin Calculator</span>
    </DropdownMenu.Item>
  {:else}
    {#each fcoinCalculators as widget}
      <div class="flex items-center justify-between px-2 py-1.5 text-sm gap-2">
        <div class="flex items-center gap-2">
          <Coins class="h-4 w-4" />
          <span>FCoin Calculator</span>
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

  <!-- Notepad -->
  {#if notepads.length === 0}
    <DropdownMenu.Item onclick={createNotepad}>
      <StickyNote class="h-4 w-4 mr-2" />
      <span>Notepad</span>
    </DropdownMenu.Item>
  {:else}
    {#each notepads as widget}
      <div class="flex items-center justify-between px-2 py-1.5 text-sm gap-2">
        <div class="flex items-center gap-2">
          <StickyNote class="h-4 w-4" />
          <span>Notepad</span>
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

  <!-- Mini Browser - Always show create (instanced) -->
  <DropdownMenu.Item onclick={createMiniBrowser}>
    <Globe class="h-4 w-4 mr-2" />
    <span>Mini Browser</span>
  </DropdownMenu.Item>

  <!-- Show active browser instances -->
  {#if miniBrowsers.length > 0}
    <DropdownMenu.Separator />
    <DropdownMenu.Label class="text-xs">Active Browsers ({miniBrowsers.length})</DropdownMenu.Label>
    {#each miniBrowsers as widget}
      <div class="flex items-center justify-between px-2 py-1.5 text-sm gap-2">
        <div class="flex items-center gap-2">
          <Globe class="h-4 w-4" />
          <span class="text-xs">Browser <span class="text-[10px] opacity-50">({widget.data?.instanceNumber || '?'})</span></span>
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

  <!-- Action Pad - Instanced per session with actions -->
  {#if allSessionsWithActions.length > 0}
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>
        <Swords class="h-4 w-4 mr-2" />
        <span>Action Pad</span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        {#if availableSessionsForActionPad.length > 0}
          {#each availableSessionsForActionPad as sessionInfo}
            <DropdownMenu.Item onclick={() => createActionPad(sessionInfo.id)}>
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
    {#if actionPads.length > 0}
      <DropdownMenu.Separator />
      <DropdownMenu.Label class="text-xs">Active Action Pads ({actionPads.length})</DropdownMenu.Label>
      {#each actionPads as widget}
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
</DropdownMenu.Group>

{#if widgetsContext.widgets.length === 0}
  <DropdownMenu.Separator />
  <div class="px-2 py-1.5 text-xs text-muted-foreground text-center">
    No active widgets
  </div>
{/if}

