<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Coins, X, Eye, EyeOff, StickyNote, Globe } from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

  const widgetsContext = getWidgetsContext();

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

  function toggleWidget(id: string) {
    widgetsContext.toggleWidget(id);
  }

  function destroyWidget(id: string) {
    widgetsContext.destroyWidget(id);
  }

  const fcoinCalculators = $derived(widgetsContext.getWidgetsByType('widget.builtin.fcoin_calculator'));
  const notepads = $derived(widgetsContext.getWidgetsByType('widget.builtin.notepad'));
  const miniBrowsers = $derived(widgetsContext.getWidgetsByType('widget.builtin.mini_browser'));
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
</DropdownMenu.Group>

{#if widgetsContext.widgets.length === 0}
  <DropdownMenu.Separator />
  <div class="px-2 py-1.5 text-xs text-muted-foreground text-center">
    No active widgets
  </div>
{/if}

