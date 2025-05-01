<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte'
  import {
    ChevronsLeftRight,
    ChevronsUpDown,
    Maximize,
    Minimize,
    Minus,
    Plus,
    X
  } from 'lucide-svelte'
  import { onMount } from 'svelte'

  export let container: HTMLElement
  export let x_offset: number = 0.6
  export let y_offset: number = 0.1
  export let title: string = 'Window Title'
  export let icon: string = 'favicon.png'
  export let onClose: () => unknown
  export let resizable: boolean = false
  export let quitable: boolean = true
  export let minimizable: boolean = true
  export let initialWidth: number = 400
  export let initialHeight: number = 400

  let minimized: boolean = false

  let containerW = 0
  let containerH = 0
  let left = 0
  let top = 0

  let width: number | null = null
  let height: number | null = null

  let observer: ResizeObserver

  let dragging = false
  let dragStartX = 0
  let dragStartY = 0
  let initialLeft = 0
  let initialTop = 0

  onMount(() => {
    setTimeout(() => {
      if (container) {
        containerW = container.offsetWidth
        containerH = container.offsetHeight

        left = containerW * x_offset
        top = containerH * y_offset

        width = initialWidth == -1 ? null : initialWidth
        height = initialHeight == -1 ? null : initialHeight

        observer = new ResizeObserver(() => {
          containerW = container.offsetWidth
          containerH = container.offsetHeight
        })

        observer.observe(container)
      }
    }, 1)
  })

  function onMouseDown(e: MouseEvent) {
    dragging = true
    dragStartX = e.clientX
    dragStartY = e.clientY
    initialLeft = left
    initialTop = top

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    if (dragging) {
      const dx = e.clientX - dragStartX
      const dy = e.clientY - dragStartY
      left = initialLeft + dx
      top = initialTop + dy
    }
  }

  function onMouseUp() {
    dragging = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  function increaseWidth() {
    if (width !== null) width += 20
  }

  function decreaseWidth() {
    if (width !== null) width = Math.max(100, width - 20)
  }

  function increaseHeight() {
    if (height !== null) height += 20
  }

  function decreaseHeight() {
    if (height !== null) height = Math.max(200, height - 20)
  }
</script>

<div
  class="bg-background shadow rounded-md overflow-hidden flex flex-col z-50 border-accent border {minimized
    ? 'relative'
    : resizable
      ? ''
      : 'min-w-[0rem] max-w-[32rem]'}"
  style="position: absolute; left: {left}px; top: {top}px; {width !== null
    ? !minimized
      ? `width: ${width}px;`
      : ''
    : ''} {height !== null ? (!minimized ? `height: ${height}px;` : '') : ''}"
>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="cursor-grab gap-4 active:cursor-grabbing p-1 px-3 select-none border-b border-accent flex items-center justify-between bg-accent/50"
    on:mousedown={onMouseDown}
  >
  {#if resizable}
  <div class="flex items-center gap-1">
    <ChevronsLeftRight class="w-4 h-4" />
    <Button variant="outline" size="sm" class="w-4 h-4 p-0" on:click={decreaseWidth}
      ><Minus class="w-3 h-3" /></Button
    >
    <Button variant="outline" size="sm" class="w-4 h-4 p-0" on:click={increaseWidth}
      ><Plus class="w-3 h-3" /></Button
    >
  </div>
  {/if}
    <div class="flex gap-2 items-center">
      <img
        class="w-4 h-4 contain-content select-none pointer-events-none"
        src={icon}
        alt="widget"
      />
      <strong class="text-sm">{title}</strong>
    </div>
    <div class="flex gap-2 items-center">
      {#if resizable}
      <div class="flex items-center gap-1">
        <ChevronsUpDown class="w-4 h-4" />
        <Button variant="outline" size="sm" class="w-4 h-4 p-0" on:click={decreaseHeight}
          ><Minus class="w-3 h-3" /></Button
        >
        <Button variant="outline" size="sm" class="w-4 h-4 p-0" on:click={increaseHeight}
          ><Plus class="w-3 h-3" /></Button
        >
      </div>
    {/if}
      {#if minimized}
        {#if minimizable}
          <Button class="h-4 w-4 p-0" variant="ghost" size="sm" on:click={() => (minimized = false)}>
            <Maximize class="w-4 h-4" />
          </Button>
        {/if}
      {:else}
        {#if minimizable}
          <Button
            class="p-0 w-5 h-5"
            variant="ghost"
            size="sm"
            on:click={() => (minimized = true)}
          >
            <Minimize class="w-4 h-4" />
          </Button>
        {/if}
        {#if quitable}
          <Button class="p-0 w-5 h-5" variant="ghost" size="sm" on:click={onClose}>
            <X class="w-4 h-4" />
          </Button>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Body -->
  <div class="p-2 select-none {minimized ? 'hidden' : 'w-full h-full'}">
    <slot />
  </div>

  {#if !minimized}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      on:mousedown={onMouseDown}
      class="cursor-grab active:cursor-grabbing flex justify-between items-end p-1 gap-1 text-xs text-foreground bg-accent/50 border-t border-accent"
    >
    </div>
  {/if}
</div>
