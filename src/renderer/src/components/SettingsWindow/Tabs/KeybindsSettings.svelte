<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import * as Select from "$lib/components/ui/select";

  import {getContext, onMount} from "svelte";
  import type {IpcRenderer} from "@electron-toolkit/preload";
  import {Button} from "$lib/components/ui/button";

  import type {NeuzConfig} from "$lib/types";
  import {Plus, Trash2} from "@lucide/svelte";
  import {Input} from "$lib/components/ui/input";

  const allowedModifiers = [
    "alt",
    "control",
    "ctrl",
    "commandorcontrol",
    "cmdorctrl",
    "super",
    "command",
    "cmd",
    "meta",
    "shift",
    "option",
    "altgr",
  ];
  let allowedEventKeybinds: {
    [key: string]: {
      label: string,
      args?: string[],
      unique?: boolean
    }
  } = $state({})

  const electronApi = getContext<IpcRenderer>("electronApi");
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");
  onMount(async () => {
    allowedEventKeybinds = await electronApi.invoke("config.get_available_event_keybinds");
  });

  let dummy: any = $state(null);

  $effect(() => {
    if (dummy !== null) {
      dummy = null;
    }
  });

</script>
<Card.Root class="h-full  overflow-y-auto">
  <Card.Content class="flex flex-col gap-4">
    <p class="text-sm">
      Please use Electron accelerator syntax for the keybinds.<br/>
      To prevent crashes please refer to the documentation
      <a class="underline"
         href="https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts"
         target="_blank">Here</a>

    </p>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="font-bold"></Table.Head>
          <Table.Head class="font-bold">Keybind</Table.Head>
          <Table.Head class="font-bold">Event</Table.Head>
          <Table.Head></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each neuzosConfig.keyBinds as keyBind}
          {@const eventInfo = allowedEventKeybinds[keyBind.event]}
          <Table.Row>
            <Table.Cell class="text-sm text-muted-foreground">
              <Button variant="outline" size="xs" class="w-6 h-6" onclick={() => {
                neuzosConfig.keyBinds.splice(neuzosConfig.keyBinds.indexOf(keyBind), 1)
              }}>
                <Trash2 class="size-3"/>
              </Button>
            </Table.Cell>
            <Table.Cell>
              {@const notAllowed = allowedModifiers.includes(keyBind.key.toLowerCase().trim()) }
              <Input type="text" bind:value={keyBind.key} class="w-64 {notAllowed ? 'border-red-400' : ''}"/>
              {#if notAllowed}
                <b class="text-red-400">Using a modifier only as a keybind is not allowed.</b>
              {/if}
            </Table.Cell>
            <Table.Cell class="text-sm text-muted-foreground">{eventInfo?.label}</Table.Cell>
            <Table.Cell>
              {#if eventInfo?.args?.length > 0}
                {#each eventInfo?.args ?? [] as arg}
                  {#if arg === 'layout_id'}
                    <Select.Root type="single" bind:value={ keyBind.args[0]} onValueChange={(value) => {
                        if(!value) return
                        keyBind.args[0] = value
                      }}>
                      <Select.Trigger size="xs" class="w-64 p-0 m-0 px-2 py-1" onclick={() => {
                          dummy = null
                        }}>
                        {@const selectedLayout = neuzosConfig.layouts.find(layout => layout.id === keyBind.args[0])}

                        {selectedLayout?.label ?? 'Select Layout'}
                      </Select.Trigger>
                      <Select.Content class="max-h-64">
                        {#each neuzosConfig.layouts as layout}
                          <Select.Item aria-checked={false} value={layout.id}>
                            <img class="w-5 h-5" src="icons/{layout.icon.slug}.png" alt=""/>
                            {layout.label}
                          </Select.Item
                          >
                        {/each}
                      </Select.Content>
                    </Select.Root>
                  {:else if arg === 'session_id'}
                    Session Choser Select
                  {/if}
                {/each}
              {:else}
                <i class="text-accent-foreground opacity-50"> No extra data is needed for this event.</i>
              {/if}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
    <Select.Root type="single" bind:value={dummy} onValueChange={(value) => {
                        if(!value) return
                        neuzosConfig.keyBinds.push({
                        key: '',
                        event: value,
                        args: []
                        })
                      }}>
      <Select.Trigger size="xs" class="p-0 m-0 px-2 py-1" onclick={() => {
                          dummy = null
                        }}>
        <Plus class="size-3"/>
        Add Keybind
      </Select.Trigger>
      <Select.Content class="">
        {#each Object.keys(allowedEventKeybinds) as event (event)}
          {#if !(allowedEventKeybinds[event]?.unique && neuzosConfig.keyBinds.find(keyBind => keyBind.event === event))}
            {@const eventInfo = allowedEventKeybinds[event]}
            <Select.Item aria-checked={false} value={event}>
              {eventInfo?.label}
            </Select.Item
            >
          {/if}
        {/each}
      </Select.Content>
    </Select.Root>
  </Card.Content>
</Card.Root>
