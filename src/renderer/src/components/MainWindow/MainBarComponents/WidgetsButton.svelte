<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Puzzle } from '@lucide/svelte';
  import WidgetsDropdownContent from '../../Widgets/Core/WidgetsDropdownContent.svelte';
  import ActionPinManageDialog from '../../Widgets/Builtin/ActionPin/ManageDialog.svelte';
  import FloatingSessionManageDialog from '../../Widgets/Builtin/FloatingSession/ManageDialog.svelte';

  let manageActionPinsOpen = $state(false);
  let manageFloatingSessionsOpen = $state(false);
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({props})}
      <Button {...props} variant="outline" size="icon-xs">
        <Puzzle class="size-3.5"/>
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="min-w-64">
    <WidgetsDropdownContent
      onManageActionPins={() => {
        manageActionPinsOpen = true;
      }}
      onManageFloatingSessions={() => {
        manageFloatingSessionsOpen = true;
      }}
    />
  </DropdownMenu.Content>
</DropdownMenu.Root>

<ActionPinManageDialog bind:open={manageActionPinsOpen} />
<FloatingSessionManageDialog bind:open={manageFloatingSessionsOpen} />

