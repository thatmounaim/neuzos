<script lang="ts">
  import { getContext, onMount } from "svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Tabs from "$lib/components/ui/tabs";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Button } from "$lib/components/ui/button";
  import { RefreshCcw } from "@lucide/svelte";
  import type { MainWindowState } from "$lib/types";
  import { getElectronContext } from "$lib/contexts/electronContext";

  const electronApi = getElectronContext();
  const mainWindowState = getContext<MainWindowState>("mainWindowState");

  let loading: boolean = $state(true);
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
    older: {
      updates: FlyffNewsItem[]
      events: FlyffNewsItem[]
      shop: FlyffNewsItem[]
    }
  } = $state({
    latest: {
      updates: [],
      events: [],
      shop: []
    },
    older: {
      updates: [],
      events: [],
      shop: []
    }
  });

  let olderToggleStates: {
    updates: boolean
    events: boolean
    shop: boolean
  } = $state({
    updates: false,
    events: false,
    shop: false
  });

  const parseFlyffDomLatest = (newsElement: Element) => {
    const newsElements = newsElement?.querySelectorAll("div > div > a");
    const data: FlyffNewsItem[] = [];
    newsElements.forEach(news => {
      const link = news.getAttribute("href");
      const imageSrc = news.querySelector("img")?.getAttribute("src") || "";
      const title = news.querySelector("div > h5")?.textContent || "";
      const sumary = news.querySelector("div > h6")?.textContent || "";

      data.push({
        title: title,
        link: link || "",
        imageSrc: imageSrc,
        summary: sumary
      });
    });

    return data;
  };

  const parseFlyffDomOlder = (newsElement: Element) => {
    const newsElements = newsElement?.querySelectorAll("li > a > div");
    const data: FlyffNewsItem[] = [];
    newsElements.forEach(news => {
      const link = news.parentElement?.getAttribute("href");
      const imageSrc = news.querySelector("div:first-child > img")?.getAttribute("src") || "";
      const title = news.querySelector("div:nth-child(2) > h5")?.textContent || "";
      const sumary = news.querySelector("div:nth-child(2) > h6")?.textContent || "";
      data.push({
        title: title,
        link: link || "",
        imageSrc: imageSrc,
        summary: sumary
      });
    });

    return data;
  };
  const fetchFlyffPageData = async () => {
    loading = true;
    const htmlData = await electronApi.invoke("fetch.flyff_news");
    if (htmlData === "") {
      loading = false;
      return;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, "text/html");
    // Extract updates
    const updatesElement = doc.querySelector("#nav-1 > div ");
    flyffPageData.latest.updates = updatesElement ? parseFlyffDomLatest(updatesElement) : [];
    const eventsElement = doc.querySelector("#nav-2 > div ");
    flyffPageData.latest.events = eventsElement ? parseFlyffDomLatest(eventsElement) : [];
    const shopElement = doc.querySelector("#nav-3 > div ");
    flyffPageData.latest.shop = shopElement ? parseFlyffDomLatest(shopElement) : [];
    const olderUpdatesElement = doc.querySelector("#nav-1 > ul ");
    flyffPageData.older.updates = olderUpdatesElement ? parseFlyffDomOlder(olderUpdatesElement) : [];
    const olderEventsElement = doc.querySelector("#nav-2 > ul ");
    flyffPageData.older.events = olderEventsElement ? parseFlyffDomOlder(olderEventsElement) : [];
    const olderShopElement = doc.querySelector("#nav-3 > ul ");
    flyffPageData.older.shop = olderShopElement ? parseFlyffDomOlder(olderShopElement) : [];
    loading = false;
  };

  onMount(() => {
    fetchFlyffPageData();
  });
</script>

<div
  class="h-full w-full left-0 top-0 absolute bg-background {mainWindowState.tabs.activeLayoutId === 'home'
            ? 'z-[39]'
            : 'z-[0] hidden'} overflow-hidden"
