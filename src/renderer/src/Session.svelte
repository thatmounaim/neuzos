<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {onMount, onDestroy, tick} from "svelte";
  import {initElectronApi, neuzosBridge} from "$lib/core";
  import type {NeuzSession, NeuzConfig} from "$lib/types";
  import type {WebviewTag} from "electron";
  import {Button} from "$lib/components/ui/button";
  import { setElectronContext } from "$lib/contexts/electronContext";
  import { setNeuzosBridgeContext } from "$lib/contexts/neuzosBridgeContext";

  import {
    Fullscreen, Minus, Maximize, X, Play,
    Volume,
    VolumeOff,
    Square,
    Minimize,
  } from '@lucide/svelte'
  import {Separator} from "$lib/components/ui/separator";

  initElectronApi(window.electron.ipcRenderer);

  // Set up contexts for accessing electron and neuzosBridge
  setElectronContext(window.electron.ipcRenderer);
  setNeuzosBridgeContext(neuzosBridge);

  let sessionData: {
    mode: 'session' | 'focus' | 'focus_fullscreen';
    sessionId: string;
    sessionConfig: NeuzSession;
  } | null = $state(null);

  let webview: WebviewTag | HTMLDivElement | undefined = $state(undefined);
  let isFullscreen = $state(false);
  const electronApi = window.electron.ipcRenderer;
  let focusExitClickCount = 0;
  let focusExitClickTimer: ReturnType<typeof setTimeout> | null = null;
  let showFocusExitHintToast = $state(false);
  let focusExitHintToastText = $state('');

  onMount(async () => {
    sessionData = await electronApi.invoke("session_window.get_data");

    // Load config to get userAgent setting
    try {
      neuzosConfig = await electronApi.invoke("config.load", false);
    } catch (e) {
      console.error("Failed to load config:", e);
    }

    if (sessionData) {
      if (sessionData.mode === 'focus' || sessionData.mode === 'focus_fullscreen') {
        showFocusExitHint(getSessionExitHint());
      }

      // Listen for fullscreen state changes
      electronApi.on('event.fullscreen_changed', (_, fullscreen: boolean) => {
        isFullscreen = fullscreen
      })
    } else {
      console.error("Failed to load session data");
    }
  });

  function closeWindow() {
    electronApi.send("session_window.close");
  }

  function requestCloseWindow() {
    if (sessionData?.mode !== 'focus') {
      closeWindow();
      return;
    }

    showFocusExitHint(getFocusCloseHint());
    focusExitClickCount += 1;
    if (focusExitClickTimer) {
      clearTimeout(focusExitClickTimer);
    }

    if (focusExitClickCount >= 3) {
      focusExitClickCount = 0;
      closeWindow();
      return;
    }

    focusExitClickTimer = setTimeout(() => {
      focusExitClickCount = 0;
      focusExitClickTimer = null;
    }, 2000);
  }

  function requestFocusFullscreenFallbackClose() {
    if (sessionData?.mode !== 'focus_fullscreen') {
      return;
    }

    showFocusExitHint(getSessionExitHint());
    focusExitClickCount += 1;
    if (focusExitClickTimer) {
      clearTimeout(focusExitClickTimer);
    }

    if (focusExitClickCount >= 3) {
      focusExitClickCount = 0;
      closeWindow();
      return;
    }

    focusExitClickTimer = setTimeout(() => {
      focusExitClickCount = 0;
      focusExitClickTimer = null;
    }, 2000);
  }

  function minimizeWindow() {
    electronApi.send("session_window.minimize");
  }

  function maximizeWindow() {
    electronApi.send("session_window.maximize");
  }

  function toggleFullscreen() {
    electronApi.send("session_window.fullscreen_toggle");
  }

  function getIconPath(session: NeuzSession): string {
    return `icons/${session.icon.slug}.png`;
  }

  function getSrc(): string {
    if (!sessionData) return '';
    return sessionData.sessionConfig.srcOverwrite || 'https://universe.flyff.com/play';
  }

  function getPartition(): string {
    if (!sessionData) return '';
    return `persist:${sessionData.sessionId}`;
  }

  function getModeName(): string {
    if (!sessionData) return '';
    switch (sessionData.mode) {
      case 'focus_fullscreen':
        return '(Fullscreen Locked)';
      default:
        return '';
    }
  }

  function formatShortcutLabel(key: string): string {
    if (key.toLowerCase() === 'commandorcontrol+delete') {
      return 'CTRL + DELETE';
    }

    return key
      .split('+')
      .map((part) => part.trim().toUpperCase())
      .join(' + ');
  }

  function getCloseFocusSessionKeybindLabel(): string {
    const keyBind = neuzosConfig?.keyBinds?.find((bind) => bind.event === 'close_focus_session' && bind.key);
    return keyBind?.key ? formatShortcutLabel(keyBind.key) : '';
  }

  function getSessionExitHint(): string {
    if (sessionData?.mode !== 'focus' && sessionData?.mode !== 'focus_fullscreen') return '';
    const keyBindLabel = getCloseFocusSessionKeybindLabel();

    if (sessionData.mode === 'focus') {
      return `To Exit this Session Press 3x Close${keyBindLabel ? ` or ${keyBindLabel}` : ''}`;
    }

    return `To Exit This Session Press 3x Close${keyBindLabel ? ` or ${keyBindLabel}` : ''}`;
  }

  function getFocusCloseHint(): string {
    return getSessionExitHint();
  }

  function showFocusExitHint(text: string) {
    if (!text) return;
    focusExitHintToastText = text;
    showFocusExitHintToast = true;
    setTimeout(() => {
      showFocusExitHintToast = false;
    }, 3000);
  }

  let started: boolean = $state(false)
  let muted: boolean = $state(true)
  let forceStopped: boolean = $state(false)

  export const startClient = () => {
    forceStopped = false
    started = true
  }

  export const stopClient = () => {
    started = false
  }

  export const isStarted = () => {
    return started
  }

  export const focus = () => {
   // if (!autofocusEnabled) return
    if (!webview.shadowRoot) {
      webview.focus()
      return
    }
    const cNodes = webview.shadowRoot.getRootNode().childNodes
    const client = cNodes[cNodes.length - 1] as HTMLElement
    if (client) {
      setTimeout(() => client.focus(), 1)
    }
  }

  export const setAudioMuted = (mu: boolean) => {
    muted = mu
    try {
      const webviewElement = getWebview()
      if (webviewElement) {
        webviewElement.setAudioMuted(mu)
        muted = webviewElement.isAudioMuted() ?? mu
      }
    } catch (e) {
      console.log('Cant mute, maybe client not started')
    }
  }

  export const isMuted = () => {
    return muted
  }

  export const getWebview = () => {
    return webview?.tagName === 'WEBVIEW' ? (webview as WebviewTag) : null
  }

  $effect(() => {
    const webviewElement = getWebview()
    if (!webviewElement) return

    const applyMutedState = () => {
      if (getWebview() !== webviewElement) return
      try {
        webviewElement.setAudioMuted(muted)
        muted = webviewElement.isAudioMuted() ?? muted
      } catch {
        // Keep the desired muted state and apply it again when the webview is ready.
      }
    }

    applyMutedState()
    webviewElement.addEventListener('dom-ready', applyMutedState)
    webviewElement.addEventListener('did-finish-load', applyMutedState)

    return () => {
      webviewElement.removeEventListener('dom-ready', applyMutedState)
      webviewElement.removeEventListener('did-finish-load', applyMutedState)
    }
  })

  let koreanLinkFixed = $state(false);
  const koreanLinkFix = () => {
    getWebview()?.executeJavaScript(`
document.querySelectorAll('[target="_blank"]').forEach((el) => {el.setAttribute('target', '_self');});
const oldWindowOpen = window.open;
window.open = function(...args) {
  if(args[0].startsWith('https://universe.flyff.com/sniegu/auth/wcnkr/callback')){
    location.href = args[0]
    window.open = oldWindowOpen
  } else {
    oldWindowOpen(...args)
  }
}
`)
    koreanLinkFixed = true;
  }

  let neuzosConfig: NeuzConfig | null = $state(null);
  let userAgent: string | undefined = $state(undefined);

  const onStopSession = async (_: any, stopSessionId: string) => {
    if (!sessionData || stopSessionId !== sessionData.sessionId) {
      return
    }
    // Force teardown regardless of launch mode (session/focus/focus_fullscreen).
    // Focus modes normally keep webview mounted, which can keep LevelDB handles open.
    forceStopped = true
    started = false
    await tick()
    electronApi.send('event.stop_session_ack', stopSessionId)
  }

  // Load config and compute userAgent
  $effect(() => {
    userAgent = neuzosConfig?.userAgent || undefined;
  });

  onMount(() => {
    electronApi.on('event.stop_session', onStopSession)
  })

  onDestroy(() => {
    electronApi.removeListener?.('event.stop_session', onStopSession)
    if (focusExitClickTimer) {
      clearTimeout(focusExitClickTimer)
    }
  })
