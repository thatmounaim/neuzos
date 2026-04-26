<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {
    ChevronDown,
    ChevronUp,
    Copy,
    FileX,
    HardDrive,
    Plus,
    Trash,
    Globe,
    PersonStanding
  } from '@lucide/svelte'

  import {Input} from '$lib/components/ui/input'
  import * as Tooltip from '$lib/components/ui/tooltip'
  import * as Command from '$lib/components/ui/command'
  import * as Popover from '$lib/components/ui/popover'
  import * as Table from '$lib/components/ui/table'
  import * as AlertDialog from '$lib/components/ui/alert-dialog'
  import type {NeuzConfig, NeuzSession, NeuzSessionGroup} from "$lib/types";
  import {getContext} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {Switch} from "$lib/components/ui/switch";
  import {neuzosBridge} from "$lib/core";
  import {toast} from 'svelte-sonner'

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

  const clampZoom = (value: number) => Math.min(1.5, Math.max(0.5, Math.round(value * 20) / 20))

  const defaultGroupLabel = 'New Group'

  const generateCloneLabel = (sourceLabel: string, existingLabels: Set<string>) => {
    const baseLabel = `${sourceLabel} (Copy)`
    if (!existingLabels.has(baseLabel)) {
      return baseLabel
    }

    let copyIndex = 2
    while (existingLabels.has(`${baseLabel} (${copyIndex})`)) {
      copyIndex += 1
    }

    return `${baseLabel} (${copyIndex})`
  }

  const normalizeSessionGroups = (groups: unknown, knownSessionIds: Set<string>): NeuzSessionGroup[] => {
    if (!Array.isArray(groups)) {
      return []
    }

    return groups.flatMap((group: any) => {
      if (!group || typeof group !== 'object') {
        return []
      }

      const id = typeof group.id === 'string' && group.id.trim() !== '' ? group.id.trim() : null
      if (!id) {
        return []
      }

      const label = typeof group.label === 'string' && group.label.trim() !== '' ? group.label.trim() : defaultGroupLabel
      const sessionIds = Array.isArray(group.sessionIds)
        ? [...new Set(group.sessionIds.filter((sessionId: any) => typeof sessionId === 'string' && knownSessionIds.has(sessionId)))]
        : []

      return [{id, label, sessionIds: sessionIds as string[]}]
    })
  }

  const currentGroups = $derived.by(() => {
    const knownSessionIds = new Set(neuzosConfig.sessions.map((session) => session.id))
    return normalizeSessionGroups(neuzosConfig.sessionGroups ?? [], knownSessionIds)
  })

  const ungroupedSessions = $derived.by(() => {
    const groupedSessionIds = new Set(currentGroups.flatMap((group) => group.sessionIds))
    return neuzosConfig.sessions.filter((session) => !groupedSessionIds.has(session.id))
  })

  const ensureSessionGroups = () => {
    const knownSessionIds = new Set(neuzosConfig.sessions.map((session) => session.id))
    const normalizedGroups = normalizeSessionGroups(neuzosConfig.sessionGroups ?? [], knownSessionIds)

    if (JSON.stringify(neuzosConfig.sessionGroups ?? []) !== JSON.stringify(normalizedGroups)) {
      neuzosConfig.sessionGroups = normalizedGroups
    }

    return neuzosConfig.sessionGroups
  }

  const getSessionZoom = (sessionId: string) => {
    return neuzosConfig.sessionZoomLevels?.[sessionId] ?? 1.0
  }

  const setSessionZoom = (sessionId: string, value: number) => {
    const zoom = clampZoom(value)
    neuzosConfig.sessionZoomLevels = neuzosConfig.sessionZoomLevels ?? {}
    neuzosConfig.sessionZoomLevels[sessionId] = zoom
    void neuzosBridge.sessions.setZoom(sessionId, zoom)
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
      },
      floatable: false
    })
  }

  const getSessionGroupId = (sessionId: string) => {
    return currentGroups.find((group) => group.sessionIds.includes(sessionId))?.id ?? null
  }

  const assignSessionToGroup = (sessionId: string, groupId: string | null) => {
    const groups = ensureSessionGroups()
    groups.forEach((group) => {
      group.sessionIds = group.sessionIds.filter((id) => id !== sessionId)
    })

    if (!groupId) {
      return
    }

    const targetGroup = groups.find((group) => group.id === groupId)
    if (!targetGroup) {
      return
    }

    targetGroup.sessionIds = [...targetGroup.sessionIds, sessionId]
  }

  const addGroup = () => {
    const newGroup: NeuzSessionGroup = {
      id: crypto.randomUUID(),
      label: defaultGroupLabel,
      sessionIds: []
    }
    ensureSessionGroups().push(newGroup)
    startEditingGroup(newGroup)
  }

  const deleteGroup = (groupId: string) => {
    neuzosConfig.sessionGroups = ensureSessionGroups().filter((group) => group.id !== groupId)
  }

  const moveGroup = (groupId: string, direction: -1 | 1) => {
    const groups = ensureSessionGroups()
    const currentIndex = groups.findIndex((group) => group.id === groupId)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= groups.length) {
      return
    }

    const nextGroups = [...groups]
    const [movedGroup] = nextGroups.splice(currentIndex, 1)
    nextGroups.splice(nextIndex, 0, movedGroup)
    neuzosConfig.sessionGroups = nextGroups
  }

  const moveSessionInSection = (groupId: string | null, sessionId: string, direction: -1 | 1) => {
    if (groupId) {
      const group = ensureSessionGroups().find((entry) => entry.id === groupId)
      if (!group) {
        return
      }

      const currentIndex = group.sessionIds.indexOf(sessionId)
      const nextIndex = currentIndex + direction
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= group.sessionIds.length) {
        return
      }

      const nextSessionIds = [...group.sessionIds]
      ;[nextSessionIds[currentIndex], nextSessionIds[nextIndex]] = [nextSessionIds[nextIndex], nextSessionIds[currentIndex]]
      group.sessionIds = nextSessionIds
      return
    }

    const groupedSessionIds = new Set(ensureSessionGroups().flatMap((group) => group.sessionIds))
    const ungroupedSessions = neuzosConfig.sessions.filter((session) => !groupedSessionIds.has(session.id))
    const currentIndex = ungroupedSessions.findIndex((session) => session.id === sessionId)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ungroupedSessions.length) {
      return
    }

    const swapSessionId = ungroupedSessions[nextIndex].id
    const sessionIndices = new Map(neuzosConfig.sessions.map((session, index) => [session.id, index]))
    const currentSessionIndex = sessionIndices.get(sessionId)
    const swapSessionIndex = sessionIndices.get(swapSessionId)
    if (currentSessionIndex === undefined || swapSessionIndex === undefined) {
      return
    }

    const nextSessions = [...neuzosConfig.sessions]
    ;[nextSessions[currentSessionIndex], nextSessions[swapSessionIndex]] = [nextSessions[swapSessionIndex], nextSessions[currentSessionIndex]]
    neuzosConfig.sessions = nextSessions
  }

  const getGroupSessions = (group: NeuzSessionGroup) => {
    const sessionMap = new Map(neuzosConfig.sessions.map((session) => [session.id, session]))
    return group.sessionIds
      .map((sessionId) => sessionMap.get(sessionId))
      .filter((session): session is NeuzSession => session !== undefined)
  }

  let clearCacheOpenModal: string | null = $state(null)
  let clearStorageOpenModal: string | null = $state(null)
  let clearAllCacheOpenModal: boolean = $state(false)
  let deleteSessionModal: { sessionId: string; sessionLabel: string; isRunning: boolean } | null = $state(null)
  let deleteErrorModal: { sessionLabel: string; error: string } | null = $state(null)
  let deletingSessionId: string | null = $state(null)
  let editingGroupId: string | null = $state(null)
  let collapsedGroupIds: Record<string, boolean> = $state({})
  let groupLabelDraft = $state('')
  let groupLabelBackup = $state('')

  const startEditingGroup = (group: NeuzSessionGroup) => {
    editingGroupId = group.id
    groupLabelDraft = group.label
    groupLabelBackup = group.label
  }

  const commitGroupLabel = (groupId: string) => {
    const group = ensureSessionGroups().find((entry) => entry.id === groupId)
    if (!group) {
      return
    }

    const trimmedLabel = groupLabelDraft.trim()
    group.label = trimmedLabel.length > 0 ? trimmedLabel : groupLabelBackup
    editingGroupId = null
  }

  const cancelGroupLabelEdit = () => {
    groupLabelDraft = groupLabelBackup
    editingGroupId = null
  }

  const isGroupCollapsed = (groupId: string) => {
    return collapsedGroupIds[groupId] ?? false
  }

  const toggleGroupCollapsed = (groupId: string) => {
    collapsedGroupIds[groupId] = !isGroupCollapsed(groupId)
  }

  const openDeleteSessionModal = async (sessionId: string, sessionLabel: string) => {
    const runningIds = await neuzosBridge.sessions.getRunningIds()
    deleteSessionModal = {
      sessionId,
      sessionLabel,
      isRunning: runningIds.includes(sessionId),
    }
  }

  const cloneSession = async (session: NeuzSession) => {
    const result = await neuzosBridge.sessions.clone(session.id)

    if (result.success === false) {
      toast.error(result.error ?? 'Failed to clone session')
      return
    }

    const sourceIndex = neuzosConfig.sessions.findIndex((entry) => entry.id === session.id)
    if (sourceIndex < 0) {
      toast.error('Source session was removed before cloning completed.')
      return
    }

    const existingLabels = new Set(neuzosConfig.sessions.map((entry) => entry.label))
    const clonedSession: NeuzSession = {
      ...session,
      id: result.newId,
      label: generateCloneLabel(session.label, existingLabels),
      partitionOverwrite: undefined,
    }

    neuzosConfig.sessions = [
      ...neuzosConfig.sessions.slice(0, sourceIndex + 1),
      clonedSession,
      ...neuzosConfig.sessions.slice(sourceIndex + 1),
    ]

    await neuzosBridge.config.save(neuzosConfig)

    if (result.stoppedBeforeClone) {
      toast.info('Session was stopped to allow cloning.')
    }
  }

  const deleteSession = async (sessionId: string, sessionLabel: string) => {
    deletingSessionId = sessionId
    deleteSessionModal = null
    const result = await neuzosBridge.sessions.deleteSession(sessionId)
    deletingSessionId = null
    if (result.success) {
      neuzosConfig.sessions = neuzosConfig.sessions.filter(s => s.id !== sessionId)
      ensureSessionGroups().forEach((group) => {
        group.sessionIds = group.sessionIds.filter((id) => id !== sessionId)
      })
      await neuzosBridge.config.save(neuzosConfig)
    } else {
      deleteErrorModal = { sessionLabel, error: result.error ?? 'Unknown error' }
    }
  }

  // Track icon popover state for each session
  let iconPopoverStates: { [sessionId: string]: boolean } = $state({});
