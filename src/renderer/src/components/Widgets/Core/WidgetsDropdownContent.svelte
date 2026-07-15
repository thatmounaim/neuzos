<script lang="ts">
  import { onMount } from 'svelte';
  import { getQuestPanelContext } from '$lib/contexts/questPanelContext.svelte';
  import { getNeuzosBridgeContext } from '$lib/contexts/neuzosBridgeContext';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

  import { BookMarked, BrushCleaning, Check, GraduationCap, PawPrint, Scroll, ScrollText, X } from '@lucide/svelte';
  import type { ViewerWindowType } from '$lib/types';
  import FCoinCalculatorDropdownItem from '../Builtin/FCoinCalculator/DropdownItem.svelte';
  import NotepadDropdownItem from '../Builtin/Notepad/DropdownItem.svelte';
  import TodoDropdownItem from '../Builtin/Todo/DropdownItem.svelte';
  import MiniBrowserDropdownItem from '../Builtin/MiniBrowser/DropdownItem.svelte';
  import ActionPadDropdownItem from '../Builtin/ActionPad/DropdownItem.svelte';
  import ActionPinDropdownItem from '../Builtin/ActionPin/DropdownItem.svelte';
  import FloatingSessionDropdownItem from '../Builtin/FloatingSession/DropdownItem.svelte';
  import WidgetLauncherPinButton from './WidgetLauncherPinButton.svelte';

  const questPanel = getQuestPanelContext();
  const neuzosBridge = getNeuzosBridgeContext();
  let openViewerTypes = $state<ViewerWindowType[]>([]);
  let isClearingViewerCache = $state(false);
  let viewerCacheFeedback = $state('');
  let viewerCacheFeedbackType = $state<'success' | 'error' | null>(null);

  async function clearViewerCache(): Promise<void> {
    if (isClearingViewerCache) return;

    isClearingViewerCache = true;
    viewerCacheFeedback = '';
    viewerCacheFeedbackType = null;

    try {
      const cleared = await neuzosBridge.viewerWindow.clearCache();
      viewerCacheFeedback = cleared ? 'Cleared!' : 'Failed!';
      viewerCacheFeedbackType = cleared ? 'success' : 'error';
    } catch (error) {
      console.error('Failed to clear viewer cache', error);
      viewerCacheFeedback = 'Failed!';
      viewerCacheFeedbackType = 'error';
    } finally {
      isClearingViewerCache = false;
      window.setTimeout(() => {
        viewerCacheFeedback = '';
        viewerCacheFeedbackType = null;
      }, 1600);
    }
  }

  async function refreshOpenViewerTypes() {
    openViewerTypes = await neuzosBridge.viewerWindow.getOpenTypes();
  }

  function isViewerOpen(type: ViewerWindowType): boolean {
    return openViewerTypes.includes(type);
  }

  function openViewer(type: ViewerWindowType) {
    neuzosBridge.viewerWindow.open(type);
    if (!openViewerTypes.includes(type)) {
      openViewerTypes = [...openViewerTypes, type];
    }
  }

  function closeViewer(type: ViewerWindowType, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    neuzosBridge.viewerWindow.closeType(type);
    openViewerTypes = openViewerTypes.filter((openType) => openType !== type);
  }

  function closeQuestPanel(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    questPanel.close();
  }

  function ignoreActiveLauncherClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onMount(() => {
    void refreshOpenViewerTypes();

    const removeViewerStateListener = neuzosBridge.viewerWindow.onStateChanged(() => {
      void refreshOpenViewerTypes();
    });

    return () => {
      removeViewerStateListener();
    };
  });
</script>

