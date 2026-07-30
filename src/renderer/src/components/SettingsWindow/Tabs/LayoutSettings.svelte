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
    Save,
    Grid2x2Check,
    SquarePen,
    List,
    Grid3X3
  } from "@lucide/svelte";

  import {Input} from "$lib/components/ui/input";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import {Separator} from "$lib/components/ui/separator";
  import {readSettingsLayoutAutoSave, readSettingsSortMode, writeSettingsLayoutAutoSave, writeSettingsSortMode} from "$lib/localStorageStores";
  import * as Table from "$lib/components/ui/table";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import type {NeuzConfig} from "$lib/types";
  import {getContext, onMount} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {Switch} from "$lib/components/ui/switch";

  type LayoutIconOption = {
    slug: string
    label: string
  }

  type LayoutIconGroup = {
    heading: string
    icons: LayoutIconOption[]
  }

  const numberedIconOptions = (folder: string, prefix: string, label: string, start: number, end: number) => {
    return Array.from({length: end - start + 1}, (_, index) => {
      const value = start + index
      return {
        slug: `${folder}/${prefix}${value}`,
        label: `${label} ${value}`
      }
    })
  }

  const petIconOptions = (name: string, label: string, includeSClass = true): LayoutIconOption[] => {
    const icons = [{slug: `pets/pet_${name}`, label}]
    if (includeSClass) {
      icons.push({slug: `pets/pet_${name}_s`, label: `${label} S Class`})
    }
    return icons
  }

  const colorIconOptions = (prefix: string, label: string, colors: string[]): LayoutIconOption[] => {
    return colors.map((color) => ({
      slug: `misc/${prefix}_${color}`,
      label: `${label} ${color.charAt(0).toUpperCase()}${color.slice(1)}`
    }))
  }

  const pieceIconOptions = (colors: string[]): LayoutIconOption[] => {
    return colors.map((color) => ({
      slug: `misc/piece_${color}`,
      label: `Piece ${color.charAt(0).toUpperCase()}${color.slice(1)}`
    }))
  }

  const layoutIconGroups: LayoutIconGroup[] = [
    {
      heading: 'Beginner Class',
      icons: [
        {slug: 'jobs/vagrant', label: 'Vagrant'}
      ]
    },
    {
      heading: 'Job Classes',
      icons: [
        {slug: 'jobs/acrobat', label: 'Acrobat'},
        {slug: 'jobs/assist', label: 'Assist'},
        {slug: 'jobs/mercenary', label: 'Mercenary'},
        {slug: 'jobs/magician', label: 'Magician'},
        {slug: 'jobs/ranger', label: 'Ranger'},
        {slug: 'jobs/jester', label: 'Jester'},
        {slug: 'jobs/ringmaster', label: 'Ringmaster'},
        {slug: 'jobs/billposter', label: 'Billposter'},
        {slug: 'jobs/blade', label: 'Blade'},
        {slug: 'jobs/knight', label: 'Knight'},
        {slug: 'jobs/elementor', label: 'Elementor'},
        {slug: 'jobs/psykeeper', label: 'Psykeeper'},
        {slug: 'jobs/crackshooter', label: 'Crackshooter'},
        {slug: 'jobs/harlequin', label: 'Harlequin'},
        {slug: 'jobs/seraph', label: 'Seraph'},
        {slug: 'jobs/forcemaster', label: 'Forcemaster'},
        {slug: 'jobs/slayer', label: 'Slayer'},
        {slug: 'jobs/templar', label: 'Templar'},
        {slug: 'jobs/arcanist', label: 'Arcanist'},
        {slug: 'jobs/mentalist', label: 'Mentalist'}
      ]
    },
    {
      heading: 'Master / Hero Badges',
      icons: [
        {slug: 'levels/master_1', label: 'Master Lv. 70'},
        {slug: 'levels/master_2', label: 'Master Lv. 80'},
        {slug: 'levels/master_3', label: 'Master Lv. 90'},
        {slug: 'levels/master_4', label: 'Master Lv. 100'},
        {slug: 'levels/master_5', label: 'Master Lv. 110'},
        {slug: 'levels/master_6', label: 'Master Lv. 120'},
        {slug: 'levels/hero_1', label: 'Hero Lv. 125'},
        {slug: 'levels/hero_2', label: 'Hero Lv. 140'},
        {slug: 'levels/hero_3', label: 'Hero Lv. 160'},
        {slug: 'levels/hero_4', label: 'Hero Lv. 180'}
      ]
    },
    {
      heading: 'Pet Levels',
      icons: numberedIconOptions('pets', 'level_', 'Level', 1, 9)
    },
    {
      heading: 'Pets',
      icons: [
        {slug: 'misc/egg', label: 'Egg'},
        ...petIconOptions('angel', 'Angel'),
        ...petIconOptions('crab', 'Crab'),
        ...petIconOptions('dragon', 'Dragon'),
        ...petIconOptions('fox', 'Fox'),
        ...petIconOptions('griffin', 'Griffin'),
        ...petIconOptions('lion', 'Lion'),
        ...petIconOptions('rabbit', 'Rabbit'),
        ...petIconOptions('tiger', 'Tiger'),
        ...petIconOptions('unicorn', 'Unicorn'),
        ...petIconOptions('whitelion', 'White Lion', false)
      ]
    },
    {
      heading: 'Other Icons',
      icons: [
        {slug: 'neuzos_pang', label: 'NeuzOS'},
        {slug: 'misc/browser', label: 'Browser'},
        {slug: 'misc/neuz_hat', label: 'Neuz'},
        {slug: 'misc/fwc', label: 'FWC'},
        {slug: 'misc/star', label: 'Star'},
        {slug: 'misc/item', label: 'Item'},
        {slug: 'misc/bag', label: 'Bag'},
        {slug: 'misc/pet_food', label: 'Pet Food'},
        {slug: 'misc/battlepass', label: 'Battle Pass'},
        {slug: 'misc/perin', label: 'Perin'},
        {slug: 'misc/diamond_black', label: 'Diamond Black'},
        {slug: 'misc/diamond', label: 'Diamond'},
        ...numberedIconOptions('misc', 'pickup_pet_buff_', 'Pickup Pet Buff', 1, 3),
        ...colorIconOptions('jewel', 'Jewel', ['black', 'green', 'purple', 'red', 'yellow']),
        ...numberedIconOptions('misc', 'card', 'Card', 1, 10),
        ...colorIconOptions('heart', 'Heart', ['blue', 'cyan', 'green', 'red', 'yellow']),
        ...colorIconOptions('element', 'Element', ['white', 'blue', 'green', 'purple', 'red', 'yellow']),
        ...pieceIconOptions(['blue', 'cyan', 'gold', 'green', 'grey', 'red', 'yellow'])
      ]
    }
  ];

  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

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

  const deleteLayout = (layoutId: string) => {
    neuzosConfig.layouts = neuzosConfig.layouts.filter((layout) => layout.id !== layoutId);
    neuzosConfig.defaultLayouts = neuzosConfig.defaultLayouts.filter((defaultLayoutId) => defaultLayoutId !== layoutId);
  };

  // Track icon popover state for each layout
  let iconPopoverStates: { [layoutId: string]: boolean } = $state({});
  let layoutIconViewMode: 'grid' | 'list' = $state('grid');

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
  let autoSaveLayouts = $state(true)
  let autoSaveLayoutsPopoverOpen = $state(false)

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
    const layout = neuzosConfig.layouts.find((entry) => entry.id === layoutId)
    if (layout) {
      cleanupEmptyLayoutRows(layout)
    }
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

  const cleanupEmptyLayoutRows = (layout: NeuzConfig['layouts'][number]) => {
    const rows = layout.rows ?? []
    const filledRows = rows.filter((row) => (row.sessionIds ?? []).length > 0)

    layout.rows = filledRows.length > 0 ? filledRows : [{ sessionIds: [] }]
  }

  const cleanupEmptyCustomizationRows = () => {
    for (const layoutId of layoutCustomizationEditIds) {
      const layout = neuzosConfig.layouts.find((entry) => entry.id === layoutId)
      if (layout) {
        cleanupEmptyLayoutRows(layout)
      }
    }
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
    writeSettingsSortMode('layoutSettings', useDragLayoutSorting ? 'dragDrop' : 'arrows')
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
    useDragLayoutSorting = readSettingsSortMode('layoutSettings') === 'dragDrop'
    autoSaveLayouts = readSettingsLayoutAutoSave()

    const handleSettingsSaved = () => {
      cleanupEmptyCustomizationRows()
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
    <Table.Row class="h-0 border-b-0 hover:[&,&>svelte-css-wrapper]:[&>th,td]:bg-transparent">
      <Table.Cell
        colspan={6}
        class={`p-0 leading-none transition-[height] duration-150 ${active ? 'h-10' : 'h-0'}`}
        ondragover={(event) => handleLayoutDragOver(event, index)}
        ondrop={(event) => handleLayoutDrop(event, index)}
      >
        <div
          class={`mx-2 rounded-md transition-all duration-150 ${active ? 'h-8 border border-dashed border-primary/70 bg-primary/10 shadow-sm' : 'h-0 bg-transparent'}`}
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
      <div class="flex items-center gap-2">
        <Popover.Root bind:open={autoSaveLayoutsPopoverOpen}>
          <Popover.Trigger>
            <Button variant="outline" size="sm" class="h-8 gap-2">
              <Save class="h-4 w-4"></Save>
              Auto Save
              <Separator orientation="vertical" class="h-4"></Separator>
              <span class={autoSaveLayouts ? 'text-foreground' : 'text-muted-foreground'}>{autoSaveLayouts ? 'ON' : 'OFF'}</span>
            </Button>
          </Popover.Trigger>
          <Popover.Content class="w-80 p-3" align="end">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="text-sm font-medium">Auto Save Layouts</div>
                <p class="text-xs leading-relaxed text-muted-foreground">
                  Manually added Layouts via the Layout Manager will directly Saved to the Default Layouts.
                </p>
              </div>
              <Switch
                checked={autoSaveLayouts}
                onCheckedChange={(checked) => {
                  autoSaveLayouts = checked
                  writeSettingsLayoutAutoSave(autoSaveLayouts)
                }}
              />
            </div>
          </Popover.Content>
        </Popover.Root>
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
    </div>
    <Card.Description class="flex flex-col">
      Choose which Layouts appear on the Main Bar by Default when NeuzOS starts.
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
<div class="h-4"></div>
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
      Configure your Layouts. You can Add, Edit, Reorder, and Delete Layouts.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    {#if neuzosConfig.layouts.length === 0}
      <div class="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
        <p class="text-sm font-medium text-foreground">No Layouts Configured</p>
        <p class="text-xs text-muted-foreground">
          Press the <span class="inline-flex h-6 items-center gap-1 rounded-md border border-input bg-background px-2 text-[11px] font-medium text-foreground shadow-xs"><Plus class="h-3 w-3"></Plus>Add Layout</span> Button below to Add a New Layout
        </p>
      </div>
    {:else}
      <div class="overflow-hidden rounded-md border">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head class=""></Table.Head>
              <Table.Head class="w-[100px]">Icon</Table.Head>
              <Table.Head class="w-1/3">Label</Table.Head>
              <Table.Head class="w-[16.25rem]">Layout Mode</Table.Head>
              <Table.Head class="w-2/3">Sessions</Table.Head>
              <Table.Head></Table.Head>

            </Table.Row>
          </Table.Header>
          <Table.Body>
        {#each neuzosConfig.layouts as layout, lidx (layout.id)}
          {@const isMultiSession = isMultiSessionLayout(layout)}
          {@const isCustomizationEditing = isLayoutCustomizationEditing(layout.id)}
          {@const layoutSessionCount = getLayoutSessionIds(layout).length}
          {@const layoutRows = layout.rows?.length ? layout.rows : [{ sessionIds: [] }]}
          {@const layoutCanAddSession = canAddSessionToLayout(layout)}
          {@const maxLayoutSessionCellCount = Math.max(1, ...layoutRows.map(row => row.sessionIds?.length ?? 0))}
          {@const maxLayoutCellCount = Math.max(1, ...layoutRows.map(row => (row.sessionIds?.length ?? 0) + (layoutCanAddSession && (!isMultiSession || isCustomizationEditing || layoutSessionCount === 0) ? 1 : 0)))}
          {@render layoutDropZone(lidx)}
          <Table.Row
            class="hover:bg-muted/50 {lidx === neuzosConfig.layouts.length - 1 ? 'border-b-0' : ''} {useDragLayoutSorting && draggedLayoutId === layout.id ? 'opacity-50' : ''}"
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
                  <Popover.Content class="w-[17.5rem] max-w-[calc(100vw-2rem)] p-0">
                    <Command.Root shouldFilter={true}>
                      <div class="flex items-center gap-2 border-b px-2 py-2">
                        <Command.Input placeholder="Search Icon..." class="h-9 border-0 px-1 focus-visible:ring-0 focus-visible:ring-offset-0"/>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title={layoutIconViewMode === 'grid' ? 'List View' : 'Grid View'}
                          onclick={() => {
                            layoutIconViewMode = layoutIconViewMode === 'grid' ? 'list' : 'grid'
                          }}
                        >
                          {#if layoutIconViewMode === 'grid'}
                            <List class="h-4 w-4" />
                          {:else}
                            <Grid3X3 class="h-4 w-4" />
                          {/if}
                        </Button>
                      </div>
                      <Command.Empty>No Icon found.</Command.Empty>
                      <Command.List class="max-h-[min(20rem,calc(100vh-8rem))]">
                        {#each layoutIconGroups as group (group.heading)}
                          <Command.Group heading={group.heading}>
                            {#if layoutIconViewMode === 'grid'}
                              <div class={`grid ${group.heading === 'Job Classes' ? 'grid-cols-[repeat(4,2.25rem)]' : 'grid-cols-[repeat(5,2.25rem)]'} justify-start gap-2 px-2 pb-2`}>
                                {#each group.icons as icon (icon.slug)}
                                  <Command.Item
                                    value={icon.slug}
                                    keywords={[icon.label.toLowerCase(), icon.slug.replace('jobs/', '').replace('misc/', '').replace('levels/', '').replace('pets/', '').replace(/_/g, ' ').toLowerCase()]}
                                    onSelect={() => {
                                      layout.icon.slug = icon.slug;
                                      iconPopoverStates[layout.id] = false;
                                    }}
                                    class={`h-9 w-9 justify-center p-0 border ${layout.icon.slug === icon.slug ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-transparent'}`}
                                    title={icon.label}
                                  >
                                    <img class="size-6" src="icons/{icon.slug}.png" alt={icon.label}/>
                                  </Command.Item>
                                {/each}
                              </div>
                            {:else}
                              {#each group.icons as icon (icon.slug)}
                                <Command.Item
                                  value={icon.slug}
                                  keywords={[icon.label.toLowerCase(), icon.slug.replace('jobs/', '').replace('misc/', '').replace('levels/', '').replace('pets/', '').replace(/_/g, ' ').toLowerCase()]}
                                  onSelect={() => {
                                    layout.icon.slug = icon.slug;
                                    iconPopoverStates[layout.id] = false;
                                  }}
                                  class={`py-2 border ${layout.icon.slug === icon.slug ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-transparent'}`}
                                >
                                  <img class="size-6 mr-2" src="icons/{icon.slug}.png" alt={icon.label}/>
                                  <span class="text-xs truncate">{icon.label}</span>
                                </Command.Item>
                              {/each}
                            {/if}
                          </Command.Group>
                        {/each}
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
              <div class="flex items-center gap-2">
                <div class="flex w-[5.9375rem] shrink-0 flex-col">
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
                  <Popover.Root open={multiSessionSettingsPopoverStates[layout.id] ?? false} onOpenChange={(open) => { multiSessionSettingsPopoverStates[layout.id] = open; }}>
                    <Popover.Trigger>
                      <Button variant="outline" size="icon-sm" title="Settings">
                        <Settings class="h-4 w-4"></Settings>
                      </Button>
                    </Popover.Trigger>
                    <Popover.Content class="w-[300px] p-4">
                      <div class="flex flex-col gap-3">
                        <div class="flex items-center gap-2 text-sm font-semibold">
                          <LayoutGrid class="h-4 w-4"></LayoutGrid>
                          Switch to Multi-Session
                        </div>
                        <p class="text-xs text-muted-foreground">
                          Switch this Layout to Multi-Session Mode to add multiple Sessions and Unlock Layout Customization.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          class="w-full gap-2"
                          onclick={() => {
                            switchLayoutToMultiSession(layout)
                            multiSessionSettingsPopoverStates[layout.id] = false
                          }}
                        >
                          Switch to Multi-Session
                        </Button>
                      </div>
                    </Popover.Content>
                  </Popover.Root>
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="w-1/2 py-3">
              <div class="flex {layout.columnFirst ? 'flex-col items-start' : 'flex-row items-start'} gap-2">
                <div class="inline-flex {layout.columnFirst ? 'flex-row' : 'flex-col'} overflow-hidden {isMultiSession && isCustomizationEditing ? 'rounded-md border border-border bg-muted/20 shadow-sm' : 'gap-2'}">
                  {#each layoutRows as row, ridx (ridx)}
                    {@const popoverKey = `${layout.id}-${ridx}`}
                    {@const isPopoverOpen = addColumnPopoverStates[popoverKey] ?? false}
                    {@const rowHasSessions = (row.sessionIds?.length ?? 0) > 0}
                    {@const showAddSession = layoutCanAddSession && (!isMultiSession || isCustomizationEditing || layoutSessionCount === 0)}
                    {@const showInitialAddSession = !isMultiSession || ridx === 0}
                    {@const rowSessionCount = row.sessionIds?.length ?? 0}
                    {@const rowCellCount = rowSessionCount + (showAddSession && (layoutSessionCount > 0 || showInitialAddSession) ? 1 : 0)}
                    {@const rowLeadingCellSpan = Math.max(1, maxLayoutCellCount - rowCellCount + 1)}
                    {@const addCellSpan = Math.max(1, maxLayoutSessionCellCount - rowSessionCount + 1)}
                    <div
                      class="flex {layout.columnFirst ? 'flex-col items-stretch' : 'flex-row items-stretch'} {isMultiSession && isCustomizationEditing ? '' : 'gap-2'} {layout.columnFirst && isMultiSession && isCustomizationEditing ? 'min-w-[160px]' : ''} {isMultiSession && isCustomizationEditing && !rowHasSessions && !layout.columnFirst ? 'w-full' : ''} {isMultiSession && isCustomizationEditing && ridx > 0 ? (layout.columnFirst ? 'border-l-2 border-border' : 'border-t-2 border-border') : ''}"
                      style={isMultiSession && isCustomizationEditing && layout.columnFirst && !rowHasSessions ? `min-height: ${maxLayoutCellCount * 36}px;` : (isMultiSession && !isCustomizationEditing && !layout.columnFirst ? `width: ${maxLayoutCellCount * 160}px;` : undefined)}
                    >
                      {#each row.sessionIds ?? [] as sessionId,sidx (sidx)}
                        {@const session = neuzosConfig.sessions.find(s => s.id === sessionId)}
                        {@const replaceSessionPopoverKey = `${layout.id}-${ridx}-${sidx}`}
                        {@const isReplaceSessionPopoverOpen = replaceSessionPopoverStates[replaceSessionPopoverKey] ?? false}
                        <div
                          class="flex items-stretch {isMultiSession && isCustomizationEditing ? 'min-h-9 min-w-[160px]' : 'items-center'} {isMultiSession && !isCustomizationEditing ? 'w-full' : ''} {isMultiSession && isCustomizationEditing && sidx > 0 ? (layout.columnFirst ? 'border-t-2 border-border' : 'border-l-2 border-border') : ''}"
                          style={isMultiSession && isCustomizationEditing && !layout.columnFirst ? `flex: ${sidx === 0 ? rowLeadingCellSpan : 1} 1 0;` : (isMultiSession && !isCustomizationEditing && !layout.columnFirst ? 'flex: 1 1 0;' : undefined)}
                        >
                          <div class="{isMultiSession && isCustomizationEditing ? 'flex min-w-0 w-full items-stretch text-xs' : 'inline-flex items-center rounded-md border border-input text-xs shadow-sm'} {isMultiSession && !isCustomizationEditing ? 'w-full' : ''}">
                            <Popover.Root open={isReplaceSessionPopoverOpen} onOpenChange={(open) => { replaceSessionPopoverStates[replaceSessionPopoverKey] = open; }}>
                              {#if isMultiSession && isCustomizationEditing}
                                <Popover.Trigger class="flex min-h-9 min-w-0 flex-1 items-center gap-2 overflow-hidden px-3 text-xs transition-colors hover:bg-muted/60">
                                  <img class="h-3.5 w-3.5 shrink-0" src="icons/{session?.icon.slug}.png" alt=""/>
                                  <span class="min-w-0 truncate">{session?.label}</span>
                                </Popover.Trigger>
                              {:else}
                                <Popover.Trigger class={isMultiSession && !isCustomizationEditing ? 'flex flex-1' : ''}>
                                  <Button variant="outline" size="xs" class="h-7 rounded-r-none border-0 pl-2 pr-3 text-xs gap-2 {isMultiSession && !isCustomizationEditing ? 'w-full flex-1 justify-start' : ''}">
                                    <img class="h-3.5 w-3.5" src="icons/{session?.icon.slug}.png" alt=""/>
                                    {session?.label}
                                  </Button>
                                </Popover.Trigger>
                              {/if}
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
                            {#if isMultiSession && isCustomizationEditing}
                              <Button variant="ghost" size="icon" class="min-h-9 w-9 rounded-none border-0 bg-transparent text-muted-foreground hover:bg-transparent hover:text-destructive" onclick={() => {
                                row.sessionIds.splice(sidx, 1)
                              }}>
                                <Trash class="size-3"/>
                              </Button>
                            {:else}
                              <Button variant="outline" size="icon" class="h-7 w-7 rounded-l-none border-0 border-l bg-background text-muted-foreground hover:text-destructive" onclick={() => {
                                row.sessionIds.splice(sidx, 1)
                              }}>
                                <Trash class="size-3"/>
                              </Button>
                            {/if}
                          </div>
                        </div>
                      {/each}
                      <div
                        class="flex items-stretch justify-center {isMultiSession && isCustomizationEditing ? 'min-h-9 min-w-[160px]' : 'items-center'} {isMultiSession && isCustomizationEditing && !rowHasSessions && !layout.columnFirst ? 'w-full' : ''} {isMultiSession && isCustomizationEditing && rowHasSessions && showAddSession ? (layout.columnFirst ? 'border-t-2 border-border' : 'border-l-2 border-border') : ''}"
                        style={isMultiSession && isCustomizationEditing ? (layout.columnFirst ? `min-height: ${addCellSpan * 36}px;` : `flex: ${rowHasSessions ? 1 : maxLayoutCellCount} 1 0;`) : undefined}
                      >
                        {#if showAddSession && (layoutSessionCount > 0 || showInitialAddSession)}
                          <Popover.Root open={isPopoverOpen}
                                        onOpenChange={(open) => { addColumnPopoverStates[popoverKey] = open; }}>
                            {#if isMultiSession && isCustomizationEditing}
                              <Popover.Trigger class="flex h-full min-h-9 w-full min-w-[160px] items-center justify-center gap-2 rounded-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                                <Plus class="size-3.5"/>
                                {#if layoutSessionCount === 0 && ridx === 0}
                                  <span class="text-xs font-medium">Add Session</span>
                                {/if}
                              </Popover.Trigger>
                            {:else if showInitialAddSession}
                              <Popover.Trigger class="flex h-9 min-w-[160px] items-center justify-center gap-2 rounded-md border border-input bg-muted/20 px-3 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted/60 hover:text-foreground">
                                <Plus class="size-3.5"/>
                                <span class="font-medium">Add Session</span>
                              </Popover.Trigger>
                            {/if}
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
                    </div>
                  {/each}
                </div>
                {#if isMultiSession && isCustomizationEditing && (layout.rows?.length ?? 0) > 1}
                  <div class="flex {layout.columnFirst ? 'flex-row' : 'flex-col'} gap-0">
                    {#each (layout.rows?.length ? layout.rows : [{ sessionIds: [] }]) as row, ridx (ridx)}
                      <div class="flex items-center justify-center p-1.5 {layout.columnFirst ? 'min-w-[160px]' : 'min-h-10'}">
                        {#if ridx > 0}
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
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="py-3">
              <Button variant="outline" size="icon"
                      class="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                      onclick={() => { deleteLayout(layout.id) }}>
                <Trash class="h-4 w-4"></Trash>
              </Button>
            </Table.Cell>
          </Table.Row>
        {/each}
        {@render layoutDropZone(neuzosConfig.layouts.length)}
          </Table.Body>
        </Table.Root>
      </div>
    {/if}
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
