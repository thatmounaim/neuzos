<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {onMount} from "svelte";
  import {initElectronApi, neuzosBridge} from "$lib/core";
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import type {NeuzSession, NeuzSessionGroup} from "$lib/types";
  import {ChevronDown, ChevronUp, Minus, Settings2, X} from "@lucide/svelte";
  import {Separator} from "$lib/components/ui/separator";
  import {setElectronContext, getElectronContext} from "$lib/contexts/electronContext";
  import {setNeuzosBridgeContext} from "$lib/contexts/neuzosBridgeContext";

  let isLoading = $state(true);
  let sessions: NeuzSession[] = $state([]);
  let groups: NeuzSessionGroup[] = $state([]);
  let collapsedGroupIds: Record<string, boolean> = $state({});
  const collapsedGroupsStorageKey = 'neuzos.sessionLauncher.collapsedGroups';
  const ungroupedGroupId = 'ungrouped';

  setElectronContext(window.electron.ipcRenderer);
  setNeuzosBridgeContext(neuzosBridge);
  initElectronApi(window.electron.ipcRenderer);

  const electronApi = getElectronContext();

  async function loadData() {
    sessions = await electronApi.invoke("session_launcher.get_sessions");
    groups = await electronApi.invoke("session_launcher.get_groups");
  }

  function loadCollapsedGroups() {
    try {
      const stored = localStorage.getItem(collapsedGroupsStorageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        collapsedGroupIds = parsed;
      }
    } catch {
      collapsedGroupIds = {};
    }
  }

  function saveCollapsedGroups() {
    collapsedGroupIds = sanitizeCollapsedGroups(collapsedGroupIds);
    localStorage.setItem(collapsedGroupsStorageKey, JSON.stringify(collapsedGroupIds));
  }

  function sanitizeCollapsedGroups(collapsedGroups: Record<string, boolean>): Record<string, boolean> {
    const validGroupIds = new Set(groups.filter((group) => !isUngroupedGroup(group)).map((group) => group.id));
    validGroupIds.add(ungroupedGroupId);
    return Object.fromEntries(
      Object.entries(collapsedGroups).filter(([groupId]) => validGroupIds.has(groupId))
    );
  }

  onMount(() => {
    let disposed = false;
    loadCollapsedGroups();

    const refreshData = async () => {
      if (disposed) {
        return;
      }
      await loadData();
      collapsedGroupIds = sanitizeCollapsedGroups(collapsedGroupIds);
      saveCollapsedGroups();
    };

    const initialize = async () => {
      await loadData();
      if (disposed) {
        return;
      }
      collapsedGroupIds = sanitizeCollapsedGroups(collapsedGroupIds);
      saveCollapsedGroups();
      setTimeout(() => {
        if (!disposed) {
          isLoading = false;
        }
      }, 100);
    };

    void initialize();
    electronApi.on("event.config_changed", refreshData);

    return () => {
      disposed = true;
      electronApi.removeListener("event.config_changed", refreshData);
    };
  });

  function launchSession(sessionId: string, mode: 'session' | 'focus' | 'focus_fullscreen') {
    electronApi.send("session_launcher.launch_session", sessionId, mode);
  }

  function closeWindow() {
    electronApi.send("session_launcher.close");
  }

  function minimizeWindow() {
    electronApi.send("session_launcher.minimize");
  }

  function getIconPath(session: NeuzSession): string {
    return `icons/${session.icon.slug}.png`;
  }

  function isGroupCollapsed(groupId: string): boolean {
    return collapsedGroupIds[groupId] ?? false;
  }

  function toggleGroupCollapsed(groupId: string) {
    collapsedGroupIds[groupId] = !isGroupCollapsed(groupId);
    saveCollapsedGroups();
  }

  function isUngroupedGroup(group: NeuzSessionGroup): boolean {
    return group.id === ungroupedGroupId || group.type === 'ungrouped';
  }

  function getGroupSessions(group: NeuzSessionGroup): NeuzSession[] {
    if (isUngroupedGroup(group)) {
      return [];
    }
    const sessionMap = new Map(sessions.map((session) => [session.id, session]));
    const sessionIds = Array.isArray(group.sessionIds) ? group.sessionIds : [];
    return sessionIds
      .map((sessionId) => sessionMap.get(sessionId))
      .filter((session): session is NeuzSession => session !== undefined);
  }

  function getUngroupedSessions(): NeuzSession[] {
    const groupedSessionIds = new Set(groups.flatMap((group) => isUngroupedGroup(group) ? [] : (Array.isArray(group.sessionIds) ? group.sessionIds : [])));
    return sessions.filter((session) => !groupedSessionIds.has(session.id));
  }

  const ungroupedSessions = $derived.by(() => getUngroupedSessions())

  const orderedSessionSections = $derived.by(() => {
    return groups.some((group) => isUngroupedGroup(group))
      ? groups
      : [...groups, { id: ungroupedGroupId, type: 'ungrouped' as const }];
  })

  const formatSessionCount = (count: number) => `${count} ${count === 1 ? 'Session' : 'Sessions'}`

  const openSettings = () => {
    neuzosBridge.settingsWindow.open();
  }