>
  <div class="h-full w-full overflow-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Welcome to NeuzOS!</h1>
    <div class="flex items-center gap-4 justify-between">
      <h1 class="text-lg mb-6 text-muted-foreground">Stay updated with the latest news and events from Flyff
        Universe.</h1>

      <Button variant="outline" onclick={fetchFlyffPageData} disabled={loading}>
        Refresh News
        <RefreshCcw />
      </Button>
    </div>
    <Tabs.Root value="updates" class="w-full">
      <Tabs.List>
        <Tabs.Trigger value="updates">Updates</Tabs.Trigger>
        <Tabs.Trigger value="events">Events</Tabs.Trigger>
        <Tabs.Trigger value="shop">Cash Shop</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="updates">
        <Card.Root>
          <Card.Header>
            Latest Updates
          </Card.Header>
          <Card.Content>
            {#if loading}
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {#each [1, 2, 3] as _}
                  <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                    <Skeleton class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md" />
                    <div class="flex flex-col gap-2 flex-1">
                      <Skeleton class="h-6 w-3/4" />
                      <Skeleton class="h-4 w-full" />
                      <Skeleton class="h-4 w-5/6" />
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {#each flyffPageData.latest.updates as item}
                  <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                    <img src={item.imageSrc} alt={item.title}
                         class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md" />
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
          <Card.Content>
            {#if loading}
              <div class="grid grid-cols-1 gap-4">
                {#each [1, 2, 3] as _}
                  <div class="mb-4 p-4 border border-border rounded-lg flex gap-4">
                    <Skeleton class="w-44 h-24 object-cover rounded-md" />
                    <div class="flex flex-col gap-2 flex-1">
                      <Skeleton class="h-6 w-3/4" />
                      <Skeleton class="h-4 w-full" />
                      <Skeleton class="h-4 w-5/6" />
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="grid grid-cols-1 gap-4">
                {#each flyffPageData.older.updates as item}
                  <div class="mb-4 p-4 border border-border rounded-lg flex gap-4">
                    <img src={item.imageSrc} alt={item.title} class="w-44 h-24 object-cover rounded-md" />
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
        </Card.Root>
      </Tabs.Content>
      <Tabs.Content value="events">
        <Card.Root>
          <Card.Header>
            Latest Events
          </Card.Header>
          <Card.Content>
            {#if loading}
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {#each [1, 2, 3] as _}
                  <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                    <Skeleton class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md" />
                    <div class="flex flex-col gap-2 flex-1">
                      <Skeleton class="h-6 w-3/4" />
                      <Skeleton class="h-4 w-full" />
                      <Skeleton class="h-4 w-5/6" />
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {#each flyffPageData.latest.events as item}
                  <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                    <img src={item.imageSrc} alt={item.title}
                         class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md" />
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
          <Card.Content>
            {#if loading}
              <div class="grid grid-cols-1  gap-4">
                {#each [1, 2, 3] as _}
                  <div class="mb-4 p-4 border border-border rounded-lg flex  gap-4">
                    <Skeleton class="w-44  h-24  object-cover rounded-md" />
                    <div class="flex flex-col gap-2 flex-1">
                      <Skeleton class="h-6 w-3/4" />
                      <Skeleton class="h-4 w-full" />
                      <Skeleton class="h-4 w-5/6" />
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="grid grid-cols-1 gap-4">
                {#each flyffPageData.older.events as item}
                  <div class="mb-4 p-4 border border-border rounded-lg flex gap-4">
                    <img src={item.imageSrc} alt={item.title} class="w-44 h-24 object-cover rounded-md" />
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
        </Card.Root>
      </Tabs.Content>
      <Tabs.Content value="shop">
        <Card.Root>
          <Card.Header>
            Latest Shop Updates
          </Card.Header>
          <Card.Content>
            {#if loading}
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {#each [1, 2, 3] as _}
                  <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                    <Skeleton class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md" />
                    <div class="flex flex-col gap-2 flex-1">
                      <Skeleton class="h-6 w-3/4" />
                      <Skeleton class="h-4 w-full" />
                      <Skeleton class="h-4 w-5/6" />
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {#each flyffPageData.latest.shop as item}
                  <div class="mb-4 p-4 border border-border rounded-lg flex xl:flex-col gap-4">
                    <img src={item.imageSrc} alt={item.title}
                         class="w-44 xl:w-full h-24 xl:h-44 object-cover rounded-md" />
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
          <Card.Content>
            {#if loading}
              <div class="grid grid-cols-1 gap-4">
                {#each [1, 2, 3] as _}
                  <div class="mb-4 p-4 border border-border rounded-lg flex gap-4">
                    <Skeleton class="w-44 h-24 object-cover rounded-md" />
                    <div class="flex flex-col gap-2 flex-1">
                      <Skeleton class="h-6 w-3/4" />
                      <Skeleton class="h-4 w-full" />
                      <Skeleton class="h-4 w-5/6" />
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="grid grid-cols-1 gap-4">
                {#each flyffPageData.older.shop as item}
                  <div class="mb-4 p-4 border border-border rounded-lg flex gap-4">
                    <img src={item.imageSrc} alt={item.title} class="w-44 h-24 object-cover rounded-md" />
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
        </Card.Root>
      </Tabs.Content>
    </Tabs.Root>
  </div>
</div>
