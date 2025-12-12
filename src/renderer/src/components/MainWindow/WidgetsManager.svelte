<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import BuiltinWidgetFCoinCalculator from "../Widgets/Builtin/BuiltinWidgetFCoinCalculator.svelte";
  import BuiltinWidgetNotepad from "../Widgets/Builtin/BuiltinWidgetNotepad.svelte";
  import BuiltinWidgetMiniBrowser from "../Widgets/Builtin/BuiltinWidgetMiniBrowser.svelte";

  // Get the widgets context from App
  const widgetsContext = getWidgetsContext();
</script>

{#each widgetsContext.widgets as widget (widget.id)}
  {#if widget.type === 'widget.builtin.fcoin_calculator'}
    <BuiltinWidgetFCoinCalculator
      visible={widget.visible}
      data={widget.data}
      onClose={() => widgetsContext.destroyWidget(widget.id)}
      onHide={() => widgetsContext.hideWidget(widget.id)}
    />
  {:else if widget.type === 'widget.builtin.notepad'}
    <BuiltinWidgetNotepad
      visible={widget.visible}
      data={widget.data}
      onClose={() => widgetsContext.destroyWidget(widget.id)}
      onHide={() => widgetsContext.hideWidget(widget.id)}
    />
  {:else if widget.type === 'widget.builtin.mini_browser'}
    <BuiltinWidgetMiniBrowser
      visible={widget.visible}
      data={widget.data}
      onClose={() => widgetsContext.destroyWidget(widget.id)}
      onHide={() => widgetsContext.hideWidget(widget.id)}
    />
  {/if}
{/each}


