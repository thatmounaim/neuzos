<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import MainBar from "./components/MainWindow/MainBar.svelte";
  import {onMount, setContext} from "svelte";
  import {neuzosBridge, initElectronApi} from "$lib/core";
  import type {MainWindowState} from "$lib/types";
  import LayoutsDisplay from "./components/MainWindow/LayoutsDisplay.svelte";
  import SharedEvents from "./components/SharedEvents.svelte";
  import { createWidgetsContext, setWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { createCooldownsContext, setCooldownsContext } from '$lib/contexts/cooldownsContext';

  const dockedTabs = $state([])

  setContext('electronApi', window.electron.ipcRenderer)
  setContext('dockedTabs', dockedTabs);
  setContext('neuzosBridge', neuzosBridge)

  // Create and set the widgets context at the app level
  const widgetsContext = createWidgetsContext();
  setWidgetsContext(widgetsContext);

  // Create and set the cooldowns context at the app level
  const cooldownsContext = createCooldownsContext();
  setCooldownsContext(cooldownsContext);

  initElectronApi(window.electron.ipcRenderer)

  let mainWindowState: MainWindowState = $state({
    config: {
      sessions: [],
      layouts: [],
      chromium: {
        commandLineSwitches: [],
      },
      defaultLayouts: [],
      keyBinds: [],
      sessionActions: [],
      defaultLaunchMode: 'normal',
      changed: false,
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
    doCalculationUpdatesRng: 0,
  })

  const electronApi = window.electron.ipcRenderer;

  electronApi.on('event.layout_add', (_, layoutId: string) => {
    console.log("layout_add", layoutId)
    mainWindowState.tabs.layoutsIds.push(layoutId)
    mainWindowState.tabs.layoutOrder.push(layoutId)
  })

  electronApi.on('event.layout_switch', (_, layoutId: string) => {
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

  electronApi.on('event.layout_close_all', (_) => {
    mainWindowState.tabs.previousLayoutId = null
    mainWindowState.tabs.activeLayoutId = 'home'
    mainWindowState.tabs.layoutsIds.forEach(layoutId => {
      closeLayout(layoutId)
    })

  })


  electronApi.on('event.layout_close', (_, layoutId: string) => {
    console.log("layout_close", layoutId)
    closeLayout(layoutId)
  })

  electronApi.on('event.layout_swap', (_) => {
    const activeLayoutId = mainWindowState.tabs.activeLayoutId
    const previousLayoutId = mainWindowState.tabs.previousLayoutId
    if (previousLayoutId) {
      const newLayoutId = previousLayoutId
      mainWindowState.tabs.previousLayoutId = activeLayoutId
      mainWindowState.tabs.activeLayoutId = newLayoutId
    }
  })

  electronApi.on('event.stop_session', (_, sessionId: string) => {
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

  electronApi.on('event.start_session', (_, sessionId: string, layoutId: string) => {
    neuzosBridge.sessions.stop(sessionId)
    setTimeout(() => {
      mainWindowState.sessionsLayoutsRef[sessionId]?.layouts[layoutId].startClient()
    }, 100)
  })

  electronApi.on('event.send_session_action', (_, sessionId: string, actionId: string) => {
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

    // Start cast if there's a cast time
    if (action.castTime > 0) {
      cooldownsContext.startCast(sessionId, actionId, action.castTime)

      // After cast time, send the key and start cooldown
      setTimeout(() => {
        sendActionKeyToSession(sessionId, action)
        if (action.cooldown > 0) {
          cooldownsContext.startCooldown(sessionId, actionId, action.cooldown)

          // Trigger cooldowns for all actions in the same category
          if (action.cooldownCategory && action.cooldownCategory.trim() !== '') {
            triggerCategoryCooldowns(sessionId, action.cooldownCategory, action.cooldown, actionId)
          }
        }
      }, action.castTime * 1000)
    } else {
      // No cast time, send immediately and start cooldown
      sendActionKeyToSession(sessionId, action)
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

  electronApi.on('event.config_changed', (_, cfg: string) => {
    mainWindowState.config.changed = true
    const newConfig = JSON.parse(cfg)
    mainWindowState.config.sessions = newConfig.sessions
    mainWindowState.config.layouts = newConfig.layouts
    mainWindowState.config.defaultLayouts = newConfig.defaultLayouts
    mainWindowState.config.chromium.commandLineSwitches = newConfig.chromium.commandLineSwitches
    mainWindowState.config.keyBinds = newConfig.keyBinds
    mainWindowState.config.sessionActions = newConfig.sessionActions || []
    mainWindowState.config.defaultLaunchMode = newConfig.defaultLaunchMode
  })

  const reloadNeuzos = () => {
    setTimeout(() => {
      mainWindowState.sessions = JSON.parse(JSON.stringify(mainWindowState.config.sessions))
      mainWindowState.layouts = JSON.parse(JSON.stringify(mainWindowState.config.layouts))
      mainWindowState.tabs.layoutsIds = JSON.parse(JSON.stringify(mainWindowState.config.defaultLayouts))
      mainWindowState.tabs.layoutOrder = JSON.parse(JSON.stringify(mainWindowState.config.defaultLayouts))
    }, 50)
  }

  electronApi.on('event.reload_config', async (_) => {
    neuzosBridge.layouts.closeAll()
    mainWindowState.config.changed = false
    reloadNeuzos()
  })

  addEventListener('resize', () => {
    mainWindowState.doCalculationUpdatesRng = Math.random()
  })

  setContext('mainWindowState', mainWindowState)


  onMount(async () => {
    neuzosBridge.layouts.closeAll()
    mainWindowState.config = await electronApi.invoke('config.load', true)
    reloadNeuzos()
  })
</script>
<ModeWatcher/>
<SharedEvents/>
<div class="w-full h-full flex flex-col border-2">
  <MainBar/>
  <LayoutsDisplay/>
</div>
