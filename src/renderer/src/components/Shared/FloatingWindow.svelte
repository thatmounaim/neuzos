<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import type { Snippet } from 'svelte';
  import { X, Minus, Maximize2 } from '@lucide/svelte';
  import { FLOATING_WINDOW_CONTEXT_KEY, type FloatingWindowContext } from './floatingWindowContext';

  const windowContext = getContext<FloatingWindowContext>(FLOATING_WINDOW_CONTEXT_KEY);

  interface Props {
    persistId?: string;
    title?: string;
    defaultX?: number;
    defaultY?: number;
    defaultWidth?: number;
    defaultHeight?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    onClose?: () => void;
    closable?: boolean;
    minimizable?: boolean;
    resizable?: boolean;
    class?: string;
    children?: Snippet;
    titleSnippet?: Snippet;
  }

  let {
    persistId,
    title = '',
    defaultX = 100,
    defaultY = 100,
    defaultWidth = 400,
    defaultHeight = 300,
    minWidth = 200,
    minHeight = 150,
    maxWidth = Infinity,
    maxHeight = Infinity,
    onClose,
    closable = true,
    minimizable = true,
    resizable = true,
    class: className = '',
    children,
    titleSnippet
  }: Props = $props();

  let x = $state(defaultX);
  let y = $state(defaultY);
  let width = $state(defaultWidth);
  let height = $state(defaultHeight);
  let isMinimized = $state(false);
  let isDragging = $state(false);
  let isResizing = $state(false);
  let resizeDirection = $state<string>('');

  let dragStartX = 0;
  let dragStartY = 0;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;

  const windowId = persistId || `window-${Math.random().toString(36).substr(2, 9)}`;
  const STORAGE_KEY = persistId ? `floating-window-${persistId}` : null;

  // Compute if this window is active
  const isActive = $derived(windowContext.activeWindowId === windowId);
  const zIndex = $derived(isActive ? 'z-[41]' : 'z-40');

  // Load persisted state
  onMount(() => {
    if (!STORAGE_KEY) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state = JSON.parse(stored);
        x = state.x ?? defaultX;
        y = state.y ?? defaultY;
        width = state.width ?? defaultWidth;
        height = state.height ?? defaultHeight;
        isMinimized = state.isMinimized ?? false;
      } catch (e) {
        console.error('Failed to parse stored window state:', e);
      }
    }
  });

  // Persist state
  function persistState() {
    if (!STORAGE_KEY) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      x,
      y,
      width,
      height,
      isMinimized
    }));
  }

  // Dragging logic
  function handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.window-controls, .resize-handle')) {
      return;
    }

    windowContext.setActiveWindow(windowId);
    isDragging = true;
    windowContext.isDragging = true;
    dragStartX = e.clientX - x;
    dragStartY = e.clientY - y;
    e.preventDefault();
  }

  function handleMouseMove(e: MouseEvent) {
    if (isDragging) {
      // Calculate new position
      let newX = e.clientX - dragStartX;
      let newY = e.clientY - dragStartY;

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Prevent going offscreen - keep at least 50px of the window visible
      const minVisiblePx = 50;

      // Left boundary
      newX = Math.max(-width + minVisiblePx, newX);
      // Right boundary
      newX = Math.min(viewportWidth - minVisiblePx, newX);
      // Top boundary (never allow title bar to go above viewport)
      newY = Math.max(0, newY);
      // Bottom boundary
      newY = Math.min(viewportHeight - minVisiblePx, newY);

      x = newX;
      y = newY;
    } else if (isResizing) {
      handleResize(e);
    }
  }

  function handleMouseUp() {
    if (isDragging || isResizing) {
      persistState();
    }
    if (isDragging) {
      isDragging = false;
      windowContext.isDragging = false;
    }
    if (isResizing) {
      isResizing = false;
      windowContext.isResizing = false;
    }
    resizeDirection = '';
  }

  // Resizing logic
  function startResize(direction: string, e: MouseEvent) {
    if (!resizable) return;

    windowContext.setActiveWindow(windowId);
    isResizing = true;
    windowContext.isResizing = true;
    resizeDirection = direction;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = width;
    resizeStartHeight = height;
    e.stopPropagation();
  }

  function handleResize(e: MouseEvent) {
    const deltaX = e.clientX - resizeStartX;
    const deltaY = e.clientY - resizeStartY;

    if (resizeDirection.includes('e')) {
      width = Math.min(maxWidth, Math.max(minWidth, resizeStartWidth + deltaX));
    }
    if (resizeDirection.includes('s')) {
      height = Math.min(maxHeight, Math.max(minHeight, resizeStartHeight + deltaY));
    }
    if (resizeDirection.includes('w')) {
      const newWidth = Math.min(maxWidth, Math.max(minWidth, resizeStartWidth - deltaX));
      if (newWidth !== width) {
        x += width - newWidth;
        width = newWidth;
      }
    }
    if (resizeDirection.includes('n')) {
      const newHeight = Math.min(maxHeight, Math.max(minHeight, resizeStartHeight - deltaY));
      if (newHeight !== height) {
        y += height - newHeight;
        height = newHeight;
      }
    }
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    persistState();
  }

  function handleClose() {
    onClose?.();
  }

  // Reset window to default position and size
  export function reset() {
    x = defaultX;
    y = defaultY;
    width = defaultWidth;
    height = defaultHeight;
    isMinimized = false;
    persistState();
  }

  onMount(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });
