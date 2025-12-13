<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {
    ChevronDown,
    ChevronsUpDown,
    ChevronUp,
    FileX,
    HardDrive,
    Plus,
    Save,
    Trash,
    Minus,
    Lock
  } from "@lucide/svelte";

  import {Input} from "$lib/components/ui/input";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import {Separator} from "$lib/components/ui/separator";
  import * as Table from "$lib/components/ui/table";
  import * as Select from "$lib/components/ui/select";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import type {NeuzConfig} from "$lib/types";
  import {getContext} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {neuzosBridge} from "$lib/core";
  import {Checkbox} from "$lib/components/ui/checkbox";
  import {Label} from "$lib/components/ui/label";
  import {Toggle} from "$lib/components/ui/toggle";

  const layoutIcons: string[] = [
    "neuzos_pang",
    "misc/bag",
    "misc/browser",
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
  ];

  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

  const addLayout = () => {
    neuzosConfig.layouts.push({
      id: Date.now().toString(),
      label: "Unnamed Layout",
      icon: {
        slug: "neuzos_pang"
      },
      rows: []
    });
  };

  // Track icon popover state for each layout
  let iconPopoverStates: { [layoutId: string]: boolean } = $state({});

  // Track popover states for adding default layouts and columns
  let addDefaultLayoutPopoverOpen = $state(false);
  let addColumnPopoverStates: { [key: string]: boolean } = $state({});

