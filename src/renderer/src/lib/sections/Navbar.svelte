<script lang="ts">
  import {
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Eye,
    EyeOff,
    Globe,
    Maximize,
    Minus,
    Play,
    Plus,
    Puzzle,
    RefreshCcw,
    Settings,
    Square,
    Volume2,
    VolumeX,
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
  import * as Tabs from '$lib/components/ui/tabs'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { cn } from '$lib/utils'
  export let onRefresh: () => unknown
  export let changeTab: (s: string) => unknown
  export let sessions: NeuzSession[]
  export let layouts: NeuzLayout[]
  export let activeLayout: string
  export let activeLayouts: NeuzLayout[]
  export let activeLayoutsOrder: string[]
  export let widgets: any
  export let onWidgetUpdate: () => unknown
  export let browserEnabled: boolean
  export let autofocusEnabled: boolean
  export let zenModeFull: boolean

  let openOverlay: string | null = null
  let promptReload: boolean = false
  let visible: boolean = true

  const onSettingsClose = () => {
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
          floating: (lay.floating ?? []).map((ll) => {
            return {
              sessionId: ll.sessionId
            }
          }),
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
    browserEnabled = parseInt(localStorage.getItem('browserEnabled') ?? '1') == 1
    autofocusEnabled = parseInt(localStorage.getItem('autofocusEnabled') ?? '1') == 1
    zenModeFull = parseInt(localStorage.getItem('zenModeFull') ?? '0') == 1

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
  <div
    id="titlebar"
    class="gap-2 p-1 px-3 select-none border-b border-accent flex items-center justify-end bg-accent/50"
  >
    <div
      class="flex-1 cursor-grab active:cursor-grabbing h-full w-full"
      style="-webkit-app-region: drag;"
    ></div>
    <Button
      size="sm"
      variant="outline"
      class="p-1 px-2 h-4"
      on:click={() => {
        window.electron.ipcRenderer.send('window-minimize')
      }}
    >
      <Minus class="w-3 h-3" />
    </Button>
    <Button
      size="sm"
      variant="outline"
      class="p-1 px-2 h-4"
      on:click={() => {
        window.electron.ipcRenderer.send('window-maximize')
      }}
    >
      <Maximize class="w-3 h-3" />
    </Button>
    <Button
      variant="outline"
      on:click={() => {
        window.electron.ipcRenderer.send('window-close')
      }}
      size="sm"
      class="p-1 px-2 h-4"
    >
      <X class="w-3 h-3" />
    </Button>
  </div>
  <nav class="w-full flex items-center justify-between">
    <div class="flex items-center gap-2 p-2 px-2">
      <Button
        size="sm"
        class="p-1 px-2"
        variant="outline"
        on:click={() => {
          openOverlay = 'settings'
        }}
      >
        <Settings class="w-4 h-4" />
      </Button>
      <Dialog.Root>
        <Dialog.Trigger class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'p-1 px-2')}
          ><Plus class="w-4 h-4" /></Dialog.Trigger
        >
        <Dialog.Content class="sm:max-w-[425px]">
          <Dialog.Header>
            <Dialog.Title>Chose a Layout / Session</Dialog.Title>
            <Dialog.Description
              >Select a layout to use or a session to pop in a window</Dialog.Description
            >
          </Dialog.Header>
          <div class="flex gap-2 flex-col w-full">
            <Tabs.Root value="layouts" class="">
              <Tabs.List class="grid w-full grid-cols-3">
                <Tabs.Trigger value="layouts">Layouts</Tabs.Trigger>
                <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
                <Tabs.Trigger value="zensessions">Zen Mode</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="layouts">
                <div class="flex gap-2 flex-col">
                  {#each layouts as layout}
                    <Button
                      variant="outline"
                      on:click={() => {
                        const newLay = {
                          id: layout.id,
                          label: layout.label,
                          floating: layout.floating ?? [],
                          rows: layout.rows
                        }
                        activeLayouts.push(newLay)
                        if (activeLayouts.length == 1) {
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
              </Tabs.Content>
              <Tabs.Content value="sessions">
                <div class="grid gap-2 grid-cols-2 w-full">
                  {#each sessions as session}
                    <Button
                      variant="outline"
                      class="flex items-center gap-2 justify-between"
                      on:click={() => {
                        const customSessionWindowSizes = JSON.parse(
                          localStorage.getItem('customSessionWindowSizes') ?? '{}'
                        )
                        const wSize = customSessionWindowSizes[session.id]
                        {
                          /*@ts-ignore*/
                        }
                        window.electron.ipcRenderer.send('popSession', session.id, wSize)
                      }}
                    >
                      <div class="flex items-center justify-start gap-2 flex-1">
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <img src="jobs/{session.jobId}.png" class="h-4 w-4" />
                        <span>{session.name}</span>
                      </div>
                      <ExternalLink class="h-4" />
                    </Button>
                  {/each}
                </div>
              </Tabs.Content>
              <Tabs.Content value="zensessions">
                <div class="grid gap-2 grid-cols-2 w-full">
                  {#each sessions as session}
                    <Button
                      variant="outline"
                      class="flex items-center gap-2 justify-between"
                      on:click={() => {
                        window.electron.ipcRenderer.send(
                          'popSession',
                          session.id,
                          null,
                          true,
                          zenModeFull
                        )
                      }}
                    >
                      <div class="flex items-center justify-start gap-2 flex-1">
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <img src="jobs/{session.jobId}.png" class="h-4 w-4" />
                        <span>{session.name}</span>
                      </div>
                      <ExternalLink class="h-4" />
                    </Button>
                  {/each}
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </div>
          <Dialog.Footer></Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
      {#if browserEnabled}
        <Button
          size="sm"
          variant="outline"
          class="p-1 px-2"
          on:click={() => {
            changeTab('neuzos.internal.browser')
          }}
          disabled={activeLayout == 'neuzos.internal.browser'}
        >
          <Globe class="w-4 h-4" />
        </Button>
      {/if}
      <Separator orientation="vertical" />
      {#each activeLayoutsOrdered as av, index}
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <Button
              variant="outline"
              size="sm"
              disabled={activeLayout == av.id}
              on:click={() => changeTab(av.id)}
            >
              {av.label}
            </Button>
          </ContextMenu.Trigger>
          <ContextMenu.Content class="fixed">
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
                if (activeLayouts.length == 1) {
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
            <Separator class="my-1" />
            <ContextMenu.Item
              on:click={() => {
                av.rows.forEach((r) => {
                  r.cells.forEach((c) => {
                    c.clientRef?.setAudioMuted(false)
                  })
                })

                av.floating?.forEach((c) => {
                  c.clientRef?.setAudioMuted(false)
                })
              }}
            >
              <div class="flex items-center gap-2">
                <Volume2 class="h-4" /> Unmute All
              </div></ContextMenu.Item
            >
            <ContextMenu.Item
              on:click={() => {
                av.rows.forEach((r) => {
                  r.cells.forEach((c) => {
                    c.clientRef?.setAudioMuted(true)
                  })
                })

                av.floating?.forEach((c) => {
                  c.clientRef?.setAudioMuted(true)
                })
              }}
            >
              <div class="flex items-center gap-2">
                <VolumeX class="h-4" /> Mute All
              </div></ContextMenu.Item
            >
            <Separator class="my-1" />
            <ContextMenu.Item
              on:click={() => {
                av.rows.forEach((r) => {
                  r.cells.forEach((c) => {
                    c.clientRef?.stopClient()
                  })
                })

                av.floating?.forEach((c) => {
                  c.clientRef?.stopClient()
                })
              }}
            >
              <div class="flex items-center gap-2">
                <Square class="h-4" /> Stop All
              </div></ContextMenu.Item
            >
            <ContextMenu.Item
              on:click={() => {
                av.rows.forEach((r) => {
                  r.cells.forEach((c) => {
                    c.clientRef?.starClient()
                  })
                })

                av.floating?.forEach((c) => {
                  c.clientRef?.starClient()
                })
              }}
            >
              <div class="flex items-center gap-2">
                <Play class="h-4" /> Start All
              </div></ContextMenu.Item
            >
            <Separator class="my-1" />
            <ContextMenu.Label>Layout Session</ContextMenu.Label>
            {#each av.rows as row}
              {#each row.cells as cell}
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger>
                    <div class="flex items-center gap-2 justify-between w-full">
                      <div class="flex items-center gap-2">
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <img src="jobs/{sessions.find((s) => s.id == cell.sessionId)?.jobId}.png" />
                        {sessions.find((s) => s.id == cell.sessionId)?.name}
                      </div>
                      {#if cell.clientRef?.isMuted()}
                        <VolumeX class="w-4 h-4" />
                      {/if}
                    </div>
                  </ContextMenu.SubTrigger>
                  <ContextMenu.SubContent class="w-48">
                    <ContextMenu.Item
                      on:click={() => {
                        cell.clientRef?.isMuted()
                          ? cell.clientRef?.setAudioMuted(false)
                          : cell.clientRef?.setAudioMuted(true)
                      }}
                      >{#if !cell.clientRef?.isMuted()}
                        <VolumeX class="h-4" />Mute
                      {:else}
                        <Volume2 class="h-4" />Unmute
                      {/if}</ContextMenu.Item
                    >
                    <Separator />
                    <ContextMenu.Item
                      on:click={() => {
                        cell.clientRef?.isStarted()
                          ? cell.clientRef?.stopClient()
                          : cell.clientRef?.starClient()
                      }}
                      >{#if cell.clientRef?.isStarted()}
                        <Square class="h-4" />Stop
                      {:else}
                        <Play class="h-4" />Start
                      {/if}</ContextMenu.Item
                    >
                    <ContextMenu.Item
                      on:click={() => {
                        cell.clientRef?.stopClient()
                        setTimeout(cell.clientRef?.starClient, 500)
                      }}><RefreshCcw class="h-4" /> Restart</ContextMenu.Item
                    >
                    <Separator />
                    <ContextMenu.Item
                      on:click={() => {
                        {
                          /*@ts-ignore*/
                        }
                        window.electron.ipcRenderer.send('popSession', cell.sessionId)
                      }}><ExternalLink class="h-4" /> Pop Session Out</ContextMenu.Item
                    >
                  </ContextMenu.SubContent>
                </ContextMenu.Sub>
              {/each}
            {/each}
            {#if (av.floating ?? []).length > 0}
              <Separator class="my-1" />
              <ContextMenu.Label>Floating Session</ContextMenu.Label>
              {#each av.floating ?? [] as cell}
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger>
                    <div class="flex items-center gap-2 justify-between w-full">
                      <div class="flex items-center gap-2">
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <img src="jobs/{sessions.find((s) => s.id == cell.sessionId)?.jobId}.png" />
                        {sessions.find((s) => s.id == cell.sessionId)?.name}
                      </div>
                      {#if cell.clientRef?.isMuted()}
                        <VolumeX class="w-4 h-4" />
                      {/if}
                    </div>
                  </ContextMenu.SubTrigger>
                  <ContextMenu.SubContent class="w-48">
                    <ContextMenu.Item
                      on:click={() => {
                        cell.clientRef?.isMuted()
                          ? cell.clientRef?.setAudioMuted(false)
                          : cell.clientRef?.setAudioMuted(true)
                      }}
                      >{#if !cell.clientRef?.isMuted()}
                        <VolumeX class="h-4" />Mute
                      {:else}
                        <Volume2 class="h-4" />Unmute
                      {/if}</ContextMenu.Item
                    >
                    <Separator />
                    <ContextMenu.Item
                      on:click={() => {
                        cell.clientRef?.isStarted()
                          ? cell.clientRef?.stopClient()
                          : cell.clientRef?.starClient()
                      }}
                      >{#if cell.clientRef?.isStarted()}
                        <Square class="h-4" />Stop
                      {:else}
                        <Play class="h-4" />Start
                      {/if}</ContextMenu.Item
                    >
                    <ContextMenu.Item
                      on:click={() => {
                        cell.clientRef?.stopClient()
                        setTimeout(cell.clientRef?.starClient, 500)
                      }}><RefreshCcw class="h-4" /> Restart</ContextMenu.Item
                    >
                    <Separator />
                    <ContextMenu.Item
                      on:click={() => {
                        {
                          /*@ts-ignore*/
                        }
                        window.electron.ipcRenderer.send('popSession', cell.sessionId)
                      }}><ExternalLink class="h-4" /> Pop Session Out</ContextMenu.Item
                    >
                  </ContextMenu.SubContent>
                </ContextMenu.Sub>
              {/each}
            {/if}
          </ContextMenu.Content>
        </ContextMenu.Root>
      {/each}
    </div>
    <div class="flex items-center gap-2 p-2 px-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild let:builder>
          <Button size="sm" builders={[builder]} variant="outline"
            ><Puzzle class="w-4 h-4" /></Button
          >
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-56 fixed">
          <DropdownMenu.Label>Widgets</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            disabled={widgets.internal_flyffipedia.active}
            on:click={() => {
              widgets.internal_flyffipedia.active = true
              onWidgetUpdate()
            }}
          >
            <!-- svelte-ignore a11y-missing-attribute -->
            <img src={widgets.internal_flyffipedia.icon} class="mr-2 h-4 w-4" />
            <span>{widgets.internal_flyffipedia.title}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            disabled={widgets.internal_fcoin_calculator.active}
            on:click={() => {
              widgets.internal_fcoin_calculator.active = true
              onWidgetUpdate()
            }}
          >
            <!-- svelte-ignore a11y-missing-attribute -->
            <img src={widgets.internal_fcoin_calculator.icon} class="mr-2 h-4 w-4" />
            <span>{widgets.internal_fcoin_calculator.title}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            disabled={widgets.internal_pet_food_calculator.active}
            on:click={() => {
              widgets.internal_pet_food_calculator.active = true
              onWidgetUpdate()
            }}
          >
            <!-- svelte-ignore a11y-missing-attribute -->
            <img src={widgets.internal_pet_food_calculator.icon} class="mr-2 h-4 w-4" />
            <span>{widgets.internal_pet_food_calculator.title}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <Button size="sm" variant="outline" on:click={() => (visible = false)}>
        <Eye class="w-4 h-4" />
      </Button>
    </div>
  </nav>
  <SettingsOverlay open={openOverlay == 'settings'} onClose={onSettingsClose} />
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
    class="fixed top-2 right-2 z-[100] h-6 w-6 p-1"
    size="sm"
    variant="outline"
    on:click={() => (visible = true)}
  >
    <EyeOff class="w-4 h-4" />
  </Button>
{/if}
