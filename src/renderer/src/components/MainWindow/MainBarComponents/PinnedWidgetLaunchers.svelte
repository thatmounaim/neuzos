<script lang="ts">
  import { onMount } from 'svelte';
  import { BookMarked, Calculator, ChartNoAxesCombined, Coins, ListTodo, NotebookText, PawPrint, Scroll, ScrollText, Search } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { getWidgetsContext } from '$lib/contexts/widgetsContext.svelte';
  import { getQuestPanelContext } from '$lib/contexts/questPanelContext.svelte';
  import { getNeuzosBridgeContext } from '$lib/contexts/neuzosBridgeContext';
  import {
    readPinnedWidgetLaunchers,
    WIDGET_LAUNCHER_PINS_CHANGED,
    type WidgetLauncherId
  } from '$lib/widgetLauncherPins';
  import type { ViewerWindowType } from '$lib/types';

  const widgetsContext = getWidgetsContext();
  const questPanel = getQuestPanelContext();
  const neuzosBridge = getNeuzosBridgeContext();

  let pinnedLaunchers = $state<WidgetLauncherId[]>([]);
  let openViewerTypes = $state<ViewerWindowType[]>([]);

  function refreshPinnedLaunchers() {
    pinnedLaunchers = readPinnedWidgetLaunchers();
  }

  async function refreshOpenViewerTypes() {
    openViewerTypes = await neuzosBridge.viewerWindow.getOpenTypes();
  }

  function isSingleWidgetOpen(type: 'widget.builtin.fcoin_calculator' | 'widget.builtin.notepad' | 'widget.builtin.todo'): boolean {
    return widgetsContext.getWidgetsByType(type).length > 0;
  }

  function toggleSingleWidget(type: 'widget.builtin.fcoin_calculator' | 'widget.builtin.notepad' | 'widget.builtin.todo') {
    const existing = widgetsContext.getWidgetsByType(type);
    if (existing.length > 0) {
      widgetsContext.destroyWidget(existing[0].id);
      return;
    }

    widgetsContext.createWidget(type);
  }

  function toggleViewer(type: ViewerWindowType) {
    if (openViewerTypes.includes(type)) {
      neuzosBridge.viewerWindow.closeType(type);
      openViewerTypes = openViewerTypes.filter((openType) => openType !== type);
      return;
    }

    neuzosBridge.viewerWindow.open(type);
    openViewerTypes = [...openViewerTypes, type];
  }

  function isLauncherActive(id: WidgetLauncherId): boolean {
    switch (id) {
      case 'fcoin_calculator':
        return isSingleWidgetOpen('widget.builtin.fcoin_calculator');
      case 'notepad':
        return isSingleWidgetOpen('widget.builtin.notepad');
      case 'todo':
        return isSingleWidgetOpen('widget.builtin.todo');
      case 'navi_guide':
      case 'flyffipedia':
      case 'flyffulator':
      case 'flyff_calculators':
      case 'siege_stats':
      case 'cs_modelviewer':
        return openViewerTypes.includes(id);
      case 'quest_log':
        return questPanel.isOpen;
    }
  }

  function launch(id: WidgetLauncherId) {
    switch (id) {
      case 'fcoin_calculator':
        toggleSingleWidget('widget.builtin.fcoin_calculator');
        break;
      case 'notepad':
        toggleSingleWidget('widget.builtin.notepad');
        break;
      case 'todo':
        toggleSingleWidget('widget.builtin.todo');
        break;
      case 'navi_guide':
      case 'flyffipedia':
      case 'flyffulator':
      case 'flyff_calculators':
      case 'siege_stats':
      case 'cs_modelviewer':
        toggleViewer(id);
        break;
      case 'quest_log':
        questPanel.toggle();
        break;
    }
  }

  function getTitle(id: WidgetLauncherId): string {
    switch (id) {
      case 'fcoin_calculator':
        return 'FCoin Calculator';
      case 'notepad':
        return 'Notepad';
      case 'todo':
        return 'To-Do';
      case 'navi_guide':
        return 'Navi Guide';
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
      case 'quest_log':
        return 'Quest Log';
    }
  }

  onMount(() => {
    refreshPinnedLaunchers();
    void refreshOpenViewerTypes();
    window.addEventListener(WIDGET_LAUNCHER_PINS_CHANGED, refreshPinnedLaunchers);
    const removeViewerStateListener = neuzosBridge.viewerWindow.onStateChanged(() => {
      void refreshOpenViewerTypes();
    });

    return () => {
      window.removeEventListener(WIDGET_LAUNCHER_PINS_CHANGED, refreshPinnedLaunchers);
      removeViewerStateListener();
    };
  });
</script>

{#each pinnedLaunchers as launcherId (launcherId)}
  <Button
    size="icon-xs"
    variant={isLauncherActive(launcherId) ? 'secondary' : 'outline'}
    onclick={() => launch(launcherId)}
    class="cursor-pointer"
    title={getTitle(launcherId)}
  >
    {#if launcherId === 'fcoin_calculator'}
      <Coins class="size-3.5" />
    {:else if launcherId === 'notepad'}
      <NotebookText class="size-3.5" />
    {:else if launcherId === 'todo'}
      <ListTodo class="size-3.5" />
    {:else if launcherId === 'navi_guide'}
      <PawPrint class="size-3.5" />
    {:else if launcherId === 'flyffipedia'}
      <BookMarked class="size-3.5" />
    {:else if launcherId === 'flyffulator'}
      <Scroll class="size-3.5" />
    {:else if launcherId === 'flyff_calculators'}
      <Calculator class="size-3.5" />
    {:else if launcherId === 'siege_stats'}
      <ChartNoAxesCombined class="size-3.5" />
    {:else if launcherId === 'cs_modelviewer'}
      <Search class="size-3.5" />
    {:else if launcherId === 'quest_log'}
      <ScrollText class="size-3.5" />
    {/if}
  </Button>
{/each}