<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte'
  import { Maximize, Minimize, X } from 'lucide-svelte'
  import { onMount } from 'svelte'

  export let container: HTMLElement
  export let x_offset: number = 0.6
  export let y_offset: number = 0.1
export let title: string = 'Window Title'
export let icon : string = 'favicon.png'
  export let onClose: () => unknown

  let minimized: boolean = false

  let containerW = 0
  let containerH = 0
  let left = 0
  let top = 0

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
    if (!dragging) return

    const dx = e.clientX - dragStartX
    const dy = e.clientY - dragStartY

    left = initialLeft + dx
    top = initialTop + dy
  }

  function onMouseUp() {
    dragging = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
</script>

<div
  class="bg-background shadow rounded-md overflow-hidden flex flex-col z-50 {minimized ? ' relative' : 'min-w-[20rem] max-w-[32rem]'} border-accent border"
  style="position: absolute; left: {left}px; top: {top}px;"
>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="cursor-grab gap-4 active:cursor-grabbing p-1 px-3 select-none border-b flex items-center justify-between"
    on:mousedown={onMouseDown}
  >
   
      <div class="flex gap-2">
        <img
          class="w-6 h-6 contain-content select-none pointer-events-none"
          src={icon}
          alt="widget"
        />
        <strong>{title}</strong>
      </div>
      <div class="flex gap-2">
        {#if minimized}
        <Button variant="ghost" size="sm" on:click={() => minimized = false}>
          <Maximize class="w-4 h-4"/>
        </Button>
      {:else}
        <Button class="px-2 py-2" variant="outline" size="sm"  on:click={() => minimized = true}><Minimize class="w-4 h-4" /></Button>
        <Button class="px-2 py-2" variant="outline" size="sm" on:click={onClose}><X class="w-4 h-4" /></Button>
        {/if}
      
    </div>
  </div>

  <div class="p-2 select-none {minimized ? 'hidden' : ''}">
   <slot />
  </div>
</div>