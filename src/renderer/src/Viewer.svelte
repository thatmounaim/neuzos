<script lang="ts">
  import { onMount } from 'svelte';
  import { ModeWatcher } from 'mode-watcher';
  import { initElectronApi, neuzosBridge } from '$lib/core';
  import type { ViewerWindowType } from '$lib/types';
  import ViewerTitleBar from './components/Widgets/Builtin/ViewerWindow/ViewerTitleBar.svelte';
  import NaviGuideViewer from './components/Widgets/Builtin/ViewerWindow/NaviGuideViewer.svelte';
  import FlyffipediaViewer from './components/Widgets/Builtin/ViewerWindow/FlyffipediaViewer.svelte';
  import FlyffulatorViewer from './components/Widgets/Builtin/ViewerWindow/FlyffulatorViewer.svelte';
  import FlyffCalculatorsViewer from './components/Widgets/Builtin/ViewerWindow/FlyffCalculatorsViewer.svelte';
  import SiegeStatsViewer from './components/Widgets/Builtin/ViewerWindow/SiegeStatsViewer.svelte';
  import CsModelviewerViewer from './components/Widgets/Builtin/ViewerWindow/CsModelviewerViewer.svelte';

  // Must be called before any IPC bridge usage - mirrors what App.svelte does
  initElectronApi(window.electron.ipcRenderer);

  const viewerTypes: ViewerWindowType[] = ['navi_guide', 'flyffipedia', 'flyffulator', 'flyff_calculators', 'siege_stats', 'cs_modelviewer'];
  const requestedType = new URLSearchParams(window.location.search).get('type');
  const requestedViewerType = viewerTypes.includes(requestedType as ViewerWindowType) ? requestedType as ViewerWindowType : null;
  let viewerType = $state<ViewerWindowType | null>(requestedViewerType);
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

      viewerType = requestedViewerType ?? result.type;
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

  function maximizeWindow() {
    neuzosBridge.viewerWindow.maximize();
  }

  function closeWindow() {
    neuzosBridge.viewerWindow.close();
  }

  $effect(() => {
    if (viewerType) {
      document.title = getViewerWindowTitle(viewerType);
    }
  });

  function getViewerWindowTitle(type: ViewerWindowType): string {
    switch (type) {
      case 'navi_guide':
        return "NeuzOS - Navi's Bestiary";
      case 'flyffipedia':
        return 'NeuzOS - Flyffipedia';
      case 'flyffulator':
        return 'NeuzOS - Flyffulator';
      case 'flyff_calculators':
        return 'NeuzOS - Flyff Calculators';
      case 'siege_stats':
        return 'NeuzOS - Siege Stats';
      case 'cs_modelviewer':
        return 'NeuzOS - CS-Modelviewer';
    }
  }

  function getViewerTitle(type: ViewerWindowType): string {
    switch (type) {
      case 'navi_guide':
        return "Navi's Bestiary";
      case 'flyffipedia':
        return 'Flyffipedia';
      case 'flyffulator':
        return 'Flyffulator';
      case 'flyff_calculators':
        return 'Flyff Calculators';
      case 'siege_stats':
        return 'Siege Stats';
      case 'cs_modelviewer':
        return 'CS-Modelviewer';
    }
  }

  function getViewerAttribution(type: ViewerWindowType): string {
    switch (type) {
      case 'navi_guide':
        return 'created by Navi2765';
      case 'flyffipedia':
        return 'created by Swaight';
      case 'flyffulator':
        return 'created by Frostiae';
      case 'flyff_calculators':
        return 'created by Stellar';
      case 'siege_stats':
        return 'created by Shynox';
      case 'cs_modelviewer':
        return 'created by i9hdkill';
    }
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
      title={getViewerTitle(viewerType)}
      attribution={getViewerAttribution(viewerType)}
      alwaysOnTop={alwaysOnTop}
      isLoading={isLoading}
      onToggleAlwaysOnTop={toggleAlwaysOnTop}
      onMinimize={minimizeWindow}
      onMaximize={maximizeWindow}
      onClose={closeWindow}
    />

    <div class="min-h-0 flex-1">
      {#if viewerType === 'navi_guide'}
        <NaviGuideViewer onLoadingChange={handleLoadingChange} />
      {:else if viewerType === 'flyffipedia'}
        <FlyffipediaViewer onLoadingChange={handleLoadingChange} />
      {:else if viewerType === 'flyffulator'}
        <FlyffulatorViewer onLoadingChange={handleLoadingChange} />
      {:else if viewerType === 'flyff_calculators'}
        <FlyffCalculatorsViewer onLoadingChange={handleLoadingChange} />
      {:else if viewerType === 'siege_stats'}
        <SiegeStatsViewer onLoadingChange={handleLoadingChange} />
      {:else}
        <CsModelviewerViewer onLoadingChange={handleLoadingChange} />
      {/if}
    </div>
  {/if}
</div>