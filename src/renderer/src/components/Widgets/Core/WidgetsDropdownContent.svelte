<script lang="ts">
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import FCoinCalculatorDropdownItem from '../Builtin/FCoinCalculator/DropdownItem.svelte';
  import NotepadDropdownItem from '../Builtin/Notepad/DropdownItem.svelte';
  import MiniBrowserDropdownItem from '../Builtin/MiniBrowser/DropdownItem.svelte';
  import ActionPadDropdownItem from '../Builtin/ActionPad/DropdownItem.svelte';
  import ActionPinDropdownItem from '../Builtin/ActionPin/DropdownItem.svelte';

  const widgetsContext = getWidgetsContext();
</script>

<DropdownMenu.Group>
  <FCoinCalculatorDropdownItem />
  <NotepadDropdownItem />
  <MiniBrowserDropdownItem />
  <DropdownMenu.Separator />
  <ActionPinDropdownItem />
  <ActionPadDropdownItem />
</DropdownMenu.Group>

{#if widgetsContext.widgets.length === 0}
  <DropdownMenu.Separator />
  <div class="px-2 py-1.5 text-xs text-muted-foreground text-center">
    No active widgets
  </div>
{/if}

