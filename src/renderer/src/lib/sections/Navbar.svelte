<script lang="ts">
  import {
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Play,
    Plus,
    RefreshCcw,
    Settings,
    Square,
    X
  } from 'lucide-svelte'
  import { Button, buttonVariants } from '$lib/components/ui/button/index.js'
  import SettingsOverlay from '$lib/overlays/SettingsOverlay.svelte'
  import { logme } from '../../debug'
  import type { NeuzLayout, NeuzSession } from '../../characterutils'
  import * as AlertDialog from '$lib/components/ui/alert-dialog'
  import * as Dialog from '$lib/components/ui/dialog'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import Separator from '$lib/components/ui/separator/separator.svelte'

  export let onRefresh: () => unknown
  export let changeTab: (s: string) => unknown
  export let sessions: NeuzSession[]
  export let layouts: NeuzLayout[]
  export let activeLayout: string
  export let activeLayouts: NeuzLayout[]
  export let activeLayoutsOrder: string[]

  let openOverlay: string | null = null
  let promptReload: boolean = false
  let visible: boolean = true

  const onOverlayClose = () => {
    logme('onOverlayClose')
    openOverlay = null
    const savedSessions = localStorage.getItem('sessions') ?? '[]'
    logme('savedSessions', savedSessions)
    const savedLayouts = localStorage.getItem('layouts') ?? '[]'
    logme('savedLayouts', savedLayouts)
    const currentSession = JSON.stringify(sessions ?? [])
    logme('currentSession', currentSession)

    const currentLayous = JSON.stringify(
      layouts?.map((lay) => {
        return {
          id: lay.id,
          label: lay.label,
          rows: lay.rows.map((row) => {
            return {
              cells: row.cells.map((cell) => {
                return {
                  sessionId: cell.sessionId
                }
              })
            }
          })
        }
      }) ?? []
    )
    logme('currentLayous', currentLayous)

    if (currentSession != savedSessions || currentLayous != savedLayouts) {
      promptReload = true
    }
  }

  $: activeLayoutsOrdered = activeLayoutsOrder.map((lid) => {
    return activeLayouts.find((ll) => {
      return ll.id == lid
    })
  })
</script>

