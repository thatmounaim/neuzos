<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { Button } from '$lib/components/ui/button';
  import { StickyNote, Eye, EyeOff, X } from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

  const widgetsContext = getWidgetsContext();

  function createWidget() {
    // Check if one already exists
    const existing = widgetsContext.getWidgetsByType('widget.builtin.notepad');
    if (existing.length > 0) {
      // Show the existing one if hidden
      widgetsContext.showWidget(existing[0].id);
      return;
    }
    widgetsContext.createWidget('widget.builtin.notepad');
  }

  function toggleWidget(id: string) {
    widgetsContext.toggleWidget(id);
  }

  function destroyWidget(id: string) {
    widgetsContext.destroyWidget(id);
  }

  const widgets = $derived(widgetsContext.getWidgetsByType('widget.builtin.notepad'));
</script>

{#if widgets.length === 0}
  <DropdownMenu.Item onclick={createWidget}>
    <StickyNote class="h-4 w-4 mr-2" />
    <span>Notepad</span>
  </DropdownMenu.Item>
{:else}
  {#each widgets as widget}
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

