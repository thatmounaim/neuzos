<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {
    ChevronDown,
    ChevronsUpDown,
    ChevronUp,
    FileX,
    HardDrive,
    Plus,
    Save,
    Trash
  } from '@lucide/svelte'

  import {Input} from '$lib/components/ui/input'
  import * as Command from '$lib/components/ui/command'
  import * as Popover from '$lib/components/ui/popover'
  import {Separator} from '$lib/components/ui/separator'
  import * as Table from '$lib/components/ui/table'
  import * as Select from '$lib/components/ui/select'
  import * as AlertDialog from '$lib/components/ui/alert-dialog'
  import type {NeuzConfig} from "$lib/types";
  import {getContext} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {neuzosBridge} from "$lib/core";

  const sessionIcons: string[] = [
    'job_vagrant',
    'job_assist',
    'job_ringmaster',
    'job_seraph',
    'job_billposter',
    'job_forcemaster',
    'job_acrobat',
    'job_ranger',
    'job_crackshooter',
    'job_jester',
    'job_harlequin',
    'job_magician',
    'job_psykeeper',
    'job_mentalist',
    'job_elementor',
    'job_arcanist',
    'job_mercenary',
    'job_knight',
    'job_templar',
    'job_blade',
    'job_slayer',
    'icn_browser',
  ]

  const neuzosConfig = getContext<NeuzConfig>('neuzosConfig')

  const clearCache = (sessionId: string) => {
    neuzosBridge.sessions.clearCache(sessionId)
  }

  const clearStorage = (sessionId: string) => {
    neuzosBridge.sessions.clearStorage(sessionId)
  }

  const addSession = () => {
    neuzosConfig.sessions.push({
      id: Date.now().toString(),
      label: 'Unnamed Session',
      icon: {
        slug: 'job_vagrant'
      }
    })
  }
  const deleteSession = (sessionId: string) => {
    clearStorage(sessionId)
    neuzosConfig.sessions = neuzosConfig.sessions.filter(s => s.id !== sessionId)
  }

</script>
<Card.Root class="h-full  overflow-y-auto">
  <Card.Content class="flex flex-col gap-4">
    <Table.Root>
      <Table.Caption>A list of your flyff universe sessions.</Table.Caption>
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
                  <ChevronUp class="size-3"></ChevronUp>
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
                  <ChevronDown class="size-3"></ChevronDown>
                </Button
                >
              </div>
            </Table.Cell>
            <Table.Cell>
              <div class="flex items-center">
                <Select.Root type="single" bind:value={session.icon.slug}>
                  <Select.Trigger size="xs" class="w-14 p-0 m-0 px-2 py-1">
                    {#if session.icon.slug}
                      <img src="/icons/{session.icon.slug}.png" alt=""/>
                    {:else}
                      <img src="/icons/default.png" alt=""/>
                    {/if}
                  </Select.Trigger>
                  <Select.Content class="w-16 max-h-64">
                    {#each sessionIcons as icon}
                      <Select.Item value={icon}>
                        <img src="/icons/{icon}.png" alt=""/></Select.Item
                      >
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>
            </Table.Cell>
            <Table.Cell class="w-1/2">
              <Input
                class="px-3 py-1 h-auto"
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
              {#if session.srcOverwrite}
                <Input class="px-3 py-1 h-auto w-full" bind:value={session.srcOverwrite}/>
                {:else}
                <Button variant="outline" size="sm" onclick={() => {
                  session.srcOverwrite = 'https://'
                }}>Overwrite</Button>
              {/if}
            </Table.Cell>
            <Table.Cell class="text-xs">{session.id}</Table.Cell>
            <Table.Cell>
              <div class="flex gap-2 items-center">
                <AlertDialog.Root>
                  <AlertDialog.Trigger>
                    <Button variant="outline" size="xs">
                      <FileX class="h-4"/>
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
                      }}>Clear Cache
                      </AlertDialog.Action
                      >
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog.Root>
                <AlertDialog.Root>
                  <AlertDialog.Trigger>
                    <Button variant="outline" size="xs">
                      <HardDrive class="h-4"/>
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
                      }}>Clear Data
                      </AlertDialog.Action
                      >
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog.Root>
                <AlertDialog.Root>
                  <AlertDialog.Trigger>
                    <Button variant="outline" size="xs">
                      <Trash class="h-4"/>
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
    <div class="flex items-center justify-between">
      <Button variant="outline" size="sm" onclick={addSession}>Add Session</Button>
    </div>
  </Card.Footer>
</Card.Root>
