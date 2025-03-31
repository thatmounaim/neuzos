<script lang="ts">
  import { onMount } from 'svelte'
  import { ModeWatcher } from 'mode-watcher'
  import Navbar from '$lib/sections/Navbar.svelte'
  import type { NeuzLayout, NeuzSession } from './characterutils'
  import { logme } from './debug'
  import * as Resizable from '$lib/components/ui/resizable'
  import NeuzClient from '$lib/sections/NeuzClient.svelte'
  import BrowserComponent from '$lib/overlays/BrowserComponent.svelte'

  let sessions: NeuzSession[] = []
  let layouts: NeuzLayout[] = []
  let activeLayout: string = ''
  let activeLayouts: NeuzLayout[] = []
  let activeLayoutsOrder: string[] = []
  let lastActiveLayout: string = ''
  function onRefresh() {
    logme('onRefresh')
    sessions = JSON.parse(localStorage.getItem('sessions') ?? '[]')
    layouts = JSON.parse(localStorage.getItem('layouts') ?? '[]')
    activeLayouts = []
    activeLayout = ''
    activeLayoutsOrder = []
  }

  function changeTab(switchToLayout: string) {
    lastActiveLayout = activeLayout
    if (switchToLayout.startsWith('neuzos.internal.')) {
      activeLayout = switchToLayout
    } else {
      activeLayout = switchToLayout
      activeLayouts
        .find((lay) => {
          lay.id == activeLayout
        })
        ?.rows[0]?.cells[0]?.clientRef?.focous()
    }
  }

  onMount(() => {
    onRefresh()
    {
      /*@ts-ignore*/
    }
    window.electron.ipcRenderer.on('doTabbing', function () {
      if (lastActiveLayout == '') return
      changeTab(lastActiveLayout)
    })
  })
</script>

<ModeWatcher />
<div class="w-full h-full overflow-hidden flex flex-col">
  <Navbar
    {changeTab}
    {onRefresh}
    bind:activeLayoutsOrder
    bind:sessions
    bind:layouts
    bind:activeLayout
    bind:activeLayouts
  />
  <section class="w-full flex-1 relative">
    <BrowserComponent open={activeLayout == 'neuzos.internal.browser'} />
    {#each layouts as layout}
    {#key layout.id}
        <div
          class="h-full w-full left-0 top-0 absolute bg-background {layout.id == activeLayout
            ? 'z-[50]'
            : 'z-[0] hidden'} overflow-hidden"
        >
          <Resizable.PaneGroup direction="vertical" class="h-full w-full">
            {#each layout.rows as row, rowIndex}
              {#if row.cells.length > 0}
                <Resizable.Pane>
                  <Resizable.PaneGroup direction="horizontal">
                    {#each row.cells as cell, cellIndex}
                      {#if sessions.find((s) => s.id == cell.sessionId)}
                        <Resizable.Pane>
                          <NeuzClient
                          forceClose={!activeLayoutsOrder.includes(layout.id)}
                            bind:this={cell.clientRef}
                            session={sessions.find((s) => {
                              return s.id == cell.sessionId
                            })}
                          />
                        </Resizable.Pane>
                        {#if cellIndex < row.cells.length - 1}
                          <Resizable.Handle />
                        {/if}
                      {/if}
                    {/each}
                  </Resizable.PaneGroup>
                </Resizable.Pane>
                {#if rowIndex < layout.rows.length - 1}
                  <Resizable.Handle />
                {/if}
              {/if}
            {/each}
          </Resizable.PaneGroup>
        </div>
      {/key}
    {/each}
  </section>
</div>
