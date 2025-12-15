<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {onMount} from "svelte";
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

  let webview: WebviewTag | undefined = $state(undefined);
  const electronApi = window.electron.ipcRenderer;

  onMount(async () => {
    sessionData = await electronApi.invoke("session_window.get_data");

    // Load config to get userAgent setting
    try {
      neuzosConfig = await electronApi.invoke("config.load", false);
    } catch (e) {
      console.error("Failed to load config:", e);
    }

    if (!sessionData) {
      console.error("Failed to load session data");
      return;
    }

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      // We can track fullscreen state if needed
    };

    window.addEventListener('resize', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleFullscreenChange);
    };
  });

  function closeWindow() {
    electronApi.send("session_window.close");
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
      case 'focus':
        return '(Fullscreen Disabled, Exit button removed)';
      case 'focus_fullscreen':
        return '(Fullscreen Locked)';
      default:
        return '';
    }
  }

  let started: boolean = $state(false)
  let muted: boolean = $state(false)

  export const startClient = () => {
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
    try {
      if (webview) {
        ;(webview as WebviewTag)?.setAudioMuted(mu)
        muted = (webview as WebviewTag)?.isAudioMuted() ?? false
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

  // Load config and compute userAgent
  $effect(() => {
    userAgent = neuzosConfig?.userAgent || undefined;
  });
</script>

<ModeWatcher/>

<div class="w-screen h-screen flex flex-col bg-background text-foreground">
  <!-- Title Bar (hidden in focus_fullscreen mode) -->
  {#if sessionData?.mode !== 'focus_fullscreen'}
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
        <Button size="icon-xs" variant="outline" onclick={() => { muted ? setAudioMuted(false) : setAudioMuted(true)} }>
          {#if muted}
            <VolumeOff class="size-3.5"/>
          {:else}
            <Volume class="size-3.5"/>
          {/if}
        </Button>
        {#if sessionData?.mode !== 'focus'}
          <Button size="icon-xs" variant="outline" onclick={() => { started ? stopClient() : startClient()} }>
            {#if started}
              <Square class="size-3.5"/>
            {:else}
              <Play class="size-3.5"/>
            {/if}
          </Button>
        {/if}
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
        {#if sessionData?.mode !== 'focus'}
          <Button size="icon-xs" variant="outline" onclick={closeWindow}>
            <X class="size-3.5"/>
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Webview Content -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex-1 relative" onmouseenter={() => {
    focus()
  }}>
    {#if sessionData}
      {#if started || sessionData.mode === 'focus_fullscreen' || sessionData.mode === 'focus'}
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
</div>