<DropdownMenu.Group>
  <FCoinCalculatorDropdownItem />
  <NotepadDropdownItem />
  {#if questPanel.isOpen}
    <DropdownMenu.Item class="justify-between gap-2 data-highlighted:bg-transparent data-highlighted:text-foreground" onclick={ignoreActiveLauncherClick}>
      <div class="flex min-w-0 items-center gap-2">
        <ScrollText class="h-4 w-4" />
        <span>Quest Log</span>
      </div>
      <div class="flex items-center gap-1">
        <WidgetLauncherPinButton launcherId="quest_log" />
        <Button
          size="icon"
          variant="ghost"
          class="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
          onclick={closeQuestPanel}
          title="Close"
        >
          <X class="h-3 w-3" />
        </Button>
      </div>
    </DropdownMenu.Item>
  {:else}
    <DropdownMenu.Item class="justify-between gap-2" onclick={() => questPanel.toggle()}>
      <div class="flex min-w-0 items-center gap-2">
        <ScrollText class="h-4 w-4" />
        <span>Quest Log</span>
      </div>
      <WidgetLauncherPinButton launcherId="quest_log" />
    </DropdownMenu.Item>
  {/if}
  <TodoDropdownItem />
  <DropdownMenu.Separator />
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger>
      <GraduationCap class="h-4 w-4 mr-2" />
      <span>Community Resources</span>
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent side="right" class="w-44 min-w-44">
      <DropdownMenu.Item class="justify-between gap-2" onSelect={(event) => event.preventDefault()} onclick={clearViewerCache}>
        <div class="flex min-w-0 items-center gap-2">
          {#if viewerCacheFeedbackType === 'success'}
            <Check class="h-4 w-4" />
          {:else if viewerCacheFeedbackType === 'error'}
            <X class="h-4 w-4" />
          {:else}
            <BrushCleaning class="h-4 w-4" />
          {/if}
          <span>{isClearingViewerCache ? 'Clearing Viewer Cache...' : viewerCacheFeedback || 'Clear Viewer Cache'}</span>
        </div>
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
      {#if isViewerOpen('flyffipedia')}
        <DropdownMenu.Item class="justify-between gap-2 data-highlighted:bg-transparent data-highlighted:text-foreground" onclick={ignoreActiveLauncherClick}>
          <div class="flex min-w-0 items-center gap-2">
            <BookMarked class="h-4 w-4" />
            <span>Flyffipedia</span>
          </div>
          <div class="flex items-center gap-1">
            <WidgetLauncherPinButton launcherId="flyffipedia" />
            <Button
              size="icon"
              variant="ghost"
              class="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
              onclick={(event) => closeViewer('flyffipedia', event)}
              title="Close"
            >
              <X class="h-3 w-3" />
            </Button>
          </div>
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item class="justify-between gap-2" onclick={() => openViewer('flyffipedia')}>
          <div class="flex min-w-0 items-center gap-2">
            <BookMarked class="h-4 w-4" />
            <span>Flyffipedia</span>
          </div>
          <WidgetLauncherPinButton launcherId="flyffipedia" />
        </DropdownMenu.Item>
      {/if}
      {#if isViewerOpen('flyffulator')}
        <DropdownMenu.Item class="justify-between gap-2 data-highlighted:bg-transparent data-highlighted:text-foreground" onclick={ignoreActiveLauncherClick}>
          <div class="flex min-w-0 items-center gap-2">
            <Scroll class="h-4 w-4" />
            <span>Flyffulator</span>
          </div>
          <div class="flex items-center gap-1">
            <WidgetLauncherPinButton launcherId="flyffulator" />
            <Button
              size="icon"
              variant="ghost"
              class="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
              onclick={(event) => closeViewer('flyffulator', event)}
              title="Close"
            >
              <X class="h-3 w-3" />
            </Button>
          </div>
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item class="justify-between gap-2" onclick={() => openViewer('flyffulator')}>
          <div class="flex min-w-0 items-center gap-2">
            <Scroll class="h-4 w-4" />
            <span>Flyffulator</span>
          </div>
          <WidgetLauncherPinButton launcherId="flyffulator" />
        </DropdownMenu.Item>
      {/if}
      {#if isViewerOpen('navi_guide')}
        <DropdownMenu.Item class="justify-between gap-2 data-highlighted:bg-transparent data-highlighted:text-foreground" onclick={ignoreActiveLauncherClick}>
          <div class="flex min-w-0 items-center gap-2">
            <PawPrint class="h-4 w-4" />
            <span>Navi Guide</span>
          </div>
          <div class="flex items-center gap-1">
            <WidgetLauncherPinButton launcherId="navi_guide" />
            <Button
              size="icon"
              variant="ghost"
              class="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
              onclick={(event) => closeViewer('navi_guide', event)}
              title="Close"
            >
              <X class="h-3 w-3" />
            </Button>
          </div>
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item class="justify-between gap-2" onclick={() => openViewer('navi_guide')}>
          <div class="flex min-w-0 items-center gap-2">
            <PawPrint class="h-4 w-4" />
            <span>Navi Guide</span>
          </div>
          <WidgetLauncherPinButton launcherId="navi_guide" />
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
  <MiniBrowserDropdownItem />
  <DropdownMenu.Separator />
  <ActionPinDropdownItem />
  <ActionPadDropdownItem />
  <FloatingSessionDropdownItem />
</DropdownMenu.Group>
