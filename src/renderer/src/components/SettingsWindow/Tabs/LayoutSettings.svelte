<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {
    ChevronDown,
    ChevronUp,
    Plus,
    Trash,
    Lock,
    Rows2,
    Columns2,
    BetweenHorizontalStart,
    BetweenVerticalStart,
    GripVertical,
    ArrowDownUp,
    Settings,
    Crosshair,
    Grid2x2Plus,
    LayoutGrid,
    ArrowLeftRight,
    Check,
    Grid2x2Check,
    SquarePen
  } from "@lucide/svelte";

  import {Input} from "$lib/components/ui/input";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import {Separator} from "$lib/components/ui/separator";
  import * as Table from "$lib/components/ui/table";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import type {NeuzConfig} from "$lib/types";
  import {getContext, onMount} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {Switch} from "$lib/components/ui/switch";

  const layoutIcons: string[] = [
    "neuzos_pang",
    "misc/bag",
    "misc/browser",
    "misc/battlepass",
    "misc/fwc",
    "misc/card1",
    "misc/card2",
    "misc/card3",
    "misc/card4",
    "misc/card5",
    "misc/card6",
    "misc/card7",
    "misc/card8",
    "misc/card9",
    "misc/card10",
    "misc/diamond_black",
    "misc/diamond",
    "misc/egg",
    "misc/element_blue",
    "misc/element_green",
    "misc/element_purple",
    "misc/element_red",
    "misc/element_white",
    "misc/element_yellow",
    "misc/heart_blue",
    "misc/heart_cyan",
    "misc/heart_green",
    "misc/heart_red",
    "misc/heart_yellow",
    "misc/item",
    "misc/jewel_black",
    "misc/jewel_green",
    "misc/jewel_purple",
    "misc/jewel_red",
    "misc/jewel_yellow",
    "misc/neuz_hat",
    "misc/perin",
    "misc/pet_food",
    "misc/pickup_pet_buff_1",
    "misc/pickup_pet_buff_2",
    "misc/pickup_pet_buff_3",
    "levels/master_1",
    "levels/master_2",
    "levels/master_3",
    "levels/master_4",
    "levels/master_5",
    "levels/master_6",
    "levels/hero_1",
    "levels/hero_2",
    "levels/hero_3",
    "levels/hero_4",
    'jobs/vagrant',
    'jobs/assist',
    'jobs/ringmaster',
    'jobs/seraph',
    'jobs/billposter',
    'jobs/forcemaster',
    'jobs/acrobat',
    'jobs/ranger',
    'jobs/crackshooter',
    'jobs/jester',
    'jobs/harlequin',
    'jobs/magician',
    'jobs/psykeeper',
    'jobs/mentalist',
    'jobs/elementor',
    'jobs/arcanist',
    'jobs/mercenary',
    'jobs/knight',
    'jobs/templar',
    'jobs/blade',
    'jobs/slayer',
    "pets/level_1",
    "pets/level_2",
    "pets/level_3",
    "pets/level_4",
    "pets/level_5",
    "pets/level_6",
    "pets/level_7",
    "pets/level_8",
    "pets/level_9",
    "pets/pet_angel",
    "pets/pet_angel_s",
    "pets/pet_crab",
    "pets/pet_crab_s",
    "pets/pet_dragon",
    "pets/pet_dragon_s",
    "pets/pet_fox",
    "pets/pet_fox_s",
    "pets/pet_griffin",
    "pets/pet_griffin_s",
    "pets/pet_lion",
    "pets/pet_lion_s",
    "pets/pet_rabbit",
    "pets/pet_rabbit_s",
    "pets/pet_tiger",
    "pets/pet_tiger_s",
    "pets/pet_unicorn",
    "pets/pet_unicorn_s",
    "pets/pet_whitelion",

  ];

  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");
  const layoutSortModeStorageKey = 'neuzos.layoutSettings.sortMode'

  const addLayout = () => {
    neuzosConfig.layouts.push({
      id: Date.now().toString(),
      label: "Unnamed Layout",
      icon: {
        slug: "neuzos_pang"
      },
      rows: [{ sessionIds: [] }]
    });
  };

  // Track icon popover state for each layout
  let iconPopoverStates: { [layoutId: string]: boolean } = $state({});

  // Track popover states for adding default layouts and columns
  let addDefaultLayoutPopoverOpen = $state(false);
  let replaceDefaultLayoutPopoverStates: { [key: string]: boolean } = $state({});
  let addColumnPopoverStates: { [key: string]: boolean } = $state({});
  let replaceSessionPopoverStates: { [key: string]: boolean } = $state({});
  let draggedDefaultLayoutId: string | null = $state(null);
  let defaultLayoutDropTarget: number | null = $state(null);
  let useDefaultLayoutReordering = $state(false);
  let useDragLayoutSorting = $state(false)
  let draggedLayoutId: string | null = $state(null)
  let layoutDropTarget: number | null = $state(null)
  let layoutSettingsScrollContainer: HTMLElement | null = $state(null)
  let temporaryMultiLayoutIds: string[] = $state([])
  let layoutCustomizationEditIds: string[] = $state([])
  let pendingSingleSessionLayoutId: string | null = $state(null)
  let multiSessionSettingsPopoverStates: { [layoutId: string]: boolean } = $state({})

  const getIconLabel = (icon: string) => {
    return icon.replace('misc/', '').replace('levels/', '').replace('jobs/', '').replace('pets/', '')
  }

  const getLayoutSessionIds = (layout: NeuzConfig['layouts'][number]) => {
    return (layout.rows ?? []).flatMap((row) => row.sessionIds ?? [])
  }

  const ensureLayoutRows = (layout: NeuzConfig['layouts'][number]) => {
    if (!layout.rows || layout.rows.length === 0) {
      layout.rows = [{ sessionIds: [] }]
    }
  }

  const isMultiSessionLayout = (layout: NeuzConfig['layouts'][number]) => {
    const sessionCount = getLayoutSessionIds(layout).length
    return temporaryMultiLayoutIds.includes(layout.id) || sessionCount > 1
  }

  const isLayoutCustomizationEditing = (layoutId: string) => {
    return layoutCustomizationEditIds.includes(layoutId)
  }

  const startLayoutCustomizationEdit = (layoutId: string) => {
    if (!layoutCustomizationEditIds.includes(layoutId)) {
      layoutCustomizationEditIds = [...layoutCustomizationEditIds, layoutId]
    }
  }

  const stopLayoutCustomizationEdit = (layoutId: string) => {
    layoutCustomizationEditIds = layoutCustomizationEditIds.filter((id) => id !== layoutId)
  }

  const switchLayoutToMultiSession = (layout: NeuzConfig['layouts'][number]) => {
    ensureLayoutRows(layout)
    if (!temporaryMultiLayoutIds.includes(layout.id)) {
      temporaryMultiLayoutIds = [...temporaryMultiLayoutIds, layout.id]
    }
    startLayoutCustomizationEdit(layout.id)
  }

  const switchLayoutToSingleSession = (layout: NeuzConfig['layouts'][number]) => {
    temporaryMultiLayoutIds = temporaryMultiLayoutIds.filter((layoutId) => layoutId !== layout.id)
    stopLayoutCustomizationEdit(layout.id)
    normalizeLayoutToSingleSession(layout)
  }

  const requestSwitchLayoutToSingleSession = (layout: NeuzConfig['layouts'][number]) => {
    multiSessionSettingsPopoverStates[layout.id] = false

    if (getLayoutSessionIds(layout).length > 1) {
      pendingSingleSessionLayoutId = layout.id
      return
    }

    switchLayoutToSingleSession(layout)
  }

  const confirmSwitchLayoutToSingleSession = () => {
    const layout = neuzosConfig.layouts.find((entry) => entry.id === pendingSingleSessionLayoutId)
    if (layout) {
      switchLayoutToSingleSession(layout)
    }
    pendingSingleSessionLayoutId = null
  }

  const normalizeLayoutToSingleSession = (layout: NeuzConfig['layouts'][number]) => {
    const firstSessionId = getLayoutSessionIds(layout)[0]
    layout.rows = [{ sessionIds: firstSessionId ? [firstSessionId] : [] }]
    delete layout.autoFocus
    delete layout.locked
    delete layout.columnFirst
  }

  const setLayoutAutoFocus = (layout: NeuzConfig['layouts'][number], checked: boolean) => {
    if (checked) {
      delete layout.autoFocus
    } else {
      layout.autoFocus = false
    }
  }

  const setLayoutLocked = (layout: NeuzConfig['layouts'][number], checked: boolean) => {
    if (checked) {
      layout.locked = true
    } else {
      delete layout.locked
    }
  }

  const setLayoutDirection = (layout: NeuzConfig['layouts'][number], columnFirst: boolean) => {
    if (columnFirst) {
      layout.columnFirst = true
    } else {
      delete layout.columnFirst
    }
  }

  const canAddSessionToLayout = (layout: NeuzConfig['layouts'][number]) => {
    return isMultiSessionLayout(layout) || getLayoutSessionIds(layout).length === 0
  }

  const addSessionToLayoutRow = (layout: NeuzConfig['layouts'][number], row: { sessionIds: string[] }, sessionId: string) => {
    ensureLayoutRows(layout)

    if (!layout.rows.includes(row)) {
      layout.rows = [row]
    }

    if (isMultiSessionLayout(layout)) {
      row.sessionIds.push(sessionId)
      return
    }

    layout.rows = [{ sessionIds: [sessionId] }]
  }

  const moveDefaultLayout = (layoutId: string, targetIndex: number) => {
    const currentIndex = neuzosConfig.defaultLayouts.indexOf(layoutId)
    if (currentIndex === -1) return

    const nextDefaultLayouts = [...neuzosConfig.defaultLayouts]
    nextDefaultLayouts.splice(currentIndex, 1)
    const adjustedIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex
    nextDefaultLayouts.splice(adjustedIndex, 0, layoutId)
    neuzosConfig.defaultLayouts = nextDefaultLayouts
  }

  const handleDefaultLayoutDragStart = (event: DragEvent, layoutId: string) => {
    if (!useDefaultLayoutReordering) return
    draggedDefaultLayoutId = layoutId
    event.dataTransfer?.setData('text/plain', layoutId)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  const handleDefaultLayoutDragOver = (event: DragEvent, index: number) => {
    if (!useDefaultLayoutReordering || !draggedDefaultLayoutId) return
    event.preventDefault()
    defaultLayoutDropTarget = index
  }

  const handleDefaultLayoutDrop = (event: DragEvent, index: number) => {
    event.preventDefault()
    if (draggedDefaultLayoutId) {
      moveDefaultLayout(draggedDefaultLayoutId, index)
    }
    draggedDefaultLayoutId = null
    defaultLayoutDropTarget = null
  }

  const handleDefaultLayoutDragEnd = () => {
    draggedDefaultLayoutId = null
    defaultLayoutDropTarget = null
  }

  const toggleDefaultLayoutReordering = () => {
    useDefaultLayoutReordering = !useDefaultLayoutReordering
    draggedDefaultLayoutId = null
    defaultLayoutDropTarget = null
  }

  const moveLayout = (layoutId: string, targetIndex: number) => {
    const currentIndex = neuzosConfig.layouts.findIndex((layout) => layout.id === layoutId)
    if (currentIndex === -1) return

    const nextLayouts = [...neuzosConfig.layouts]
    const [layout] = nextLayouts.splice(currentIndex, 1)
    const adjustedIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex
    nextLayouts.splice(adjustedIndex, 0, layout)
    neuzosConfig.layouts = nextLayouts
  }

  const handleLayoutDragStart = (event: DragEvent, layoutId: string) => {
    if (!useDragLayoutSorting) return
    draggedLayoutId = layoutId
    event.dataTransfer?.setData('text/plain', layoutId)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  const handleLayoutDragOver = (event: DragEvent, index: number) => {
    if (!useDragLayoutSorting || !draggedLayoutId) return
    event.preventDefault()
    scrollLayoutSettingsNearEdge(event)
    layoutDropTarget = index
  }

  const getLayoutRowDropIndex = (event: DragEvent, layoutIndex: number) => {
    const row = event.currentTarget as HTMLElement
    const rect = row.getBoundingClientRect()
    return event.clientY > rect.top + rect.height / 2 ? layoutIndex + 1 : layoutIndex
  }

  const handleLayoutRowDragOver = (event: DragEvent, layoutIndex: number) => {
    handleLayoutDragOver(event, getLayoutRowDropIndex(event, layoutIndex))
  }

  const handleLayoutRowDrop = (event: DragEvent, layoutIndex: number) => {
    handleLayoutDrop(event, getLayoutRowDropIndex(event, layoutIndex))
  }

  const handleLayoutDrop = (event: DragEvent, index: number) => {
    event.preventDefault()
    if (draggedLayoutId) {
      moveLayout(draggedLayoutId, index)
    }
    draggedLayoutId = null
    layoutDropTarget = null
  }

  const handleLayoutDragEnd = () => {
    draggedLayoutId = null
    layoutDropTarget = null
  }

  const toggleLayoutSortMode = () => {
    useDragLayoutSorting = !useDragLayoutSorting
    draggedLayoutId = null
    layoutDropTarget = null
    localStorage.setItem(layoutSortModeStorageKey, useDragLayoutSorting ? 'drag' : 'buttons')
  }

  const scrollLayoutSettingsNearEdge = (event: DragEvent) => {
    if (!layoutSettingsScrollContainer) {
      return
    }

    const rect = layoutSettingsScrollContainer.getBoundingClientRect()
    const edgeSize = 36
    const scrollStep = 5

    if (event.clientY < rect.top + edgeSize) {
      layoutSettingsScrollContainer.scrollTop -= scrollStep
    } else if (event.clientY > rect.bottom - edgeSize) {
      layoutSettingsScrollContainer.scrollTop += scrollStep
    }
  }

  onMount(() => {
    useDragLayoutSorting = localStorage.getItem(layoutSortModeStorageKey) === 'drag'

    const handleSettingsSaved = () => {
      temporaryMultiLayoutIds = []
      layoutCustomizationEditIds = []
    }

    window.addEventListener('neuzos:settings-saved', handleSettingsSaved)

    return () => {
      window.removeEventListener('neuzos:settings-saved', handleSettingsSaved)
    }
  })

</script>
{#snippet defaultLayoutDropZone(index)}
  {@const active = defaultLayoutDropTarget === index}
  <div
    role="presentation"
    class={`h-8 transition-all duration-150 ${active ? 'w-20 rounded-md border border-dashed border-primary/70 bg-primary/10 shadow-sm' : 'w-4 rounded-full bg-transparent'}`}
    ondragover={(event) => handleDefaultLayoutDragOver(event, index)}
    ondrop={(event) => handleDefaultLayoutDrop(event, index)}
  ></div>
{/snippet}

{#snippet defaultLayoutStartDropZone()}
  {#if draggedDefaultLayoutId && defaultLayoutDropTarget !== 0}
    <div
      role="presentation"
      class="absolute -left-3 top-0 z-10 h-8 w-6 bg-transparent"
      ondragover={(event) => handleDefaultLayoutDragOver(event, 0)}
      ondrop={(event) => handleDefaultLayoutDrop(event, 0)}
    ></div>
  {/if}
{/snippet}

{#snippet layoutDropZone(index)}
  {@const active = layoutDropTarget === index}
  {#if useDragLayoutSorting}
    <Table.Row class="border-b-0 hover:[&,&>svelte-css-wrapper]:[&>th,td]:bg-transparent">
      <Table.Cell
        colspan={6}
        class={`p-0 transition-[height] duration-150 ${active ? 'h-10' : 'h-1'}`}
        ondragover={(event) => handleLayoutDragOver(event, index)}
        ondrop={(event) => handleLayoutDrop(event, index)}
      >
        <div
          class={`mx-2 rounded-md transition-all duration-150 ${active ? 'h-8 border border-dashed border-primary/70 bg-primary/10 shadow-sm' : 'h-1 bg-transparent'}`}
        ></div>
      </Table.Cell>
    </Table.Row>
  {/if}
{/snippet}

<Card.Root class="w-full">
  <Card.Header>
    <div class="flex items-center justify-between gap-3">
      <Card.Title class="text-lg font-semibold">
        Default Layouts on Launch
      </Card.Title>
      <Button variant="outline" size="sm" class="h-8 gap-2" onclick={toggleDefaultLayoutReordering} title={useDefaultLayoutReordering ? 'Done' : 'Reorder'}>
        {#if useDefaultLayoutReordering}
          <Check class="h-4 w-4"></Check>
          Done
        {:else}
          <ArrowLeftRight class="h-4 w-4"></ArrowLeftRight>
          Reorder
        {/if}
      </Button>
    </div>
    <Card.Description class="flex flex-col">
      Select which Layouts should be on your Mainbar by default when NeuzOS starts.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-wrap items-center gap-2">
    {#if neuzosConfig.defaultLayouts.length === 0}
      <div class="flex h-8 items-center rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground">
        No Default Layouts
      </div>
    {/if}
    {#each neuzosConfig.defaultLayouts as layoutId, lidx (layoutId)}
      {@const layout = neuzosConfig.layouts.find(l => l.id === layoutId)}
      {@const replacePopoverKey = `${layoutId}-${lidx}`}
      {@const isReplacePopoverOpen = replaceDefaultLayoutPopoverStates[replacePopoverKey] ?? false}
      {#if useDefaultLayoutReordering && (lidx > 0 || defaultLayoutDropTarget === 0)}
        {@render defaultLayoutDropZone(lidx)}
      {/if}
      <div
        class="relative inline-flex items-center rounded-md border border-input text-sm shadow-sm transition-opacity {draggedDefaultLayoutId === layoutId ? 'opacity-50' : ''}"
      >
        {#if useDefaultLayoutReordering && lidx === 0}
          {@render defaultLayoutStartDropZone()}
        {/if}
        {#if useDefaultLayoutReordering}
          <button
            type="button"
            draggable="true"
            class="flex h-8 w-8 cursor-grab items-center justify-center border-r bg-muted/50 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
            ondragstart={(event) => handleDefaultLayoutDragStart(event, layoutId)}
            ondragend={handleDefaultLayoutDragEnd}
            aria-label="Drag default layout"
          >
            <GripVertical class="h-4 w-4"></GripVertical>
          </button>
        {/if}
        <Popover.Root open={isReplacePopoverOpen} onOpenChange={(open) => { replaceDefaultLayoutPopoverStates[replacePopoverKey] = open; }}>
          <Popover.Trigger>
            <Button variant="outline" size="sm" class="h-8 border-0 pl-2 pr-3 {useDefaultLayoutReordering ? 'rounded-none' : 'rounded-r-none'}">
              <img class="w-5 h-5" src="icons/{layout?.icon.slug}.png" alt=""/>
              {layout?.label ?? "Unnamed Layout"}
            </Button>
          </Popover.Trigger>
          <Popover.Content class="w-[280px] p-0">
            <Command.Root shouldFilter={true}>
              <Command.Input placeholder="Search Layouts..." class="h-10"/>
              <Command.Empty>No Layout found.</Command.Empty>
              <Command.List class="max-h-[320px]">
                <Command.Group>
                  {#each neuzosConfig.layouts as replacementLayout}
                    {@const disabled = replacementLayout.id !== layoutId && neuzosConfig.defaultLayouts.includes(replacementLayout.id)}
                    {#if !disabled}
                      <Command.Item
                        value={replacementLayout.id}
                        keywords={[replacementLayout.label.toLowerCase()]}
                        onSelect={() => {
                          neuzosConfig.defaultLayouts[lidx] = replacementLayout.id;
                          replaceDefaultLayoutPopoverStates[replacePopoverKey] = false;
                        }}
                        class="py-2"
                      >
                        <img class="size-5 mr-2" src="icons/{replacementLayout.icon.slug}.png" alt=""/>
                        <span>{replacementLayout.label}</span>
                      </Command.Item>
                    {/if}
                  {/each}
                </Command.Group>
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
        <Button variant="outline" size="icon" class="h-8 w-8 rounded-l-none border-0 border-l bg-background text-muted-foreground hover:text-destructive" onclick={() => { neuzosConfig.defaultLayouts.splice(lidx, 1) }}>
          <Trash class="size-3"></Trash>
        </Button>
      </div>
    {/each}
    {#if useDefaultLayoutReordering}
      {@render defaultLayoutDropZone(neuzosConfig.defaultLayouts.length)}
    {/if}
    <Popover.Root open={addDefaultLayoutPopoverOpen} onOpenChange={(open) => { addDefaultLayoutPopoverOpen = open; }}>
      <Popover.Trigger>
        <Button variant="outline" size="icon" class="h-8 w-8">
          <Plus class="h-4 w-4"/>
        </Button>
      </Popover.Trigger>
      <Popover.Content class="w-[280px] p-0">
        <Command.Root shouldFilter={true}>
          <Command.Input placeholder="Search Layouts..." class="h-10"/>
          <Command.Empty>No Layout found.</Command.Empty>
          <Command.List class="max-h-[320px]">
            <Command.Group>
              {#each neuzosConfig.layouts as layout}
                {@const disabled = neuzosConfig.defaultLayouts.includes(layout.id)}
                {#if !disabled}
                  <Command.Item
                    value={layout.id}
                    keywords={[layout.label.toLowerCase()]}
                    onSelect={() => {
                        neuzosConfig.defaultLayouts.push(layout.id);
                        addDefaultLayoutPopoverOpen = false;
                      }}
                    class="py-2"
                  >
                    <img class="size-5 mr-2" src="icons/{layout.icon.slug}.png" alt=""/>
                    <span>{layout.label}</span>
                  </Command.Item>
                {/if}
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>

  </Card.Content>
</Card.Root>
<AlertDialog.Root open={pendingSingleSessionLayoutId !== null} onOpenChange={(open) => {
  if (!open) {
    pendingSingleSessionLayoutId = null
  }
}}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Switch to Single-Session Mode</AlertDialog.Title>
      <AlertDialog.Description>
        This Action will Remove all Sessions except one from this Layout.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmSwitchLayoutToSingleSession}>Accept</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
<Separator class="mb-4 mt-6"/>
<Card.Root bind:ref={layoutSettingsScrollContainer} class="overflow-y-auto">
  <Card.Header>
    <div class="flex items-center justify-between gap-3">
      <Card.Title class="text-lg font-semibold">
        Manage Layouts
      </Card.Title>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">Sorting:</span>
        <Button variant="outline" size="sm" class="h-8 gap-2" onclick={toggleLayoutSortMode} title={useDragLayoutSorting ? 'Drag & Drop Sorting' : 'Arrow Sorting'}>
          {#if useDragLayoutSorting}
            <GripVertical class="h-4 w-4"></GripVertical>
            Drag & Drop
          {:else}
            <ArrowDownUp class="h-4 w-4"></ArrowDownUp>
            Arrows
          {/if}
        </Button>
      </div>
    </div>
    <Card.Description class="flex flex-col">
      Configure your Layouts below. You can Add, Edit, Reorder, and Delete Layouts.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class=""></Table.Head>
          <Table.Head class="w-[100px]">Icon</Table.Head>
          <Table.Head class="w-1/3">Label</Table.Head>
          <Table.Head class="w-[260px]">Layout Mode</Table.Head>
          <Table.Head class="w-2/3">Sessions</Table.Head>
          <Table.Head></Table.Head>

        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each neuzosConfig.layouts as layout, lidx (layout.id)}
          {@const isMultiSession = isMultiSessionLayout(layout)}
          {@const isCustomizationEditing = isLayoutCustomizationEditing(layout.id)}
          {@render layoutDropZone(lidx)}
          <Table.Row
            class="hover:bg-muted/50 {useDragLayoutSorting && draggedLayoutId === layout.id ? 'opacity-50' : ''}"
            ondragover={(event) => handleLayoutRowDragOver(event, lidx)}
            ondrop={(event) => handleLayoutRowDrop(event, lidx)}
          >
            <Table.Cell class="py-3">
              {#if useDragLayoutSorting}
                <button
                  type="button"
                  draggable="true"
                  class="flex h-8 w-8 cursor-grab items-center justify-center rounded-md border text-muted-foreground active:cursor-grabbing"
                  ondragstart={(event) => handleLayoutDragStart(event, layout.id)}
                  ondragend={handleLayoutDragEnd}
                  aria-label="Drag layout to reorder"
                >
                  <GripVertical class="h-4 w-4"></GripVertical>
                </button>
              {:else}
                <div class="flex flex-col gap-0.5 ">
                  <Button onclick={() => {
                let curLay = JSON.parse(JSON.stringify(layout))
                let repLay = JSON.parse(JSON.stringify(neuzosConfig.layouts[lidx-1]))
                neuzosConfig.layouts[lidx] = repLay
                neuzosConfig.layouts[lidx-1] = curLay

              }} disabled={lidx <= 0} variant="outline" size="icon-xs"
                >
                    <ChevronUp class="h-4 w-4"></ChevronUp>
                  </Button
                  >
                  <Button onclick={() => {
                let curLay = JSON.parse(JSON.stringify(layout))
                let repLay = JSON.parse(JSON.stringify(neuzosConfig.layouts[lidx+1]))
                neuzosConfig.layouts[lidx] = repLay
                neuzosConfig.layouts[lidx+1] = curLay
              }}
                        disabled={lidx > neuzosConfig.layouts.length - 2} variant="outline" size="icon-xs"
                >
                    <ChevronDown class="h-4 w-4"></ChevronDown>
                  </Button
                  >
                </div>
              {/if}
            </Table.Cell>
            <Table.Cell class="py-3">
              {@const isOpen = iconPopoverStates[layout.id] ?? false}
              <div class="flex items-center">
                <Popover.Root open={isOpen} onOpenChange={(open) => { iconPopoverStates[layout.id] = open; }}>
                  <Popover.Trigger
                    class="w-10 h-10 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-muted/50 hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                    {#if layout.icon.slug}
                      <img class="w-6 h-6" src="icons/{layout.icon.slug}.png" alt=""/>
                    {:else}
                      <img class="w-6 h-6" src="icons/neuzos_pang.png" alt=""/>
                    {/if}
                  </Popover.Trigger>
                  <Popover.Content class="w-[280px] p-0">
                    <Command.Root shouldFilter={true}>
                      <Command.Input placeholder="Search Icon..." class="h-10"/>
                      <Command.Empty>No Icon found.</Command.Empty>
                      <Command.List class="max-h-[320px]">
                        <Command.Group>
                          {#each layoutIcons as icon}
                            <Command.Item
                              value={icon}
                              keywords={[getIconLabel(icon).replace(/_/g, ' ').toLowerCase()]}
                              onSelect={() => {
                                layout.icon.slug = icon;
                                iconPopoverStates[layout.id] = false;
                              }}
                              class="py-2"
                            >
                              <img class="size-6 mr-2" src="icons/{icon}.png" alt=""/>
                              <span
                                class="text-xs truncate">{getIconLabel(icon)}</span>
                            </Command.Item>
                          {/each}
                        </Command.Group>
                      </Command.List>
                    </Command.Root>
                  </Popover.Content>
                </Popover.Root>
              </div>
            </Table.Cell>
            <Table.Cell class="w-1/2 py-3">
              <Input
                class="h-9 text-sm"
                bind:value={layout.label}
                onchange={(e) => {
                {/*@ts-ignore*/}
                if (e.target.value === '') {
                  layout.label = 'Unnamed Layout'
                }
              }}
              />
            </Table.Cell>
            <Table.Cell class="py-3">
              <div class="flex items-center gap-3">
                <div class="flex w-[115px] flex-col">
                  <span class="text-xs text-muted-foreground">Layout Mode</span>
                  <span class="text-sm font-medium">{isMultiSession ? 'Multi-Session' : 'Single-Session'}</span>
                </div>
                {#if isMultiSession}
                  <Popover.Root open={multiSessionSettingsPopoverStates[layout.id] ?? false} onOpenChange={(open) => { multiSessionSettingsPopoverStates[layout.id] = open; }}>
                    <Popover.Trigger>
                      <Button variant="outline" size="icon-sm" title="Settings">
                        <Settings class="h-4 w-4"></Settings>
                      </Button>
                    </Popover.Trigger>
                    <Popover.Content class="w-[380px] p-4">
                      <div class="flex flex-col gap-4">
                        <div class="text-sm font-semibold">Multi-Session Settings</div>

                        <div class="flex flex-col gap-1.5">
                          <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2 text-sm font-medium">
                              <Crosshair class="h-4 w-4"></Crosshair>
                              Auto-Focus
                            </div>
                            <Switch
                              checked={layout.autoFocus ?? true}
                              onCheckedChange={(checked) => setLayoutAutoFocus(layout, checked)}
                            />
                          </div>
                          <p class="text-xs text-muted-foreground">Auto-Focuses the Session where the Mouse-Cursor is pointing at.</p>
                        </div>

                        <div class="flex flex-col gap-1.5">
                          <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2 text-sm font-medium">
                              <Lock class="h-4 w-4"></Lock>
                              Lock
                            </div>
                            <Switch
                              checked={layout.locked ?? false}
                              onCheckedChange={(checked) => setLayoutLocked(layout, checked)}
                            />
                          </div>
                          <p class="text-xs text-muted-foreground">Locks the Sizes of the Sessions in the Layout. They cannot be resized while the Lock is active.</p>
                        </div>

                        <Separator></Separator>

                        <div class="text-sm font-semibold">Layout Configuration</div>

                        <div class="flex flex-col gap-1.5">
                          <div class="flex items-center gap-2 text-sm font-medium">
                            <Grid2x2Plus class="h-4 w-4"></Grid2x2Plus>
                            Direction
                          </div>
                          <p class="text-xs text-muted-foreground">Changes the Direction of the Layout Configuration.</p>
                          <div class="grid grid-cols-2 gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              class="w-full gap-2 {layout.columnFirst ? 'bg-muted/50' : 'border-primary text-primary ring-1 ring-primary/50'}"
                              onclick={() => setLayoutDirection(layout, false)}
                            >
                              <Rows2 class="h-4 w-4"></Rows2>
                              Rows
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              class="w-full gap-2 {layout.columnFirst ? 'border-primary text-primary ring-1 ring-primary/50' : 'bg-muted/50'}"
                              onclick={() => setLayoutDirection(layout, true)}
                            >
                              <Columns2 class="h-4 w-4"></Columns2>
                              Columns
                            </Button>
                          </div>
                        </div>

                        {#if isCustomizationEditing}
                          <Button variant="outline" size="sm" onclick={() => {
                              layout.rows ??= []
                              layout.rows.push({
                                sessionIds: []
                              })
                            }} class="w-full gap-2">
                            {#if layout.columnFirst}
                              <BetweenVerticalStart class="h-4 w-4"></BetweenVerticalStart>
                              Add Column
                            {:else}
                              <BetweenHorizontalStart class="h-4 w-4"></BetweenHorizontalStart>
                              Add Row
                            {/if}
                          </Button>
                        {/if}

                        <div class="flex flex-col gap-2">
                          <p class="text-xs text-muted-foreground">Enable/ Disable the Layout Customization.</p>
                          {#if isCustomizationEditing}
                            <Button variant="outline" size="sm" class="w-full gap-2" onclick={() => stopLayoutCustomizationEdit(layout.id)}>
                              <Grid2x2Check class="h-4 w-4"></Grid2x2Check>
                              Save Layout Customization
                            </Button>
                          {:else}
                            <Button variant="outline" size="sm" class="w-full gap-2" onclick={() => startLayoutCustomizationEdit(layout.id)}>
                              <SquarePen class="h-4 w-4"></SquarePen>
                              Edit Layout
                            </Button>
                          {/if}
                        </div>

                        <Separator></Separator>

                        <div class="flex flex-col gap-2">
                          <Button variant="outline" size="sm" onclick={() => requestSwitchLayoutToSingleSession(layout)}>
                            Switch to Single-Session
                          </Button>
                        </div>
                      </div>
                    </Popover.Content>
                  </Popover.Root>
                {:else}
                  <Button variant="outline" size="icon-sm" title="Switch to Multi-Session" onclick={() => switchLayoutToMultiSession(layout)}>
                    <LayoutGrid class="h-4 w-4"></LayoutGrid>
                  </Button>
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="w-1/2 py-3">
              <div class="flex {layout.columnFirst ? 'flex-row' : 'flex-col'} gap-2">
                {#each (layout.rows?.length ? layout.rows : [{ sessionIds: [] }]) as row, ridx (ridx)}
                  {@const popoverKey = `${layout.id}-${ridx}`}
                  {@const isPopoverOpen = addColumnPopoverStates[popoverKey] ?? false}
                  <div class="flex {layout.columnFirst ? 'flex-col items-start' : 'flex-row items-center'} gap-2">
                    {#each row.sessionIds ?? [] as sessionId,sidx (sidx)}
                      {@const session = neuzosConfig.sessions.find(s => s.id === sessionId)}
                      {@const replaceSessionPopoverKey = `${layout.id}-${ridx}-${sidx}`}
                      {@const isReplaceSessionPopoverOpen = replaceSessionPopoverStates[replaceSessionPopoverKey] ?? false}
                      <div class="inline-flex items-center rounded-md border border-input text-xs shadow-sm">
                        <Popover.Root open={isReplaceSessionPopoverOpen} onOpenChange={(open) => { replaceSessionPopoverStates[replaceSessionPopoverKey] = open; }}>
                          <Popover.Trigger>
                            <Button variant="outline" size="xs" class="h-7 rounded-r-none border-0 pl-2 pr-3 text-xs gap-2">
                              <img class="h-3.5 w-3.5" src="icons/{session?.icon.slug}.png" alt=""/>
                              {session?.label}
                            </Button>
                          </Popover.Trigger>
                          <Popover.Content class="w-[280px] p-0">
                            <Command.Root shouldFilter={true}>
                              <Command.Input placeholder="Search Sessions..." class="h-10"/>
                              <Command.Empty>No Session found.</Command.Empty>
                              <Command.List class="max-h-[320px]">
                                <Command.Group>
                                  {#each neuzosConfig.sessions as replacementSession}
                                    {@const selectedInLayout = neuzosConfig.layouts.find(l => l.id === layout.id)?.rows.find(r => r.sessionIds.includes(replacementSession.id)) !== undefined}
                                    {#if replacementSession.id === sessionId || !selectedInLayout}
                                      <Command.Item
                                        value={replacementSession.id}
                                        keywords={[replacementSession.label.toLowerCase()]}
                                        onSelect={() => {
                                          row.sessionIds[sidx] = replacementSession.id;
                                          replaceSessionPopoverStates[replaceSessionPopoverKey] = false;
                                        }}
                                        class="py-2"
                                      >
                                        <img class="size-5 mr-2" src="icons/{replacementSession.icon.slug}.png" alt=""/>
                                        <span>{replacementSession.label}</span>
                                      </Command.Item>
                                    {/if}
                                  {/each}
                                </Command.Group>
                              </Command.List>
                            </Command.Root>
                          </Popover.Content>
                        </Popover.Root>
                        <Button variant="outline" size="icon" class="h-7 w-7 rounded-l-none border-0 border-l bg-background text-muted-foreground hover:text-destructive" onclick={() => {
                          row.sessionIds.splice(sidx, 1)
                        }}>
                          <Trash class="size-3"/>
                        </Button>
                      </div>
                    {/each}
                    <div class="flex items-center gap-1">
                      {#if (!isMultiSession || isCustomizationEditing) && canAddSessionToLayout(layout)}
                        <Popover.Root open={isPopoverOpen}
                                      onOpenChange={(open) => { addColumnPopoverStates[popoverKey] = open; }}>
                          <Popover.Trigger>
                            <Button variant="outline" size="xs" class="text-xs">
                              <Plus class="size-3 mr-1"/>
                              Add Session
                            </Button>
                          </Popover.Trigger>
                          <Popover.Content class="w-[280px] p-0">
                            <Command.Root shouldFilter={true}>
                              <Command.Input placeholder="Search Sessions..." class="h-10"/>
                              <Command.Empty>No Session found.</Command.Empty>
                              <Command.List class="max-h-[320px]">
                                <Command.Group>
                                  {#each neuzosConfig.sessions as session}
                                    {@const
                                      selectedInLayout = neuzosConfig.layouts.find(l => l.id === layout.id)?.rows.find(r => r.sessionIds.includes(session.id)) !== undefined}
                                    {#if !selectedInLayout}
                                      <Command.Item
                                        value={session.id}
                                        keywords={[session.label.toLowerCase()]}
                                        onSelect={() => {
                                          addSessionToLayoutRow(layout, row, session.id);
                                          addColumnPopoverStates[popoverKey] = false;
                                        }}
                                        class="py-2"
                                      >
                                        <img class="size-5 mr-2" src="icons/{session.icon.slug}.png" alt=""/>
                                        <span>{session.label}</span>
                                      </Command.Item>
                                    {/if}
                                  {/each}
                                </Command.Group>
                              </Command.List>
                            </Command.Root>
                          </Popover.Content>
                        </Popover.Root>
                      {/if}


                    </div>
                    <div class="flex-1"></div>
                    {#if isMultiSession && isCustomizationEditing && (layout.rows?.length ?? 0) > 1}
                      <Button class="text-xs" variant="outline" size="xs" onclick={() => {
                        layout.rows.splice(ridx, 1)
                      }}>
                        <Trash class="size-3"/>
                        Delete {layout.columnFirst ? "Column" : "Row"}
                      </Button>
                    {/if}
                  </div>

                {/each}
              </div>
            </Table.Cell>
            <Table.Cell class="py-3">
              <Button variant="outline" size="icon"
                      class="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                      onclick={() => { neuzosConfig.layouts.splice(lidx, 1) }}>
                <Trash class="h-4 w-4"></Trash>
              </Button>
            </Table.Cell>
          </Table.Row>
        {/each}
        {@render layoutDropZone(neuzosConfig.layouts.length)}
      </Table.Body>
    </Table.Root>
  </Card.Content>
  <Card.Footer>
    <div class="flex items-center justify-between">
      <Button variant="outline" size="sm" onclick={addLayout}>
        <Plus class="h-4 w-4"></Plus>
        Add Layout
      </Button>
    </div>
  </Card.Footer>
</Card.Root>
