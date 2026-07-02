<script lang="ts">
  import {Button, buttonVariants} from "$lib/components/ui/button";
  import {
    Minus,
    Maximize,
    X,
    Plus,
    RefreshCcw,
    VolumeX,
    Volume,
    Volume2,
    VolumeOff,
    Square,
    Play,
    Home,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Fullscreen,
    Keyboard,
    KeyboardOff,
    Check,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Globe,
    RadioTower,
    Settings,
    Columns2
  } from '@lucide/svelte'
  import {getContext, onMount} from "svelte";
  import type {MainWindowState, NeuzLayout, NeuzSession, NeuzSessionGroup} from "$lib/types";
  import * as Dialog from '$lib/components/ui/dialog'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import * as Tabs from '$lib/components/ui/tabs'
  import * as Card from '$lib/components/ui/card'
  import {getNeuzosBridgeContext} from "$lib/contexts/neuzosBridgeContext";
  import {getElectronContext} from "$lib/contexts/electronContext";
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import {cn} from "$lib/utils";
  import {Separator} from "$lib/components/ui/separator";
  import PinnedActions from "./MainBarComponents/PinnedActions.svelte";
  import PinnedWidgetLaunchers from "./MainBarComponents/PinnedWidgetLaunchers.svelte";
  import WidgetsButton from "./MainBarComponents/WidgetsButton.svelte";
  import ThemeToggle from "./MainBarComponents/ThemeToggle.svelte";
  import {getQuestPanelContext} from "$lib/contexts/questPanelContext.svelte";
  import {getUIActionContext} from "$lib/contexts/uiActionContext.svelte";

  let shortcutsEnabled = $state(true);
  let collapsedSessionGroupIds: Record<string, boolean> = $state({});
  let hasVisibleActionPins = $state(false);
  const collapsedSessionGroupsStorageKey = 'neuzos.mainbar.sessionPopup.collapsedGroups';
  const ungroupedGroupId = 'ungrouped';

  function loadCollapsedSessionGroups() {
    try {
      const stored = localStorage.getItem(collapsedSessionGroupsStorageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        collapsedSessionGroupIds = parsed;
      }
    } catch {
      collapsedSessionGroupIds = {};
    }
  }

  function saveCollapsedSessionGroups() {
    localStorage.setItem(collapsedSessionGroupsStorageKey, JSON.stringify(collapsedSessionGroupIds));
  }

  onMount(() => {
    loadCollapsedSessionGroups();
    const handleShortcutsStateChanged = (_: any, newEnabled: boolean) => {
      shortcutsEnabled = newEnabled;
    };
    const handleActiveKeybindProfileChanged = (_: any, profileId: string) => {
      mainWindowState.config.activeKeyBindProfileId = profileId;
    };

    void electronApi.invoke("shortcuts.get_state")
      .then((state) => {
        shortcutsEnabled = state.mainWindow;
      })
      .catch((e) => {
        console.error("Failed to get shortcuts state:", e);
      });

    electronApi.on("event.shortcuts_state_changed", handleShortcutsStateChanged);
    electronApi.on("event.active_keybind_profile_changed", handleActiveKeybindProfileChanged);

    return () => {
      electronApi.removeListener("event.shortcuts_state_changed", handleShortcutsStateChanged);
      electronApi.removeListener("event.active_keybind_profile_changed", handleActiveKeybindProfileChanged);
    };
  });

  async function swapProfile(profileId: string) {
    await electronApi.invoke("keybinds.swap_profile", profileId);
    mainWindowState.config.activeKeyBindProfileId = profileId;
  }

  const neuzosBridge = getNeuzosBridgeContext();
  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  const electronApi = getElectronContext();
  const questPanel = getQuestPanelContext();
  const uiActionContext = getUIActionContext();

  onMount(() => {
    uiActionContext.register('ui.toggle_quest_log', () => questPanel.toggle());

    return () => {
      uiActionContext.unregister('ui.toggle_quest_log');
    };
  });

  const openSettings = (tab?: string) => {
    neuzosBridge.settingsWindow.open(tab)
  }

  const switchToHome = () => {
    neuzosBridge.layouts.switch('home')
  }

  const addLayout = (layoutId: string) => {
    neuzosBridge.layouts.add(layoutId)
  }

  const getNextGuestLabel = (existingLabels: Set<string>) => {
    let index = 1;
    while (existingLabels.has(index === 1 ? 'Guest' : `Guest (${index})`)) {
      index++;
    }

    return index === 1 ? 'Guest' : `Guest (${index})`;
  }

  const getNextGuestLabels = (existingLabels: Set<string>, count: number) => {
    const labels: string[] = [];
    const usedLabels = new Set(existingLabels);
    for (let index = 0; index < count; index++) {
      const label = getNextGuestLabel(usedLabels);
      labels.push(label);
      usedLabels.add(label);
    }

    return labels;
  }

  const quickCreateLayoutSession = async (sessionCount: 1 | 2) => {
    const layoutLabel = getNextGuestLabel(new Set(mainWindowState.config.layouts.map((layout) => layout.label)));
    const sessionLabels = getNextGuestLabels(new Set(mainWindowState.config.sessions.map((session) => session.label)), sessionCount);
    const baseId = Date.now();
    const sessionIds = Array.from({length: sessionCount}, (_, index) => (baseId + index).toString());
    const layoutId = (baseId + sessionCount).toString();
    const icon = {slug: 'jobs/vagrant'};
    const sessions: NeuzSession[] = sessionIds.map((sessionId, index) => ({
      id: sessionId,
      label: sessionLabels[index],
      icon
    }));
    const layout: NeuzLayout = {
      id: layoutId,
      label: layoutLabel,
      icon,
      rows: [{sessionIds}]
    };

    mainWindowState.config.sessions = [...mainWindowState.config.sessions, ...sessions];
    mainWindowState.config.layouts = [...mainWindowState.config.layouts, layout];
    mainWindowState.sessions = [...mainWindowState.sessions, ...sessions];
    mainWindowState.layouts = [...mainWindowState.layouts, layout];

    await neuzosBridge.config.saveSilent(mainWindowState.config);
    addLayout(layoutId);
  }

  const switchToLayout = (layoutId: string) => {
    neuzosBridge.layouts.switch(layoutId)
  }

  const closeLayout = (layoutId: string) => {
    neuzosBridge.layouts.close(layoutId)
  }

  const stopSession = (sessionId: string) => {
    neuzosBridge.sessions.stop(sessionId)
  }

  const restartSession = (layoutId: string, sessionId: string) => {
    neuzosBridge.sessions.restart(sessionId, layoutId)
  }

  const startSession = (layoutId: string, sessionId: string) => {
    neuzosBridge.sessions.start(sessionId, layoutId)
  }

  const isSessionStarted = (layoutId: string, sessionId: string) => {
    return mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.isStarted() ?? false
  }

  const isSessionMuted = (layoutId: string, sessionId: string) => {
    const liveMuted = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.isMuted()
    if (liveMuted !== undefined) {
      return liveMuted
    }
    return mainWindowState.config.layouts.find((layout) => layout.id === layoutId)?.mutedSessionIds?.includes(sessionId) ?? false
  }

  const setPersistedSessionMuted = (layoutId: string, sessionId: string, muted: boolean) => {
    const updateLayout = (layout: NeuzLayout) => {
      if (layout.id !== layoutId) {
        return layout
      }

      const mutedSessionIds = new Set(layout.mutedSessionIds ?? [])
      if (muted) {
        mutedSessionIds.add(sessionId)
      } else {
        mutedSessionIds.delete(sessionId)
      }

      const nextLayout = { ...layout }
      if (mutedSessionIds.size === 0) {
        delete nextLayout.mutedSessionIds
      } else {
        nextLayout.mutedSessionIds = [...mutedSessionIds]
      }

      return nextLayout
    }

    mainWindowState.config.layouts = mainWindowState.config.layouts.map(updateLayout)
    mainWindowState.layouts = mainWindowState.layouts.map(updateLayout)
  }

  const saveMutedLayoutState = () => {
    void neuzosBridge.config.saveSilent(mainWindowState.config)
  }

  const setSessionMuted = (layoutId: string, sessionId: string, muted: boolean, save: boolean = true) => {
    setPersistedSessionMuted(layoutId, sessionId, muted)
    mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.setAudioMuted?.(muted)
    if (save) {
      saveMutedLayoutState()
    }
  }

  const muteAllSessions = (layoutId: string) => {
    const layout = mainWindowState.layouts.find((layout) => layout.id === layoutId)
    layout?.rows.flatMap((row) => row.sessionIds).forEach((sessionId) => setSessionMuted(layoutId, sessionId, true, false))
    saveMutedLayoutState()
  }

  const unmuteAllSessions = (layoutId: string) => {
    const layout = mainWindowState.layouts.find((layout) => layout.id === layoutId)
    layout?.rows.flatMap((row) => row.sessionIds).forEach((sessionId) => setSessionMuted(layoutId, sessionId, false, false))
    saveMutedLayoutState()
  }

  const stopAllSessions = (layoutId: string) => {
    for (const sessionId in mainWindowState.sessionsLayoutsRef) {
      mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.stopClient()
    }
  }

  const startAllSessions = (layoutId: string) => {
    const layout = mainWindowState.layouts.find(l => l.id === layoutId)
    if (layout) {
      layout.rows.flatMap(r => r.sessionIds).forEach(sessionId => {
        neuzosBridge.sessions.start(sessionId, layoutId)
      })
    }
  }

  const muteSession = (layoutId: string, sessionId: string) => {
    setSessionMuted(layoutId, sessionId, true)
  }

  const unmuteSession = (layoutId: string, sessionId: string) => {
    setSessionMuted(layoutId, sessionId, false)
  }

  const reloadConfing = () => {
    neuzosBridge.mainWindow.reloadConfig()
  }

  const clampZoom = (value: number) => Math.min(1.5, Math.max(0.5, Math.round(value * 20) / 20))

  const getSessionZoom = (sessionId: string): number => {
    return mainWindowState.config.sessionZoomLevels?.[sessionId] ?? 1.0
  }

  const setSessionZoom = (sessionId: string, value: number) => {
    const clamped = clampZoom(value)
    mainWindowState.config.sessionZoomLevels = mainWindowState.config.sessionZoomLevels ?? {}
    if (clamped === 1.0) {
      delete mainWindowState.config.sessionZoomLevels[sessionId]
    } else {
      mainWindowState.config.sessionZoomLevels[sessionId] = clamped
    }
    // Imperatively apply to all running webviews for this session (reactive chain is unreliable)
    const layouts = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts
    if (layouts) {
      Object.values(layouts).forEach((ref: any) => ref.setZoom?.(clamped))
    }
    void neuzosBridge.config.saveSilent(mainWindowState.config)
  }

  const isActiveReceiver = (sessionId: string) => {
    return mainWindowState.config.syncReceiverSessionId === sessionId
  }

  const toggleActiveReceiver = (sessionId: string) => {
    const nextReceiverId = isActiveReceiver(sessionId) ? null : sessionId
    mainWindowState.config.syncReceiverSessionId = nextReceiverId
    neuzosBridge.sessions.setSyncReceiver(nextReceiverId)
  }

  const layoutHasActiveReceiver = (layout: { rows?: { sessionIds?: string[] }[] }) => {
    const receiverId = mainWindowState.config.syncReceiverSessionId
    if (!receiverId) return false

    return layout.rows?.some((row) => row.sessionIds?.includes(receiverId)) ?? false
  }


  function getIconPath(session: NeuzSession): string {
    if (!session?.icon?.slug) return 'icons/misc/unknown.png';
    return `icons/${session.icon.slug}.png`;
  }


  function launchSession(sessionId: string, mode: 'session' | 'focus' | 'focus_fullscreen') {
    electronApi.send("session_launcher.launch_session", sessionId, mode);
  }

  function getLaunchableSessions(): NeuzSession[] {
    return mainWindowState.sessions.filter(session => session.partitionOverwrite !== 'browser');
  }

  function getSessionGroups(): NeuzSessionGroup[] {
    return mainWindowState.config.sessionGroups ?? [];
  }

  function isUngroupedGroup(group: NeuzSessionGroup): boolean {
    return group.id === ungroupedGroupId || group.type === 'ungrouped';
  }

  function getOrderedSessionSections(): NeuzSessionGroup[] {
    const groups = getSessionGroups();
    return groups.some((group) => isUngroupedGroup(group))
      ? groups
      : [...groups, { id: ungroupedGroupId, type: 'ungrouped' }];
  }

  function getGroupSessions(group: NeuzSessionGroup): NeuzSession[] {
    if (isUngroupedGroup(group)) {
      return [];
    }
    const sessionMap = new Map(getLaunchableSessions().map((session) => [session.id, session]));
    const sessionIds = Array.isArray(group.sessionIds) ? group.sessionIds : [];
    return sessionIds
      .map((sessionId) => sessionMap.get(sessionId))
      .filter((session): session is NeuzSession => session !== undefined);
  }

  function getUngroupedSessions(): NeuzSession[] {
    const groupedSessionIds = new Set(getSessionGroups().flatMap((group) => isUngroupedGroup(group) ? [] : (Array.isArray(group.sessionIds) ? group.sessionIds : [])));
    return getLaunchableSessions().filter((session) => !groupedSessionIds.has(session.id));
  }

  function isSessionGroupCollapsed(groupId: string): boolean {
    return collapsedSessionGroupIds[groupId] ?? false;
  }

  function toggleSessionGroupCollapsed(groupId: string) {
    collapsedSessionGroupIds[groupId] = !isSessionGroupCollapsed(groupId);
    saveCollapsedSessionGroups();
  }

  function formatSessionCount(count: number): string {
    return `${count} ${count === 1 ? 'Session' : 'Sessions'}`;
  }