{#if visible}
  <nav class="w-full flex items-center justify-between">
    <div class="flex items-center gap-2 p-2 px-2">
      <Button
        size="icon"
        variant="outline"
        on:click={() => {
          openOverlay = 'settings'
        }}
      >
        <Settings />
      </Button>
      <Dialog.Root>
        <Dialog.Trigger class={buttonVariants({ variant: 'outline' })}><Plus /></Dialog.Trigger>
        <Dialog.Content class="sm:max-w-[425px]">
          <Dialog.Header>
            <Dialog.Title>Use Layout</Dialog.Title>
            <Dialog.Description>Select a layout to use</Dialog.Description>
          </Dialog.Header>
          <div class="flex gap-2 flex-col">
            {#each layouts as layout}
              <Button
                on:click={() => {
                  const newLay = JSON.parse(JSON.stringify(layout))
                  let isFirst = false
                  activeLayouts.push(newLay)
                  if(activeLayouts.length == 1) {
                    activeLayout = newLay.id
                  }
                  layout.active = true
                  activeLayouts = activeLayouts
                  activeLayoutsOrder.push(layout.id)
                  activeLayoutsOrder = activeLayoutsOrder
                }}
                disabled={layout.active}>{layout.label}</Button
              >
            {/each}
          </div>
          <Dialog.Footer></Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
      {#each activeLayoutsOrdered as av, index}
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <Button variant="outline" disabled={activeLayout == av.id} on:click={() => changeTab(av.id)}>
              {av.label}
            </Button>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item
              on:click={() => {
                if (index > 0 && activeLayoutsOrder.length > 0) {
                  let newLays = activeLayoutsOrder
                  let temp = newLays[index - 1]
                  newLays[index - 1] = newLays[index]
                  newLays[index] = temp
                  activeLayoutsOrder = newLays
                }
              }}
              ><div class="flex items-center gap-2"><ChevronLeft class="h-4" /> Move Left</div>
            </ContextMenu.Item>
            <ContextMenu.Item
              on:click={() => {
                if (index < activeLayoutsOrder.length - 1 && activeLayoutsOrder.length > 0) {
                  let newLays = activeLayoutsOrder
                  let temp = newLays[index + 1]
                  newLays[index + 1] = newLays[index]
                  newLays[index] = temp
                  activeLayoutsOrder = newLays
                }
              }}
            >
              <div class="flex items-center gap-2">
                <ChevronRight class="h-4" /> Move Right
              </div></ContextMenu.Item
            >
            <ContextMenu.Item
              on:click={() => {
                if (activeLayout == av.id) {
                  activeLayout = ''
                }

                const layIndex = activeLayouts.findIndex((lid) => {
                  return lid.id == av.id
                })
                const deletedAvs = activeLayouts.splice(layIndex, 1)
                deletedAvs.forEach((dav) => {
                  const idx = activeLayoutsOrder.findIndex((lid) => {
                    return lid == dav.id
                  })
                  activeLayoutsOrder.splice(idx, 1)
                  activeLayoutsOrder = activeLayoutsOrder
                })
                activeLayouts = activeLayouts
                if(activeLayouts.length == 1) {
                    activeLayout = activeLayouts[0].id
                  }

                layouts = layouts.map((lay) => {
                  logme('Active false', lay)
                  if (lay.id == av.id) lay.active = false
                  return lay
                })
              }}
            >
              <div class="flex items-center gap-2"><X class="h-4" /> Close</div></ContextMenu.Item
            >

            <Separator class="my-1"/>
            <ContextMenu.Item
            on:click={() => {
              av.rows.forEach((r) => {
                r.cells.forEach((c) => {
                  c.clientRef?.stopClient()
                })
              })
            }}
          >
            <div class="flex items-center gap-2"><Square class="h-4" /> Stop All</div></ContextMenu.Item
          >
          <ContextMenu.Item
          on:click={() => {
            av.rows.forEach((r) => {
              r.cells.forEach((c) => {
                c.clientRef?.starClient()
              })
            })
          }}
        >
          <div class="flex items-center gap-2"><Play class="h-4" /> Start All</div></ContextMenu.Item
        >
          <Separator class="my-1"/>
            {#each av.rows as row}
              {#each row.cells as cell}
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger>
                    <div class="flex items-center gap-2">
                      <!-- svelte-ignore a11y-missing-attribute -->
                      <img src="jobs/{sessions.find((s) => s.id == cell.sessionId)?.jobId}.png" />
                      {sessions.find((s) => s.id == cell.sessionId)?.name}
                    </div>
                  </ContextMenu.SubTrigger>
                  <ContextMenu.SubContent class="w-48">
                    <ContextMenu.Item
                      on:click={() => {
                        cell.clientRef.isStarted()
                          ? cell.clientRef.stopClient()
                          : cell.clientRef.starClient()
                      }}
                      >{#if cell.clientRef.isStarted()}
                        <Square class="h-4" />Stop
                      {:else}
                        <Play class="h-4" />Start
                      {/if}</ContextMenu.Item
                    >
                    <ContextMenu.Item
                      on:click={() => {
                        cell.clientRef.stopClient()
                        setTimeout(cell.clientRef.starClient, 500)
                      }}><RefreshCcw class="h-4" /> Restart</ContextMenu.Item
                    >
                  </ContextMenu.SubContent>
                </ContextMenu.Sub>
              {/each}
            {/each}
          </ContextMenu.Content>
        </ContextMenu.Root>
      {/each}
    </div>
    <div class="flex items-center gap-2 p-2 px-2">
      <Button size="icon" variant="outline" on:click={() => (visible = false)}>
        <Eye />
      </Button>
    </div>
  </nav>

  <SettingsOverlay open={openOverlay == 'settings'} onClose={onOverlayClose} />
  {#if promptReload}
    <AlertDialog.Root
      open
      onOpenChange={(o) => {
        if (!o) {
          promptReload = false
        }
      }}
    >
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Refresh sessions and layouts?</AlertDialog.Title>
          <AlertDialog.Description>
            There was changes to your sessions and layouts, do you want to refresh the data ?<br
            /><br />
            <strong>This will close all active sessions</strong>
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Close</AlertDialog.Cancel>
          <AlertDialog.Action
            on:click={() => {
              onRefresh()
            }}>Refresh</AlertDialog.Action
          >
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  {/if}
{:else}
  <Button
    class="fixed top-2 right-2 z-[100]"
    size="icon"
    variant="outline"
    on:click={() => (visible = true)}
  >
    <EyeOff />
  </Button>
{/if}
