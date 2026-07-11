<script lang="ts">
  import FloatingWindow from '../../../Shared/FloatingWindow.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { BrushCleaning, Check, ChevronLeft, ChevronRight, Globe, Minus, PanelTopClose, PanelTopOpen, Plus, RefreshCw, Settings, Star, Trash2, X, ZoomIn } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import * as Popover from '$lib/components/ui/popover';
  import {neuzosBridge} from '$lib/core';
  import {
    readMiniBrowserFavorites,
    readMiniBrowserWindowState,
    readMiniBrowserZoom,
    writeMiniBrowserFavorites,
    writeMiniBrowserWindowState,
    writeMiniBrowserZoom,
    type MiniBrowserFavorite
  } from '$lib/localStorageStores';

  type Favorite = MiniBrowserFavorite;

  interface Props {
    visible?: boolean;
    onClose?: () => void;
    onHide?: () => void;
    data?: { url?: string; instanceNumber?: number };
  }

  let { visible = true, onClose, onHide, data }: Props = $props();
  let windowRef: FloatingWindow;
  let webviewRef: HTMLElement;

  const instanceNumber = (() => data?.instanceNumber || 1)();
  const initialUrl = (() => data?.url || 'https://www.google.com')();
  let inputUrl = $state(initialUrl);
  let isLoading = $state(false);
  let canGoBack = $state(false);
  let canGoForward = $state(false);
  let pageTitle = $state('New Tab');
  let favorites = $state<Favorite[]>(readMiniBrowserFavorites());
  let isEditingFavorites = $state(false);
  let isBrowserExpanded = $state(false);
  let isClearingCache = $state(false);
  let cacheFeedback = $state('');
  let cacheFeedbackType = $state<'success' | 'error' | null>(null);
  let browserZoom = $state(readMiniBrowserZoom());

  const zoomSteps = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 300, 400, 500];

  const isFavorited = $derived(favorites.some(f => f.url === inputUrl));

  function saveFavorites() {
    writeMiniBrowserFavorites(favorites);
  }

  function toggleFavorite() {
    if (isFavorited) {
      // Remove from favorites
      favorites = favorites.filter(f => f.url !== inputUrl);
    } else {
      // Add to favorites
      favorites = [...favorites, {
        url: inputUrl,
        title: pageTitle
      }];
    }
    saveFavorites();
  }

  function removeFavorite(url: string) {
    favorites = favorites.filter(f => f.url !== url);
    saveFavorites();
  }

  function openFavorite(url: string) {
    inputUrl = url;
    if (webviewRef) {
      (webviewRef as any).src = url;
    }
  }

  function navigateToUrl() {
    if (!inputUrl.trim()) return;

    let url = inputUrl.trim();

    // Add https:// if no protocol specified
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (webviewRef) {
      (webviewRef as any).src = url;
    }
  }

  function refresh() {
    if (webviewRef) {
      (webviewRef as any).reload();
    }
  }

  async function clearBrowserCache() {
    if (isClearingCache) return;
    isClearingCache = true;
    cacheFeedback = '';
    cacheFeedbackType = null;
    try {
      await neuzosBridge.browser.clearCache();
      cacheFeedback = 'Browser Cache Cleared!';
      cacheFeedbackType = 'success';
      refresh();
    } catch (error) {
      cacheFeedback = 'Failed to Clear Browser Cache!';
      cacheFeedbackType = 'error';
    } finally {
      isClearingCache = false;
      setTimeout(() => {
        cacheFeedback = '';
        cacheFeedbackType = null;
      }, 2400);
    }
  }

  function applyBrowserZoom() {
    if (!webviewRef) return;
    const webview = webviewRef as any;
    if (typeof webview.setZoomFactor === 'function') {
      webview.setZoomFactor(browserZoom / 100);
    }
  }

  function setBrowserZoom(value: number) {
    browserZoom = value;
    writeMiniBrowserZoom(browserZoom);
    applyBrowserZoom();
  }

  function stepBrowserZoom(direction: -1 | 1) {
    const currentIndex = zoomSteps.findIndex(step => step === browserZoom);
    const fallbackIndex = zoomSteps.reduce((nearestIndex, step, index) => {
      return Math.abs(step - browserZoom) < Math.abs(zoomSteps[nearestIndex] - browserZoom) ? index : nearestIndex;
    }, 0);
    const baseIndex = currentIndex >= 0 ? currentIndex : fallbackIndex;
    const nextIndex = Math.max(0, Math.min(zoomSteps.length - 1, baseIndex + direction));
    setBrowserZoom(zoomSteps[nextIndex]);
  }

  function goBack() {
    if (webviewRef && canGoBack) {
      (webviewRef as any).goBack();
    }
  }

  function goForward() {
    if (webviewRef && canGoForward) {
      (webviewRef as any).goForward();
    }
  }

  onMount(() => {
    if (webviewRef) {
      const webview = webviewRef as any;

      // Update URL bar when navigation occurs
      webview.addEventListener('did-navigate', (event: any) => {
        inputUrl = event.url;
        isLoading = false;
        canGoBack = webview.canGoBack();
        canGoForward = webview.canGoForward();
        isBrowserExpanded = false;
      });

      webview.addEventListener('did-navigate-in-page', (event: any) => {
        inputUrl = event.url;
        canGoBack = webview.canGoBack();
        canGoForward = webview.canGoForward();
      });

      // Handle loading states
      webview.addEventListener('did-start-loading', () => {
        isLoading = true;
      });

      webview.addEventListener('did-stop-loading', () => {
        isLoading = false;
      });

      webview.addEventListener('dom-ready', () => {
        applyBrowserZoom();
      });

      // Update page title
      webview.addEventListener('page-title-updated', (event: any) => {
        pageTitle = event.title || 'New Tab';
      });

      // Set initial URL once
      webview.src = initialUrl;
    }
  });

  export function reset() {
    windowRef?.reset();
  }