</script>
<Card.Root class="w-full">
  <Card.Content class="flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <strong>Default Layouts on Launch</strong>

      <Popover.Root open={addDefaultLayoutPopoverOpen} onOpenChange={(open) => { addDefaultLayoutPopoverOpen = open; }}>
        <Popover.Trigger>
          <Button variant="outline" size="xs">
            <Plus class="size-3"/>
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-[280px] p-0">
          <Command.Root shouldFilter={true}>
            <Command.Input placeholder="Search layouts..." class="h-10" />
            <Command.Empty>No layout found.</Command.Empty>
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
    </div>
    <div class="flex gap-2">
      {#if neuzosConfig.defaultLayouts.length === 0}
        <div class="flex items-center gap-1 text-sm">
          No Default Layouts
        </div>
      {/if}
      {#each neuzosConfig.defaultLayouts as layoutId, lidx (layoutId)}
        {@const layout = neuzosConfig.layouts.find(l => l.id === layoutId)}
        <Button variant="outline" size="sm" onclick={() => { neuzosConfig.defaultLayouts.splice(lidx, 1) }}>
          <img class="w-5 h-5" src="icons/{layout?.icon.slug}.png" alt=""/>
          {layout?.label ?? "Unnamed Layout"}
          <Trash class="size-3"></Trash>
        </Button>
      {/each}
    </div>
  </Card.Content>
</Card.Root>
<Separator class="my-4"/>
<Card.Root class="overflow-y-auto">
  <Card.Content class="flex flex-col gap-4">
    <Table.Root>
      <Table.Caption>A list of your layouts.</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head></Table.Head>
          <Table.Head class=""></Table.Head>
          <Table.Head class="w-[100px]">Icon</Table.Head>
          <Table.Head class="w-1/3">Label</Table.Head>
          <Table.Head class="w-auto">Lock</Table.Head>
          <Table.Head class="w-2/3">Sessions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each neuzosConfig.layouts as layout, lidx (layout.id)}
          <Table.Row>
            <Table.Cell>
              <Button variant="outline" size="icon-xs" onclick={() => { neuzosConfig.layouts.splice(lidx, 1) }}>
                <Trash class="size-3"></Trash>
              </Button>
            </Table.Cell>
            <Table.Cell>
              <div class="flex flex-col gap-0.5 ">
                <Button onclick={() => {
                let curLay = JSON.parse(JSON.stringify(layout))
                let repLay = JSON.parse(JSON.stringify(neuzosConfig.layouts[lidx-1]))
                neuzosConfig.layouts[lidx] = repLay
                neuzosConfig.layouts[lidx-1] = curLay

              }} disabled={lidx <= 0} variant="outline" size="icon-xs"
                >
                  <ChevronUp class="size-3"></ChevronUp>
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
                  <ChevronDown class="size-3"></ChevronDown>
                </Button
                >
              </div>
            </Table.Cell>
            <Table.Cell>
              {@const isOpen = iconPopoverStates[layout.id] ?? false}
              <div class="flex items-center">
                <Popover.Root open={isOpen} onOpenChange={(open) => { iconPopoverStates[layout.id] = open; }}>
                  <Popover.Trigger class="w-14 h-6 p-0 px-2 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                    {#if layout.icon.slug}
                      <img class="w-5 h-5" src="icons/{layout.icon.slug}.png" alt=""/>
                    {:else}
                      <img class="w-5 h-5" src="icons/neuzos_pang.png" alt=""/>
                    {/if}
                  </Popover.Trigger>
                  <Popover.Content class="w-[280px] p-0">
                    <Command.Root shouldFilter={true}>
                      <Command.Input placeholder="Search icons..." class="h-10" />
                      <Command.Empty>No icon found.</Command.Empty>
                      <Command.List class="max-h-[320px]">
                        <Command.Group>
                          {#each layoutIcons as icon}
                            <Command.Item
                              value={icon}
                              keywords={[icon.replace('misc/', '').replace('levels/', '').replace(/_/g, ' ').toLowerCase()]}
                              onSelect={() => {
                                layout.icon.slug = icon;
                                iconPopoverStates[layout.id] = false;
                              }}
                              class="py-2"
                            >
                              <img class="size-5 mr-2" src="icons/{icon}.png" alt=""/>
                              <span class="text-xs truncate">{icon.replace('misc/', '').replace('levels/', '')}</span>
                            </Command.Item>
                          {/each}
                        </Command.Group>
                      </Command.List>
                    </Command.Root>
                  </Popover.Content>
                </Popover.Root>
              </div>
            </Table.Cell>
            <Table.Cell class="w-1/2">
              <Input
                class="px-3 py-1 h-auto"
                bind:value={layout.label}
                onchange={(e) => {
                {/*@ts-ignore*/}
                if (e.target.value === '') {
                  layout.label = 'Unnamed Layout'
                }
              }}
              />
            </Table.Cell>
            <Table.Cell>
              <Toggle class="border" aria-label="toggle bold" pressed={layout.locked} onPressedChange={(v) => {
                  layout.locked = v
                }}
              >
                <Lock class="size-4"/>
              </Toggle>
            </Table.Cell>
            <Table.Cell class="w-1/2">
              <div class="flex flex-col gap-2">
                {#each layout.rows ?? [] as row, ridx (ridx)}
                  {@const popoverKey = `${layout.id}-${ridx}`}
                  {@const isPopoverOpen = addColumnPopoverStates[popoverKey] ?? false}
                  <div class="flex items-center gap-2">
                    {#each row.sessionIds ?? [] as sessionId,sidx (sidx)}
                      {@const session = neuzosConfig.sessions.find(s => s.id === sessionId)}
                      <div class="flex items-center gap-1">
                        <Button variant="outline" size="xs" class="text-xs gap-2" onclick={() => {
                        row.sessionIds.splice(sidx, 1)
                      }}>
                          <img class="h-4 w-4" src="icons/{session?.icon.slug}.png" alt=""/>
                          <div class="flex items-center gap-2">
                            {session?.label}
                            <Trash class="size-3"/>
                          </div>
                        </Button>
                      </div>
                    {/each}
                    <div class="flex-1"></div>
                    <div class="flex items-center gap-1">
                      <Popover.Root open={isPopoverOpen} onOpenChange={(open) => { addColumnPopoverStates[popoverKey] = open; }}>
                        <Popover.Trigger>
                          <Button variant="outline" size="xs" class="text-xs">
                            <Plus class="size-3 mr-1"/>
                            Add Column
                          </Button>
                        </Popover.Trigger>
                        <Popover.Content class="w-[280px] p-0">
                          <Command.Root shouldFilter={true}>
                            <Command.Input placeholder="Search sessions..." class="h-10" />
                            <Command.Empty>No session found.</Command.Empty>
                            <Command.List class="max-h-[320px]">
                              <Command.Group>
                                {#each neuzosConfig.sessions as session}
                                  {@const selectedInLayout = neuzosConfig.layouts.find(l => l.id === layout.id)?.rows.find(r => r.sessionIds.includes(session.id)) !== undefined}
                                  {#if !selectedInLayout}
                                    <Command.Item
                                      value={session.id}
                                      keywords={[session.label.toLowerCase()]}
                                      onSelect={() => {
                                        row.sessionIds.push(session.id);
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
                      <Button class="text-xs" variant="outline" size="xs" onclick={() => {
                      layout.rows.splice(ridx, 1)
                    }}>
                        <Trash class="size-3"/>
                        Delete Row
                      </Button>
                    </div>

                  </div>
                {/each}
                <Button variant="outline" size="xs" onclick={() => {
                      layout.rows ??= []
                      layout.rows.push({
                        sessionIds: []
                      })
                    }}>
                  <Plus/>
                  Add Row
                </Button>

              </div>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </Card.Content>
  <Card.Footer>
    <div class="flex items-center justify-between">
      <Button variant="outline" size="sm" onclick={addLayout}>Add Layout</Button>
    </div>
  </Card.Footer>
</Card.Root>
