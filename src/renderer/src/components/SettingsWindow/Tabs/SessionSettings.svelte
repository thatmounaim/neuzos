<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    FilePen,
    FileX,
    ArrowDownUp,
    GripVertical,
    Plus,
    Trash,
    RotateCw,
    Users,
    ZoomIn,
    SquareArrowOutUpRight,
    List,
    Grid3X3
  } from '@lucide/svelte'

  import {Input} from '$lib/components/ui/input'
  import * as Tooltip from '$lib/components/ui/tooltip'
  import * as Command from '$lib/components/ui/command'
  import * as Popover from '$lib/components/ui/popover'
  import * as Table from '$lib/components/ui/table'
  import * as AlertDialog from '$lib/components/ui/alert-dialog'
  import type {NeuzConfig, NeuzSession, NeuzSessionGroup} from "$lib/types";
  import {getContext, onMount} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {Switch} from "$lib/components/ui/switch";
  import {neuzosBridge} from "$lib/core";
  import {toast} from 'svelte-sonner'

  type SessionIconOption = {
    slug: string
    label: string
  }

  type SessionIconGroup = {
    heading: string
    icons: SessionIconOption[]
  }

  const sessionIconGroups: SessionIconGroup[] = [
    {
      heading: 'Beginner Class',
      icons: [
        {slug: 'jobs/vagrant', label: 'Vagrant'}
      ]
    },
    {
      heading: '1st Job Classes',
      icons: [
        {slug: 'jobs/acrobat', label: 'Acrobat'},
        {slug: 'jobs/assist', label: 'Assist'},
        {slug: 'jobs/mercenary', label: 'Mercenary'},
        {slug: 'jobs/magician', label: 'Magician'}
      ]
    },
    {
      heading: '2nd Job Classes',
      icons: [
        {slug: 'jobs/ranger', label: 'Ranger'},
        {slug: 'jobs/jester', label: 'Jester'},
        {slug: 'jobs/ringmaster', label: 'Ringmaster'},
        {slug: 'jobs/billposter', label: 'Billposter'},
        {slug: 'jobs/blade', label: 'Blade'},
        {slug: 'jobs/knight', label: 'Knight'},
        {slug: 'jobs/elementor', label: 'Elementor'},
        {slug: 'jobs/psykeeper', label: 'Psykeeper'}
      ]
    },
    {
      heading: '3rd Job Classes',
      icons: [
        {slug: 'jobs/crackshooter', label: 'Crackshooter'},
        {slug: 'jobs/harlequin', label: 'Harlequin'},
        {slug: 'jobs/seraph', label: 'Seraph'},
        {slug: 'jobs/forcemaster', label: 'Forcemaster'},
        {slug: 'jobs/slayer', label: 'Slayer'},
        {slug: 'jobs/templar', label: 'Templar'},
        {slug: 'jobs/arcanist', label: 'Arcanist'},
        {slug: 'jobs/mentalist', label: 'Mentalist'}
      ]
    },
    {
      heading: 'Other Icons',
      icons: [
        {slug: 'neuzos_pang', label: 'NeuzOS'},
        {slug: 'misc/browser', label: 'Browser'},
        {slug: 'misc/bag', label: 'Bag'},
        {slug: 'misc/item', label: 'Item'}
      ]
    }
  ]

  const neuzosConfig = getContext<NeuzConfig>('neuzosConfig')
  const defaultLaunchUrl = 'https://universe.flyff.com/play'
  const collapsedGroupsStorageKey = 'neuzos.sessionSettings.collapsedGroups'
  const sessionSortModeStorageKey = 'neuzos.sessionSettings.sortMode'
  const ungroupedGroupId = 'ungrouped'

  const clearCache = (sessionId: string) => {
    neuzosBridge.sessions.clearCache(sessionId)
  }

  const clampZoom = (value: number) => Math.min(1.5, Math.max(0.5, Math.round(value * 20) / 20))

  const formatSessionCount = (count: number) => `${count} ${count === 1 ? 'Session' : 'Sessions'}`

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

  const isUngroupedGroup = (group: NeuzSessionGroup) => group.id === ungroupedGroupId || group.type === 'ungrouped'

  const normalizeSessionGroups = (groups: unknown, knownSessionIds: Set<string>): NeuzSessionGroup[] => {
    if (!Array.isArray(groups)) {
      return []
    }

    let hasUngroupedMarker = false
    return groups.flatMap((group: any) => {
      if (!group || typeof group !== 'object') {
        return []
      }

      const id = typeof group.id === 'string' && group.id.trim() !== '' ? group.id.trim() : null
      if (!id) {
        return []
      }

      if (id === ungroupedGroupId || group.type === 'ungrouped') {
        if (hasUngroupedMarker) {
          return []
        }
        hasUngroupedMarker = true
        return [{id: ungroupedGroupId, type: 'ungrouped' as const}]
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
    return normalizeSessionGroups(neuzosConfig.sessionGroups ?? [], knownSessionIds).filter((group) => !isUngroupedGroup(group))
  })

  const orderedSessionSections = $derived.by(() => {
    const knownSessionIds = new Set(neuzosConfig.sessions.map((session) => session.id))
    const normalizedGroups = normalizeSessionGroups(neuzosConfig.sessionGroups ?? [], knownSessionIds)
    return normalizedGroups.some((group) => isUngroupedGroup(group))
      ? normalizedGroups
      : [...normalizedGroups, {id: ungroupedGroupId, type: 'ungrouped' as const}]
  })

  const ungroupedSessions = $derived.by(() => {
    const groupedSessionIds = new Set(currentGroups.flatMap((group) => group.sessionIds ?? []))
    return neuzosConfig.sessions.filter((session) => !groupedSessionIds.has(session.id))
  })

  const ensureSessionGroups = () => {
    const knownSessionIds = new Set(neuzosConfig.sessions.map((session) => session.id))
    const normalizedGroups = normalizeSessionGroups(neuzosConfig.sessionGroups ?? [], knownSessionIds)
    const nextGroups = normalizedGroups.some((group) => isUngroupedGroup(group))
      ? normalizedGroups
      : [...normalizedGroups, {id: ungroupedGroupId, type: 'ungrouped' as const}]

    if (JSON.stringify(neuzosConfig.sessionGroups ?? []) !== JSON.stringify(nextGroups)) {
      neuzosConfig.sessionGroups = nextGroups
    }

    return neuzosConfig.sessionGroups
  }

  const getSessionZoom = (sessionId: string) => {
    return neuzosConfig.sessionZoomLevels?.[sessionId] ?? 1.0
  }

  const setSessionZoom = (sessionId: string, value: number) => {
    const zoom = clampZoom(value)
    neuzosConfig.sessionZoomLevels = neuzosConfig.sessionZoomLevels ?? {}
    if (zoom === 1.0) {
      delete neuzosConfig.sessionZoomLevels[sessionId]
    } else {
      neuzosConfig.sessionZoomLevels[sessionId] = zoom
    }
    void neuzosBridge.sessions.previewZoom(sessionId, zoom)
  }

  const openLaunchUrlOverwriteModal = (session: NeuzSession) => {
    launchUrlOverwriteModal = session.id
    launchUrlDraft = session.srcOverwrite ?? defaultLaunchUrl
  }

  const setLaunchUrlOverwrite = async (session: NeuzSession) => {
    const nextUrl = launchUrlDraft.trim()
    if (!nextUrl || nextUrl === defaultLaunchUrl) {
      delete session.srcOverwrite
    } else {
      session.srcOverwrite = nextUrl
    }
    delete session.partitionOverwrite
    await neuzosBridge.config.save(neuzosConfig)
    launchUrlOverwriteModal = null
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
    return currentGroups.find((group) => (group.sessionIds ?? []).includes(sessionId))?.id ?? null
  }

  const assignSessionToGroup = (sessionId: string, groupId: string | null) => {
    const groups = ensureSessionGroups()
    groups.forEach((group) => {
      if (!isUngroupedGroup(group)) {
        group.sessionIds = (group.sessionIds ?? []).filter((id) => id !== sessionId)
      }
    })

    if (!groupId) {
      return
    }

    const targetGroup = groups.find((group) => group.id === groupId)
    if (!targetGroup || isUngroupedGroup(targetGroup)) {
      return
    }

    targetGroup.sessionIds = [...(targetGroup.sessionIds ?? []), sessionId]
  }

  const addGroup = () => {
    const newGroup: NeuzSessionGroup = {
      id: Date.now().toString(),
      label: defaultGroupLabel,
      sessionIds: []
    }
    const groups = ensureSessionGroups()
    const ungroupedIndex = groups.findIndex((group) => isUngroupedGroup(group))
    if (ungroupedIndex >= 0) {
      groups.splice(ungroupedIndex, 0, newGroup)
    } else {
      groups.push(newGroup)
    }
    startEditingGroup(newGroup)
  }

  const deleteGroup = (groupId: string) => {
    neuzosConfig.sessionGroups = ensureSessionGroups().filter((group) => group.id !== groupId || isUngroupedGroup(group))
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
      const groups = ensureSessionGroups()
      const group = groups.find((entry) => entry.id === groupId)
      if (!group || isUngroupedGroup(group)) {
        return
      }

      const groupSessionIds = [...(group.sessionIds ?? [])]
      const currentIndex = groupSessionIds.indexOf(sessionId)
      const nextIndex = currentIndex + direction
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= groupSessionIds.length) {
        return
      }

      ;[groupSessionIds[currentIndex], groupSessionIds[nextIndex]] = [groupSessionIds[nextIndex], groupSessionIds[currentIndex]]
      group.sessionIds = groupSessionIds
      neuzosConfig.sessionGroups = [...groups]
      return
    }

    const groupedSessionIds = new Set(ensureSessionGroups().flatMap((group) => isUngroupedGroup(group) ? [] : (group.sessionIds ?? [])))
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
    if (isUngroupedGroup(group)) {
      return []
    }
    const sessionMap = new Map(neuzosConfig.sessions.map((session) => [session.id, session]))
    return (group.sessionIds ?? [])
      .map((sessionId) => sessionMap.get(sessionId))
      .filter((session): session is NeuzSession => session !== undefined)
  }

  let draggedSession: { sessionId: string; groupId: string | null } | null = $state(null)
  let sessionDropTarget: { groupId: string | null; index: number } | null = $state(null)

  const isSameSessionSection = (left: string | null, right: string | null) => left === right

  const reorderSessionInSection = (groupId: string | null, sessionId: string, targetIndex: number) => {
    if (groupId) {
      const groups = ensureSessionGroups()
      const group = groups.find((entry) => entry.id === groupId)
      if (!group || isUngroupedGroup(group)) {
        return
      }

      const groupSessionIds = [...(group.sessionIds ?? [])]
      const currentIndex = groupSessionIds.indexOf(sessionId)
      if (currentIndex < 0) {
        return
      }

      const [movedSessionId] = groupSessionIds.splice(currentIndex, 1)
      const nextIndex = Math.max(0, Math.min(targetIndex > currentIndex ? targetIndex - 1 : targetIndex, groupSessionIds.length))
      groupSessionIds.splice(nextIndex, 0, movedSessionId)
      group.sessionIds = groupSessionIds
      neuzosConfig.sessionGroups = [...groups]
      return
    }

    const groupedSessionIds = new Set(ensureSessionGroups().flatMap((group) => isUngroupedGroup(group) ? [] : (group.sessionIds ?? [])))
    const ungroupedSessionIds = neuzosConfig.sessions
      .filter((session) => !groupedSessionIds.has(session.id))
      .map((session) => session.id)
    const currentIndex = ungroupedSessionIds.indexOf(sessionId)
    if (currentIndex < 0) {
      return
    }

    const [movedSessionId] = ungroupedSessionIds.splice(currentIndex, 1)
    const nextIndex = Math.max(0, Math.min(targetIndex > currentIndex ? targetIndex - 1 : targetIndex, ungroupedSessionIds.length))
    ungroupedSessionIds.splice(nextIndex, 0, movedSessionId)

    const ungroupedSessionMap = new Map(neuzosConfig.sessions.map((session) => [session.id, session]))
    const reorderedUngroupedSessions = ungroupedSessionIds
      .map((id) => ungroupedSessionMap.get(id))
      .filter((session): session is NeuzSession => session !== undefined)
    let ungroupedIndex = 0
    neuzosConfig.sessions = neuzosConfig.sessions.map((session) => {
      if (groupedSessionIds.has(session.id)) {
        return session
      }
      return reorderedUngroupedSessions[ungroupedIndex++] ?? session
    })
  }

  const handleSessionDragStart = (event: DragEvent, groupId: string | null, sessionId: string) => {
    if (!useDragSessionSorting) {
      event.preventDefault()
      return
    }
    draggedSession = { sessionId, groupId }
    event.dataTransfer?.setData('text/plain', sessionId)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  const handleSessionDragOver = (event: DragEvent, groupId: string | null, index: number) => {
    if (!useDragSessionSorting || !draggedSession || !isSameSessionSection(draggedSession.groupId, groupId)) {
      return
    }
    event.preventDefault()
    scrollSessionSettingsNearEdge(event)
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    sessionDropTarget = { groupId, index }
  }

  const getSessionRowDropIndex = (event: DragEvent, sessionIndex: number) => {
    const row = event.currentTarget as HTMLElement
    const rect = row.getBoundingClientRect()
    return event.clientY > rect.top + rect.height / 2 ? sessionIndex + 1 : sessionIndex
  }

  const handleSessionRowDragOver = (event: DragEvent, groupId: string | null, sessionIndex: number) => {
    handleSessionDragOver(event, groupId, getSessionRowDropIndex(event, sessionIndex))
  }

  const handleSessionRowDrop = (event: DragEvent, groupId: string | null, sessionIndex: number) => {
    handleSessionDrop(event, groupId, getSessionRowDropIndex(event, sessionIndex))
  }

  const handleSessionDrop = (event: DragEvent, groupId: string | null, index: number) => {
    event.preventDefault()
    if (draggedSession && isSameSessionSection(draggedSession.groupId, groupId)) {
      reorderSessionInSection(groupId, draggedSession.sessionId, index)
    }
    draggedSession = null
    sessionDropTarget = null
  }

  const handleSessionDragEnd = () => {
    draggedSession = null
    sessionDropTarget = null
  }

  const isSessionDropTarget = (groupId: string | null, index: number) => {
    return sessionDropTarget?.index === index && isSameSessionSection(sessionDropTarget.groupId, groupId)
  }

  let clearCacheOpenModal: string | null = $state(null)
  let launchUrlOverwriteModal: string | null = $state(null)
  let launchUrlDraft = $state('')
  let clearAllCacheOpenModal: boolean = $state(false)
  let deleteSessionModal: { sessionId: string; sessionLabel: string; isRunning: boolean } | null = $state(null)
  let deleteErrorModal: { sessionLabel: string; error: string } | null = $state(null)
  let deletingSessionId: string | null = $state(null)
  let editingGroupId: string | null = $state(null)
  let collapsedGroupIds: Record<string, boolean> = $state({})
  let sessionSettingsScrollContainer: HTMLElement | null = $state(null)
  let useDragSessionSorting = $state(false)
  let groupLabelDraft = $state('')
  let groupLabelBackup = $state('')

  const loadCollapsedGroups = () => {
    try {
      const stored = localStorage.getItem(collapsedGroupsStorageKey)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        collapsedGroupIds = parsed
      }
    } catch {
      collapsedGroupIds = {}
    }
  }

  const saveCollapsedGroups = () => {
    localStorage.setItem(collapsedGroupsStorageKey, JSON.stringify(collapsedGroupIds))
  }

  const loadSessionSortMode = () => {
    useDragSessionSorting = localStorage.getItem(sessionSortModeStorageKey) === 'drag'
  }

  const toggleSessionSortMode = () => {
    useDragSessionSorting = !useDragSessionSorting
    draggedSession = null
    sessionDropTarget = null
    localStorage.setItem(sessionSortModeStorageKey, useDragSessionSorting ? 'drag' : 'buttons')
  }

  const scrollSessionSettingsNearEdge = (event: DragEvent) => {
    if (!sessionSettingsScrollContainer) {
      return
    }

    const rect = sessionSettingsScrollContainer.getBoundingClientRect()
    const edgeSize = 36
    const scrollStep = 5

    if (event.clientY < rect.top + edgeSize) {
      sessionSettingsScrollContainer.scrollTop -= scrollStep
    } else if (event.clientY > rect.bottom - edgeSize) {
      sessionSettingsScrollContainer.scrollTop += scrollStep
    }
  }

  onMount(() => {
    loadCollapsedGroups()
    loadSessionSortMode()
  })

  const startEditingGroup = (group: NeuzSessionGroup) => {
    editingGroupId = group.id
    groupLabelDraft = group.label ?? defaultGroupLabel
    groupLabelBackup = group.label ?? defaultGroupLabel
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
    saveCollapsedGroups()
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
      toast.error(result.error ?? 'Failed to Clone Session')
      return
    }

    const sourceIndex = neuzosConfig.sessions.findIndex((entry) => entry.id === session.id)
    if (sourceIndex < 0) {
      toast.error('Source Session was removed before cloning completed.')
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
    const deletingToastId = toast.loading(`Deleting "${sessionLabel}"...`, { duration: Infinity })
    const result = await neuzosBridge.sessions.deleteSession(sessionId)
    if (result.success) {
      neuzosConfig.sessions = neuzosConfig.sessions.filter(s => s.id !== sessionId)
      ensureSessionGroups().forEach((group) => {
        if (!isUngroupedGroup(group)) {
          group.sessionIds = (group.sessionIds ?? []).filter((id) => id !== sessionId)
        }
      })
      neuzosConfig.layouts = (neuzosConfig.layouts ?? []).map((layout) => ({
        ...layout,
        rows: (layout.rows ?? [])
          .map((row) => ({
            ...row,
            sessionIds: (row.sessionIds ?? []).filter((id) => id !== sessionId),
          }))
          .filter((row) => row.sessionIds.length > 0),
      }))
      neuzosConfig.sessionActions = (neuzosConfig.sessionActions ?? []).filter((sessionActions) => sessionActions.sessionId !== sessionId)
      if (neuzosConfig.sessionZoomLevels && sessionId in neuzosConfig.sessionZoomLevels) {
        delete neuzosConfig.sessionZoomLevels[sessionId]
      }
      if (neuzosConfig.syncReceiverSessionId === sessionId) {
        neuzosConfig.syncReceiverSessionId = null
      }
      // Merge pendingPartitionDeletes from the main process so our config.save()
      // does not overwrite the deferred-cleanup list the main process just persisted.
      if (Array.isArray((result as any).pendingPartitionDeletes)) {
        (neuzosConfig as any).pendingPartitionDeletes = (result as any).pendingPartitionDeletes
      }
      await neuzosBridge.config.save(neuzosConfig)
      toast.dismiss(deletingToastId)
      deletingSessionId = null
      toast.success(`"${sessionLabel}" Deleted Successfully.`)
      if ((result as any).deferred) {
        toast.info('Some partition files were still locked — NeuzOS will finish cleanup automatically on next start.')
      }
    } else {
      toast.dismiss(deletingToastId)
      deletingSessionId = null
      toast.error(`Failed to Delete "${sessionLabel}"`)
      deleteErrorModal = { sessionLabel, error: result.error ?? 'Unknown error' }
    }
  }

  // Track icon popover state for each session
  let iconPopoverStates: { [sessionId: string]: boolean } = $state({});
  let sessionIconViewMode: 'grid' | 'list' = $state('grid');
  let groupPopoverStates: { [sessionId: string]: boolean } = $state({});
  let zoomPopoverStates: { [sessionId: string]: boolean } = $state({});
