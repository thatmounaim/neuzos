<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {onMount} from "svelte";
  import {initElectronApi} from "$lib/core";
  import {Button} from "$lib/components/ui/button";
  import type {NeuzSession} from "$lib/types";
  import type {WebviewTag} from 'electron';

  import {
    Fullscreen, Minus, Maximize, X
  } from '@lucide/svelte'

  initElectronApi(window.electron.ipcRenderer);

  let sessionData: {
    mode: 'session' | 'focus' | 'focus_fullscreen';
    sessionId: string;
    sessionConfig: NeuzSession;
  } | null = $state(null);

  let webview: WebviewTag | undefined = $state(undefined);
  const electronApi = window.electron.ipcRenderer;

  onMount(async () => {
    sessionData = await electronApi.invoke("session_window.get_data");

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
      <div class="flex gap-1">
        <Button variant="ghost" size="icon" class="h-6 w-6" onclick={minimizeWindow}>
          <Minus class="size-3.5"/>
        </Button>
        <Button variant="ghost" size="icon" class="h-6 w-6" onclick={maximizeWindow}>
          <Maximize class="size-3.5"/>
        </Button>
        {#if sessionData?.mode === 'session'}
          <Button variant="ghost" size="icon" class="h-6 w-6" onclick={toggleFullscreen}>
            <Fullscreen class="size-3.5"/>
          </Button>
        {/if}
        {#if sessionData?.mode !== 'focus'}
          <Button variant="ghost" size="icon" class="h-6 w-6" onclick={closeWindow}>
            <X class="size-3.5"/>
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Webview Content -->
  <div class="flex-1 relative">
    {#if sessionData}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <webview
        bind:this={webview}
        src={getSrc()}
        partition={getPartition()}
        class="w-full h-full"
        webpreferences="nativeWindowOpen=no"
        allowpopups="false"
      ></webview>
    {:else}
      <div class="flex items-center justify-center h-full">
        <p class="text-muted-foreground">Loading session...</p>
      </div>
    {/if}
  </div>
</div>