</script>

<ModeWatcher/>

<div class="w-screen h-screen flex flex-col bg-background text-foreground relative">
  {#if showFocusExitHintToast}
    <div class="pointer-events-none absolute left-1/2 top-5 z-50 -translate-x-1/2 rounded-md border border-border bg-background/95 px-4 py-2 text-sm text-foreground shadow-lg">
      {focusExitHintToastText}
    </div>
  {/if}

  {#if sessionData?.mode === 'focus_fullscreen'}
    <button
      type="button"
      class="absolute right-2 top-2 z-50 flex size-7 items-center justify-center rounded-md border border-border/40 bg-background/35 text-muted-foreground opacity-20 transition-all hover:border-border hover:bg-background/80 hover:text-foreground hover:opacity-100"
      title="Close"
      aria-label="Close"
      onclick={requestFocusFullscreenFallbackClose}
    >
      <X class="size-3.5"/>
    </button>
  {/if}

  <!-- Title Bar (hidden in focus_fullscreen mode or when fullscreen with hide setting enabled) -->
  {#if sessionData?.mode !== 'focus_fullscreen' && (!isFullscreen || !neuzosConfig?.fullscreen?.hideTitleBarInSessionLayouts)}
    <div class="flex items-center justify-between px-2 bg-card border-b border-border min-h-8">
      <div class="flex flex-1 items-center gap-2 cursor-grab active:cursor-grabbing select-none"
           style="-webkit-app-region: drag;">
        {#if sessionData}
          <img src={getIconPath(sessionData.sessionConfig)} alt={sessionData.sessionConfig.label} class="w-4 h-4"/>
          <span class="text-sm font-semibold">{sessionData.sessionConfig.label}</span>
          <span class="text-xs text-muted-foreground">{getModeName()}</span>
        {:else}
          <span class="text-sm font-semibold">Loading...</span>
        {/if}
      </div>
      <div class="flex gap-2 h-full items-center">
        {#if sessionData?.mode !== 'focus'}
          <Button size="icon-xs" variant="outline" onclick={() => { started ? stopClient() : startClient()} }>
            {#if started}
              <Square class="size-3.5"/>
            {:else}
              <Play class="size-3.5"/>
            {/if}
          </Button>
        {/if}
        <Button size="icon-xs" variant="outline" onclick={() => { muted ? setAudioMuted(false) : setAudioMuted(true)} }>
          {#if muted}
            <VolumeOff class="size-3.5"/>
          {:else}
            <Volume class="size-3.5"/>
          {/if}
        </Button>
        <Separator orientation="vertical" class="h-4"/>
        {#if sessionData?.mode === 'session'}
          <Button size="icon-xs" variant="outline" onclick={toggleFullscreen}>
            <Fullscreen class="size-3.5"/>
          </Button>
          <Separator orientation="vertical" class="h-4"/>
        {/if}
        <Button size="icon-xs" variant="outline" onclick={minimizeWindow}>
          <Minus class="size-3.5"/>
        </Button>
        <Button size="icon-xs" variant="outline" onclick={maximizeWindow}>
          <Maximize class="size-3.5"/>
        </Button>
        <Button size="icon-xs" variant="outline" onclick={requestCloseWindow}>
          <X class="size-3.5"/>
        </Button>
      </div>
    </div>
  {/if}

  <!-- Webview Content -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex-1 relative" onmouseenter={() => {
    focus()
  }}>
    {#if sessionData}
      {#if !forceStopped && (started || sessionData.mode === 'focus_fullscreen' || sessionData.mode === 'focus')}
        {#if getSrc().startsWith('https://flyff.wemadeconnect.com') && !koreanLinkFixed}
          <Button class="z-50 absolute bottom-2 right-2" size="xs" onclick={koreanLinkFix}>
            KR Fix - Once Logged & Page is Fully Loaded Press This Button
          </Button>
        {/if}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <webview
          bind:this={webview}
          src={getSrc()}
          partition={getPartition()}
          class="w-full h-full"
          webpreferences="nativeWindowOpen=no"
          useragent={userAgent}
        ></webview>
      {:else}
        <div
          bind:this={webview}
          class="w-full h-full flex items-center flex-col gap-2 justify-center select-none"
        >
          <img src="flyffu-logo.png" alt="Flyff Universe Logo" class="w-1/2 max-w-32 pointer-events-none select-none"/>
          <Button variant="outline" onclick={() => startClient()}>Start Session
            - {sessionData.sessionConfig.label}</Button>
        </div>
      {/if}
    {:else}
      <div class="flex items-center justify-center h-full">
        <p class="text-muted-foreground">Loading session...</p>
      </div>
    {/if}
  </div>

  <!-- Floating Exit Fullscreen Button -->
  {#if isFullscreen && neuzosConfig?.fullscreen?.hideTitleBarInSessionLayouts && sessionData?.mode === 'session'}
    <Button
      size="icon-sm"
      variant="secondary"
      class="absolute top-2 right-2 z-50 shadow-lg"
      onclick={toggleFullscreen}
    >
      <Minimize class="size-4"/>
    </Button>
  {/if}
</div>

<svelte:head>
  {#if sessionData}
    <title>NeuzOS - {sessionData.sessionConfig.label}</title>
  {:else}
    <title>NeuzOS - Loading Session...</title>
    {/if}
</svelte:head>
