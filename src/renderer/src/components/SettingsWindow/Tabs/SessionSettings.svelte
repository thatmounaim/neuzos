<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {
    ChevronDown,
    ChevronUp,
    FileX,
    HardDrive,
    Plus,
    Trash,
    Globe,
    PersonStanding
  } from '@lucide/svelte'

  import {Input} from '$lib/components/ui/input'
  import * as Command from '$lib/components/ui/command'
  import * as Popover from '$lib/components/ui/popover'
  import * as Table from '$lib/components/ui/table'
  import * as AlertDialog from '$lib/components/ui/alert-dialog'
  import type {NeuzConfig} from "$lib/types";
  import {getContext} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {neuzosBridge} from "$lib/core";

  const sessionIcons: string[] = [
    "neuzos_pang",
    'misc/browser',
    'jobs/vagrant',
    'jobs/assist',
    'jobs/ringmaster',
    'jobs/seraph',
    'jobs/billposter',
    'jobs/forcemaster',
    'jobs/acrobat',
    'jobs/ranger',
    'jobs/crackshooter',
    'jobs/jester',
    'jobs/harlequin',
    'jobs/magician',
    'jobs/psykeeper',
    'jobs/mentalist',
    'jobs/elementor',
    'jobs/arcanist',
    'jobs/mercenary',
    'jobs/knight',
    'jobs/templar',
    'jobs/blade',
    'jobs/slayer',
  ]

  const neuzosConfig = getContext<NeuzConfig>('neuzosConfig')

  const clearCache = (sessionId: string) => {
    neuzosBridge.sessions.clearCache(sessionId)
  }

  const clearStorage = (sessionId: string) => {
    neuzosBridge.sessions.clearStorage(sessionId)
  }

  const clearAllCache = () => {
    neuzosConfig.sessions.forEach(session => {
      neuzosBridge.sessions.clearCache(session.id)
    })
    clearAllCacheOpenModal = false
  }

  const addSession = () => {
    neuzosConfig.sessions.push({
      id: Date.now().toString(),
      label: 'Unnamed Session',
      icon: {
        slug: 'jobs/vagrant'
      }
    })
  }
  const deleteSession = (sessionId: string) => {
    clearStorage(sessionId)
    neuzosConfig.sessions = neuzosConfig.sessions.filter(s => s.id !== sessionId)
  }

  let clearCacheOpenModal: string | null = $state(null)
  let clearStorageOpenModal: string | null = $state(null)
  let clearAllCacheOpenModal: boolean = $state(false)

  // Track icon popover state for each session
  let iconPopoverStates: { [sessionId: string]: boolean } = $state({});
