<script lang="ts">
  import {Button} from "$lib/components/ui/button";
  import {Keyboard, KeyboardOff} from '@lucide/svelte'
  import {onMount} from "svelte";

  interface Props {
    window: 'main' | 'session';
    onToggle: (enabled: boolean) => void;
  }

  let {window: windowType, onToggle}: Props = $props();

  let enabled: boolean = $state(true);
  const electronApi = window.electron.ipcRenderer;

  onMount(async () => {
    // Get initial state
    try {
      const state = await electronApi.invoke("shortcuts.get_state");
      enabled = windowType === 'main' ? state.mainWindow : state.sessionWindow;
    } catch (e) {
      console.error("Failed to get shortcuts state:", e);
    }

    // Listen for state changes
    const handleStateChange = (_: any, newEnabled: boolean) => {
      enabled = newEnabled;
    };

    electronApi.on("event.shortcuts_state_changed", handleStateChange);

    return () => {
      electronApi.removeListener("event.shortcuts_state_changed", handleStateChange);
    };
  });

  const toggleShortcuts = () => {
    const newState = !enabled;
    onToggle(newState);
  };
</script>

<Button
  size="icon-xs"
  variant="outline"
  onclick={toggleShortcuts}
  class="cursor-pointer"
  title={enabled ? "Disable Global Shortcuts" : "Enable Global Shortcuts"}
>
  {#if enabled}
    <Keyboard class="size-3.5"/>
  {:else}
    <KeyboardOff class="size-3.5"/>
  {/if}
</Button>