</script>

{#snippet sessionRow(session, sessionIndex, sectionLength, groupId)}
  {@const currentGroupId = getSessionGroupId(session.id)}
  <Table.Row>
    <Table.Cell>
      <div class="flex flex-col gap-0.5">
        <Button
          onclick={() => moveSessionInSection(groupId, session.id, -1)}
          disabled={sessionIndex <= 0}
          variant="outline"
          size="icon-xs"
        >
          <ChevronUp class="h-4 w-4"></ChevronUp>
        </Button>
        <Button
          onclick={() => moveSessionInSection(groupId, session.id, 1)}
          disabled={sessionIndex >= sectionLength - 1}
          variant="outline"
          size="icon-xs"
        >
          <ChevronDown class="h-4 w-4"></ChevronDown>
        </Button>
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
    <Table.Cell>
      <div class="flex items-center justify-center">
        <Switch
          checked={session.floatable ?? false}
          onCheckedChange={(checked) => { session.floatable = checked; }}
        />
      </div>
    </Table.Cell>
    <Table.Cell class="w-[300px]">
      <div class="flex flex-col gap-2">
        <input
          class="w-full h-2 accent-primary cursor-pointer rounded-full"
          type="range"
          min="0.5"
          max="1.5"
          step="0.05"
          value={getSessionZoom(session.id)}
          oninput={(event) => {
            const value = Number((event.currentTarget as HTMLInputElement).value)
            setSessionZoom(session.id, value)
          }}
        />
        <div class="flex items-center gap-2">
          <Input
            class="h-9 w-24 shrink-0 text-sm text-center tabular-nums"
            type="number"
            min="50"
            max="150"
            step="5"
            value={Math.round(getSessionZoom(session.id) * 100)}
            oninput={(event) => {
              const value = Number((event.currentTarget as HTMLInputElement).value)
              setSessionZoom(session.id, value / 100)
            }}
          />
          <span class="text-xs text-muted-foreground shrink-0">%</span>
          <Button variant="outline" size="sm" class="shrink-0" onclick={() => setSessionZoom(session.id, 1)}>
            Reset
          </Button>
        </div>
      </div>
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
            const target = e.currentTarget as HTMLInputElement
            if (target.value.length == 0 || target.value === ' ') {
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
    <Table.Cell class="w-[190px]">
      <div class="flex items-center justify-center">
        <Switch
          checked={session.autoDeleteCache ?? false}
          onCheckedChange={(checked) => {
            session.autoDeleteCache = checked
            void neuzosBridge.config.save(neuzosConfig)
          }}
        />
      </div>
    </Table.Cell>
    <Table.Cell class="w-[220px]">
      <select
        class="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        value={currentGroupId ?? '__ungrouped__'}
        onchange={(event) => {
          const target = event.currentTarget as HTMLSelectElement
          assignSessionToGroup(session.id, target.value === '__ungrouped__' ? null : target.value)
        }}
      >
        <option value="__ungrouped__">Unassigned</option>
        {#each ensureSessionGroups() as group}
          <option value={group.id}>{group.label}</option>
        {/each}
      </select>
    </Table.Cell>
    <Table.Cell class="text-xs">{session.id}</Table.Cell>
    <Table.Cell>
      <Tooltip.Provider>
        <div class="flex gap-2 items-center">
          <AlertDialog.Root open={clearCacheOpenModal === session.id} onOpenChange={(open) => {
            clearCacheOpenModal = open ? session.id : null;
          }}>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <AlertDialog.Trigger>
                  <Button variant="outline" size="icon" class="h-8 w-8">
                    <FileX class="h-4 w-4"/>
                  </Button>
                </AlertDialog.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Content>Clear cache</Tooltip.Content>
            </Tooltip.Root>
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
                </AlertDialog.Action>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Root>
          <AlertDialog.Root open={clearStorageOpenModal === session.id} onOpenChange={(open) => {
            clearStorageOpenModal = open ? session.id : null;
          }}>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <AlertDialog.Trigger>
                  <Button variant="outline" size="icon" class="h-8 w-8">
                    <HardDrive class="h-4 w-4"/>
                  </Button>
                </AlertDialog.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Content>Clear session data</Tooltip.Content>
            </Tooltip.Root>
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
                </AlertDialog.Action>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Root>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="outline"
                size="icon"
                class="h-8 w-8"
                onclick={() => void cloneSession(session)}
              >
                <Copy class="h-4 w-4"/>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Clone session</Tooltip.Content>
          </Tooltip.Root>
          <AlertDialog.Root open={deleteSessionModal?.sessionId === session.id} onOpenChange={(open) => {
            if (!open) {
              deleteSessionModal = null;
            }
          }}>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Button
                  variant="outline"
                  size="icon"
                  class="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                  disabled={deletingSessionId === session.id}
                  onclick={() => void openDeleteSessionModal(session.id, session.label)}
                >
                  <Trash class="h-4 w-4"/>
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>Delete session</Tooltip.Content>
            </Tooltip.Root>
            <AlertDialog.Content>
              <AlertDialog.Header>
                <AlertDialog.Title>
                  {#if deleteSessionModal?.isRunning}
                    Stop and delete running session "{session.label}"?
                  {:else}
                    Delete session "{session.label}"?
                  {/if}
                </AlertDialog.Title>
                <AlertDialog.Description>
                  This will <b>permanently delete</b> all data for <b>"{session.label}"</b>.<br/><br/>
                  {#if deleteSessionModal?.isRunning}
                    This session is currently running. NeuzOS will stop it before deletion proceeds.<br/><br/>
                  {/if}
                  This cannot be undone.
                </AlertDialog.Description>
              </AlertDialog.Header>
              <AlertDialog.Footer>
                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                <AlertDialog.Action
                  class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onclick={() => deleteSession(deleteSessionModal?.sessionId ?? session.id, deleteSessionModal?.sessionLabel ?? session.label)}
                >Delete
                </AlertDialog.Action>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </div>
      </Tooltip.Provider>
    </Table.Cell>
  </Table.Row>
{/snippet}
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
    <div class="flex flex-col gap-3">
      {#each currentGroups as group, gidx (group.id)}
        {@const groupSessions = getGroupSessions(group)}
        <Card.Root class="overflow-hidden gap-0 border-border/70">
          <div class="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
            <div class="flex min-w-0 items-center gap-2">
              <Button variant="outline" size="icon-xs" onclick={() => toggleGroupCollapsed(group.id)}>
                <ChevronDown class={`h-4 w-4 transition-transform ${isGroupCollapsed(group.id) ? 'rotate-180' : ''}`}></ChevronDown>
              </Button>
              {#if editingGroupId === group.id}
                <Input
                  autofocus
                  class="h-9 w-56 max-w-full text-sm"
                  bind:value={groupLabelDraft}
                  onblur={() => commitGroupLabel(group.id)}
                  onkeydown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitGroupLabel(group.id)
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      cancelGroupLabelEdit()
                    }
                  }}
                />
              {:else}
                <button type="button" class="min-w-0 truncate text-left text-sm font-semibold hover:underline" onclick={() => startEditingGroup(group)}>
                  {group.label}
                </button>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">{groupSessions.length} session(s)</span>
              <Button variant="outline" size="icon-xs" onclick={() => moveGroup(group.id, -1)} disabled={gidx <= 0}>
                <ChevronUp class="h-4 w-4"></ChevronUp>
              </Button>
              <Button variant="outline" size="icon-xs" onclick={() => moveGroup(group.id, 1)} disabled={gidx >= currentGroups.length - 1}>
                <ChevronDown class="h-4 w-4"></ChevronDown>
              </Button>
              <Button variant="outline" size="icon-xs" class="hover:bg-destructive hover:text-destructive-foreground" onclick={() => deleteGroup(group.id)}>
                <Trash class="h-4 w-4"></Trash>
              </Button>
            </div>
          </div>

          {#if !isGroupCollapsed(group.id)}
            <Card.Content class="p-0">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head class=""></Table.Head>
                    <Table.Head class="w-[100px]">Icon</Table.Head>
                    <Table.Head class="w-1/2">Label</Table.Head>
                    <Table.Head class="w-[110px] text-center">Floatable</Table.Head>
                    <Table.Head class="w-[300px]">Zoom</Table.Head>
                    <Table.Head class="w-1/2">Launch URL Overwrite</Table.Head>
                    <Table.Head class="w-[190px] text-center">
                      <Tooltip.Provider>
                        <Tooltip.Root>
                          <Tooltip.Trigger>
                            <span class="inline-flex cursor-help items-center justify-center">Auto-Delete Cache</span>
                          </Tooltip.Trigger>
                          <Tooltip.Content>Automatically clear this session's cache when it stops.</Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </Table.Head>
                    <Table.Head class="w-[220px]">Group</Table.Head>
                    <Table.Head>Session ID</Table.Head>
                    <Table.Head>Actions</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each groupSessions as session, sidx (session.id)}
                    {@render sessionRow(session, sidx, groupSessions.length, group.id)}
                  {/each}
                </Table.Body>
              </Table.Root>
            </Card.Content>
          {/if}
        </Card.Root>
      {/each}

      <Card.Root class="overflow-hidden gap-0 border-border/70">
        <div class="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <div class="flex min-w-0 items-center gap-2">
            <span class="truncate text-sm font-semibold">Ungrouped</span>
          </div>
          <span class="text-xs text-muted-foreground">{ungroupedSessions.length} session(s)</span>
        </div>

        <Card.Content class="p-0">
          {#if ungroupedSessions.length === 0}
            <div class="px-3 py-3 text-sm text-muted-foreground">No ungrouped sessions.</div>
          {:else}
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head class=""></Table.Head>
                  <Table.Head class="w-[100px]">Icon</Table.Head>
                  <Table.Head class="w-1/2">Label</Table.Head>
                  <Table.Head class="w-[110px] text-center">Floatable</Table.Head>
                  <Table.Head class="w-[300px]">Zoom</Table.Head>
                  <Table.Head class="w-1/2">Launch URL Overwrite</Table.Head>
                  <Table.Head class="w-[190px] text-center">
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <span class="inline-flex cursor-help items-center justify-center">Auto-Delete Cache</span>
                        </Tooltip.Trigger>
                        <Tooltip.Content>Automatically clear this session's cache when it stops.</Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </Table.Head>
                  <Table.Head class="w-[220px]">Group</Table.Head>
                  <Table.Head>Session ID</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each ungroupedSessions as session, sidx (session.id)}
                  {@render sessionRow(session, sidx, ungroupedSessions.length, null)}
                {/each}
              </Table.Body>
            </Table.Root>
          {/if}
        </Card.Content>
      </Card.Root>
    </div>
  </Card.Content>
  <Card.Footer>
    <div class="flex items-center justify-between w-full">
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" onclick={addSession}>
          <Plus class="h-4 w-4 mr-2"/>
          Add Session
        </Button>
        <Button variant="outline" size="sm" onclick={addGroup}>
          <Plus class="h-4 w-4 mr-2"/>
          Add Group
        </Button>
      </div>
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

<!-- Delete session error dialog -->
<AlertDialog.Root open={deleteErrorModal !== null} onOpenChange={(open) => { if (!open) deleteErrorModal = null; }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Failed to delete "{deleteErrorModal?.sessionLabel}"</AlertDialog.Title>
      <AlertDialog.Description>
        {deleteErrorModal?.error}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Action onclick={() => { deleteErrorModal = null }}>OK</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
