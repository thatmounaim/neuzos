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
    "misc/neuz_hat",
    "misc/browser",
    "misc/pickup_pet_buff_1",
    "misc/pickup_pet_buff_2",
    "misc/pickup_pet_buff_3",
    "misc/perin",
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

  let dummy: any = $state(null);

  $effect(() => {
    if (dummy !== null) {
      dummy = null;
    }
  });

</script>
<Card.Root class="w-full">
  <Card.Content class="flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <strong>Default Layouts on Launch</strong>

      <Select.Root type="single" bind:value={dummy} onValueChange={(value) => {
                        if(!value) return
                        neuzosConfig.defaultLayouts.push(value)
                      }}>
        <Select.Trigger size="xs" class="w-14 p-0 m-0 px-2 py-1" onclick={() => {
                          dummy = null
                        }}>
          <Plus class="size-3"></Plus>
        </Select.Trigger>
        <Select.Content class="w-16 max-h-64">
          {#each neuzosConfig.layouts as layout}
            {@const disabled = neuzosConfig.defaultLayouts.includes(layout.id)}
            {#if !disabled}
              <Select.Item aria-checked={false} disabled={disabled} value={layout.id}>
                <img class="w-5 h-5" src="icons/{layout.icon.slug}.png" alt=""/>
                {layout.label}
              </Select.Item
              >
            {/if}
          {/each}
        </Select.Content>
      </Select.Root>
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
              <div class="flex items-center">
                <Select.Root type="single" bind:value={layout.icon.slug}>
                  <Select.Trigger size="sm" class="w-14 p-0 m-0 px-2 py-2 h-6">
                    {#if layout.icon.slug}
                      <img class="w-5 h-5" src="icons/{layout.icon.slug}.png" alt=""/>
                    {:else}
                      <img class="w-5 h-5" src="icons/neuzos_pang.png" alt=""/>
                    {/if}
                  </Select.Trigger>
                  <Select.Content class="w-16 max-h-64">
                    {#each layoutIcons as icon}
                      <Select.Item value={icon}>
                        <img class="w-5 h-5" src="icons/{icon}.png" alt=""/></Select.Item
                      >
                    {/each}
                  </Select.Content>
                </Select.Root>
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
                      <Select.Root type="single" bind:value={dummy} onValueChange={(value) => {
                        if(!value) return
                        row.sessionIds.push(value)
                      }}>
                        <Select.Trigger size="xs" class="text-xs p-0 m-0 px-2 py-1" onclick={() => {
                          dummy = null
                        }}>
                          <Plus class="size-3"/>
                          Add Column
                        </Select.Trigger>
                        <Select.Content class="w-16 max-h-64">
                          {#each neuzosConfig.sessions as session}
                            {@const
                              selectedInLayout = neuzosConfig.layouts.find(l => l.id === layout.id)?.rows.find(r => r.sessionIds.includes(session.id)) !== undefined }
                            {#if !selectedInLayout}
                              <Select.Item aria-checked={false} disabled={selectedInLayout} value={session.id}>
                                <img class="w-5 h-5" src="icons/{session.icon.slug}.png" alt=""/>
                                {session.label}
                              </Select.Item
                              >
                            {/if}
                          {/each}
                        </Select.Content>
                      </Select.Root>
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