</script>
<Card.Root class="h-full  overflow-y-auto">
  <Card.Header>
    <Card.Title class="text-lg font-semibold">
      Manage Sessions
    </Card.Title>
    <Card.Description>
      Configure your Flyff Universe sessions below. You can add, edit, reorder, and delete sessions as needed.<br>
      You can overwrite the launch URL for each session to point to different website.<br>
      Overwritten URLs for web use cases can be set to use a browser partition to avoid heavy storage usage.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class=""></Table.Head>
          <Table.Head class="w-[100px]">Icon</Table.Head>
          <Table.Head class="w-1/2">Label</Table.Head>
          <Table.Head class="w-1/2">Launch URL Overwrite</Table.Head>
          <Table.Head>Session ID</Table.Head>
          <Table.Head>Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each neuzosConfig.sessions as session, sidx (session.id)}
          <Table.Row>
            <Table.Cell>
              <div class="flex flex-col gap-0.5">
                <Button onclick={() => {
                let curSess = JSON.parse(JSON.stringify(session))
                let repSess = JSON.parse(JSON.stringify(neuzosConfig.sessions[sidx-1]))
                neuzosConfig.sessions[sidx] = repSess
                neuzosConfig.sessions[sidx-1] = curSess

              }} disabled={sidx <= 0} variant="outline" size="icon-xs"

                >
                  <ChevronUp class="h-4 w-4"></ChevronUp>
                </Button
                >
                <Button onclick={() => {
                let curSess = JSON.parse(JSON.stringify(session))
                let repSess = JSON.parse(JSON.stringify(neuzosConfig.sessions[sidx+1]))
                neuzosConfig.sessions[sidx] = repSess
                neuzosConfig.sessions[sidx+1] = curSess
              }}
                        disabled={sidx > neuzosConfig.sessions.length - 2} variant="outline" size="icon-xs"

                >
                  <ChevronDown class="h-4 w-4"></ChevronDown>
                </Button
                >
              </div>
            </Table.Cell>
            <Table.Cell>
              {@const isOpen = iconPopoverStates[session.id] ?? false}
              <div class="flex items-center">
                <Popover.Root open={isOpen} onOpenChange={(open) => { iconPopoverStates[session.id] = open; }}>
                  <Popover.Trigger class="w-10 h-10 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                    {#if session.icon.slug}
                      <img class="w-6 h-6" src="icons/{session.icon.slug}.png" alt=""/>
                    {:else}
                      <img class="w-6 h-6" src="icons/neuzos_pang.png" alt=""/>
                    {/if}
                  </Popover.Trigger>
                  <Popover.Content class="w-[280px] p-0">
                    <Command.Root shouldFilter={true}>
                      <Command.Input placeholder="Search icons..." class="h-10" />
                      <Command.Empty>No icon found.</Command.Empty>
                      <Command.List class="max-h-[320px]">
                        <Command.Group>
                          {#each sessionIcons as icon}
                            <Command.Item
                              value={icon}
                              keywords={[icon.replace('jobs/', '').replace('misc/', '').replace(/_/g, ' ').toLowerCase()]}
                              onSelect={() => {
                                session.icon.slug = icon;
                                iconPopoverStates[session.id] = false;
                              }}
                              class="py-2"
                            >
                              <img class="size-6 mr-2" src="icons/{icon}.png" alt=""/>
                              <span class="text-xs truncate">{icon.replace('jobs/', '').replace('misc/', '')}</span>
                            </Command.Item>
                          {/each}
                        </Command.Group>
                      </Command.List>
                    </Command.Root>
                  </Popover.Content>
                </Popover.Root>
              </div>
            </Table.Cell>
            <Table.Cell class="w-1/2">
              <Input
                class="h-9 text-sm"
                bind:value={session.label}
                onchange={(e) => {
                {/*@ts-ignore*/}
                if (e.target.value === '') {
                  session.label = 'Unnamed Session'
                }
              }}
              />
            </Table.Cell>
            <Table.Cell class="w-1/2">
              <div class="flex items-center gap-2">
                {#if session.srcOverwrite}
                  {#if !session.partitionOverwrite}
                    <Button variant="outline" size="sm" onclick={() => {session.partitionOverwrite = 'browser'}}>
                      <PersonStanding/>
                    </Button>
                  {:else}
                    <Button variant="outline" size="sm" onclick={() => {delete(session.partitionOverwrite)}}>
                      <Globe/>
                    </Button>
                  {/if}
                  <Input class="h-9 text-sm w-full" bind:value={session.srcOverwrite} oninput={(e) => {
                  if (e.target.value.length == 0 || e.target.value === ' ') {
                    delete(session.srcOverwrite)
                    delete(session.partitionOverwrite)
                  }
                }}/>

                {:else}
                  <Button variant="outline" size="sm" onclick={() => {
                  session.srcOverwrite = 'https://'
                }}>Overwrite
                  </Button>
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="text-xs">{session.id}</Table.Cell>
            <Table.Cell>
              <div class="flex gap-2 items-center">
                <AlertDialog.Root open={clearCacheOpenModal === session.id} onOpenChange={(open) => {
                  clearCacheOpenModal = open ? session.id : null;
                }}>
                  <AlertDialog.Trigger>
                    <Button variant="outline" size="icon" class="h-8 w-8">
                      <FileX class="h-4 w-4"/>
                    </Button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Content>
                    <AlertDialog.Header>
                      <AlertDialog.Title>Clear "{session.label}" session's cache.</AlertDialog.Title>
                      <AlertDialog.Description>
                        This action will clear the cache for <b>"{session.label}"</b> even without
                        saving your changes later on.<br/>

                        Your session data will still be saved
                      </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer>
                      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                      <AlertDialog.Action
                        onclick={() => {
                        clearCache(session.id)
                        clearCacheOpenModal = null
                      }}>Clear Cache
                      </AlertDialog.Action
                      >
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog.Root>
                <AlertDialog.Root open={clearStorageOpenModal === session.id} onOpenChange={(open) => {
                  clearStorageOpenModal = open ? session.id : null;
                }}>
                  <AlertDialog.Trigger>
                    <Button variant="outline" size="icon" class="h-8 w-8">
                      <HardDrive class="h-4 w-4"/>
                    </Button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Content>
                    <AlertDialog.Header>
                      <AlertDialog.Title>Clear "{session.label}" session's data.</AlertDialog.Title>
                      <AlertDialog.Description>
                        This action will still clear any session data for <b>"{session.label}"</b> even
                        without saving your changes later on.
                      </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer>
                      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                      <AlertDialog.Action
                        onclick={() => {
                        clearStorage(session.id)
                        clearStorageOpenModal = null
                      }}>Clear Data
                      </AlertDialog.Action
                      >
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog.Root>
                <AlertDialog.Root>
                  <AlertDialog.Trigger>
                    <Button variant="outline" size="icon" class="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground">
                      <Trash class="h-4 w-4"/>
                    </Button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Content>
                    <AlertDialog.Header>
                      <AlertDialog.Title>Delete session "{session.label}" ?</AlertDialog.Title>
                      <AlertDialog.Description>
                        This action will still clear any session data for <b>"{session.label}"</b> even
                        without saving your changes later on.
                      </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer>
                      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                      <AlertDialog.Action
                        onclick={() => {
                        deleteSession(session.id)
                      }}>Delete
                      </AlertDialog.Action
                      >
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog.Root>
              </div>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </Card.Content>
  <Card.Footer>
    <div class="flex items-center justify-between w-full">
      <Button variant="outline" size="sm" onclick={addSession}>
        <Plus class="h-4 w-4 mr-2"/>
        Add Session
      </Button>
      <AlertDialog.Root open={clearAllCacheOpenModal} onOpenChange={(open) => {
        clearAllCacheOpenModal = open;
      }}>
        <AlertDialog.Trigger>
          <Button variant="outline" size="sm">
            <FileX class="h-4 w-4 mr-2"/>
            Clear All Cache
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Clear all sessions' cache?</AlertDialog.Title>
            <AlertDialog.Description>
              This action will clear the cache for all sessions even without saving your changes later on.<br/><br/>
              <strong>Sessions that will be affected:</strong>
              <ul class="mt-2 space-y-1 list-disc list-inside">
                {#each neuzosConfig.sessions as session}
                  <li class="text-sm">
                    <span class="font-medium">{session.label}</span>
                    <span class="text-muted-foreground"> (ID: {session.id})</span>
                  </li>
                {/each}
              </ul>
              <br/>
              Your session data will still be saved.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action onclick={clearAllCache}>
              Clear All Cache
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  </Card.Footer>
</Card.Root>
