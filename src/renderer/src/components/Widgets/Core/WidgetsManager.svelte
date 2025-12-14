<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte.js';
  import FCoinCalculatorWidget from "../Builtin/FCoinCalculator/Widget.svelte";
  import NotepadWidget from "../Builtin/Notepad/Widget.svelte";
  import MiniBrowserWidget from "../Builtin/MiniBrowser/Widget.svelte";
  import ActionPadWidget from "../Builtin/ActionPad/Widget.svelte";
  // Get the widgets context from App
  const widgetsContext = getWidgetsContext();
</script>

{#each widgetsContext.widgets as widget (widget.id)}
  {#if widget.type === 'widget.builtin.fcoin_calculator'}
    <FCoinCalculatorWidget
      visible={widget.visible}
      data={widget.data}
      onClose={() => widgetsContext.destroyWidget(widget.id)}
      onHide={() => widgetsContext.hideWidget(widget.id)}
    />
  {:else if widget.type === 'widget.builtin.notepad'}
    <NotepadWidget
      visible={widget.visible}
      data={widget.data}
      onClose={() => widgetsContext.destroyWidget(widget.id)}
      onHide={() => widgetsContext.hideWidget(widget.id)}
    />
  {:else if widget.type === 'widget.builtin.mini_browser'}
    <MiniBrowserWidget
      visible={widget.visible}
      data={widget.data}
      onClose={() => widgetsContext.destroyWidget(widget.id)}
      onHide={() => widgetsContext.hideWidget(widget.id)}
    />
  {:else if widget.type === 'widget.builtin.action_pad'}
    <ActionPadWidget
      visible={widget.visible}
      data={widget.data}
      onClose={() => widgetsContext.destroyWidget(widget.id)}
      onHide={() => widgetsContext.hideWidget(widget.id)}
    />
  {/if}
{/each}


