<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {Toaster} from 'svelte-sonner';
  import MainBar from "./components/MainWindow/MainBar.svelte";
  import {onDestroy, onMount, setContext} from "svelte";
  import {neuzosBridge, initElectronApi} from "$lib/core";
  import type {MainWindowState, NeuzConfigPatch} from "$lib/types";
  import MainSectionsContainer from "./components/MainWindow/MainSectionsContainer.svelte";
  import SharedEvents from "./components/Shared/SharedEvents.svelte";
  import {createWidgetsContext, setWidgetsContext} from '$lib/contexts/widgetsContext.svelte';
  import {createCooldownsContext, setCooldownsContext} from '$lib/contexts/cooldownsContext';
  import {setElectronContext} from '$lib/contexts/electronContext';
  import {setNeuzosBridgeContext} from '$lib/contexts/neuzosBridgeContext';
  import {createFlyffRegistryContext, setFlyffRegistryContext} from '$lib/contexts/flyffRegistryContext.svelte';
  import {createQuestPanelContext, setQuestPanelContext} from '$lib/contexts/questPanelContext.svelte';
  import {createTodoContext, setTodoContext} from '$lib/contexts/todoContext.svelte';
  import {createUIActionContext, setUIActionContext} from '$lib/contexts/uiActionContext.svelte';
  import {flyffRegistry} from '$lib/core';
  import {Button} from "$lib/components/ui/button";
  import {Minimize} from '@lucide/svelte';


  import {cleanupActionPadStorage, cleanupActionPinsStorage, readSettingsLayoutAutoSave} from '$lib/localStorageStores';
  addEventListener('error', (event) => {
    console.error('[window.error]', event.error?.stack ?? event.message);
  });

  addEventListener('unhandledrejection', (event) => {
    console.error('[window.unhandledrejection]', event.reason?.stack ?? event.reason);
  });


  let isLoading = $state(true);
  let isFullscreen = $state(false);

  setElectronContext(window.electron.ipcRenderer);
  setNeuzosBridgeContext(neuzosBridge);

  // Create and set the widgets context at the app level
  const widgetsContext = createWidgetsContext();
  setWidgetsContext(widgetsContext);

  // Create and set the cooldowns context at the app level
  const cooldownsContext = createCooldownsContext();
  setCooldownsContext(cooldownsContext);

  // Create and set the flyff registry context
  const flyffRegistryContext = createFlyffRegistryContext();
  setFlyffRegistryContext(flyffRegistryContext);

  // Create and set the quest panel context
  const questPanelContext = createQuestPanelContext();
  setQuestPanelContext(questPanelContext);

  // Create and set the todo checklist context
  const todoContext = createTodoContext();
  setTodoContext(todoContext);

  // Create and set the UI action dispatcher context
  const uiActionContext = createUIActionContext();
  setUIActionContext(uiActionContext);

  initElectronApi(window.electron.ipcRenderer)

  function cleanupSessionActionLocalStorage(sessionActions: Array<{sessionId: string; actions?: Array<{id?: string}>}> = []) {
    cleanupActionPadStorage(sessionActions);
    cleanupActionPinsStorage(sessionActions);
  }

  async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string, fallback: T): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn(`${label} timed out after ${timeoutMs}ms, continuing with fallback state`);
            resolve(fallback);
          }, timeoutMs);
        }),
      ]);
    } catch (error) {
      console.error(`${label} failed:`, error);
      return fallback;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  let mainWindowState: MainWindowState = $state({
    config: {
      window: {
        main: {
          width: 1200,
          height: 800,
          zoom: 1.0,
          maximized: true
        },
        settings: {
          width: 1200,
          height: 800,
          zoom: 1.0,
          maximized: false
        },
        session: {
          width: 1024,
          height: 768,
          zoom: 1.0,
          maximized: true
        }
      },
      sessions: [],
      layouts: [],
      chromium: {
        commandLineSwitches: [],
      },
      defaultLayouts: [],
      keyBindProfiles: [],
      activeKeyBindProfileId: null,
      keyBinds: [],
      syncReceiverSessionId: null,
      sessionActions: [],
      defaultLaunchMode: 'normal',
      userAgent: undefined,
      autoSaveSettings: false,
      titleBarButtons: {
        darkModeToggle: false,
        fullscreenToggle: true,
        keybindToggle: true
      },
      fullscreen: {
        hideTitleBarInMainWindow: true,
        hideTitleBarInSessionLayouts: true
      }
    },
    sessions: [],
    layouts: [],
    tabs: {
      layoutOrder: [],
      layoutsIds: [],
      visible: true,
      activeLayoutId: null,
      previousLayoutId: null,
    },
    sessionsLayoutsRef: {},
    doCalculationUpdatesRng: 0
  })

  const electronApi = window.electron.ipcRenderer;
  const cleanupListeners: Array<() => void> = []

  const listen = (channel: string, listener: (...args: any[]) => void) => {
    electronApi.on(channel, listener)
    cleanupListeners.push(() => electronApi.removeListener(channel, listener))
  }

  onDestroy(() => {
    cleanupListeners.forEach((cleanup) => cleanup())
  })

  listen('event.layout_add', (_, layoutId: string) => {
    console.log("layout_add", layoutId)
    if (!mainWindowState.tabs.layoutsIds.includes(layoutId)) {
      mainWindowState.tabs.layoutsIds = [...mainWindowState.tabs.layoutsIds, layoutId]
    }
    if (!mainWindowState.tabs.layoutOrder.includes(layoutId)) {
      mainWindowState.tabs.layoutOrder = [...mainWindowState.tabs.layoutOrder, layoutId]
    }

    if (
      readSettingsLayoutAutoSave() &&
      mainWindowState.config.layouts.some((layout) => layout.id === layoutId) &&
      !mainWindowState.config.defaultLayouts.includes(layoutId)
    ) {
      mainWindowState.config.defaultLayouts = [...mainWindowState.config.defaultLayouts, layoutId]
      void neuzosBridge.config.saveSilent(mainWindowState.config)
      neuzosBridge.config.notifyPatch({defaultLayouts: mainWindowState.config.defaultLayouts})
    }
  })

  listen('event.layout_switch', (_, layoutId: string) => {
    console.log("layout_switch", layoutId)
    mainWindowState.tabs.previousLayoutId = mainWindowState.tabs.activeLayoutId
    mainWindowState.tabs.activeLayoutId = layoutId
  })

  const closeLayout = (layoutId: string, mirrorDefaultLayouts = false) => {
    mainWindowState.tabs.layoutsIds = mainWindowState.tabs.layoutsIds.filter(id => id !== layoutId)
    if (mainWindowState.tabs.activeLayoutId === layoutId) {
      mainWindowState.tabs.activeLayoutId = mainWindowState.tabs.previousLayoutId ?? null
    }
    mainWindowState.tabs.layoutOrder = mainWindowState.tabs.layoutOrder.filter(id => id !== layoutId)

    if (mirrorDefaultLayouts && readSettingsLayoutAutoSave() && mainWindowState.config.defaultLayouts.includes(layoutId)) {
      mainWindowState.config.defaultLayouts = mainWindowState.config.defaultLayouts.filter((defaultLayoutId) => defaultLayoutId !== layoutId)
      void neuzosBridge.config.saveSilent(mainWindowState.config)
      neuzosBridge.config.notifyPatch({defaultLayouts: mainWindowState.config.defaultLayouts})
    }
  }

  listen('event.layout_close_all', (_) => {
    mainWindowState.tabs.previousLayoutId = null
    mainWindowState.tabs.activeLayoutId = 'home'
    mainWindowState.tabs.layoutsIds.forEach(layoutId => {
      closeLayout(layoutId)
    })

  })


  listen('event.layout_close', (_, layoutId: string) => {
    console.log("layout_close", layoutId)
    closeLayout(layoutId, true)
  })

  listen('event.layout_swap', (_) => {
    const activeLayoutId = mainWindowState.tabs.activeLayoutId
    const previousLayoutId = mainWindowState.tabs.previousLayoutId
    if (previousLayoutId) {
      const newLayoutId = previousLayoutId
      mainWindowState.tabs.previousLayoutId = activeLayoutId
      mainWindowState.tabs.activeLayoutId = newLayoutId
    }
  })

  const cycleLayout = (direction: 1 | -1) => {
    const layoutOrder = mainWindowState.tabs.layoutOrder
    if (layoutOrder.length <= 1) {
      return
    }

    const activeLayoutId = mainWindowState.tabs.activeLayoutId
    const currentIndex = layoutOrder.findIndex(layoutId => layoutId === activeLayoutId)
    const nextIndex = currentIndex === -1
      ? 0
      : (currentIndex + direction + layoutOrder.length) % layoutOrder.length
    const nextLayoutId = layoutOrder[nextIndex]

    mainWindowState.tabs.previousLayoutId = activeLayoutId
    mainWindowState.tabs.activeLayoutId = nextLayoutId
  }

  listen('event.layout_cycle_forward', (_) => {
    cycleLayout(1)
  })

  listen('event.layout_cycle_backward', (_) => {
    cycleLayout(-1)
  })

  listen('event.stop_session', (_, sessionId: string) => {
    console.log("stop_session", sessionId)
    const layouts = Object.values(mainWindowState.sessionsLayoutsRef[sessionId]?.layouts ?? {}) as Array<{ stopClient?: (onStopped?: () => void) => void }>
    const stopTargets = layouts.filter((ref) => typeof ref?.stopClient === 'function')
    if (stopTargets.length === 0) {
      window.electron.ipcRenderer.send('event.stop_session_ack', sessionId)
      return
    }

    let pendingStops = stopTargets.length
    let ackSent = false
    const onStopped = () => {
      if (ackSent) return
      pendingStops -= 1
      if (pendingStops <= 0) {
        ackSent = true
        window.electron.ipcRenderer.send('event.stop_session_ack', sessionId)
      }
    }

    stopTargets.forEach((neuzClient) => {
      try {
        neuzClient.stopClient?.(onStopped)
      } catch (error) {
        console.warn('Failed to stop session layout client during delete', sessionId, error)
        onStopped()
      }
    })
  })

  listen('event.start_session', (_, sessionId: string, layoutId: string) => {
    // Stop all layout clients locally WITHOUT sending session.stop IPC to main.
    // Previously called neuzosBridge.sessions.stop() here, which immediately removed
    // the session from runningSessionIds in the main process — making getRunningIds()
    // always return empty and the running-session delete warning never appear. (BUG-007 fix)
    Object.keys(mainWindowState.sessionsLayoutsRef[sessionId]?.layouts ?? {}).forEach(lid => {
      mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[lid]?.stopClient()
    })
    setTimeout(() => {
      mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId].startClient()
    }, 100)
  })

  listen('event.send_session_action', (_, sessionId: string, actionId: string) => {
    console.log("send_session_action", sessionId, actionId)

    // Check if action is ready (not casting or on cooldown)
    if (!cooldownsContext.canUseAction(sessionId, actionId)) {
      console.log("Action on cooldown, ignoring")
      return
    }

    // Find the session actions for this session
    const sessionActionsData = mainWindowState.config.sessionActions?.find(sa => sa.sessionId === sessionId)
    if (!sessionActionsData) {
      console.warn("No session actions found for session:", sessionId)
      return
    }

    // Find the specific action
    const action = sessionActionsData.actions.find(a => a.id === actionId)
    if (!action) {
      console.warn("Action not found:", actionId, "in session:", sessionId)
      return
    }

    console.log("Executing action:", action.label, "for session:", sessionId)

    // Start cast FIRST to mark action as "in use" and prevent double-triggering
    if (action.castTime > 0) {
      cooldownsContext.startCast(sessionId, actionId, action.castTime)
    }

    // Send the key immediately to buffer/queue the action in-game
    sendActionKeyToSession(sessionId, action)

    // After cast time, start cooldown
    if (action.castTime > 0) {
      setTimeout(() => {
        if (action.cooldown > 0) {
          cooldownsContext.startCooldown(sessionId, actionId, action.cooldown)

          // Trigger cooldowns for all actions in the same category
          if (action.cooldownCategory && action.cooldownCategory.trim() !== '') {
            triggerCategoryCooldowns(sessionId, action.cooldownCategory, action.cooldown, actionId)
          }
        }
      }, action.castTime * 1000)
    } else {
      // No cast time, start cooldown immediately
      if (action.cooldown > 0) {
        cooldownsContext.startCooldown(sessionId, actionId, action.cooldown)

        // Trigger cooldowns for all actions in the same category
        if (action.cooldownCategory && action.cooldownCategory.trim() !== '') {
          triggerCategoryCooldowns(sessionId, action.cooldownCategory, action.cooldown, actionId)
        }
      }
    }
  })

  function triggerCategoryCooldowns(sessionId: string, category: string, cooldown: number, excludeActionId: string) {
    // Find the session actions for this session
    const sessionActionsData = mainWindowState.config.sessionActions?.find(sa => sa.sessionId === sessionId)
    if (!sessionActionsData) return

    // Find all actions with the same category (excluding the one that was just triggered)
    const categoryActions = sessionActionsData.actions.filter(
      a => a.id !== excludeActionId &&
        a.cooldownCategory &&
        a.cooldownCategory.trim() === category.trim()
    )

    // Start cooldown for each action in the category
    categoryActions.forEach(categoryAction => {
      cooldownsContext.startCooldown(sessionId, categoryAction.id, cooldown)
    })
  }

  function sendActionKeyToSession(sessionId: string, action: any) {
    // Send the action key to all neuz clients for this session across all layouts
    const sessionLayouts = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts
    if (sessionLayouts) {
      Object.keys(sessionLayouts).forEach(layoutId => {
        const neuzClient = sessionLayouts[layoutId] as any
        if (neuzClient && neuzClient.sendKey && action.ingameKey) {
          console.log("Sending key", action.ingameKey, "to session", sessionId, "in layout", layoutId)
          // Send the ingame key to the neuz client
          neuzClient.sendKey(action.ingameKey)
        }
      })
    }
  }

  function sendKeyToReceiverSession(sessionId: string, ingameKey: string) {
    const sessionLayouts = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts
    if (!sessionLayouts) return

    const activeClient = Object.values(sessionLayouts).find((client: any) => {
      return client?.isStarted?.() && client?.sendKey
    }) as any

    if (!activeClient) return

    activeClient.sendKey(ingameKey)
  }

  listen('event.send_to_receiver', (_, ingameKey: string) => {
    const receiverId = mainWindowState.config.syncReceiverSessionId
    if (!receiverId) return
    sendKeyToReceiverSession(receiverId, ingameKey)
  })

  listen('event.sync_receiver_changed', (_, sessionId: string | null) => {
    mainWindowState.config.syncReceiverSessionId = sessionId
  })

  const applySessionZoomPreview = (sessionId: string, zoom: number) => {
    const layouts = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts
    if (layouts) {
      Object.values(layouts).forEach((ref: any) => ref.setZoom?.(zoom))
    }
  }

  const syncRuntimeStateFromConfig = (newConfig: any, defaultLayoutsChanged: boolean) => {
    const nextSessions = JSON.parse(JSON.stringify(newConfig.sessions ?? []))
    const nextLayouts = JSON.parse(JSON.stringify(newConfig.layouts ?? []))
    const validSessionIds = new Set(nextSessions.map((session: any) => session.id))
    const validLayoutIds = new Set(nextLayouts.map((layout: any) => layout.id))
    const nextDefaultLayouts = (newConfig.defaultLayouts ?? []).filter((layoutId: string) => validLayoutIds.has(layoutId))
    const nextOpenLayoutIds = defaultLayoutsChanged
      ? nextDefaultLayouts
      : mainWindowState.tabs.layoutOrder.filter((layoutId) => validLayoutIds.has(layoutId))

    for (const [sessionId, sessionRef] of Object.entries(mainWindowState.sessionsLayoutsRef) as [string, any][]) {
      if (!validSessionIds.has(sessionId)) {
        Object.values(sessionRef.layouts ?? {}).forEach((client: any) => client?.stopClient?.())
        delete mainWindowState.sessionsLayoutsRef[sessionId]
        continue
      }

      for (const layoutId of Object.keys(sessionRef.layouts ?? {})) {
        if (!validLayoutIds.has(layoutId) || !nextOpenLayoutIds.includes(layoutId)) {
          sessionRef.layouts[layoutId]?.stopClient?.()
          delete sessionRef.layouts[layoutId]
        }
      }
    }

    mainWindowState.sessions = nextSessions
    mainWindowState.layouts = nextLayouts
    mainWindowState.tabs.layoutsIds = JSON.parse(JSON.stringify(nextOpenLayoutIds))
    mainWindowState.tabs.layoutOrder = JSON.parse(JSON.stringify(nextOpenLayoutIds))

    if (
      mainWindowState.tabs.activeLayoutId !== 'home' &&
      !nextOpenLayoutIds.includes(mainWindowState.tabs.activeLayoutId ?? '')
    ) {
      mainWindowState.tabs.activeLayoutId = 'home'
    }

    if (
      mainWindowState.tabs.previousLayoutId !== null &&
      !nextOpenLayoutIds.includes(mainWindowState.tabs.previousLayoutId)
    ) {
      mainWindowState.tabs.previousLayoutId = null
    }
  }

  listen('event.config_patch', (_, patch: NeuzConfigPatch) => {
    const sessionsChanged = patch.sessions !== undefined && JSON.stringify(mainWindowState.config.sessions ?? []) !== JSON.stringify(patch.sessions)
    const layoutsChanged = patch.layouts !== undefined && JSON.stringify(mainWindowState.config.layouts ?? []) !== JSON.stringify(patch.layouts)
    const defaultLayoutsChanged = patch.defaultLayouts !== undefined && JSON.stringify(mainWindowState.config.defaultLayouts ?? []) !== JSON.stringify(patch.defaultLayouts)

    const patchedConfig = {
      ...mainWindowState.config,
      ...(patch.sessions !== undefined ? {sessions: patch.sessions} : {}),
      ...(patch.layouts !== undefined ? {layouts: patch.layouts} : {}),
      ...(patch.defaultLayouts !== undefined ? {defaultLayouts: patch.defaultLayouts} : {})
    }

    if (patch.sessions !== undefined) {
      mainWindowState.config.sessions = patch.sessions
    }
    if (patch.layouts !== undefined) {
      mainWindowState.config.layouts = patch.layouts
    }
    if (patch.defaultLayouts !== undefined) {
      mainWindowState.config.defaultLayouts = patch.defaultLayouts
    }

    if (sessionsChanged || layoutsChanged || defaultLayoutsChanged) {
      syncRuntimeStateFromConfig(patchedConfig, defaultLayoutsChanged)
    }
  })

  listen('event.config_changed', (_, cfg: string) => {
    const newConfig = JSON.parse(cfg)
    const sessionsChanged = JSON.stringify(mainWindowState.config.sessions ?? []) !== JSON.stringify(newConfig.sessions ?? [])
    const sessionGroupsChanged = JSON.stringify(mainWindowState.config.sessionGroups ?? []) !== JSON.stringify(newConfig.sessionGroups ?? [])
    const layoutsChanged = JSON.stringify(mainWindowState.config.layouts ?? []) !== JSON.stringify(newConfig.layouts ?? [])
    const defaultLayoutsChanged = JSON.stringify(mainWindowState.config.defaultLayouts ?? []) !== JSON.stringify(newConfig.defaultLayouts ?? [])
    const runtimeRelevantConfigChanged = sessionsChanged || sessionGroupsChanged || layoutsChanged || defaultLayoutsChanged

    mainWindowState.config.sessions = newConfig.sessions
    mainWindowState.config.sessionGroups = newConfig.sessionGroups ?? []
    mainWindowState.config.layouts = newConfig.layouts
    mainWindowState.config.defaultLayouts = newConfig.defaultLayouts
    mainWindowState.config.chromium.commandLineSwitches = newConfig.chromium.commandLineSwitches
    mainWindowState.config.keyBinds = newConfig.keyBinds
    mainWindowState.config.keyBindProfiles = newConfig.keyBindProfiles || []
    mainWindowState.config.activeKeyBindProfileId = newConfig.activeKeyBindProfileId ?? null
    mainWindowState.config.syncReceiverSessionId = newConfig.syncReceiverSessionId ?? null
    mainWindowState.config.sessionActions = newConfig.sessionActions || []
    cleanupSessionActionLocalStorage(mainWindowState.config.sessionActions)
    mainWindowState.config.defaultLaunchMode = newConfig.defaultLaunchMode
    mainWindowState.config.userAgent = newConfig.userAgent || undefined
    mainWindowState.config.titleBarButtons = newConfig.titleBarButtons
    mainWindowState.config.window = newConfig.window
    mainWindowState.config.fullscreen = newConfig.fullscreen || {
      hideTitleBarInMainWindow: true,
      hideTitleBarInSessionLayouts: true
    }
    if (runtimeRelevantConfigChanged) {
      syncRuntimeStateFromConfig(newConfig, defaultLayoutsChanged)
    }
    // Imperatively push new zoom levels to all running webviews.
    // The reactive $effect in NeuzClient is unreliable for cross-component deep mutations.
    Object.entries(mainWindowState.sessionsLayoutsRef).forEach(([sessionId, sessionRef]: [string, any]) => {
      const zoom = mainWindowState.config.sessions?.find((session) => session.id === sessionId)?.zoom ?? 1.0
      applySessionZoomPreview(sessionId, zoom)
    })
  })

  listen('event.session_zoom_preview', (_, sessionId: string, zoom: number) => {
    applySessionZoomPreview(sessionId, zoom)
  })

  addEventListener('resize', () => {
    mainWindowState.doCalculationUpdatesRng = Math.random()
  })

  // Listen for fullscreen state changes
  listen('event.fullscreen_changed', (_, fullscreen: boolean) => {
    isFullscreen = fullscreen
  })

  setContext('mainWindowState', mainWindowState)

  onMount(() => {
    let shortcutsEnabled = true;

    const onUiActionFired = (_: any, payload: { actionId: string }) => {
      uiActionContext.dispatch(payload.actionId);
    };

    const dispatchRendererBind = (bind: { key: string; event: string; args?: string[] }) => {
      if (!shortcutsEnabled && bind.event !== 'toggle_keybinds') return;
      neuzosBridge.keybinds.dispatch(bind);
    };

    const getAllKeybinds = () => {
      const activeProfile = mainWindowState.config.keyBindProfiles?.find(
        (profile) => profile.id === mainWindowState.config.activeKeyBindProfileId
      );

      return [...(mainWindowState.config.keyBinds ?? []), ...(activeProfile?.keybinds ?? [])];
    };

    const onShortcutsStateChanged = (_: any, enabled: boolean) => {
      shortcutsEnabled = enabled;
    };

    const onWebviewMouseBind = (event: Event) => {
      const key = String((event as CustomEvent).detail?.key ?? '').toLowerCase();
      if (!key) return;

      const bind = getAllKeybinds().find(candidate => candidate.key?.toLowerCase() === key);
      if (!bind) return;

      dispatchRendererBind(bind);
    };

    const refreshGamepadPolling = () => {
      const gamepadBinds = getAllKeybinds().filter(bind => bind.key.startsWith('Gamepad'));

      uiActionContext.startGamepadPoll(gamepadBinds, dispatchRendererBind);
    };

    const refreshMouseListener = () => {
      const mouseBinds = getAllKeybinds().filter(bind => {
        const k = bind.key.toLowerCase();
        return k === 'middle' || k === 'mouse4' || k === 'mouse5';
      });

      uiActionContext.startMouseListener(mouseBinds, dispatchRendererBind);
    };

    electronApi.on('event.ui_action_fired', onUiActionFired);
    electronApi.on('event.config_changed', refreshGamepadPolling);
    electronApi.on('event.config_changed', refreshMouseListener);
    electronApi.on('event.active_keybind_profile_changed', refreshGamepadPolling);
    electronApi.on('event.active_keybind_profile_changed', refreshMouseListener);
    electronApi.on('event.shortcuts_state_changed', onShortcutsStateChanged);
    document.addEventListener('neuz:mousebind', onWebviewMouseBind);
    void electronApi.invoke('shortcuts.get_state').then((state) => {
      shortcutsEnabled = state.mainWindow;
    }).catch(() => {});
    refreshGamepadPolling();
    refreshMouseListener();

    return () => {
      electronApi.removeListener('event.ui_action_fired', onUiActionFired);
      electronApi.removeListener('event.config_changed', refreshGamepadPolling);
      electronApi.removeListener('event.config_changed', refreshMouseListener);
      electronApi.removeListener('event.active_keybind_profile_changed', refreshGamepadPolling);
      electronApi.removeListener('event.active_keybind_profile_changed', refreshMouseListener);
      electronApi.removeListener('event.shortcuts_state_changed', onShortcutsStateChanged);
      document.removeEventListener('neuz:mousebind', onWebviewMouseBind);
      uiActionContext.stopGamepadPoll();
      uiActionContext.stopMouseListener();
    };
  });

  onMount(async () => {
    try {
      const loadedConfig = await withTimeout(
        electronApi.invoke('config.load', true),
        10000,
        'config.load',
        mainWindowState.config,
      )
      mainWindowState.config = loadedConfig
      cleanupSessionActionLocalStorage(loadedConfig.sessionActions ?? [])

      // Populate runtime sessions/layouts synchronously so MainBar renders safely.
      // reloadNeuzos() uses setTimeout(50ms) which creates a race with isLoading=false.
      const loadedLayouts = loadedConfig.layouts ?? []
      const validLayoutIds = new Set(loadedLayouts.map((l: any) => l.id))
      const validDefaultLayouts = (loadedConfig.defaultLayouts ?? []).filter((id: string) => validLayoutIds.has(id))
      mainWindowState.sessions = JSON.parse(JSON.stringify(loadedConfig.sessions ?? []))
      mainWindowState.layouts = JSON.parse(JSON.stringify(loadedLayouts))
      mainWindowState.tabs.layoutsIds = JSON.parse(JSON.stringify(validDefaultLayouts))
      mainWindowState.tabs.layoutOrder = JSON.parse(JSON.stringify(validDefaultLayouts))
      mainWindowState.tabs.activeLayoutId = 'home'
      mainWindowState.tabs.previousLayoutId = null

      // Load the registry in the background so the app UI can appear even if it fails.
      void (async () => {
        try {
          const registryExists = await withTimeout(flyffRegistry.check(), 5000, 'registry.check', false);
          if (registryExists) {
            const registry = await withTimeout(flyffRegistry.load(), 5000, 'registry.load', null);
            if (registry) flyffRegistryContext.setRegistry(registry);
          }
        } catch (registryError) {
          console.warn('Flyff registry load failed, continuing without it:', registryError);
        }
      })()
    } catch (error) {
      console.error('[App] onMount error:', error);
    } finally {
      // Always dismiss the loading screen — never leave the user stuck
      isLoading = false
    }
  })
</script>
<ModeWatcher/>
<Toaster/>
{#if isLoading}
  <div class="w-full h-full flex items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-4">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p class="text-muted-foreground">Loading NeuzOS...</p>
    </div>
  </div>
{:else}
  <SharedEvents/>
  <div class="w-full h-full flex flex-col border-2 relative">
    {#if !isFullscreen || !mainWindowState.config.fullscreen?.hideTitleBarInMainWindow}
      <MainBar/>
    {/if}
    <MainSectionsContainer/>

    <!-- Floating Exit Fullscreen Button -->
    {#if isFullscreen && mainWindowState.config.fullscreen?.hideTitleBarInMainWindow}
      <Button
        size="icon-sm"
        variant="secondary"
        class="absolute top-2 right-2 z-50 shadow-lg"
        onclick={() => neuzosBridge.mainWindow.fullscreenToggle()}
      >
        <Minimize class="size-4"/>
      </Button>
    {/if}
  </div>
{/if}
