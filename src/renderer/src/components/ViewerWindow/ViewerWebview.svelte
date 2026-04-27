<script lang="ts">
  import type { WebviewTag } from 'electron';
  import { NAVI_BESTIARY_SHEETS } from '$lib/utils/viewerConstants';

  const webviewPreloadPath: string = (window as any)._preloadPaths?.webview ?? '';

  let {
    src,
    injectCss = true,
    onLoadingChange,
  }: {
    src: string;
    injectCss?: boolean;
    onLoadingChange?: (value: boolean) => void;
  } = $props();

  let loading = $state(true);

  let webviewElement: WebviewTag | null = null;
  let loadError = $state('');

  const GOOGLE_CHROME_HIDE_CSS = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
    }

    [role="banner"],
    header,
    footer,
    .docs-ml-header,
    .publish-mode-header,
    .publish-mode-footer,
    .docs-material-header,
    .docs-chrome,
    #footer,
    .footer,
    #sheet-menu,
    #sheet-menu-container,
    #sheet-menu-bar,
    #sheet-menu-wrapper,
    .sheet-menu,
    .sheet-tabs,
    .docs-sheet-tabbar,
    .docs-sheet-tab-bar,
    .docs-sheet-tabs,
    .waffle-sheet-tabs,
    .waffle-sheet-tabbar,
    [aria-label*="sheet tab" i],
    [aria-label*="sheet tabs" i],
    [role="tablist"] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      min-height: 0 !important;
    }

    body > div,
    body > iframe {
      margin-top: 0 !important;
    }
  `;

  function applyChromeHiding() {
    if (!injectCss || !webviewElement) return;

    void webviewElement.insertCSS(GOOGLE_CHROME_HIDE_CSS).catch((error) => {
      console.warn('[ViewerWebview] Failed to inject CSS:', error);
    });
  }

  function removeGoogleSheetsTabBar() {
    if (!injectCss || !webviewElement) return;

    const cleanupScript = `
      (() => {
        const labels = ${JSON.stringify(NAVI_BESTIARY_SHEETS.map((sheet) => sheet.label))};
        const lowerBoundary = window.innerHeight * 0.65;
        const nodes = Array.from(document.querySelectorAll('body *'));

        for (const node of nodes) {
          const rect = node.getBoundingClientRect();
          if (rect.top < lowerBoundary) {
            continue;
          }

          const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
          if (!text) {
            continue;
          }

          let matchCount = 0;
          for (const label of labels) {
            if (text.includes(label)) {
              matchCount += 1;
            }
          }

          if (matchCount >= 6) {
            const container = node.closest('table, tbody, tr, div, nav, footer, section, form') ?? node;
            container.remove();
            break;
          }
        }
      })();
    `;

    void webviewElement.executeJavaScript(cleanupScript, true).catch((error) => {
      console.warn('[ViewerWebview] Failed to remove Google Sheets tab bar:', error);
    });
  }

  function refreshViewerChrome() {
    applyChromeHiding();
    removeGoogleSheetsTabBar();
    setTimeout(() => {
      removeGoogleSheetsTabBar();
    }, 200);
  }

  function handleDomReady() {
    loadError = '';
    loading = false;
    onLoadingChange?.(false);
    refreshViewerChrome();
  }

  function handleDidNavigate() {
    refreshViewerChrome();
  }

  function handleDidStopLoading() {
    loading = false;
    onLoadingChange?.(false);
    refreshViewerChrome();
  }

  function handleDidStartLoading() {
    loading = true;
    onLoadingChange?.(true);
    loadError = '';
  }

  function handleDidFailLoad(event: { errorCode?: number }) {
    if (event?.errorCode === -3) return;
    loadError = 'Could not load content. Check your connection and try again.';
    loading = false;
    onLoadingChange?.(false);
  }

  function handleNewWindow(event: { preventDefault: () => void }) {
    event.preventDefault();
  }

  function attachWebview(node: WebviewTag, initialSrc: string) {
    webviewElement = node;

    const handleDomReadyEvent = () => handleDomReady();
    const handleDidNavigateEvent = () => handleDidNavigate();
    const handleDidStopLoadingEvent = () => handleDidStopLoading();
    const handleDidStartLoadingEvent = () => handleDidStartLoading();
    const handleDidFailLoadEvent = (event: Event) => handleDidFailLoad(event as { errorCode?: number });
    const handleNewWindowEvent = (event: Event) => handleNewWindow(event as { preventDefault: () => void });

    node.addEventListener('dom-ready', handleDomReadyEvent);
    node.addEventListener('did-navigate', handleDidNavigateEvent);
    node.addEventListener('did-stop-loading', handleDidStopLoadingEvent);
    node.addEventListener('did-start-loading', handleDidStartLoadingEvent);
    node.addEventListener('did-fail-load', handleDidFailLoadEvent);
    node.addEventListener('new-window', handleNewWindowEvent);

    node.src = initialSrc;

    return {
      update(nextSrc: string) {
        if (nextSrc && node.src !== nextSrc) {
          loading = true;
          onLoadingChange?.(true);
          loadError = '';
          node.src = nextSrc;
        }
      },
      destroy() {
        node.removeEventListener('dom-ready', handleDomReadyEvent);
        node.removeEventListener('did-navigate', handleDidNavigateEvent);
        node.removeEventListener('did-stop-loading', handleDidStopLoadingEvent);
        node.removeEventListener('did-start-loading', handleDidStartLoadingEvent);
        node.removeEventListener('did-fail-load', handleDidFailLoadEvent);
        node.removeEventListener('new-window', handleNewWindowEvent);
        if (webviewElement === node) {
          webviewElement = null;
        }
      }
    };
  }
</script>

<div class="relative h-full w-full overflow-hidden bg-background">
  <webview
    bind:this={webviewElement}
    class="h-full w-full"
    preload={webviewPreloadPath}
    use:attachWebview={src}
    partition="persist:viewer"
  ></webview>

  {#if loadError}
    <div class="absolute inset-0 flex items-center justify-center bg-background/95 px-6 text-center text-sm text-muted-foreground">
      <div class="max-w-md rounded-lg border border-border/70 bg-card p-4 shadow-sm">
        <p class="font-medium text-foreground">Viewer unavailable</p>
        <p class="mt-2">{loadError}</p>
      </div>
    </div>
  {:else if loading}
    <div class="absolute inset-0 flex items-center justify-center bg-background/80">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>
  {/if}
</div>