</script>

{#snippet sessionDropZone(groupId, index)}
  {@const active = isSessionDropTarget(groupId, index)}
  {#if useDragSessionSorting}
    <Table.Row class="border-b-0 hover:[&,&>svelte-css-wrapper]:[&>th,td]:bg-transparent">
      <Table.Cell
        colspan={10}
        class={`p-0 transition-[height] duration-150 ${active ? 'h-10' : 'h-1'}`}
        ondragover={(event) => handleSessionDragOver(event, groupId, index)}
        ondrop={(event) => handleSessionDrop(event, groupId, index)}
      >
        <div class={`mx-2 rounded-md transition-all duration-150 ${active ? 'h-8 border border-dashed border-primary/70 bg-primary/10 shadow-sm' : 'h-1 bg-transparent'}`}></div>
      </Table.Cell>
    </Table.Row>
  {/if}
{/snippet}

{#snippet sessionRow(session, sessionIndex, sectionLength, groupId)}
  {@const currentGroupId = getSessionGroupId(session.id)}
  <Table.Row
    class={useDragSessionSorting && draggedSession?.sessionId === session.id ? 'opacity-50' : ''}
    ondragover={(event) => handleSessionRowDragOver(event, groupId, sessionIndex)}
    ondrop={(event) => handleSessionRowDrop(event, groupId, sessionIndex)}
  >
    <Table.Cell class="w-[48px]">
      {#if useDragSessionSorting}
        <button
          type="button"
          draggable="true"
          class="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
          ondragstart={(event) => handleSessionDragStart(event, groupId, session.id)}
          ondragend={handleSessionDragEnd}
          aria-label="Drag session to reorder"
        >
          <GripVertical class="h-4 w-4"></GripVertical>
        </button>
      {:else}
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
      {/if}
    </Table.Cell>
    <Table.Cell class="w-[72px]">
      {@const isOpen = iconPopoverStates[session.id] ?? false}
      <div class="flex items-center">
        <Popover.Root open={isOpen} onOpenChange={(open) => { iconPopoverStates[session.id] = open; }}>
          <Popover.Trigger class="w-10 h-10 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-muted/50 hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
            {#if session.icon.slug}
              <img class="w-6 h-6" src="icons/{session.icon.slug}.png" alt=""/>
            {:else}
              <img class="w-6 h-6" src="icons/neuzos_pang.png" alt=""/>
            {/if}
          </Popover.Trigger>
          <Popover.Content class="w-[230px] p-0">
            <Command.Root shouldFilter={true}>
              <div class="flex items-center gap-2 border-b px-2 py-2">
                <Command.Input placeholder="Search Icons..." class="h-9 border-0 px-1 focus-visible:ring-0 focus-visible:ring-offset-0" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  title={sessionIconViewMode === 'grid' ? 'List View' : 'Grid View'}
                  onclick={() => {
                    sessionIconViewMode = sessionIconViewMode === 'grid' ? 'list' : 'grid';
                  }}
                >
                  {#if sessionIconViewMode === 'grid'}
                    <List class="h-4 w-4" />
                  {:else}
                    <Grid3X3 class="h-4 w-4" />
                  {/if}
                </Button>
              </div>
              <Command.Empty>No Icon found.</Command.Empty>
              <Command.List class="max-h-[320px]">
                {#each sessionIconGroups as group (group.heading)}
                  <Command.Group heading={group.heading}>
                    {#if sessionIconViewMode === 'grid'}
                      <div class="grid grid-cols-[repeat(4,2.25rem)] justify-start gap-2 px-2 pb-2">
                        {#each group.icons as icon (icon.slug)}
                          <Command.Item
                            value={icon.slug}
                            keywords={[icon.label.toLowerCase(), icon.slug.replace('jobs/', '').replace('misc/', '').replace(/_/g, ' ').toLowerCase()]}
                            onSelect={() => {
                              session.icon.slug = icon.slug;
                              iconPopoverStates[session.id] = false;
                            }}
                            class={`h-9 w-9 justify-center p-0 border ${session.icon.slug === icon.slug ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-transparent'}`}
                            title={icon.label}
                          >
                            <img class="size-6" src="icons/{icon.slug}.png" alt={icon.label}/>
                          </Command.Item>
                        {/each}
                      </div>
                    {:else}
                      {#each group.icons as icon (icon.slug)}
                        <Command.Item
                          value={icon.slug}
                          keywords={[icon.label.toLowerCase(), icon.slug.replace('jobs/', '').replace('misc/', '').replace(/_/g, ' ').toLowerCase()]}
                            onSelect={() => {
                              session.icon.slug = icon.slug;
                              iconPopoverStates[session.id] = false;
                            }}
                            class={`py-2 border ${session.icon.slug === icon.slug ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-transparent'}`}
                          >
                          <img class="size-6 mr-2" src="icons/{icon.slug}.png" alt={icon.label}/>
                          <span class="text-xs truncate">{icon.label}</span>
                        </Command.Item>
                      {/each}
                    {/if}
                  </Command.Group>
                {/each}
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      </div>
    </Table.Cell>
    <Table.Cell class="w-[420px] min-w-[420px]">
      <Input
        class="h-9 w-full text-sm"
        bind:value={session.label}
        onchange={(e) => {
          {/*@ts-ignore*/}
          if (e.target.value === '') {
            session.label = 'Unnamed Session'
          }
        }}
      />
    </Table.Cell>
    <Table.Cell class="w-[90px]">
      {@const groupLabel = currentGroupId
        ? (currentGroups.find(g => g.id === currentGroupId)?.label ?? 'Unknown')
        : 'Ungrouped'}
      {@const isGroupOpen = groupPopoverStates[session.id] ?? false}
      <Tooltip.Provider>
        <Tooltip.Root>
          <Popover.Root open={isGroupOpen} onOpenChange={(open) => { groupPopoverStates[session.id] = open; }}>
            <Tooltip.Trigger>
              <Popover.Trigger class="h-9 w-9 inline-flex items-center justify-center rounded-md border border-input bg-muted/50 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {currentGroupId ? 'border-primary text-primary ring-1 ring-primary/50' : ''}">
                <Users class="h-4 w-4"/>
              </Popover.Trigger>
            </Tooltip.Trigger>
            <Popover.Content class="w-[220px] p-1" align="start">
              <button
                class="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground {!currentGroupId ? 'font-semibold' : ''}"
                onclick={() => { assignSessionToGroup(session.id, null); groupPopoverStates[session.id] = false; }}
              >
                Ungrouped
              </button>
              <div class="my-1 h-px bg-border"></div>
              {#each currentGroups as group}
                <button
                  class="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground {currentGroupId === group.id ? 'font-semibold' : ''}"
                  onclick={() => { assignSessionToGroup(session.id, group.id); groupPopoverStates[session.id] = false; }}
                >
                  {group.label ?? defaultGroupLabel}
                </button>
              {/each}
            </Popover.Content>
          </Popover.Root>
          <Tooltip.Content>{groupLabel}</Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </Table.Cell>
    <Table.Cell class="w-[130px] text-center">
      {@const zoomOpen = zoomPopoverStates[session.id] ?? false}
      {@const zoomValue = getSessionZoom(session.id)}
      <Popover.Root open={zoomOpen} onOpenChange={(open) => { zoomPopoverStates[session.id] = open; }}>
        <Popover.Trigger class="h-9 w-9 inline-flex items-center justify-center rounded-md border border-input bg-muted/50 px-2 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {Math.round(zoomValue * 100) !== 100 ? 'border-primary text-primary ring-1 ring-primary/50' : ''}">
          <ZoomIn class="h-4 w-4"/>
        </Popover.Trigger>
        <Popover.Content class="w-[260px] p-3" align="start">
          <div class="flex flex-col gap-3">
            <input
              class="w-full h-2 accent-primary cursor-pointer rounded-full"
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={zoomValue}
              oninput={(event) => {
                const value = Number((event.currentTarget as HTMLInputElement).value)
                setSessionZoom(session.id, value)
              }}
            />
            <div class="flex items-center gap-2">
              <Input
                class="h-8 w-20 shrink-0 text-sm text-center tabular-nums"
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
              {#if Math.round(getSessionZoom(session.id) * 100) !== 100}
                <Button variant="outline" size="icon" class="h-8 w-8 shrink-0" onclick={() => setSessionZoom(session.id, 1)}>
                  <RotateCw class="h-4 w-4"/>
                </Button>
              {/if}
              <Button variant="outline" size="icon" class="h-8 w-8 shrink-0 ml-auto" onclick={() => { zoomPopoverStates[session.id] = false; }}>
                <Check class="h-4 w-4"/>
              </Button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    </Table.Cell>
    <Table.Cell>
      <div class="flex items-center justify-center">
        <Switch
          checked={session.floatable ?? false}
          onCheckedChange={(checked) => { session.floatable = checked; }}
        />
      </div>
    </Table.Cell>
    <Table.Cell class="w-full"></Table.Cell>
    <Table.Cell class="w-[170px]">
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
    <Table.Cell class="w-[170px]">
      <div class="flex items-center justify-start gap-1.5">
        <span class="text-xs">{session.id}</span>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7 text-muted-foreground hover:text-foreground"
                onclick={() => void neuzosBridge.sessions.openPartitionFolder(session.id)}
              >
                <SquareArrowOutUpRight class="h-3.5 w-3.5"/>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Open Session Partition Folder</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </Table.Cell>
    <Table.Cell class="w-[170px]">
      <Tooltip.Provider>
        <div class="flex gap-2 items-center">
          <AlertDialog.Root open={launchUrlOverwriteModal === session.id} onOpenChange={(open) => {
            if (open) {
              openLaunchUrlOverwriteModal(session)
            } else {
              launchUrlOverwriteModal = null
            }
          }}>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <AlertDialog.Trigger>
                  <Button variant={session.srcOverwrite ? 'default' : 'outline'} size="icon" class="h-8 w-8">
                    <FilePen class="h-4 w-4"/>
                  </Button>
                </AlertDialog.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Content>Launch URL Overwrite</Tooltip.Content>
            </Tooltip.Root>
            <AlertDialog.Content>
              <AlertDialog.Header>
                <AlertDialog.Title>Overwrite {session.label} Session's Launch URL</AlertDialog.Title>
                <AlertDialog.Description>
                  This Action will overwrite the Default Launch URL from this Session.
                </AlertDialog.Description>
              </AlertDialog.Header>
              <div class="flex items-center gap-2 py-2">
                <Input
                  class="h-9 text-sm"
                  bind:value={launchUrlDraft}
                />
                {#if launchUrlDraft.trim() !== defaultLaunchUrl}
                  <Button variant="outline" size="icon" class="h-9 w-9 shrink-0" onclick={() => { launchUrlDraft = defaultLaunchUrl }}>
                    <RotateCw class="h-4 w-4"/>
                  </Button>
                {/if}
              </div>
              <AlertDialog.Footer>
                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                <AlertDialog.Action onclick={() => void setLaunchUrlOverwrite(session)}>
                  Set URL
                </AlertDialog.Action>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Root>
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
              <Tooltip.Content>Clear Cache</Tooltip.Content>
            </Tooltip.Root>
            <AlertDialog.Content>
              <AlertDialog.Header>
                <AlertDialog.Title>Clear "{session.label}" Session's Cache.</AlertDialog.Title>
                <AlertDialog.Description>
                  This Action will clear the Cache for <b>"{session.label}"</b>.<br/>

                  Your Session Data will still be saved.
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
            <Tooltip.Content>Clone Session</Tooltip.Content>
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
              <Tooltip.Content>Delete Session</Tooltip.Content>
            </Tooltip.Root>
            <AlertDialog.Content>
              <AlertDialog.Header>
                <AlertDialog.Title>
                  {#if deleteSessionModal?.isRunning}
                    Stop and Delete Running Session "{session.label}"?
                  {:else}
                    Delete Session "{session.label}"?
                  {/if}
                </AlertDialog.Title>
                <AlertDialog.Description>
                  This Action will permanently Delete the Session Data for <b>"{session.label}"</b>.<br/><br/>
                  {#if deleteSessionModal?.isRunning}
                    This Session is currently running. NeuzOS will stop it before deletion proceeds.<br/><br/>
                  {/if}
                  This Action cannot be undone.
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
<Card.Root bind:ref={sessionSettingsScrollContainer} class="h-full overflow-y-auto">
  <Card.Header>
    <div class="flex items-center justify-between gap-3">
      <Card.Title class="text-lg font-semibold">
        Manage Sessions
      </Card.Title>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">Sorting:</span>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button variant="outline" size="sm" class="h-8 gap-2" onclick={toggleSessionSortMode}>
                {#if useDragSessionSorting}
                  <GripVertical class="h-4 w-4"></GripVertical>
                  Drag & Drop
                {:else}
                  <ArrowDownUp class="h-4 w-4"></ArrowDownUp>
                  Arrows
                {/if}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{useDragSessionSorting ? 'Drag & Drop Sorting' : 'Arrow Sorting'}</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
    <Card.Description>
      Configure your Flyff Universe Sessions below. You can Add, Edit, Reorder, and Delete Sessions.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <div class="flex flex-col gap-3">
      {#each orderedSessionSections as group, gidx (group.id)}
        {@const groupSessions = isUngroupedGroup(group) ? ungroupedSessions : getGroupSessions(group)}
        {@const groupCollapsed = isGroupCollapsed(group.id)}
        <Card.Root class="overflow-hidden gap-0 border-border/70">
          <div class={`flex items-center justify-between gap-3 px-2.5 ${groupCollapsed ? 'h-5 py-0' : 'h-7 py-0'}`}>
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-1.5 self-stretch rounded-sm text-left leading-none transition-opacity hover:opacity-80"
              onclick={() => toggleGroupCollapsed(group.id)}
              aria-label={groupCollapsed ? 'Expand group' : 'Collapse group'}
            >
              <span class="inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                {#if groupCollapsed}
                  <ChevronDown class="h-4 w-4"></ChevronDown>
                {:else}
                  <ChevronUp class="h-4 w-4"></ChevronUp>
                {/if}
              </span>
              {#if isUngroupedGroup(group)}
                <span class="truncate text-sm font-semibold">Sessions</span>
              {:else if editingGroupId === group.id}
                <Input
                  autofocus
                  class="h-9 w-56 max-w-full text-sm"
                  bind:value={groupLabelDraft}
                  onclick={(event) => event.stopPropagation()}
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
                <span
                  role="button"
                  tabindex="0"
                  class="min-w-0 truncate text-sm font-semibold hover:underline"
                  onclick={(event) => {
                    event.stopPropagation()
                    startEditingGroup(group)
                  }}
                  onkeydown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      startEditingGroup(group)
                    }
                  }}
                >
                  {group.label}
                </span>
              {/if}
            </button>
            <div class="flex shrink-0 items-center gap-1.5">
              <span class="inline-flex h-6 items-center text-xs leading-none text-muted-foreground">{formatSessionCount(groupSessions.length)}</span>
              <Button variant="outline" size="icon-xs" onclick={() => moveGroup(group.id, -1)} disabled={gidx <= 0}>
                <ChevronUp class="h-4 w-4"></ChevronUp>
              </Button>
              <Button variant="outline" size="icon-xs" onclick={() => moveGroup(group.id, 1)} disabled={gidx >= orderedSessionSections.length - 1}>
                <ChevronDown class="h-4 w-4"></ChevronDown>
              </Button>
              {#if !isUngroupedGroup(group)}
                <Button variant="outline" size="icon-xs" class="hover:bg-destructive hover:text-destructive-foreground" onclick={() => deleteGroup(group.id)}>
                  <Trash class="h-4 w-4"></Trash>
                </Button>
              {/if}
            </div>
          </div>

          {#if !isGroupCollapsed(group.id)}
            <div class="border-b border-border mt-2"></div>
            <Card.Content class="p-0">
              {#if groupSessions.length === 0}
                <div class="px-3 py-3 text-sm text-muted-foreground">
                  {isUngroupedGroup(group) ? 'No Ungrouped Sessions.' : 'No Sessions in this Group.'}
                </div>
              {:else}
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head class="w-[48px]"></Table.Head>
                      <Table.Head class="w-[72px]">Icon</Table.Head>
                      <Table.Head class="w-[420px] min-w-[420px]">Label</Table.Head>
                      <Table.Head class="w-[90px] text-center">
                        <Tooltip.Provider>
                          <Tooltip.Root>
                            <Tooltip.Trigger>
                              <span class="inline-flex cursor-help items-center justify-center">Group</span>
                            </Tooltip.Trigger>
                            <Tooltip.Content class="max-w-xs">
                              Assign this Session to a Group. Sessions are displayed under their assigned Group in the Session Launcher. Groups can be collapsed to keep the Session List organized.
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      </Table.Head>
                      <Table.Head class="w-[130px] text-center">
                        <Tooltip.Provider>
                          <Tooltip.Root>
                            <Tooltip.Trigger>
                              <span class="inline-flex cursor-help items-center justify-center">Zoom</span>
                            </Tooltip.Trigger>
                            <Tooltip.Content class="max-w-xs">
                              Set the Zoom level for this Session. This changes the Zoom of the Session's Webview content.
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      </Table.Head>
                      <Table.Head class="w-[90px] text-center">
                        <Tooltip.Provider>
                          <Tooltip.Root>
                            <Tooltip.Trigger>
                              <span class="inline-flex cursor-help items-center justify-center">Floatable</span>
                            </Tooltip.Trigger>
                            <Tooltip.Content class="max-w-xs">
                              Choose whether this Session can be selected in the Floating Sessions Widget. Only enabled Sessions will appear in the Widget's Session dropdown.
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      </Table.Head>
                      <Table.Head class="w-full"></Table.Head>
                      <Table.Head class="w-[170px] text-center">
                        <Tooltip.Provider>
                          <Tooltip.Root>
                            <Tooltip.Trigger>
                              <span class="inline-flex cursor-help items-center justify-center">Auto-Delete Cache</span>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Automatically Clear this Session's Cache, when the Session Stops and on every Startup of NeuzOS.</Tooltip.Content>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      </Table.Head>
                      <Table.Head class="w-[170px] text-center">
                        <div class="flex justify-start">Session ID</div>
                      </Table.Head>
                      <Table.Head class="w-[170px]">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {#each groupSessions as session, sidx (session.id)}
                      {@render sessionDropZone(isUngroupedGroup(group) ? null : group.id, sidx)}
                      {@render sessionRow(session, sidx, groupSessions.length, isUngroupedGroup(group) ? null : group.id)}
                    {/each}
                    {@render sessionDropZone(isUngroupedGroup(group) ? null : group.id, groupSessions.length)}
                  </Table.Body>
                </Table.Root>
              {/if}
            </Card.Content>
          {/if}
        </Card.Root>
      {/each}
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
        <AlertDialog.Content class="max-h-[85vh] overflow-hidden">
          <AlertDialog.Header>
            <AlertDialog.Title>Clear All Sessions' Cache?</AlertDialog.Title>
            <AlertDialog.Description>
              This Action will clear the Cache for all Sessions.<br/><br/>
              <strong>Sessions that will be affected:</strong>
              <div class="mt-2 max-h-[40vh] overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2">
                <ul class="space-y-1 list-disc list-inside">
                  {#each neuzosConfig.sessions as session}
                    <li class="text-sm">
                      <span class="font-medium">{session.label}</span>
                      <span class="text-muted-foreground"> (ID: {session.id})</span>
                    </li>
                  {/each}
                </ul>
              </div>
              <br/>
              Your Session Data will still be saved.
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
      <AlertDialog.Title>Failed to Delete "{deleteErrorModal?.sessionLabel}"</AlertDialog.Title>
      <AlertDialog.Description>
        {deleteErrorModal?.error}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Action onclick={() => { deleteErrorModal = null }}>OK</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
