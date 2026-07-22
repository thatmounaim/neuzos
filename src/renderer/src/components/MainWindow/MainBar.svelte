<script lang="ts">
  import {Button, buttonVariants} from "$lib/components/ui/button";
  import {
    Minus,
    Maximize,
    X,
    Plus,
    RefreshCcw,
    VolumeX,
    Volume2,
    VolumeOff,
    Square,
    Play,
    Home,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
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
    Columns2,
    CircleQuestionMark,
    Search,
    ArrowDown
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
  import {Input} from "$lib/components/ui/input";
  import PinnedActions from "./MainBarComponents/PinnedActions.svelte";
  import PinnedWidgetLaunchers from "./MainBarComponents/PinnedWidgetLaunchers.svelte";
  import WidgetsButton from "./MainBarComponents/WidgetsButton.svelte";
  import ThemeToggle from "./MainBarComponents/ThemeToggle.svelte";
  import {getQuestPanelContext} from "$lib/contexts/questPanelContext.svelte";
  import {getUIActionContext} from "$lib/contexts/uiActionContext.svelte";
  import {
    readSettingsCollapsedGroups,
    writeSettingsCollapsedGroups,
  } from "$lib/localStorageStores";

  let shortcutsEnabled = $state(true);
  let collapsedSessionGroupIds: Record<string, boolean> = $state({});
  let hasVisibleActionPins = $state(false);
  let launcherTab: 'layouts' | 'sessions' = $state('layouts');
  let layoutLauncherSearchQuery = $state('');
  let sessionLauncherSearchQuery = $state('');
  const ungroupedGroupId = 'ungrouped';

  function loadCollapsedSessionGroups() {
    collapsedSessionGroupIds = readSettingsCollapsedGroups('sessionLauncherMainbar', sanitizeCollapsedSessionGroups);
  }

  function saveCollapsedSessionGroups() {
    collapsedSessionGroupIds = sanitizeCollapsedSessionGroups(collapsedSessionGroupIds);
    writeSettingsCollapsedGroups('sessionLauncherMainbar', collapsedSessionGroupIds);
  }

  function sanitizeCollapsedSessionGroups(collapsedGroups: Record<string, boolean>): Record<string, boolean> {
    const validGroupIds = new Set(getSessionGroups().filter((group) => !isUngroupedGroup(group)).map((group) => group.id));
    validGroupIds.add(ungroupedGroupId);
    return Object.fromEntries(
      Object.entries(collapsedGroups).filter(([groupId]) => validGroupIds.has(groupId))
    );
  }

  $effect(() => {
    const sanitized = sanitizeCollapsedSessionGroups(collapsedSessionGroupIds);
    if (JSON.stringify(sanitized) !== JSON.stringify(collapsedSessionGroupIds)) {
      collapsedSessionGroupIds = sanitized;
      saveCollapsedSessionGroups();
    }
  });

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

  function handleKeybindToggleButtonContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    openSettings('keybinds');
  }

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

  const handleLauncherOpenChange = (open: boolean) => {
    if (open) {
      launcherTab = 'layouts'
    } else {
      layoutLauncherSearchQuery = ''
      sessionLauncherSearchQuery = ''
    }
  }

  const formatShortcutLabel = (key: string): string => {
    if (key.toLowerCase() === 'commandorcontrol+delete') {
      return 'CTRL + DELETE'
    }

    return key
      .split('+')
      .map((part) => part.trim().toUpperCase())
      .join(' + ')
  }

  const getCloseFocusSessionKeybindLabel = (): string => {
    const keyBind = mainWindowState.config.keyBinds?.find((bind) => bind.event === 'close_focus_session' && bind.key)
    return keyBind?.key ? formatShortcutLabel(keyBind.key) : ''
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
    neuzosBridge.config.notifyPatch({
      sessions: mainWindowState.config.sessions,
      layouts: mainWindowState.config.layouts
    });
    addLayout(layoutId);
  }

  const switchToLayout = (layoutId: string) => {
    neuzosBridge.layouts.switch(layoutId)
  }

  const closeLayout = (layoutId: string) => {
    neuzosBridge.layouts.close(layoutId)
  }

  const toggleLayoutInMainBar = (layoutId: string) => {
    if (mainWindowState.tabs.layoutsIds.includes(layoutId)) {
      closeLayout(layoutId)
    } else {
      addLayout(layoutId)
    }
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
    return mainWindowState.config.sessions.find((session) => session.id === sessionId)?.muted === true
  }

  const setPersistedSessionMuted = (sessionId: string, muted: boolean) => {
    const updateSession = (session: NeuzSession) => {
      if (session.id !== sessionId) return session
      const nextSession = {...session}
      if (muted) {
        nextSession.muted = true
      } else {
        delete nextSession.muted
      }
      return nextSession
    }

    mainWindowState.config.sessions = mainWindowState.config.sessions.map(updateSession)
    mainWindowState.sessions = mainWindowState.sessions.map(updateSession)
  }

  const saveMutedLayoutState = () => {
    void neuzosBridge.config.saveSilent(mainWindowState.config)
    neuzosBridge.config.notifyPatch({sessions: mainWindowState.config.sessions})
  }

  const setSessionMuted = (layoutId: string, sessionId: string, muted: boolean, save: boolean = true) => {
    setPersistedSessionMuted(sessionId, muted)
    Object.values(mainWindowState.sessionsLayoutsRef[sessionId]?.layouts ?? {}).forEach((client: any) => {
      client?.setAudioMuted?.(muted)
    })
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

  const clampZoom = (value: number) => Math.min(1.5, Math.max(0.5, Math.round(value * 20) / 20))

  const getSessionZoom = (sessionId: string): number => {
    return mainWindowState.config.sessions?.find((session) => session.id === sessionId)?.zoom ?? 1.0
  }

  const setSessionZoom = (sessionId: string, value: number) => {
    const clamped = clampZoom(value)
    const sessionConfig = mainWindowState.config.sessions?.find((session) => session.id === sessionId)
    if (!sessionConfig) return
    if (clamped === 1.0) {
      delete sessionConfig.zoom
    } else {
      sessionConfig.zoom = clamped
    }
    // Imperatively apply to all running webviews for this session (reactive chain is unreliable)
    const layouts = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts
    if (layouts) {
      Object.values(layouts).forEach((ref: any) => ref.setZoom?.(clamped))
    }
    void neuzosBridge.config.saveSilent(mainWindowState.config)
    neuzosBridge.config.notifyPatch({sessions: mainWindowState.config.sessions})
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

  function getFilteredLayouts(): NeuzLayout[] {
    const query = layoutLauncherSearchQuery.trim().toLowerCase();
    if (!query) {
      return mainWindowState.layouts;
    }

    return mainWindowState.layouts.filter((layout) =>
      layout.label.toLowerCase().includes(query) || layout.id.toLowerCase().includes(query)
    );
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

  function getFilteredSessionGroupSessions(group: NeuzSessionGroup, groupSessions: NeuzSession[]): NeuzSession[] {
    const query = sessionLauncherSearchQuery.trim().toLowerCase();
    if (!query) {
      return groupSessions;
    }

    const groupLabel = isUngroupedGroup(group) ? '' : (group.label ?? 'New Group');
    if (groupLabel.toLowerCase().includes(query)) {
      return groupSessions;
    }

    return groupSessions.filter((session) =>
      session.label.toLowerCase().includes(query) || session.id.toLowerCase().includes(query)
    );
  }

  function hasSessionLauncherSearchMatches(): boolean {
    return getOrderedSessionSections().some((group) => {
      const groupSessions = isUngroupedGroup(group) ? getUngroupedSessions() : getGroupSessions(group);
      return getFilteredSessionGroupSessions(group, groupSessions).length > 0;
    });
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
  <Dialog.Root onOpenChange={handleLauncherOpenChange}>
    <Dialog.Trigger class={cn(buttonVariants({ variant: 'outline', size: 'icon-xs' }), 'cursor-pointer')}
    >
      <Plus class="size-3.5"/>
    </Dialog.Trigger
    >
    <Dialog.Content class="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-[26.5625rem]">
      <Dialog.Header>
        {#if launcherTab === 'layouts'}
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 space-y-1">
              <Dialog.Title>Layout Manager</Dialog.Title>
              <Dialog.Description class="space-y-1">
                <span class="block">Add a Layout to the Main Bar</span>
              </Dialog.Description>
            </div>
          </div>
        {:else}
          <Dialog.Title>Session Launcher</Dialog.Title>
          <Dialog.Description class="space-y-1">
            {@const closeFocusKeybindLabel = getCloseFocusSessionKeybindLabel()}
            <span class="block">Open Session in a Separate Window</span>
            <span
              class="flex cursor-help items-center gap-1.5 pt-2"
              title={closeFocusKeybindLabel ? `Press ${closeFocusKeybindLabel} or Close 3x to Exit the Session Window` : 'Press Close 3x to Exit the Session Window'}
            >
              <CircleQuestionMark class="size-3.5"/>
              Focus Mode → Disabled Close Button
            </span>
          </Dialog.Description>
        {/if}
      </Dialog.Header>
      <div class="flex min-h-0 flex-col gap-2 w-full">
        <Tabs.Root bind:value={launcherTab} class="min-h-0">
          <Tabs.List class="grid w-full grid-cols-2 gap-1">
            <div class="relative min-w-0">
              <Tabs.Trigger value="layouts" class="w-full {launcherTab === 'layouts' ? 'pl-9' : ''}">Layouts</Tabs.Trigger>
              {#if launcherTab === 'layouts'}
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
              {/if}
            </div>
            <div class="relative min-w-0">
              <Tabs.Trigger value="sessions" class="w-full {launcherTab === 'sessions' ? 'pl-9' : ''}">Sessions</Tabs.Trigger>
              {#if launcherTab === 'sessions'}
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
              {/if}
            </div>
          </Tabs.List>
          <Tabs.Content value="layouts" class="min-h-0">
            {#if mainWindowState.layouts.length > 0}
              <div class="px-6 pt-2">
                <div class="relative">
                  <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                  <Input bind:value={layoutLauncherSearchQuery} placeholder="Search Layouts..." class="h-8 pl-8"/>
                </div>
              </div>
            {/if}
            <div class="flex flex-col gap-2 overflow-y-auto px-6 pt-3 {mainWindowState.layouts.length > 0 ? 'h-[33vh]' : ''}">
              {#each getFilteredLayouts() as layTab (layTab.id)}
                {@const isSelected = mainWindowState.tabs.layoutsIds.includes(layTab.id)}
                <Button
                  variant="outline"
                  size="sm"
                  class="flex gap-2 justify-start items-center {isSelected ? 'border-primary/60 bg-primary/10 opacity-50 hover:opacity-70' : ''}"
                  aria-pressed={isSelected}
                  onclick={() => toggleLayoutInMainBar(layTab.id)}
                >
                  <img class="w-6 h-6" src="icons/{layTab.icon?.slug ?? 'misc/unknown'}.png" alt=""/>
                  {layTab.label}
                  {#if isSelected}
                    <Check class="ml-auto size-4"/>
                  {/if}
                </Button>
              {/each}
              {#if mainWindowState.layouts.length === 0}
                <div class="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
                  <p class="text-sm font-medium text-foreground">No Layouts Available</p>
                  <p class="text-xs text-muted-foreground">
                    Press the <span class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-xs"><Settings class="h-3.5 w-3.5"></Settings></span> Button to Configure Layouts
                  </p>
                  <div class="mt-3 flex items-start justify-center gap-1.5 text-xs text-muted-foreground">
                    <CircleQuestionMark class="mt-0.5 size-4 shrink-0"/>
                    <span>
                      <span class="block">You can also Quick Create a Layout Session below</span>
                      <span class="mt-1 block">Edit the Layout Name / Icon / Configuration Later within the Settings</span>
                    </span>
                  </div>
                  <ArrowDown class="mx-auto mt-1 size-6 text-muted-foreground"/>
                </div>
              {:else if getFilteredLayouts().length === 0}
                <div class="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
                  <p class="text-sm font-medium text-foreground">No Matching Layouts Found</p>
                </div>
              {/if}
            </div>
            <div class="px-6 pt-2">
              <div class="rounded-md border border-border/70 bg-muted/20 p-3">
                <div class="mb-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground">
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
            {#if getLaunchableSessions().length > 0}
              <div class="px-6 pt-2">
                <div class="relative">
                  <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                  <Input bind:value={sessionLauncherSearchQuery} placeholder="Search Sessions..." class="h-8 pl-8"/>
                </div>
              </div>
            {/if}
            <div class="flex h-[33vh] w-full flex-col gap-3 overflow-y-auto px-6 pt-3">
              {#each getOrderedSessionSections() as group (group.id)}
                {@const groupSessions = isUngroupedGroup(group) ? getUngroupedSessions() : getGroupSessions(group)}
                {@const filteredGroupSessions = getFilteredSessionGroupSessions(group, groupSessions)}
                {@const groupCollapsed = !sessionLauncherSearchQuery.trim() && isSessionGroupCollapsed(group.id)}
                {#if filteredGroupSessions.length > 0}
                  <Card.Root class="shrink-0 overflow-hidden gap-0 border-border/70 py-0">
                    <button
                      type="button"
                      class="flex h-7 w-full items-center justify-between gap-3 px-2.5 py-0 text-left transition-opacity hover:opacity-80"
                      onclick={() => toggleSessionGroupCollapsed(group.id)}
                    >
                      <div class="flex min-w-0 items-center gap-1.5">
                        {#if groupCollapsed}
                          <ChevronDown class="size-4 shrink-0"/>
                        {:else}
                          <ChevronUp class="size-4 shrink-0"/>
                        {/if}
                        <span class="truncate font-semibold text-foreground">{isUngroupedGroup(group) ? 'Sessions' : (group.label ?? 'New Group')}</span>
                      </div>
                      <span class="inline-flex h-6 shrink-0 items-center text-xs leading-none text-muted-foreground">{formatSessionCount(filteredGroupSessions.length)}</span>
                    </button>
                    {#if !groupCollapsed}
                      <Card.Content class="p-3 pt-1">
                        <div class="grid gap-2">
                          {#each filteredGroupSessions as sessionTab (sessionTab.id)}
                            {@render sessionLaunchCard(sessionTab)}
                          {/each}
                        </div>
                      </Card.Content>
                    {/if}
                  </Card.Root>
                {/if}
              {/each}

              {#if getLaunchableSessions().length === 0}
                <div class="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
                  <p class="text-sm font-medium text-foreground">No Sessions Available</p>
                  <p class="text-xs text-muted-foreground">
                    Press the <span class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-xs"><Settings class="h-3.5 w-3.5"></Settings></span> Button to Configure Sessions
                  </p>
                </div>
              {:else if !hasSessionLauncherSearchMatches()}
                <div class="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
                  <p class="text-sm font-medium text-foreground">No Matching Sessions Found</p>
                </div>
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
        No Layouts Selected
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
              <RadioTower class="ml-0.5 h-3.5 w-3.5 text-primary" />
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
                    <div class="flex items-center gap-1">
                      {#if isActiveReceiver(sessionId)}
                        <RadioTower class="w-4 h-4"/>
                      {/if}
                      {#if isSessionMuted(layoutId, sessionId)}
                        <VolumeX class="w-4 h-4"/>
                      {/if}
                    </div>
                  </div>
                </ContextMenu.SubTrigger>
                <ContextMenu.SubContent class="w-48">
                  <ContextMenu.Item
                    onclick={() => isSessionMuted(layoutId, sessionId) ? unmuteSession(layoutId,sessionId) : muteSession(layoutId, sessionId)}>
                    <div class="flex items-center gap-2">
                      {#if isSessionMuted(layoutId, sessionId)}
                        <Volume2 class="h-4"/>
                        Unmute
                      {:else}
                        <VolumeOff class="h-4"/>
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
    class="flex-1 h-full w-full"
    style="-webkit-app-region: drag;"
  ></div>

  <PinnedActions onHasPinnedActionsChange={(hasPinnedActions) => hasVisibleActionPins = hasPinnedActions}/>

  {#if hasVisibleActionPins}
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
          oncontextmenu={handleKeybindToggleButtonContextMenu}
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
