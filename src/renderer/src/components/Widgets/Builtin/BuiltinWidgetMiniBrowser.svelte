<script lang="ts">
  import FloatingWindow from '../../Shared/FloatingWindow.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Globe, RefreshCw, ChevronLeft, ChevronRight, Star, Trash2 } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

  interface Favorite {
    url: string;
    title: string;
    addedAt: number;
  }

  interface Props {
    visible?: boolean;
    onClose?: () => void;
    onHide?: () => void;
    data?: { url?: string; instanceNumber?: number };
  }

  let { visible = true, onClose, onHide, data }: Props = $props();
  let windowRef: FloatingWindow;
  let webviewRef: HTMLElement;

  const FAVORITES_STORAGE_KEY = 'widget.builtin.mini_browser.favorites';

  // Get instance number - from data when widget is created
  const instanceNumber = data?.instanceNumber || 1;

  const initialUrl = data?.url || 'https://www.google.com';
  let inputUrl = $state(initialUrl);
  let isLoading = $state(false);
  let canGoBack = $state(false);
  let canGoForward = $state(false);
  let pageTitle = $state('New Tab');
  let favorites = $state<Favorite[]>(loadFavorites());
  let isEditingFavorites = $state(false);

  const isFavorited = $derived(favorites.some(f => f.url === inputUrl));

  // Check if the base domain is in favorites (but not the exact URL)
  const isDomainFavorited = $derived.by(() => {
    if (isFavorited) return false; // Exact match takes precedence
    try {
      const currentDomain = new URL(inputUrl).hostname;
      return favorites.some(f => {
        try {
          return new URL(f.url).hostname === currentDomain;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  });

  // Load favorites from localStorage
  function loadFavorites(): Favorite[] {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load favorites:', e);
    }
    return [];
  }

  // Save favorites to localStorage
  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  }

  function toggleFavorite() {
    if (isFavorited) {
      // Remove from favorites
      favorites = favorites.filter(f => f.url !== inputUrl);
    } else {
      // Add to favorites
      favorites = [...favorites, {
        url: inputUrl,
        title: pageTitle,
        addedAt: Date.now()
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
    minWidth={400}
    minHeight={300}
    onClose={onClose}
    onHide={onHide}
  >
    {#snippet titleSnippet()}
      <div class="flex items-center gap-2">
        <Globe size={16} />
        <span>({instanceNumber}) Browser - {pageTitle}</span>
      </div>
    {/snippet}

    <div class="flex flex-col h-full -m-3">
      <!-- Navigation Bar -->
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


        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({props})}
              <Button
                {...props}
                size="icon"
                variant="ghost"
                class="h-8 w-8 {isFavorited ? 'text-yellow-500' : isDomainFavorited ? 'text-yellow-300' : ''}"
                title="Favorites"
              >
                <Star class="h-4 w-4 {isFavorited ? 'fill-current' : ''}" />
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
                {isFavorited ? 'Already in favorites' : 'Add to favorites'}
              </Button>
            </div>
            <DropdownMenu.Separator />
            {#if favorites.length === 0}
              <div class="px-2 py-6 text-center text-sm text-muted-foreground">
                No favorites yet
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

        <form onsubmit={(e) => { e.preventDefault(); navigateToUrl(); }} class="flex-1">
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
            class="h-8 text-sm"
          />
        </form>
      </div>

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