</script>

<div
  class="absolute bg-background border border-border rounded-lg shadow-md flex flex-col overflow-hidden {zIndex} {className}"
  style="left: {x}px; top: {y}px; width: {width}px; height: {isMinimized ? 'auto' : height + 'px'};"
  onclick={() => windowContext.setActiveWindow(windowId)}
  role="dialog"
  aria-label={title}
  tabindex="-1"
>
  <div
    class="bg-muted border-b border-border px-3 py-2 flex items-center justify-between cursor-move select-none min-h-9"
    onmousedown={handleMouseDown}
    role="button"
    tabindex="0"
  >
    <div class="font-medium text-sm text-foreground flex-1">
      {#if titleSnippet}
        {@render titleSnippet()}
      {:else}
        {title}
      {/if}
    </div>
    <div class="flex gap-1 items-center window-controls">
      {#if minimizable}
        <button
          class="bg-transparent border-none p-1 cursor-pointer rounded flex items-center justify-center text-foreground transition-colors hover:bg-accent"
          onclick={(e) => {
            e.stopPropagation();
            toggleMinimize();
          }}
          title={isMinimized ? 'Maximize' : 'Minimize'}
        >
          {#if isMinimized}
            <Maximize2 size={14} />
          {:else}
            <Minus size={14} />
          {/if}
        </button>
      {/if}
      {#if closable}
        <button
          class="bg-transparent border-none p-1 cursor-pointer rounded flex items-center justify-center text-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          onclick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          title="Close"
        >
          <X size={14} />
        </button>
      {/if}
    </div>
  </div>

  {#if !isMinimized}
    <div class="flex-1 overflow-auto p-3">
      {@render children?.()}
    </div>

    {#if resizable}
      <!-- Resize handles -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute top-0 left-0 w-full h-1.5 cursor-ns-resize z-10" onmousedown={(e) => startResize('n', e)}></div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize z-10" onmousedown={(e) => startResize('s', e)}></div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute top-0 left-0 w-1.5 h-full cursor-ew-resize z-10" onmousedown={(e) => startResize('w', e)}></div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize z-10" onmousedown={(e) => startResize('e', e)}></div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-10" onmousedown={(e) => startResize('nw', e)}></div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-10" onmousedown={(e) => startResize('ne', e)}></div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-10" onmousedown={(e) => startResize('sw', e)}></div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-10" onmousedown={(e) => startResize('se', e)}></div>
    {/if}
  {/if}
</div>