</script>

<div style="display: {visible ? 'block' : 'none'};">
  <FloatingWindow
    bind:this={windowRef}
    defaultX={150}
    defaultY={100}
    defaultWidth={900}
    defaultHeight={600}
    persistId="widget.builtin.mini_browser"
    loadPersistedState={readMiniBrowserWindowState}
    savePersistedState={writeMiniBrowserWindowState}
    minWidth={400}
    minHeight={300}
    onClose={onClose}
    onHide={onHide}
    flushBottom={true}
  >
    {#snippet titleSnippet()}
      <div class="flex items-center gap-2">
        <Globe size={16} />
        <span>({instanceNumber}) Browser - {pageTitle}</span>
      </div>
    {/snippet}

    {#snippet controlSnippet()}
      <button
        class="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-transparent bg-transparent p-1 text-foreground transition-colors hover:border-input hover:bg-background dark:hover:bg-input/30"
        onclick={(e) => {
          e.stopPropagation();
          isBrowserExpanded = !isBrowserExpanded;
        }}
        title={isBrowserExpanded ? 'Show Navigation Bar' : 'Hide Navigation Bar'}
      >
        {#if isBrowserExpanded}
          <PanelTopOpen size={14} />
        {:else}
          <PanelTopClose size={14} />
        {/if}
      </button>
    {/snippet}

    <div class="flex flex-col h-full overflow-hidden">
      <!-- Navigation Bar -->
      {#if !isBrowserExpanded}
      <div class="flex items-center gap-2 p-2 border-b border-border bg-muted/30 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          class="h-8 w-8"
          onclick={goBack}
          disabled={!canGoBack}
          title="Back"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          class="h-8 w-8"
          onclick={goForward}
          disabled={!canGoForward}
          title="Forward"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          class="h-8 w-8"
          onclick={refresh}
          disabled={isLoading}
          title="Refresh"
        >
          <RefreshCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
        </Button>


        <form onsubmit={(e) => { e.preventDefault(); navigateToUrl(); }} class="relative flex-1">
          <Input
            type="text"
            value={inputUrl}
            oninput={(e) => inputUrl = e.currentTarget.value}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                navigateToUrl();
              }
            }}
            placeholder="Enter URL..."
            class="h-8 pr-10 text-sm"
          />
          <div class="absolute right-1 top-1/2 -translate-y-1/2">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({props})}
                  <Button
                    {...props}
                    size="icon"
                    variant="ghost"
                    class="h-6 w-6 {isFavorited ? 'text-yellow-500' : 'text-muted-foreground'}"
                    title="Favorites"
                  >
                    <Star class="h-3.5 w-3.5 {isFavorited ? 'fill-current' : ''}" />
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" class="w-80">
                <div class="flex items-center justify-between px-2 py-1.5">
                  <DropdownMenu.Label>Favorites</DropdownMenu.Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="h-6 px-2 text-xs"
                    onclick={() => isEditingFavorites = !isEditingFavorites}
                  >
                    {isEditingFavorites ? 'Done' : 'Edit'}
                  </Button>
                </div>
                <DropdownMenu.Separator />

                <!-- Add to favorites button -->
                <div class="px-2 py-2">
                  <Button
                    size="sm"
                    variant={isFavorited ? "secondary" : "default"}
                    class="w-full gap-2 h-8 {isFavorited ? 'text-yellow-500' : ''}"
                    onclick={toggleFavorite}
                    disabled={isFavorited}
                  >
                    <Star class="h-3.5 w-3.5 {isFavorited ? 'fill-current' : ''}" />
                    {isFavorited ? 'Already in Favorites' : 'Add to Favorites'}
                  </Button>
                </div>
                <DropdownMenu.Separator />
                {#if favorites.length === 0}
                  <div class="px-2 py-6 text-center text-sm text-muted-foreground">
                    No Favorites
                  </div>
                {:else}
                  {#each favorites as favorite}
                    <DropdownMenu.Item
                      class="flex items-center justify-between gap-2"
                      onclick={() => !isEditingFavorites && openFavorite(favorite.url)}
                    >
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-sm truncate">{favorite.title}</div>
                        <div class="text-xs text-muted-foreground truncate">{favorite.url}</div>
                      </div>
                      {#if isEditingFavorites}
                        <Button
                          size="icon"
                          variant="ghost"
                          class="h-6 w-6 shrink-0 hover:bg-destructive hover:text-destructive-foreground"
                          onclick={(e) => {
                            e.stopPropagation();
                            removeFavorite(favorite.url);
                          }}
                          title="Remove"
                        >
                          <Trash2 class="h-3 w-3" />
                        </Button>
                      {/if}
                    </DropdownMenu.Item>
                  {/each}
                {/if}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </form>

        <Popover.Root>
          <Popover.Trigger>
            {#snippet child({props})}
              <Button
                {...props}
                size="icon"
                variant="ghost"
                class="h-8 w-8"
                title="Browser Settings"
              >
                <Settings class="h-4 w-4" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content align="start" class="w-64 p-3">
            <div class="space-y-3">
              <div>
                <div class="text-sm font-medium">Browser Settings</div>
              </div>
              <div class="rounded-md border border-border bg-muted/30 p-2">
                <div class="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ZoomIn class="h-4 w-4" />
                  <span>Zoom</span>
                </div>
                <div class="grid grid-cols-[2rem_1fr_2rem] items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    class="h-8 w-8"
                    onclick={() => stepBrowserZoom(-1)}
                    disabled={browserZoom <= zoomSteps[0]}
                    title="Zoom Out"
                  >
                    <Minus class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-8"
                    onclick={() => setBrowserZoom(100)}
                    title="Reset Zoom"
                  >
                    {browserZoom}%
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    class="h-8 w-8"
                    onclick={() => stepBrowserZoom(1)}
                    disabled={browserZoom >= zoomSteps[zoomSteps.length - 1]}
                    title="Zoom In"
                  >
                    <Plus class="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="w-full justify-start gap-2"
                onclick={clearBrowserCache}
                disabled={isClearingCache}
              >
                {#if cacheFeedbackType === 'success'}
                  <Check class="h-4 w-4 text-emerald-500" />
                {:else if cacheFeedbackType === 'error'}
                  <X class="h-4 w-4 text-destructive" />
                {:else}
                  <BrushCleaning class="h-4 w-4 text-destructive" />
                {/if}
                {isClearingCache ? 'Clearing Browser Cache...' : cacheFeedback || 'Clear Browser Cache'}
              </Button>
            </div>
          </Popover.Content>
        </Popover.Root>
      </div>
      {/if}

      <!-- Webview -->
      <div class="flex-1 overflow-hidden bg-white">
        <webview
          bind:this={webviewRef}
          src={initialUrl}
          partition="persist:browser"
          class="w-full h-full"
          allowpopups
        ></webview>
      </div>
    </div>
  </FloatingWindow>
</div>

