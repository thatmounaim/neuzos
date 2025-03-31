<script lang="ts">
  import type { WebviewTag } from 'electron'
  import { onMount } from 'svelte'
  import { ChevronDown, ChevronUp, Globe, Home, RefreshCcw, Search, Star } from 'lucide-svelte'
  import { fly } from 'svelte/transition'

  export let open : boolean = false

  type CommunityFavourite = {
    id: string
    label: string
    url: string
  }
  const browserCommunityFavs: CommunityFavourite[] = [
    {
      id: 'flyffipedia',
      label: 'Flyffipedia',
      url: 'https://flyffipedia.com'
    },
    {
      id: 'siegestats',
      label: 'SiegeStats',
      url: 'https://siegestats.cc/'
    },
    {
      id: 'flyffulator',
      label: 'Flyffulator',
      url: 'https://flyffulator.com'
    }
  ]
  let browserWebView: WebviewTag
  let browserSrc: string = ''
  //let borwserCanGoBack: boolean = false;
  //let borwserCanGoForward: boolean = false;
  let openCommunity: boolean = false
  onMount(() => {
    setupBrowser()
  })

  function setupBrowser() {
    if (browserWebView == null || browserWebView == undefined) {
      setTimeout(() => {
        setupBrowser()
      }, 500)
      return
    }

    browserWebView.addEventListener('did-navigate', updateBrowserState)
    browserWebView.addEventListener('did-navigate-in-page', updateBrowserState)
    browserWebView.addEventListener('did-redirect-navigation', updateBrowserState)
    updateBrowserState()
  }

  function updateBrowserState() {
    browserSrc = browserWebView.src
    setTimeout(() => {
      //borwserCanGoBack = browserWebView.canGoBack();
      //borwserCanGoForward = browserWebView.canGoForward();
      browserSrc = browserWebView.src
    }, 500)
  }
</script>

<div class="flex flex-col w-full h-full border-t {open ? '' : 'hidden'}">
  <div class="flex border-b bg-background items-center">
    <form
      class="flex gap-2 flex-1 items-center border-r"
      on:submit|preventDefault={() => browserWebView.loadURL(browserSrc)}
    >
      <div class="flex items-center border-r">
        <!--
                            TODO: Figure out Back/Forward Button Not Working in Webview
                        <button
                            on:click={() => {
                                browserWebView.goBack();
                            }}
                            class="p-2"
                            class:text-neutral-400={!borwserCanGoBack}
                            disabled={!borwserCanGoBack}
                        >
                            <Undo class="w-4" /></button
                        >
                        <button
                            on:click={() => {
                                browserWebView.goForward();
                            }}
                            class="p-2"
                            class:text-neutral-400={!borwserCanGoForward}
                            disabled={!borwserCanGoForward}
                        >
                            <Redo class="w-4" /></button
                        > -->
        <button
          on:click={() => {
            browserWebView.reload()
          }}
          class="p-2 px-3 pl-3.5 hover:bg-black/10 duration-200"
        >
          <RefreshCcw class="w-4" /></button
        >
      </div>
      <Globe class="w-4" />

      <input class="flex-1 text-xs p-1" type="text" bind:value={browserSrc} />
      <button class="hover:cursor-pointer hover:bg-black/10 duration-200 p-2">
        <Search class="w-4" /></button
      >
    </form>
    <button
      class="p-2 hover:bg-background/10 duration-200 border-r"
      on:click={() => {
        browserWebView.loadURL('https://duckduckgo.com')
      }}
    >
      <Home class="w-4" />
    </button>
    <div class="p-2 relative flex {openCommunity ? 'bg-black/5' : 'hover:bg-black/5'} duration-200">
      <button
        on:click={() => (openCommunity = !openCommunity)}
        class="flex items-center px-2 gap-2"
      >
        <Star class="w-4" />
        <strong>Community</strong>
        {#if openCommunity}
          <ChevronUp class="w-4" />
        {:else}
          <ChevronDown class="w-4" />
        {/if}
      </button>
      {#if openCommunity}
        <div
          transition:fly={{ y: '100vh' }}
          class="absolute right-4 top-8 w-[80%] flex items-center flex-col bg-background border mx-2 rounded"
        >
          {#each browserCommunityFavs as browserFav}
            <button
              class="flex gap-2 hover:bg-black/10 duration-200 p-2 w-full items-center justify-center"
              on:click={() => {
                browserWebView.loadURL(browserFav.url)
                openCommunity = false
              }}
            >
              <img src="community/{browserFav.id}.png?asset" class="h-7" alt={browserFav.label} />
              <small class="font-semibold">{browserFav.label}</small></button
            >
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <webview
  src="https://duckduckgo.com/"
  partition="persist:browser"
  bind:this={browserWebView}
  class="w-full h-full"
/>
</div>
