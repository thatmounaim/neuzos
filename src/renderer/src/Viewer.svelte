<script lang="ts">
  import { onMount } from 'svelte';
  import { ModeWatcher } from 'mode-watcher';
  import { initElectronApi, neuzosBridge } from '$lib/core';
  import type { ViewerWindowType } from '$lib/types';
  import ViewerTitleBar from './components/ViewerWindow/ViewerTitleBar.svelte';
  import NaviGuideViewer from './components/ViewerWindow/NaviGuideViewer.svelte';
  import FlyffipediaViewer from './components/ViewerWindow/FlyffipediaViewer.svelte';

  // Must be called before any IPC bridge usage – mirrors what App.svelte does
  initElectronApi(window.electron.ipcRenderer);

  const requestedType = new URLSearchParams(window.location.search).get('type');
  let viewerType = $state<ViewerWindowType | null>(
    requestedType === 'navi_guide' || requestedType === 'flyffipedia' ? requestedType : null
  );
  let alwaysOnTop = $state(true);
  let isLoading = $state(true);
  let loadError = $state('');
  let didInit = $state(false);

  onMount(async () => {
    try {
      const result = await neuzosBridge.viewerWindow.getConfig();
      if ('error' in result) {
        loadError = result.error;
        return;
      }

      viewerType = requestedType === 'navi_guide' || requestedType === 'flyffipedia' ? requestedType : result.type;
      alwaysOnTop = result.config.alwaysOnTop;
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Failed to initialize viewer window.';
    } finally {
      didInit = true;
      isLoading = false;
    }
  });

  function toggleAlwaysOnTop(nextValue: boolean) {
    alwaysOnTop = nextValue;
    neuzosBridge.viewerWindow.setAlwaysOnTop(nextValue);
  }

  function handleLoadingChange(nextValue: boolean) {
    isLoading = nextValue;
  }

  function minimizeWindow() {
    neuzosBridge.viewerWindow.minimize();
  }

  function closeWindow() {
    neuzosBridge.viewerWindow.close();
  }
</script>

<ModeWatcher />

<div class="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
  {#if loadError}
    <div class="flex h-full w-full items-center justify-center p-6 text-center text-sm text-destructive">
      <div class="max-w-md rounded-lg border border-border/70 bg-card p-4 shadow-sm">
        <p class="font-medium text-foreground">Viewer initialization failed</p>
        <p class="mt-2 text-muted-foreground">{loadError}</p>
      </div>
    </div>
  {:else if !didInit || !viewerType}
    <div class="flex h-full w-full items-center justify-center">
      <div class="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>
  {:else}
    <ViewerTitleBar
      title={viewerType === 'navi_guide' ? "Navi's Bestiary" : 'Flyffipedia'}
      attribution={viewerType === 'navi_guide' ? 'created by Navi2765' : undefined}
      alwaysOnTop={alwaysOnTop}
      isLoading={isLoading}
      onToggleAlwaysOnTop={toggleAlwaysOnTop}
      onMinimize={minimizeWindow}
      onClose={closeWindow}
    />

    <div class="min-h-0 flex-1">
      {#if viewerType === 'navi_guide'}
        <NaviGuideViewer onLoadingChange={handleLoadingChange} />
      {:else}
        <FlyffipediaViewer onLoadingChange={handleLoadingChange} />
      {/if}
    </div>
  {/if}
</div>