</script>

{#snippet sessionTile(session)}
  <Card.Root class="p-3 gap-2">
    <Card.Header class="p-0">
      <Card.Title class="text-base flex items-center gap-2">
        <img src={getIconPath(session)} alt={session.label} class="w-6 h-6"/>
        <span>{session.label}</span>
        <span class="text-xs font-normal text-muted-foreground">({session.id})</span>
      </Card.Title>
    </Card.Header>
    <Card.Content class="p-0">
      <div class="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          class="text-xs h-7 flex-1"
          onclick={() => launchSession(session.id, 'session')}
        >
          Normal
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-xs h-7 flex-1"
          onclick={() => launchSession(session.id, 'focus')}
        >
          Focus
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-xs h-7 flex-1"
          onclick={() => launchSession(session.id, 'focus_fullscreen')}
        >
          Focus Fullscreen
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
{/snippet}

<ModeWatcher/>

{#if isLoading}
  <div class="w-screen h-screen flex items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-4">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p class="text-muted-foreground">Loading Sessions...</p>
    </div>
  </div>
{:else}
  <div class="w-screen h-screen flex flex-col bg-background text-foreground">
    <!-- Title Bar -->
    <div class="flex items-center justify-between px-2 bg-card border-b border-border min-h-8 select-none">
      <div
        class="flex-1 cursor-grab active:cursor-grabbing h-full w-full flex items-center gap-2 select-none"
        style="-webkit-app-region: drag;"
      >
        <div class="flex items-center gap-2">
          <img src="neuzos_pang.png" alt="NeuZOS" class="w-4 h-4"/>
          <span class="text-sm font-semibold">Session Launcher</span>
        </div>

      </div>
      <div class="flex gap-1">
        <Button size="icon-xs" variant="outline" onclick={openSettings} class="cursor-pointer">
          <Settings2 class="size-3.5"/>
        </Button>
        <Separator orientation="vertical" class="h-4"/>

        <Button
          size="icon-xs"
          variant="outline"
          onclick={minimizeWindow}
          class="cursor-pointer"
        >
          <Minus class="size-3.5"/>
        </Button>
        <Button
          variant="outline"
          onclick={closeWindow}
          size="icon-xs"
          class="cursor-pointer"
        >
          <X class="size-3.5"/>
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-3">
      {#if sessions.length === 0}
        <div class="flex items-center justify-center h-full">
          <p class="text-muted-foreground text-sm">No sessions available</p>
        </div>
      {:else}
        <div class="flex flex-col gap-3">
          {#each orderedSessionSections as group (group.id)}
            {@const groupSessions = isUngroupedGroup(group) ? ungroupedSessions : getGroupSessions(group)}
            {#if !isUngroupedGroup(group) || groupSessions.length > 0}
              <Card.Root class="overflow-hidden gap-0 border-border/70">
                <button
                  type="button"
                  class="flex h-7 w-full items-center justify-between gap-3 px-2.5 py-0 text-left transition-opacity hover:opacity-80"
                  onclick={() => toggleGroupCollapsed(group.id)}
                >
                  <div class="flex min-w-0 items-center gap-1.5">
                    {#if isGroupCollapsed(group.id)}
                      <ChevronDown class="size-4 shrink-0" />
                    {:else}
                      <ChevronUp class="size-4 shrink-0" />
                    {/if}
                    <span class="truncate font-semibold">{isUngroupedGroup(group) ? 'Sessions' : (group.label ?? 'New Group')}</span>
                  </div>
                  <span class="inline-flex h-6 shrink-0 items-center text-xs leading-none text-muted-foreground">{formatSessionCount(groupSessions.length)}</span>
                </button>

                {#if !isGroupCollapsed(group.id)}
                  <Card.Content class="p-3 pt-1">
                    {#if groupSessions.length === 0}
                      <p class="text-sm text-muted-foreground">No Sessions in this Group.</p>
                    {:else}
                      <div class="grid gap-2">
                        {#each groupSessions as session (session.id)}
                          {@render sessionTile(session)}
                        {/each}
                      </div>
                    {/if}
                  </Card.Content>
                {/if}
              </Card.Root>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
