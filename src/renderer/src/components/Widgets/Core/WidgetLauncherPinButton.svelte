<script lang="ts">
  import { onMount } from 'svelte';
  import { Pin } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    isWidgetLauncherPinned,
    toggleWidgetLauncherPin,
    WIDGET_LAUNCHER_PINS_CHANGED,
    type WidgetLauncherId
  } from '$lib/widgetLauncherPins';

  type Props = {
    launcherId: WidgetLauncherId;
  };

  let { launcherId }: Props = $props();
  let pinned = $state(false);

  function refreshPinnedState() {
    pinned = isWidgetLauncherPinned(launcherId);
  }

  function togglePin(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    pinned = toggleWidgetLauncherPin(launcherId);
  }

  onMount(() => {
    refreshPinnedState();
    window.addEventListener(WIDGET_LAUNCHER_PINS_CHANGED, refreshPinnedState);

    return () => {
      window.removeEventListener(WIDGET_LAUNCHER_PINS_CHANGED, refreshPinnedState);
    };
  });
</script>

<Button
  size="icon"
  variant={pinned ? 'secondary' : 'ghost'}
  class="h-6 w-6 shrink-0"
  onclick={togglePin}
  title={pinned ? 'Unpin from Mainbar' : 'Pin to Mainbar'}
>
  <Pin class="h-3 w-3 {pinned ? 'fill-current' : ''}" />
</Button>
