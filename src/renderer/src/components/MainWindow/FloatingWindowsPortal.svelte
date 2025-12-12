<script lang="ts">
  import type {Snippet} from 'svelte';
  import {setContext} from 'svelte';
  import {FLOATING_WINDOW_CONTEXT_KEY, type FloatingWindowContext} from '../Shared/floatingWindowContext';

  interface Props {
    children?: Snippet;
  }

  let {children}: Props = $props();


  let windowContext = $state<FloatingWindowContext>({
    isResizing: false,
    isDragging: false,
    activeWindowId: null,
    setActiveWindow: (id: string) => {
      windowContext.activeWindowId = id;
    }
  });

  setContext(FLOATING_WINDOW_CONTEXT_KEY, windowContext);
</script>

<div class="absolute w-full h-full left-0 top-0 overflow-hidden">
  {@render children?.()}

  {#if windowContext.isResizing || windowContext.isDragging}
    <div class="fixed inset-0 bg-gray-500/20 dark:bg-gray-900/40 z-[999] pointer-events-auto"></div>
  {/if}
</div>

