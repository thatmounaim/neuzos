<script lang="ts">
  import {Button, buttonVariants} from "$lib/components/ui/button";
  import {
    Settings2,
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
    RefreshCw,
    Fullscreen
  } from '@lucide/svelte'
  import {getContext} from "svelte";
  import type {NeuzosBridge} from "$lib/core";
  import type {MainWindowState, NeuzSession} from "$lib/types";
  import * as Dialog from '$lib/components/ui/dialog'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import * as Tabs from '$lib/components/ui/tabs'
  import * as Card from '$lib/components/ui/card'

  import {cn} from "$lib/utils";
  import {Separator} from "$lib/components/ui/separator";
  import type {IpcRenderer} from "@electron-toolkit/preload";
  import PinnedActions from "./PinnedActions.svelte";
  import WidgetsButton from "./WidgetsButton.svelte";
  import ThemeToggle from "./ThemeToggle.svelte";

  const neuzosBridge = getContext<NeuzosBridge>('neuzosBridge');
  const mainWindowState = getContext<MainWindowState>('mainWindowState');
  const electronApi = getContext<IpcRenderer>('electronApi');

  const openSettings = () => {
    neuzosBridge.settingsWindow.open()
  }


  const switchToHome = () => {
    neuzosBridge.layouts.switch('home')
  }

  const addLayout = (layoutId: string) => {
    neuzosBridge.layouts.add(layoutId)
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
    return mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.isMuted()
  }

  const muteAllSessions = (layoutId: string) => {
    for (const sessionId in mainWindowState.sessionsLayoutsRef) {
      mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.setAudioMuted(true)
    }
  }

  const unmuteAllSessions = (layoutId: string) => {
    for (const sessionId in mainWindowState.sessionsLayoutsRef) {
      mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.setAudioMuted(false)
    }
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
    console.log(mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.isMuted())
    mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.setAudioMuted(true)
    console.log(mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.isMuted())
  }

  const unmuteSession = (layoutId: string, sessionId: string) => {
    mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]?.setAudioMuted(false)
  }

  const reloadConfing = () => {
    neuzosBridge.mainWindow.reloadConfig()
  }


  function getIconPath(session: NeuzSession): string {
    return `icons/${session.icon.slug}.png`;
  }


  function launchSession(sessionId: string, mode: 'session' | 'focus' | 'focus_fullscreen') {
    electronApi.send("session_launcher.launch_session", sessionId, mode);
  }

</script>
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
  <Button size="icon-xs" variant="outline" onclick={openSettings} class="cursor-pointer">
    <Settings2 class="size-3.5"/>
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
        >Select a layout to use or a session to pop in a window
        </Dialog.Description
        >
      </Dialog.Header>
      <div class="flex gap-2 flex-col w-full min-h-[33vh]">
        <Tabs.Root value="layouts" class="">
          <Tabs.List class="grid w-full grid-cols-2">
            <Tabs.Trigger value="layouts">Layouts</Tabs.Trigger>
            <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="layouts">
            <div class="flex gap-2 flex-col h-full max-h-[33vh] overflow-y-auto px-6">
              {#each mainWindowState.layouts as layTab (layTab.id)}
                {@const disabledAdd = mainWindowState.tabs.layoutsIds.includes(layTab.id)}
                <Button variant="outline" size="sm" class="flex gap-2 justify-start items-center"
                        disabled={disabledAdd}
                        onclick={() => addLayout(layTab.id)}>
                  <img class="w-6 h-6" src="icons/{layTab.icon.slug}.png" alt=""/> {layTab.label}
                </Button>
              {/each}
            </div>
          </Tabs.Content>
          <Tabs.Content value="sessions">
            <div class="grid gap-4 grid-cols-1 w-full h-full max-h-[33vh] overflow-y-auto px-6">
              {#each mainWindowState.sessions as sessionTab (sessionTab.id)}
                {@const isBrowser = sessionTab.partitionOverwrite === 'browser'}
                {#if !isBrowser}
                  <Card.Root class="gap-2 pt-2 pb-3">
                    <Card.Header class="py-0">
                      <div class="flex items-center gap-2">
                        <img src={getIconPath(sessionTab)} alt={sessionTab.label} class="w-4 h-4"/>
                        <span>{sessionTab.label}</span>
                      </div>
                    </Card.Header>
                    <Card.Content class="py-0">
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
                {/if}
              {/each}

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
      <span class="text-center opacity-60">No active layouts</span>
    {/if}
    {#each mainWindowState.tabs.layoutOrder as layoutId (layoutId)}
      {@const layTab = mainWindowState.layouts.find(l => l.id === layoutId)}
      {@const disabledSwitch = mainWindowState.tabs.activeLayoutId === layoutId}

      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Button variant="outline" size="xs" class="text-center" disabled={disabledSwitch}
                  onclick={() => switchToLayout(layoutId)}>
            <img src="icons/{layTab.icon.slug}.png" alt={layTab.icon.slug} class="w-4 h-4"/>
            {layTab.label}
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
                </ContextMenu.SubContent>
              </ContextMenu.Sub>
            {/each}
          {/each}
        </ContextMenu.Content>
      </ContextMenu.Root>
    {/each}
  </div>
  <div
    class="flex-1 cursor-grab active:cursor-grabbing h-full w-full"
    style="-webkit-app-region: drag;"
  ></div>

  <PinnedActions />
  <Separator orientation="vertical" class="h-4"/>

  {#if mainWindowState.config.changed}
    <Button size="icon-xs" variant="outline" onclick={reloadConfing} class="cursor-pointer">
      <RefreshCw class="size-3.5"/>
    </Button>
  {/if}

  <WidgetsButton />
  <ThemeToggle />

  <Separator orientation="vertical" class="h-4"/>
  <Button size="icon-xs" variant="outline" onclick={() => {
        neuzosBridge.mainWindow.fullscreenToggle()
      }} class="cursor-pointer">
    <Fullscreen class="size-3.5"/>
  </Button>
  <Separator orientation="vertical" class="h-4"/>
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
