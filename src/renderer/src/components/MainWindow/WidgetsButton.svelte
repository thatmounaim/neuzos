<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Puzzle } from '@lucide/svelte';
  import WidgetsDropdownContent from '../Widgets/Core/WidgetsDropdownContent.svelte';
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({props})}
      <Button {...props} variant="outline" size="icon-xs">
        <Puzzle class="size-3.5"/>
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <WidgetsDropdownContent />
  </DropdownMenu.Content>
</DropdownMenu.Root>

