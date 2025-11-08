<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import MainBar from "./components/MainWindow/MainBar.svelte";
  import {onMount, setContext} from "svelte";
  import {neuzosBridge, initElectronApi} from "$lib/core";
  import type {MainWindowState, NeuzConfig, NeuzLayout, NeuzSession} from "$lib/types";
  import LayoutsDisplay from "./components/MainWindow/LayoutsDisplay.svelte";
  import SharedEvents from "./components/SharedEvents.svelte";

  const dockedTabs = $state([])

  setContext('electronApi', window.electron.ipcRenderer)
  setContext('dockedTabs', dockedTabs);
  setContext('neuzosBridge', neuzosBridge)

  initElectronApi(window.electron.ipcRenderer)

  let neuzosConfig: NeuzConfig = $state({
    sessions: [],
    layouts: [],
  })

  let mainWindowState: MainWindowState = $state({
    config: {
      sessions: [],
      layouts: [],
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

  electronApi.on('event.layout_close_all', (_) => {
    mainWindowState.tabs.layoutsIds.forEach(layoutId => {
      neuzosBridge.layouts.close(layoutId)
    })
    mainWindowState.tabs.previousLayoutId = null
    mainWindowState.tabs.activeLayoutId = 'home'
  })

  electronApi.on('event.layout_close', (_, layoutId: string) => {
    console.log("layout_close", layoutId)
    mainWindowState.tabs.layoutsIds = mainWindowState.tabs.layoutsIds.filter(id => id !== layoutId)
    if (mainWindowState.tabs.activeLayoutId === layoutId) {
      mainWindowState.tabs.activeLayoutId = mainWindowState.tabs.previousLayoutId ?? null
    }

    mainWindowState.tabs.layoutOrder = mainWindowState.tabs.layoutOrder.filter(id => id !== layoutId)
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

  electronApi.on('event.config_changed', (_, cfg: string) => {
    mainWindowState.config.changed = true
    const newConfig = JSON.parse(cfg)
    mainWindowState.config.sessions = newConfig.sessions
    mainWindowState.config.layouts = newConfig.layouts
  })

  electronApi.on('event.reload_config', (_) => {
    neuzosBridge.layouts.closeAll()
    mainWindowState.config.changed = false
    mainWindowState.sessions = JSON.parse(JSON.stringify(mainWindowState.config.sessions))
    mainWindowState.layouts = JSON.parse(JSON.stringify(mainWindowState.config.layouts))
  })

  addEventListener('resize', () => {
    mainWindowState.doCalculationUpdatesRng = Math.random()
  })

  setContext('mainWindowState', mainWindowState)

  onMount(async () => {
    neuzosBridge.layouts.closeAll()
    neuzosConfig = await electronApi.invoke('config.load', true)
    mainWindowState.sessions = neuzosConfig.sessions
    mainWindowState.layouts = neuzosConfig.layouts
  })
</script>
<ModeWatcher/>
<SharedEvents/>
<div class="w-full h-full flex flex-col border-2">
  <MainBar/>
  <LayoutsDisplay/>
</div>
