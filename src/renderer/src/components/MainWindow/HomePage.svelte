<script lang="ts">
  import {getContext, onMount} from 'svelte';
  import type {IpcRenderer} from "@electron-toolkit/preload";
  import * as Card from '$lib/components/ui/card';
  import {Skeleton} from "$lib/components/ui/skeleton";
  import {Button} from "$lib/components/ui/button";
  import {RefreshCcw} from '@lucide/svelte'

  const electronApi = getContext<IpcRenderer>('electronApi');

  let loading: boolean = $state(true)
  type FlyffNewsItem = {
    title: string
    link: string
    imageSrc: string
    summary: string
  }
  const flyffPageData: {
    latest: {
      updates: FlyffNewsItem[]
      events: FlyffNewsItem[]
      shop: FlyffNewsItem[]
    }
  } = $state({
    latest: {
      updates: [],
      events: [],
      shop: []
    }
  })

  const parseFlyffDom = (newsElement: Element) => {
    const newsElements = newsElement?.querySelectorAll('div > div > a')
    const data: FlyffNewsItem[] = []
    newsElements.forEach(news => {
      const link = news.getAttribute('href');
      const imageSrc = news.querySelector('img')?.getAttribute('src') || '';
      const title = news.querySelector('div > h5')?.textContent || '';
      const sumary = news.querySelector('div > h6')?.textContent || '';

      data.push({
        title: title,
        link: link || '',
        imageSrc: imageSrc,
        summary: sumary
      })
    })

    return data
  }
  const fetchFlyffPageData = async () => {
    loading = true
    const htmlData = await electronApi.invoke('fetch.flyff_news')
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, 'text/html');
    // Extract updates
    const updatesElement = doc.querySelector('#nav-1 > div ');
    flyffPageData.latest.updates = updatesElement ? parseFlyffDom(updatesElement) : [];
    const eventsElement = doc.querySelector('#nav-2 > div ');
    flyffPageData.latest.events = eventsElement ? parseFlyffDom(eventsElement) : [];
    const shopElement = doc.querySelector('#nav-3 > div ');
    flyffPageData.latest.shop = shopElement ? parseFlyffDom(shopElement) : [];
    loading = false
  }

  onMount(() => {
    fetchFlyffPageData();
  })
</script>

<div class="h-full w-full overflow-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Welcome to NeuZOS!</h1>
  <div class="flex items-center gap-4 justify-between">
  <h1 class="text-lg mb-6 text-muted-foreground">Stay updated with the latest news and events from Flyff Universe.</h1>

    <Button variant="outline" onclick={fetchFlyffPageData} disabled={loading}>
      Refresh News
      <RefreshCcw/>
    </Button>
  </div>
  <div class="flex flex-col gap-4">
    <Card.Root>
      <Card.Header>
        Latest Updates
      </Card.Header>
      <Card.Content>
        {#if loading}
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {#each [1, 2, 3] as _}
              <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                <Skeleton class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md"/>
                <div class="flex flex-col gap-2 flex-1">
                  <Skeleton class="h-6 w-3/4"/>
                  <Skeleton class="h-4 w-full"/>
                  <Skeleton class="h-4 w-5/6"/>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {#each flyffPageData.latest.updates as item}
              <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                <img src={item.imageSrc} alt={item.title} class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md"/>
                <div>
                  <a href={item.link} target="_blank"
                     class="text-lg font-bold text-primary hover:underline">{item.title}</a>
                  <p class="text-sm text-muted-foreground mt-2">{item.summary}</p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Card.Content>
      <Card.Footer>
        <a href="https://universe.flyff.com/news" target="_blank" class="text-primary hover:underline">
          View all news on Flyff Universe
        </a>
      </Card.Footer>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        Latest Events
      </Card.Header>
      <Card.Content>
        {#if loading}
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {#each [1, 2, 3] as _}
              <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                <Skeleton class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md"/>
                <div class="flex flex-col gap-2 flex-1">
                  <Skeleton class="h-6 w-3/4"/>
                  <Skeleton class="h-4 w-full"/>
                  <Skeleton class="h-4 w-5/6"/>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {#each flyffPageData.latest.events as item}
              <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                <img src={item.imageSrc} alt={item.title} class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md"/>
                <div>
                  <a href={item.link} target="_blank"
                     class="text-lg font-bold text-primary hover:underline">{item.title}</a>
                  <p class="text-sm text-muted-foreground mt-2">{item.summary}</p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Card.Content>
      <Card.Footer>
        <a href="https://universe.flyff.com/news" target="_blank" class="text-primary hover:underline">
          View all news on Flyff Universe
        </a>
      </Card.Footer>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        Latest Shop Updates
      </Card.Header>
      <Card.Content>
        {#if loading}
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {#each [1, 2, 3] as _}
              <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                <Skeleton class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md"/>
                <div class="flex flex-col gap-2 flex-1">
                  <Skeleton class="h-6 w-3/4"/>
                  <Skeleton class="h-4 w-full"/>
                  <Skeleton class="h-4 w-5/6"/>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {#each flyffPageData.latest.shop as item}
              <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                <img src={item.imageSrc} alt={item.title} class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md"/>
                <div>
                  <a href={item.link} target="_blank"
                     class="text-lg font-bold text-primary hover:underline">{item.title}</a>
                  <p class="text-sm text-muted-foreground mt-2">{item.summary}</p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Card.Content>
      <Card.Footer>
        <a href="https://universe.flyff.com/news" target="_blank" class="text-primary hover:underline">
          View all news on Flyff Universe
        </a>
      </Card.Footer>
    </Card.Root>
  </div>
</div>