</script>
{#snippet sessionLaunchCard(sessionTab)}
  <Card.Root class="p-3 gap-2">
    <Card.Header class="p-0">
      <div class="flex items-center gap-2">
        <img src={getIconPath(sessionTab)} alt={sessionTab.label} class="w-4 h-4"/>
        <span>{sessionTab.label}</span>
      </div>
    </Card.Header>
    <Card.Content class="p-0">
      <div class="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          class="text-xs h-7 flex-1"
          onclick={() => launchSession(sessionTab.id, 'session')}
        >
          Normal
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-xs h-7 flex-1"
          onclick={() => launchSession(sessionTab.id, 'focus')}
        >
          Focus
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-xs h-7 flex-1"
          onclick={() => launchSession(sessionTab.id, 'focus_fullscreen')}
        >
          Focus Fullscreen
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
{/snippet}
<div
  id="titlebar"
  class="gap-2 p-1 px-2 select-none border-b border-accent flex items-center justify-end bg-accent/50 min-h-10"
>
  <div class="flex items-center gap-2">
    <img src="favicon.png" alt="NeuzOS Logo" class="size-6"/>
  </div>
  <Button disabled={mainWindowState.tabs.activeLayoutId === 'home'} size="icon-xs" variant="outline"
          onclick={switchToHome} class="cursor-pointer">
    <Home class="size-3.5"/>
  </Button>
  <Button size="icon-xs" variant="outline" onclick={() => openSettings()} class="cursor-pointer">
    <Settings class="size-3.5"/>
  </Button>
  <!----------------------------------------!-->
  <Dialog.Root>
    <Dialog.Trigger class={cn(buttonVariants({ variant: 'outline', size: 'icon-xs' }), 'cursor-pointer')}
    >
      <Plus class="size-3.5"/>
    </Dialog.Trigger
    >
    <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
        <Dialog.Title>Chose a Layout / Session</Dialog.Title>
        <Dialog.Description
        >
          Layout → Add to Main Bar<br />
          Session → Open in separate Window
        </Dialog.Description
        >
      </Dialog.Header>
      <div class="flex min-h-0 flex-col gap-2 w-full">
        <Tabs.Root value="layouts" class="min-h-0">
          <Tabs.List class="grid w-full grid-cols-2 gap-1">
            <div class="relative min-w-0">
              <Tabs.Trigger value="layouts" class="w-full pl-9">Layouts</Tabs.Trigger>
              <Button
                variant="ghost"
                size="icon-xs"
                class="absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 bg-transparent hover:bg-accent hover:text-accent-foreground"
                title="Manage Layouts"
                onclick={(event) => {
                  event.stopPropagation();
                  openSettings('layouts');
                }}
              >
                <Settings class="size-3.5"/>
              </Button>
            </div>
            <div class="relative min-w-0">
              <Tabs.Trigger value="sessions" class="w-full pl-9">Sessions</Tabs.Trigger>
              <Button
                variant="ghost"
                size="icon-xs"
                class="absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 bg-transparent hover:bg-accent hover:text-accent-foreground"
                title="Manage Sessions"
                onclick={(event) => {
                  event.stopPropagation();
                  openSettings('sessions');
                }}
              >
                <Settings class="size-3.5"/>
              </Button>
            </div>
          </Tabs.List>
          <Tabs.Content value="layouts" class="min-h-0">
            <div class="flex h-[33vh] flex-col gap-2 overflow-y-auto px-6">
              {#each mainWindowState.layouts as layTab (layTab.id)}
                {@const disabledAdd = mainWindowState.tabs.layoutsIds.includes(layTab.id)}
                <Button variant="outline" size="sm" class="flex gap-2 justify-start items-center"
                        disabled={disabledAdd}
                        onclick={() => addLayout(layTab.id)}>
                  <img class="w-6 h-6" src="icons/{layTab.icon?.slug ?? 'misc/unknown'}.png" alt=""/> {layTab.label}
                </Button>
              {/each}
            </div>
            <div class="px-6 pt-2">
              <div class="rounded-md border border-border/70 bg-muted/20 p-3">
                <div class="mb-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground">
                  <Plus class="size-4"/>
                  Quick Create Layout Session
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    class="justify-start gap-2"
                    title="Creates a Layout with a Single Session."
                    onclick={() => quickCreateLayoutSession(1)}
                  >
                    <Square class="size-4"/>
                    Single Session
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="justify-start gap-2"
                    title="Creates a Layout with two Sessions."
                    onclick={() => quickCreateLayoutSession(2)}
                  >
                    <Columns2 class="size-4"/>
                    Dual Session
                  </Button>
                </div>
              </div>
            </div>
          </Tabs.Content>
          <Tabs.Content value="sessions" class="min-h-0">
            <div class="flex h-[33vh] w-full flex-col gap-3 overflow-y-auto px-6">
              {#each getOrderedSessionSections() as group (group.id)}
                {@const groupSessions = isUngroupedGroup(group) ? getUngroupedSessions() : getGroupSessions(group)}
                {#if groupSessions.length > 0}
                  <Card.Root class="shrink-0 overflow-hidden gap-0 border-border/70 py-0">
                    <button
                      type="button"
                      class="flex h-7 w-full items-center justify-between gap-3 px-2.5 py-0 text-left transition-opacity hover:opacity-80"
                      onclick={() => toggleSessionGroupCollapsed(group.id)}
                    >
                      <div class="flex min-w-0 items-center gap-1.5">
                        {#if isSessionGroupCollapsed(group.id)}
                          <ChevronDown class="size-4 shrink-0"/>
                        {:else}
                          <ChevronUp class="size-4 shrink-0"/>
                        {/if}
                        <span class="truncate font-semibold text-foreground">{isUngroupedGroup(group) ? 'Sessions' : (group.label ?? 'New Group')}</span>
                      </div>
                      <span class="inline-flex h-6 shrink-0 items-center text-xs leading-none text-muted-foreground">{formatSessionCount(groupSessions.length)}</span>
                    </button>
                    {#if !isSessionGroupCollapsed(group.id)}
                      <Card.Content class="p-3 pt-1">
                        <div class="grid gap-2">
                          {#each groupSessions as sessionTab (sessionTab.id)}
                            {@render sessionLaunchCard(sessionTab)}
                          {/each}
                        </div>
                      </Card.Content>
                    {/if}
                  </Card.Root>
                {/if}
              {/each}

              {#if getLaunchableSessions().length === 0}
                <p class="text-center text-sm text-muted-foreground">No sessions available</p>
              {/if}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
      <Dialog.Footer></Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
  <!-----------------------------------!-->
  <div class="flex items-center text-sm gap-1">
    {#if mainWindowState.tabs.layoutsIds.length === 0}
      <div
        class="h-7 px-3 inline-flex items-center justify-center rounded-md border border-dashed border-border/70 text-xs text-muted-foreground cursor-help"
        title="Click the + Button to Add a Layout to the Main Bar"
      >
        No Active Layouts
      </div>
    {/if}
    {#each mainWindowState.tabs.layoutOrder as layoutId (layoutId)}
      {@const layTab = mainWindowState.layouts.find(l => l.id === layoutId)}
      {#if !layTab}{:else}
      {@const disabledSwitch = mainWindowState.tabs.activeLayoutId === layoutId}

      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Button variant="outline" size="xs" class="text-center" disabled={disabledSwitch}
                  onclick={() => switchToLayout(layoutId)}>
            <img src="icons/{layTab.icon.slug}.png" alt={layTab.icon.slug} class="w-4 h-4"/>
            {layTab.label}
            {#if layoutHasActiveReceiver(layTab)}
              <RadioTower class="h-3.5 w-3.5 text-primary" />
            {/if}
          </Button>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <div class="flex w-full items-center justify-between gap-2 flex-1">
            <ContextMenu.Item
              class="border border-border/50  {mainWindowState.tabs.layoutOrder.indexOf(layTab.id) > 0 ? 'opacity-100' : 'opacity-50'}"
              onclick={() => {
              const index = mainWindowState.tabs.layoutOrder.indexOf(layTab.id)
              if (index > 0) {
                mainWindowState.tabs.layoutOrder.splice(index, 1)
                mainWindowState.tabs.layoutOrder.splice(index - 1, 0, layTab.id)
              }
            }}
            >
              <div class="flex items-center gap-2">
                <ChevronLeft class="h-4"/>
              </div>
            </ContextMenu.Item
            >
            <ContextMenu.Item class="border border-border/50"
                              onclick={() => closeLayout(layTab.id)}
            >
              <div class="flex items-center gap-2">
                <X class="h-4"/>
              </div>
            </ContextMenu.Item
            >
            <ContextMenu.Item
              class="border border-border/50 {mainWindowState.tabs.layoutOrder.indexOf(layTab.id) < (mainWindowState.tabs.layoutOrder.length - 1) ? 'opacity-100' : 'opacity-50'}"
              onclick={() => {
            const index = mainWindowState.tabs.layoutOrder.indexOf(layTab.id)
            if (index < mainWindowState.tabs.layoutOrder.length - 1) {
              mainWindowState.tabs.layoutOrder.splice(index, 1)
              mainWindowState.tabs.layoutOrder.splice(index + 1, 0, layTab.id)
            }
          }}>
              <div class="flex items-center gap-2">
                <ChevronRight class="h-4"/>
              </div>
            </ContextMenu.Item>
          </div>

          <ContextMenu.Separator/>
          <ContextMenu.Label class="text-xs text-center">
            Mass Actions
          </ContextMenu.Label>
          <ContextMenu.Separator class="mx-2"/>
          <div class="flex items-center justify-between gap-2">
            <ContextMenu.Item class={cn("flex-1 items-center justify-center")}
                              onclick={() => unmuteAllSessions(layTab.id)}>
              <Volume2 class="h=4"/>
            </ContextMenu.Item
            >
            <ContextMenu.Item class={cn("flex-1 items-center justify-center")}
                              onclick={() => muteAllSessions(layTab.id)}>
              <VolumeOff class="h=4"/>
            </ContextMenu.Item
            >
          </div>
          <ContextMenu.Separator class="mx-2"/>
          <div class="flex items-center justify-between gap-2">
            <ContextMenu.Item class={cn("flex-1 items-center justify-center")}
                              onclick={() => startAllSessions(layTab.id)}>
              <Play class="h=4"/>
            </ContextMenu.Item
            >
            <ContextMenu.Item class={cn("flex-1 items-center justify-center")}
                              onclick={() => stopAllSessions(layTab.id)}>
              <Square class="h=4"/>
            </ContextMenu.Item
            >
          </div>
          <ContextMenu.Separator/>
          {#each layTab.rows as row,idx (idx)}
            {#each row.sessionIds as sessionId (sessionId)}
              {@const session = mainWindowState.sessions.find(s => s.id === sessionId)}
              {#if !session}{:else}
              <ContextMenu.Sub>
                <ContextMenu.SubTrigger>
                  <div class="flex items-center gap-2 justify-between w-full">
                    <div class="flex items-center gap-2">
                      <img src="icons/{session.icon.slug}.png" alt={session.icon.slug} class="w-4 h-4"/>
                      {session?.label}
                    </div>
                    {#if isSessionMuted(layoutId, sessionId)}
                      <VolumeX class="w-4 h-4"/>
                    {/if}
                  </div>
                </ContextMenu.SubTrigger>
                <ContextMenu.SubContent class="w-48">
                  <ContextMenu.Item
                    onclick={() => isSessionMuted(layoutId, sessionId) ? unmuteSession(layoutId,sessionId) : muteSession(layoutId, sessionId)}>
                    <div class="flex items-center gap-2">
                      {#if isSessionMuted(layoutId, sessionId)}
                        <VolumeX class="h-4"/>
                        Unmute
                      {:else}
                        <Volume class="h-4"/>
                        Mute
                      {/if}
                    </div>
                  </ContextMenu.Item>
                  <ContextMenu.Separator/>
                  <ContextMenu.Item
                    onclick={() => isSessionStarted(layoutId, sessionId) ? stopSession(sessionId) : startSession(layoutId, sessionId)}>
                    <div class="flex items-center gap-2">
                      {#if isSessionStarted(layoutId, sessionId)}
                        <Square class="h-4"/>
                        Stop
                      {:else}
                        <Play class="h-4"/>
                        Start
                      {/if}
                    </div>
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    onclick={() => restartSession(layoutId, sessionId)}>
                    <div class="flex items-center gap-2">
                      <RefreshCcw class="h-4"/>
                      Restart
                    </div>
                  </ContextMenu.Item>
                  <ContextMenu.Separator/>
                  <ContextMenu.Item
                    onSelect={(event) => event.preventDefault()}
                    onclick={() => setSessionZoom(sessionId, getSessionZoom(sessionId) + 0.05)}
                    disabled={getSessionZoom(sessionId) >= 1.5}>
                    <div class="flex items-center gap-2">
                      <ZoomIn class="h-4"/>
                      Zoom In
                    </div>
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    onSelect={(event) => event.preventDefault()}
                    onclick={() => setSessionZoom(sessionId, getSessionZoom(sessionId) - 0.05)}
                    disabled={getSessionZoom(sessionId) <= 0.5}>
                    <div class="flex items-center gap-2">
                      <ZoomOut class="h-4"/>
                      Zoom Out
                    </div>
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    onSelect={(event) => event.preventDefault()}
                    onclick={() => setSessionZoom(sessionId, 1.0)}
                    disabled={getSessionZoom(sessionId) === 1.0}>
                    <div class="flex items-center gap-2">
                      <RotateCcw class="h-4"/>
                      Reset Zoom ({(getSessionZoom(sessionId) * 100).toFixed(0)}%)
                    </div>
                  </ContextMenu.Item>
                  <ContextMenu.Separator/>
                  <ContextMenu.Item onclick={() => toggleActiveReceiver(sessionId)}>
                    <div class="flex w-full items-center justify-between gap-4">
                      <div class="flex items-center gap-2">
                        <RadioTower class="h-4"/>
                        Active Receiver
                      </div>
                      {#if isActiveReceiver(sessionId)}
                        <Check class="h-4"/>
                      {/if}
                    </div>
                  </ContextMenu.Item>
                </ContextMenu.SubContent>
              </ContextMenu.Sub>
              {/if}
            {/each}
          {/each}
        </ContextMenu.Content>
      </ContextMenu.Root>
      {/if}
    {/each}
  </div>
  <div
    class="flex-1 cursor-grab active:cursor-grabbing h-full w-full"
    style="-webkit-app-region: drag;"
  ></div>

  <PinnedActions onHasPinnedActionsChange={(hasPinnedActions) => hasVisibleActionPins = hasPinnedActions}/>

  {#if hasVisibleActionPins}
    <Separator orientation="vertical" class="h-4"/>
  {/if}

  {#if mainWindowState.config.changed}
    <Button size="icon-xs" variant="outline" onclick={reloadConfing} class="cursor-pointer" title="Reload Config">
      <RefreshCw class="size-3.5"/>
    </Button>
    <Separator orientation="vertical" class="h-4"/>
  {/if}

  <PinnedWidgetLaunchers/>
  <WidgetsButton/>
  {#if mainWindowState.config.titleBarButtons.keybindToggle}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          size="icon-xs"
          variant="outline"
          class="cursor-pointer"
          title="Keybind Profiles"
        >
          {#if shortcutsEnabled}
            <Keyboard class="size-3.5"/>
          {:else}
            <KeyboardOff class="size-3.5"/>
          {/if}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-48">
        <DropdownMenu.Item
          onclick={() => neuzosBridge.mainWindow.toggleShortcuts(!shortcutsEnabled)}
          class="gap-2"
        >
          {#if shortcutsEnabled}
            <KeyboardOff class="size-4"/>
            Disable Keybinds
          {:else}
            <Keyboard class="size-4"/>
            Enable Keybinds
          {/if}
        </DropdownMenu.Item>
        {#if (mainWindowState.config.keyBindProfiles?.length ?? 0) > 0}
          <DropdownMenu.Separator/>
          {#each mainWindowState.config.keyBindProfiles ?? [] as profile (profile.id)}
            {@const isActive = mainWindowState.config.activeKeyBindProfileId === profile.id}
            <DropdownMenu.Item onclick={() => swapProfile(profile.id)} class="gap-2">
              <Check class="size-4 {isActive ? 'opacity-100' : 'opacity-0'}"/>
              {profile.name}
            </DropdownMenu.Item>
          {/each}
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
  {#if mainWindowState.config.titleBarButtons.darkModeToggle}
    <ThemeToggle/>
  {/if}

  <Separator orientation="vertical" class="h-4"/>
  {#if mainWindowState.config.titleBarButtons.fullscreenToggle}
    <Button size="icon-xs" variant="outline" onclick={() => {
        neuzosBridge.mainWindow.fullscreenToggle()
      }} class="cursor-pointer">
      <Fullscreen class="size-3.5"/>
    </Button>
    <Separator orientation="vertical" class="h-4"/>
  {/if}

  <Button
    size="icon-xs"
    variant="outline"
    onclick={() => {
        neuzosBridge.mainWindow.minimize()
      }}
    class="cursor-pointer"
  >
    <Minus class="size-3.5"/>
  </Button>
  <Button
    size="icon-xs"
    variant="outline"
    onclick={() => {
        neuzosBridge.mainWindow.maximize()
      }}
    class="cursor-pointer"
  >
    <Maximize class="size-3.5"/>
  </Button>
  <Button
    variant="outline"
    onclick={() => {
         neuzosBridge.mainWindow.close()
      }}
    size="icon-xs"
    class="cursor-pointer"
  >
    <X class="size-3.5"/>
  </Button>
</div>
