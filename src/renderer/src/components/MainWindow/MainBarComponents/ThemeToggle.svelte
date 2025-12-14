<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Sun, Moon } from '@lucide/svelte';
  import { getNeuzosBridgeContext } from "$lib/contexts/neuzosBridgeContext";

  const neuzosBridge = getNeuzosBridgeContext();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({props})}
      <Button {...props} variant="outline" size="icon-xs">
        <Sun
          class=" rotate-0 size-3.5 scale-100 transition-all dark:-rotate-90 dark:scale-0"
        />
        <Moon
          class="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onclick={() => neuzosBridge.preferences.setThemeMode('light')}>Light Mode</DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => neuzosBridge.preferences.setThemeMode('dark')}>Dark Mode</DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => neuzosBridge.preferences.setThemeMode('system')}>Follow System</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
