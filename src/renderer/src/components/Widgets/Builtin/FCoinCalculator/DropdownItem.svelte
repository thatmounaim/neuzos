<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Coins, X } from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import WidgetLauncherPinButton from '../../Core/WidgetLauncherPinButton.svelte';

  const widgetsContext = getWidgetsContext();

  function createWidget() {
    // Check if one already exists
    const existing = widgetsContext.getWidgetsByType('widget.builtin.fcoin_calculator');
    if (existing.length > 0) {
      // Show the existing one if hidden
      widgetsContext.showWidget(existing[0].id);
      return;
    }
    widgetsContext.createWidget('widget.builtin.fcoin_calculator');
  }

  function destroyWidget(id: string) {
    widgetsContext.destroyWidget(id);
  }

  function ignoreActiveWidgetClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  const widgets = $derived(widgetsContext.getWidgetsByType('widget.builtin.fcoin_calculator'));
</script>

{#if widgets.length === 0}
  <DropdownMenu.Item class="justify-between gap-2" onclick={createWidget}>
    <div class="flex min-w-0 items-center gap-2">
      <Coins class="h-4 w-4" />
      <span>FCoin Calculator</span>
    </div>
    <WidgetLauncherPinButton launcherId="fcoin_calculator" />
  </DropdownMenu.Item>
{:else}
  {#each widgets as widget}
    <DropdownMenu.Item class="justify-between gap-2 data-highlighted:bg-transparent data-highlighted:text-foreground" onclick={ignoreActiveWidgetClick}>
      <div class="flex items-center gap-2">
        <Coins class="h-4 w-4" />
        <span>FCoin Calculator</span>
      </div>
      <div class="flex items-center gap-1">
        <WidgetLauncherPinButton launcherId="fcoin_calculator" />
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
    </DropdownMenu.Item>
  {/each}
{/if}

