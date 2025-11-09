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
    Minus
  } from "@lucide/svelte";

  import { Input } from "$lib/components/ui/input";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Separator } from "$lib/components/ui/separator";
  import * as Table from "$lib/components/ui/table";
  import * as Select from "$lib/components/ui/select";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import type { NeuzConfig } from "$lib/types";
  import { getContext } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { neuzosBridge } from "$lib/core";

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
<Card.Root class="h-full  overflow-y-auto">
  <Card.Content class="flex flex-col gap-4">
    <Table.Root>
      <Table.Caption>A list of your layouts.</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head></Table.Head>
          <Table.Head class=""></Table.Head>
          <Table.Head class="w-[100px]">Icon</Table.Head>
          <Table.Head class="w-1/3">Label</Table.Head>
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
                      <img class="w-5 h-5" src="icons/{layout.icon.slug}.png" alt="" />
                    {:else}
                      <img class="w-5 h-5" src="icons/neuzos_pang.png" alt="" />
                    {/if}
                  </Select.Trigger>
                  <Select.Content class="w-16 max-h-64">
                    {#each layoutIcons as icon}
                      <Select.Item value={icon}>
                        <img class="w-5 h-5" src="icons/{icon}.png" alt="" /></Select.Item
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
            <Table.Cell class="w-1/2">
              <div class="flex flex-col gap-2">
                {#each layout.rows ?? [] as row, ridx (ridx)}
                  <div class="flex items-center gap-2">
                    {#each row.sessionIds ?? [] as sessionId,sidx (sidx)}
                      {@const session = neuzosConfig.sessions.find(s => s.id === sessionId)}
                      <div class="flex items-center gap-1">
                        <Button variant="outline" size="xs" class="text-xs">
                          <img class="h-4 w-4" src="icons/{session?.icon.slug}.png" alt="" /> {session?.label}
                        </Button>
                      </div>
                    {/each}
                    <div class="flex-1"></div>
                    <div class="flex items-center gap-1">

                      <Button disabled={row.sessionIds.length === 0} variant="outline" size="icon-xs" onclick={() => {
                       row.sessionIds.splice(row.sessionIds.length-1, 1)
                     }}>
                        <Minus class="size-3"></Minus>
                      </Button>
                      <Select.Root type="single" bind:value={dummy} onValueChange={(value) => {
                        if(!value) return
                        row.sessionIds.push(value)
                      }}>
                        <Select.Trigger size="xs" class="w-14 p-0 m-0 px-2 py-1" onclick={() => {
                          dummy = null
                        }}>
                          <Plus class="size-3"></Plus>
                        </Select.Trigger>
                        <Select.Content class="w-16 max-h-64">
                          {#each neuzosConfig.sessions as session}
                            {@const
                              selectedInLayout = neuzosConfig.layouts.find(l => l.id === layout.id)?.rows.find(r => r.sessionIds.includes(session.id)) !== undefined }
                            {#if !selectedInLayout}
                              <Select.Item aria-checked={false} disabled={selectedInLayout} value={session.id}>
                                <img class="w-5 h-5" src="icons/{session.icon.slug}.png" alt="" />
                                {session.label}
                              </Select.Item
                              >
                            {/if}
                          {/each}
                        </Select.Content>
                      </Select.Root>
                      <Button variant="outline" size="icon-xs" onclick={() => {
                      layout.rows.splice(ridx, 1)
                    }}>
                        <Trash class="size-3"></Trash>
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
                  <Plus />
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
