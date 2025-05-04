<script lang="ts">
  import { onMount } from 'svelte'
  import { ModeWatcher } from 'mode-watcher'
  import Navbar from '$lib/sections/Navbar.svelte'
  import type {
    CustomSessionSizeLocalStorageEntry,
    NeuzLayout,
    NeuzSession
  } from './characterutils'
  import { logme } from './debug'
  import * as Resizable from '$lib/components/ui/resizable'
  import NeuzClient from '$lib/sections/NeuzClient.svelte'
  import BrowserComponent from '$lib/overlays/BrowserComponent.svelte'
  import FloatingWindow from '$lib/widgets/FloatingWindow.svelte'
  import WgInternalFcoinCalculator from '$lib/widgets/internal/WgInternalFcoinCalculator.svelte'
  import WgInternalPetFoodCalculator from '$lib/widgets/internal/WgInternalPetFoodCalculator.svelte'

  let loaded = false
  let browserEnabled: boolean = true
  let autofocusEnabled: boolean = true
  let zenModeFull: boolean = false
  let sessions: NeuzSession[] = []
  let layouts: NeuzLayout[] = []
  let activeLayout: string = ''
  let activeLayouts: NeuzLayout[] = []
  let activeLayoutsOrder: string[] = []
  let lastActiveLayout: string = ''
  let widgetContainer: HTMLElement
  let widgets = {
    internal_fcoin_calculator: {
      title: 'FCoin Calculator',
      icon: 'icons/perin.webp',
      widget: WgInternalFcoinCalculator,
      active: false,
      windowProps: {
        initialWidth: -1,
        initialHeight: -1
      }
    },
    internal_pet_food_calculator: {
      title: 'Pet Candy Calculator',
      icon: 'icons/pet_candy.png',
      widget: WgInternalPetFoodCalculator,
      active: false,
      windowProps: {
        initialWidth: -1,
        initialHeight: -1
      }
    }
  }
  function onRefresh() {
    logme('onRefresh')
    sessions = JSON.parse(localStorage.getItem('sessions') ?? '[]')
    layouts = JSON.parse(localStorage.getItem('layouts') ?? '[]')
    logme('App.LoadedLayouts', layouts)
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

  function sessionWindowResize(sid: string, width: number, height: number) {
    let customSessionWindowSizes = JSON.parse(
      localStorage.getItem('customSessionWindowSizes') ?? '{}'
    ) as CustomSessionSizeLocalStorageEntry
    customSessionWindowSizes[sid] = {
      width,
      height
    }
    localStorage.setItem('customSessionWindowSizes', JSON.stringify(customSessionWindowSizes))
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

    window.electron.ipcRenderer.on(
      'resizedSession',
      function (_, sid: string, width: number, height: number) {
        sessionWindowResize(sid, width, height)
      }
    )

    browserEnabled = parseInt(localStorage.getItem('browserEnabled') ?? '1') == 1
    localStorage.setItem('browserEnabled', browserEnabled ? '1' : '0')

    autofocusEnabled = parseInt(localStorage.getItem('autofocusEnabled') ?? '1') == 1
    localStorage.setItem('autofocusEnabled', autofocusEnabled ? '1' : '0')

    zenModeFull = parseInt(localStorage.getItem('zenModeFull') ?? '0') == 1
    localStorage.setItem('zenModeFull', zenModeFull ? '1' : '0')

 activeLayoutsOrder = JSON.parse(localStorage.getItem('activeLayoutsOrder') ?? '[]') ?? []
    const toRemoveLayouts = []
    activeLayoutsOrder.forEach((lid) => {
      const layout = layouts.find((l) => l.id == lid)
      if(layout){
        const newLay = {
          id: layout.id,
          label: layout.label,
          floating: layout.floating ?? [],
          rows: layout.rows
        }

        activeLayouts.push(newLay)
        activeLayouts = activeLayouts
      } else {
        toRemoveLayouts.push(lid)
      }
    })

    activeLayoutsOrder = activeLayoutsOrder.filter((lid) => {
      return toRemoveLayouts.indexOf(lid) == -1
    })
    loaded = true
  })
  /*@ts-ignore*/
  $: activeLayoutsEffect = loaded && localStorage.setItem('activeLayoutsOrder', JSON.stringify(activeLayoutsOrder ?? '[]'))
</script>

<ModeWatcher />
<div class="w-full h-full overflow-hidden flex flex-col">
  <Navbar
    onWidgetUpdate={() => {
      widgets = widgets
    }}
    {widgets}
    {changeTab}
    {onRefresh}
    bind:activeLayoutsOrder
    bind:sessions
    bind:layouts
    bind:activeLayout
    bind:activeLayouts
    bind:browserEnabled
    bind:autofocusEnabled
    bind:zenModeFull
  />
  <section class="w-full flex-1 relative" bind:this={widgetContainer}>
    {#if browserEnabled}
      <BrowserComponent open={activeLayout == 'neuzos.internal.browser'} />
    {/if}
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
                            bind:autofocusEnabled
                            forceClose={!activeLayoutsOrder.includes(layout.id)}
                            bind:this={cell.clientRef}
                            session={sessions.find((s) => {
                              return s.id == cell.sessionId
                            })}
                            on:updated={() => {
                              cell.running = cell.clientRef.isStarted()
                              activeLayouts = activeLayouts
                            }}
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
          {#if (layout.floating ?? []).length > 0}
            {#each layout.floating as floating}
              <FloatingWindow
                identifier="floatingSessions.{layout.id}.{floating.sessionId}"
                initialWidth={400}
                initialHeight={500}
                minimizable={false}
                resizable
                quitable={false}
                title={sessions.find((s) => s.id == floating.sessionId).name}
                icon="jobs/{sessions.find((s) => s.id == floating.sessionId).jobId}.png"
                container={widgetContainer}
                onClose={() => {
                  floating.clientRef?.stopClient()
                }}
              >
                <NeuzClient
                  bind:autofocusEnabled
                  forceClose={!activeLayoutsOrder.includes(layout.id)}
                  bind:this={floating.clientRef}
                  session={sessions.find((s) => {
                    return s.id == floating.sessionId
                  })}
                  on:updated={() => {
                    floating.running = floating.clientRef.isStarted()
                    activeLayouts = activeLayouts
                  }}
                />
              </FloatingWindow>
            {/each}
          {/if}
        </div>
      {/key}
    {/each}
    {#if widgets.internal_fcoin_calculator.active}
      <FloatingWindow
        identifier="widgets.internal_fcoin_calculator"
        title={widgets.internal_fcoin_calculator.title}
        icon={widgets.internal_fcoin_calculator.icon}
        container={widgetContainer}
        onClose={() => (widgets.internal_fcoin_calculator.active = false)}
        {...widgets.internal_fcoin_calculator.windowProps}
      >
        <svelte:component this={widgets.internal_fcoin_calculator.widget} />
      </FloatingWindow>
    {/if}
    {#if widgets.internal_pet_food_calculator.active}
      <FloatingWindow
        identifier="widgets.internal_pet_food_calculator"
        title={widgets.internal_pet_food_calculator.title}
        icon={widgets.internal_pet_food_calculator.icon}
        container={widgetContainer}
        onClose={() => (widgets.internal_pet_food_calculator.active = false)}
        {...widgets.internal_pet_food_calculator.windowProps}
      >
        <svelte:component this={widgets.internal_pet_food_calculator.widget} />
      </FloatingWindow>
    {/if}
  </section>
</div>
