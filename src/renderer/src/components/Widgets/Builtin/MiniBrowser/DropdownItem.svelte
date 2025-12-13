<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Globe, Eye, EyeOff, X } from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

  const widgetsContext = getWidgetsContext();

  function createWidget() {
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

  const widgets = $derived(widgetsContext.getWidgetsByType('widget.builtin.mini_browser'));
</script>

<!-- Always show create (instanced) -->
<DropdownMenu.Item onclick={createWidget}>
  <Globe class="h-4 w-4 mr-2" />
  <span>Mini Browser</span>
</DropdownMenu.Item>

<!-- Show active browser instances -->
{#if widgets.length > 0}
  <DropdownMenu.Separator />
  <DropdownMenu.Label class="text-xs">Active Browsers ({widgets.length})</DropdownMenu.Label>
  {#each widgets as widget}
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

