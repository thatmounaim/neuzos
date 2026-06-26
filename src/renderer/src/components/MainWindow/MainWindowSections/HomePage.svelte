<script lang="ts">
  import { getContext, onMount } from "svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Tabs from "$lib/components/ui/tabs";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Button } from "$lib/components/ui/button";
  import { Github, RefreshCcw } from "@lucide/svelte";
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
  let appVersion = $state("");

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
    void electronApi.invoke("app.get_version").then((version) => {
      appVersion = String(version ?? "");
    }).catch(() => {
      appVersion = "";
    });
  });
</script>

<div
  class="h-full w-full left-0 top-0 absolute bg-background {mainWindowState.tabs.activeLayoutId === 'home'
            ? 'z-[39]'
            : 'z-[0] hidden'} overflow-hidden"
>
  <div class="h-full w-full overflow-auto p-4">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 items-center gap-4">
        <img src="/neuzos_pang.png" alt="NeuzOS Pang" class="h-20 w-20 shrink-0 object-contain" />
        <div class="min-w-0">
          <h1 class="text-2xl font-bold">Welcome to NeuzOS!</h1>
          <p class="mt-1 text-lg text-muted-foreground">
            Stay Updated with the Latest News and Events from Flyff Universe.
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <div class="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-xs">
          Current Version{appVersion ? ` ${appVersion}` : ""}
        </div>
        <Button
          href="https://github.com/flyffu-community/neuzos"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
        >
          NeuzOS on GitHub
          <Github />
        </Button>
        <Button
          href="https://discord.gg/mNQ5UT5e9X"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-[#5865F2] text-white hover:bg-[#4752C4]"
        >
          Join us on Discord!
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="size-4 fill-current"
          >
            <path d="M20.3 4.4A16.5 16.5 0 0 0 16.2 3l-.2.4a12.8 12.8 0 0 1 3.6 1.8 13.8 13.8 0 0 0-4.4-1.4 14 14 0 0 0-6.4 0 13.8 13.8 0 0 0-4.4 1.4A12.8 12.8 0 0 1 8 3.4L7.8 3a16.5 16.5 0 0 0-4.1 1.4C1.1 8.2.4 11.9.7 15.5A16.6 16.6 0 0 0 5.8 18l.6-.9a10.8 10.8 0 0 1-1.6-.8l.4-.3a11.9 11.9 0 0 0 13.6 0l.4.3a10.8 10.8 0 0 1-1.6.8l.6.9a16.6 16.6 0 0 0 5.1-2.5c.4-4.2-.7-7.8-3-11.1ZM8.6 13.3c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.8 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
          </svg>
        </Button>
      </div>
    </div>
    <Tabs.Root value="updates" class="w-full">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Tabs.List>
          <Tabs.Trigger value="updates">Updates</Tabs.Trigger>
          <Tabs.Trigger value="events">Events</Tabs.Trigger>
          <Tabs.Trigger value="shop">Cash Shop</Tabs.Trigger>
        </Tabs.List>
        <Button variant="outline" onclick={fetchFlyffPageData} disabled={loading}>
          Refresh News
          <RefreshCcw />
        </Button>
      </div>
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
