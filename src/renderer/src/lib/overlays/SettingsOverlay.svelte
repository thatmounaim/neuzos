<script lang="ts">
  import { Sun, Moon } from 'lucide-svelte'
  import { resetMode, setMode } from 'mode-watcher'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import * as Dialog from '$lib/components/ui/dialog'
  import * as Tabs from '$lib/components/ui/tabs'
  import { Button } from '$lib/components/ui/button'
  import GeneralSettings from '$lib/sections/Settings/GeneralSettings.svelte'
  import SessionSettings from '$lib/sections/Settings/SessionSettings.svelte'
  import LayoutSettings from '$lib/sections/Settings/LayoutSettings.svelte'
  export let open: boolean
  export let onClose: () => unknown
  let currentTab = 'sessions'
</script>

<Dialog.Root
  {open}
  onOpenChange={(o) => {
    if (!o) {
      setTimeout(onClose, 500)
    }
  }}
  closeOnEscape={false}
>
  <Dialog.Content class="h-[80%] max-w-[90%] flex flex-col">
    <Dialog.Header>
      <Dialog.Title>NeuzOS Settings</Dialog.Title>
      <Dialog.Description>Setup your sessions and layouts</Dialog.Description>
    </Dialog.Header>
    <div class="h-full w-full flex-1 overflow-hidden">
      <Tabs.Root bind:value={currentTab} class="h-full">
        <Tabs.List class="w-full flex justify-start">
          <Tabs.Trigger value="sessions">Flyff Sessions</Tabs.Trigger>
          <Tabs.Trigger value="layouts">Layouts</Tabs.Trigger>
          <div class="flex-1"></div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild let:builder>
              <Button builders={[builder]} variant="outline" size="sm">
                <Sun
                  class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                />
                <Moon
                  class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item on:click={() => setMode('light')}>Light Mode</DropdownMenu.Item>
              <DropdownMenu.Item on:click={() => setMode('dark')}>Dark Mode</DropdownMenu.Item>
              <DropdownMenu.Item on:click={() => resetMode()}>Follow System</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Tabs.List>
        <Tabs.Content class="overflow-scroll h-full" value="general">
          <GeneralSettings />
        </Tabs.Content>
        <Tabs.Content class="overflow-scroll h-full" value="sessions">
          {#if currentTab == 'sessions'}
            <SessionSettings />
          {/if}
        </Tabs.Content>
        <Tabs.Content class="overflow-scroll h-full" value="layouts">
          {#if currentTab == 'layouts'}
            <LayoutSettings />
          {/if}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  </Dialog.Content>
</Dialog.Root>
