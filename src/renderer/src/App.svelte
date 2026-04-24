<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import MainBar from "./components/MainWindow/MainBar.svelte";
  import {onDestroy, onMount} from "svelte";
  import {neuzosBridge, initElectronApi} from "$lib/core";
  import type {MainWindowState} from "$lib/types";
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
          maximized: false
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
          maximized: false
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
      sessionZoomLevels: {},
      defaultLaunchMode: 'normal',
      userAgent: undefined,
      autoSaveSettings: false,
      changed: false,
      titleBarButtons: {
        darkModeToggle: true,
        fullscreenToggle: true,
        keybindToggle: true
      },
      fullscreen: {
        hideTitleBarInMainWindow: false,
        hideTitleBarInSessionLayouts: false
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
    mainWindowState.tabs.layoutsIds.push(layoutId)
    mainWindowState.tabs.layoutOrder.push(layoutId)
  })

  listen('event.layout_switch', (_, layoutId: string) => {
    console.log("layout_switch", layoutId)
    mainWindowState.tabs.previousLayoutId = mainWindowState.tabs.activeLayoutId
    mainWindowState.tabs.activeLayoutId = layoutId
  })

  const closeLayout = (layoutId: string) => {
    mainWindowState.tabs.layoutsIds = mainWindowState.tabs.layoutsIds.filter(id => id !== layoutId)
    if (mainWindowState.tabs.activeLayoutId === layoutId) {
      mainWindowState.tabs.activeLayoutId = mainWindowState.tabs.previousLayoutId ?? null
    }
    mainWindowState.tabs.layoutOrder = mainWindowState.tabs.layoutOrder.filter(id => id !== layoutId)
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
    closeLayout(layoutId)
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

  listen('event.stop_session', (_, sessionId: string) => {
    console.log("stop_session", sessionId)
    Object.keys(mainWindowState.sessionsLayoutsRef[sessionId]?.layouts).forEach(layoutId => {
      console.log("stop_session", sessionId, " for layout", layoutId)
      const neuzClient = mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId]
      if (neuzClient) {
        console.log("stop_session", sessionId, layoutId)
        neuzClient.stopClient()
      }
    })
  })

  listen('event.start_session', (_, sessionId: string, layoutId: string) => {
    neuzosBridge.sessions.stop(sessionId)
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

  listen('event.config_changed', (_, cfg: string) => {
    mainWindowState.config.changed = true
    const newConfig = JSON.parse(cfg)
    mainWindowState.config.sessions = newConfig.sessions
    mainWindowState.config.layouts = newConfig.layouts
    mainWindowState.config.defaultLayouts = newConfig.defaultLayouts
    mainWindowState.config.chromium.commandLineSwitches = newConfig.chromium.commandLineSwitches
    mainWindowState.config.keyBinds = newConfig.keyBinds
    mainWindowState.config.keyBindProfiles = newConfig.keyBindProfiles || []
    mainWindowState.config.activeKeyBindProfileId = newConfig.activeKeyBindProfileId ?? null
    mainWindowState.config.syncReceiverSessionId = newConfig.syncReceiverSessionId ?? null
    mainWindowState.config.sessionActions = newConfig.sessionActions || []
    mainWindowState.config.sessionZoomLevels = newConfig.sessionZoomLevels ?? {}
    mainWindowState.config.defaultLaunchMode = newConfig.defaultLaunchMode
    mainWindowState.config.userAgent = newConfig.userAgent || undefined
    mainWindowState.config.titleBarButtons = newConfig.titleBarButtons
    mainWindowState.config.window = newConfig.window
    mainWindowState.config.fullscreen = newConfig.fullscreen || {
      hideTitleBarInMainWindow: false,
      hideTitleBarInSessionLayouts: false
    }
    // Imperatively push new zoom levels to all running webviews.
    // The reactive $effect in NeuzClient is unreliable for cross-component deep mutations.
    const zoomLevels = mainWindowState.config.sessionZoomLevels
    Object.entries(mainWindowState.sessionsLayoutsRef).forEach(([sessionId, sessionRef]: [string, any]) => {
      const zoom = zoomLevels[sessionId] ?? 1.0
      const layouts = sessionRef?.layouts
      if (layouts) {
        Object.values(layouts).forEach((ref: any) => ref.setZoom?.(zoom))
      }
    })
  })

  const reloadNeuzos = () => {
    setTimeout(() => {
      mainWindowState.sessions = JSON.parse(JSON.stringify(mainWindowState.config.sessions))
      mainWindowState.layouts = JSON.parse(JSON.stringify(mainWindowState.config.layouts))
      mainWindowState.tabs.layoutsIds = JSON.parse(JSON.stringify(mainWindowState.config.defaultLayouts))
      mainWindowState.tabs.layoutOrder = JSON.parse(JSON.stringify(mainWindowState.config.defaultLayouts))
      mainWindowState.tabs.activeLayoutId = 'home'
      mainWindowState.tabs.previousLayoutId = null
    }, 50)
  }

  listen('event.reload_config', async (_) => {
    neuzosBridge.layouts.closeAll()
    mainWindowState.config.changed = false
    reloadNeuzos()
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
    const onUiActionFired = (_: any, payload: { actionId: string }) => {
      uiActionContext.dispatch(payload.actionId);
    };

    const dispatchRendererBind = (bind: { key: string; event: string; args?: string[] }) => {
      neuzosBridge.keybinds.dispatch(bind);
    };

    const getAllKeybinds = () => {
      const activeProfile = mainWindowState.config.keyBindProfiles?.find(
        (profile) => profile.id === mainWindowState.config.activeKeyBindProfileId
      );

      return [...(mainWindowState.config.keyBinds ?? []), ...(activeProfile?.keybinds ?? [])];
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
    refreshGamepadPolling();
    refreshMouseListener();

    return () => {
      electronApi.removeListener('event.ui_action_fired', onUiActionFired);
      electronApi.removeListener('event.config_changed', refreshGamepadPolling);
      electronApi.removeListener('event.config_changed', refreshMouseListener);
      electronApi.removeListener('event.active_keybind_profile_changed', refreshGamepadPolling);
      electronApi.removeListener('event.active_keybind_profile_changed', refreshMouseListener);
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
