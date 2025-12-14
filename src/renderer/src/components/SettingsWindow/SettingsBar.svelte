<script lang="ts">
  import {Button} from "$lib/components/ui/button";
  import {Maximize, Minus, Moon, Sun, X} from "@lucide/svelte";
  import {Separator} from "$lib/components/ui/separator";
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { getNeuzosBridgeContext } from "$lib/contexts/neuzosBridgeContext";

  const neuzosBridge = getNeuzosBridgeContext()
</script>
<div
  id="titlebar"
  class="gap-2 p-1 px-2 select-none border-b border-accent flex items-center justify-end bg-accent/50 min-h-8"
>
  <div
    class="flex-1 cursor-grab active:cursor-grabbing h-full w-full"
    style="-webkit-app-region: drag;"
  >
    <div class="flex items-center gap-2">
      <img src="favicon.png" alt="NeuzOS Logo" class="size-6"/>
      <strong>NeuzOS Settings </strong>
    </div>

  </div>
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
      <DropdownMenu.Item onclick={() => neuzosBridge.preferences.setThemeMode('system')}>Follow System
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
  <Separator orientation="vertical" class="h-4"/>
  <Button
    size="icon-xs"
    variant="outline"
    onclick={() => {
        neuzosBridge.settingsWindow.minimize()
      }}
    class="cursor-pointer"
  >
    <Minus class="size-3.5"/>
  </Button>
  <Button
    size="icon-xs"
    variant="outline"
    onclick={() => {
        neuzosBridge.settingsWindow.maximize()
      }}
    class="cursor-pointer"
  >
    <Maximize class="size-3.5"/>
  </Button>
  <Button
    variant="outline"
    onclick={() => {
         neuzosBridge.settingsWindow.close()
      }}
    size="icon-xs"
    class="cursor-pointer"
  >
    <X class="size-3.5"/>
  </Button>
</div>
