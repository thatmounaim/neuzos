<script lang="ts">
  import { onMount } from 'svelte'
  import type { NeuzLayout, NeuzSession } from '../../../characterutils'
  import * as Card from '$lib/components/ui/card'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Minus, Plus, Save, Trash } from 'lucide-svelte'
  import Separator from '$lib/components/ui/separator/separator.svelte'
  import Input from '$lib/components/ui/input/input.svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { buttonVariants } from '$lib/components/ui/button'
  import { logme } from '../../../debug'
  let sessions: NeuzSession[] = []

  function getSession(sid) {
    const idx = sessions.findIndex((s) => {
      return s.id == sid
    })

    if (idx < 0) {
      return undefined
    }

    const session = sessions[idx]
    return session
  }

  let layouts: NeuzLayout[] = []

  function saveLayouts() {
    logme('SaveLayouts', layouts)
    layouts = layouts.map((lay) => {
      let newLay = {
        id: lay.id,
        label: lay.label,
        floating: lay.floating ?? [],
        rows: lay.rows
      }
      return newLay
    })
    logme('AfterSave', layouts)
    localStorage.setItem('layouts', JSON.stringify(layouts))
  }

  let loaded: boolean = false
  let newName = ''
  onMount(() => {
    loaded = true
    sessions = JSON.parse(localStorage.getItem('sessions') || '[]')
    layouts = JSON.parse(localStorage.getItem('layouts') || '[]')
  })
</script>

<section class="py-4">
  {#if loaded}
    <div class="flex items-center gap-2 w-auto px-2">
      <Input class="w-auto" bind:value={newName} placeholder="Layout Name" />
      <Button
        variant="outline"
        on:click={() => {
          if (newName == '') {
            alert('Please select a name for your layout')
            return
          }
          layouts.push({
            id: '' + Date.now(),
            label: newName,
            rows: []
          })
          layouts = layouts

          newName = ''
        }}
      >
        <Plus class="h-5" />
        <span>Add Layout</span>
      </Button>
      <div class="flex-1"></div>
      <Button variant="outline" on:click={saveLayouts} class="flex gap-2 items-center border-2">
        Save Changes
        <Save class="h-5" />
      </Button>
    </div>

    <Separator class="my-4"></Separator>
    <div class="flex flex-col gap-4">
      {#each layouts as layout, layIndex}
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex">
              <Input
                class="w-auto"
                bind:value={layout.label}
                on:change={(e) => {
                  {/* @ts-ignore */}
                  if (e.target.value == '') {
                    layout.label = 'Unamed Layout'
                  }
                }}
                placeholder="Layout Name"
              />
              <div class="flex-1"></div>
              <Button
                variant="outline"
                size="icon"
                on:click={(e) => {
                  layouts.splice(layIndex, 1)
                  layouts = layouts ?? []
                  e.preventDefault()
                  e.stopPropagation()
                }}><Trash class="h-5" /></Button
              >
            </Card.Title>
            <Card.Description></Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="flex flex-col gap-2">
              {#each layout.rows as row, rowIndex}
                <div class="flex gap-2">
                  {#each row.cells as cell, cellIndex}
                    <Dialog.Root>
                      <Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
                        >{getSession(cell.sessionId)?.name ?? '[Chose Session]'}</Dialog.Trigger
                      >
                      <Dialog.Content class="sm:max-w-[425px] h-[400px] py-4">
                        <Dialog.Header>
                          <Dialog.Title>Chose a session</Dialog.Title>
                        </Dialog.Header>
                        <div class="flex flex-col h-full overflow-y-auto gap-1 px-4">
                          {#each sessions as session}
                            <Dialog.Close
                              on:click={() => {
                                layouts[layIndex].rows[rowIndex].cells[cellIndex] = {
                                  sessionId: session.id
                                }
                                layouts = layouts
                              }}
                            >
                              <Button variant="outline" class="w-full">{session.name}</Button>
                            </Dialog.Close>
                          {/each}
                        </div>
                      </Dialog.Content>
                    </Dialog.Root>
                  {/each}
                  <div class="flex-1"></div>
                  <Button
                    variant="outline"
                    size="sm"
                    on:click={() => {
                      layouts[layIndex].rows[rowIndex].cells.pop()
                      if (layouts[layIndex].rows[rowIndex].cells.length == 0) {
                        layouts[layIndex].rows.splice(rowIndex, 1)
                      }
                      layouts = layouts
                    }}><Minus class="h-5" /></Button
                  >
                  <Button
                    variant="outline"
                    size="sm"
                    on:click={() => {
                      layouts[layIndex].rows[rowIndex].cells.push({
                        sessionId: ''
                      })
                      layouts = layouts
                    }}><Plus class="h-5" /></Button
                  >
                </div>
              {/each}
              <Separator class="my-2" />
              <Button
                variant="outline"
                size="sm"
                on:click={() => {
                  layouts[layIndex].rows.push({
                    cells: [
                      {
                        sessionId: ''
                      }
                    ]
                  })
                  layouts = layouts
                }}><Plus class="h-5" /> Add Row</Button
              >
            </div>
            <div class="flex flex-col gap-2">
              <Separator class="my-4" />
              <h2 class="text-lg">Floating Sessions</h2>
              <div class="flex items-center gap-2">
                {#each layout.floating ?? [] as cell, cellIndex}
                  <Dialog.Root>
                    <Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
                      >{getSession(cell.sessionId)?.name ?? '[Chose Session]'}</Dialog.Trigger
                    >
                    <Dialog.Content class="sm:max-w-[425px] h-[400px] py-4">
                      <Dialog.Header>
                        <Dialog.Title>Chose a session</Dialog.Title>
                      </Dialog.Header>
                      <div class="flex flex-col h-full overflow-y-auto gap-1 px-4">
                        {#each sessions as session}
                          <Dialog.Close
                            on:click={() => {
                              layouts[layIndex].floating[cellIndex] = {
                                sessionId: session.id
                              }
                              layouts = layouts
                            }}
                          >
                            <Button variant="outline" class="w-full">{session.name}</Button>
                          </Dialog.Close>
                        {/each}
                      </div>
                    </Dialog.Content>
                  </Dialog.Root>
                {/each}
                <div class="flex-1"></div>
                <Button
                  variant="outline"
                  size="sm"
                  on:click={() => {
                    if (!layout.floating) {
                      layouts[layIndex].floating = []
                    }
                    layouts[layIndex].floating.pop()
                    layouts = layouts
                  }}><Minus class="h-5" /></Button
                >
                <Button
                  variant="outline"
                  size="sm"
                  on:click={() => {
                    if (!layout.floating) {
                      layouts[layIndex].floating = []
                    }
                    layouts[layIndex].floating.push({
                      sessionId: ''
                    })
                    layouts = layouts
                  }}><Plus class="h-5" /></Button
                >
              </div>
            </div>
          </Card.Content>
          <Card.Footer></Card.Footer>
        </Card.Root>
      {/each}
    </div>
  {/if}
</section>
