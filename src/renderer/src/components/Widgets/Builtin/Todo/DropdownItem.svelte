<script lang="ts">
  import {getWidgetsContext} from '$lib/contexts/widgetsContext.svelte';
  import {Button} from '$lib/components/ui/button';
  import {ListTodo, X} from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import WidgetLauncherPinButton from '../../Core/WidgetLauncherPinButton.svelte';

  const widgetsContext = getWidgetsContext();
  const WIDGET_TYPE = 'widget.builtin.todo';

  function createWidget() {
    const existing = widgetsContext.getWidgetsByType(WIDGET_TYPE);
    if (existing.length > 0) {
      widgetsContext.showWidget(existing[0].id);
      return;
    }

    widgetsContext.createWidget(WIDGET_TYPE);
  }

  function destroyWidget(id: string) {
    widgetsContext.destroyWidget(id);
  }

  function ignoreActiveWidgetClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  const widgets = $derived(widgetsContext.getWidgetsByType(WIDGET_TYPE));
</script>

{#if widgets.length === 0}
  <DropdownMenu.Item class="justify-between gap-2" onclick={createWidget}>
    <div class="flex min-w-0 items-center gap-2">
      <ListTodo class="h-4 w-4" />
      <span>To-Do</span>
    </div>
    <WidgetLauncherPinButton launcherId="todo" />
  </DropdownMenu.Item>
{:else}
  {#each widgets as widget}
    <DropdownMenu.Item class="justify-between gap-2 data-highlighted:bg-transparent data-highlighted:text-foreground" onclick={ignoreActiveWidgetClick}>
      <div class="flex items-center gap-2">
        <ListTodo class="h-4 w-4" />
        <span>To-Do</span>
      </div>
      <div class="flex items-center gap-1">
        <WidgetLauncherPinButton launcherId="todo" />
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
