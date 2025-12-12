<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import * as Select from "$lib/components/ui/select";
  import * as Popover from "$lib/components/ui/popover";
  import * as Command from "$lib/components/ui/command";

  import {getContext, onMount} from "svelte";
  import type {IpcRenderer} from "@electron-toolkit/preload";
  import {Button} from "$lib/components/ui/button";

  import type {NeuzConfig} from "$lib/types";
  import {Plus, Trash2, ChevronsUpDown, Check} from "@lucide/svelte";

  const modifierOptions = [
    { value: "", label: "None" },
    { value: "commandorcontrol", label: "Ctrl/Cmd" },
    { value: "alt", label: "Alt" },
    { value: "shift", label: "Shift" },
    { value: "commandorcontrol+alt", label: "Ctrl/Cmd+Alt" },
    { value: "commandorcontrol+shift", label: "Ctrl/Cmd+Shift" },
    { value: "alt+shift", label: "Alt+Shift" },
    { value: "commandorcontrol+alt+shift", label: "Ctrl/Cmd+Alt+Shift" },
    { value: "control", label: "Control" },
    { value: "command", label: "Command" },
    { value: "cmdorctrl", label: "CmdOrCtrl" },
    { value: "cmd", label: "Cmd" },
    { value: "super", label: "Super" },
    { value: "meta", label: "Meta" },
    { value: "option", label: "Option" },
    { value: "altgr", label: "AltGr" },
  ];

  // Allowed keys based on Electron accelerator syntax
  const allowedKeys = [
    // Numbers
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    // Letters
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    // Function keys
    "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
    "f13", "f14", "f15", "f16", "f17", "f18", "f19", "f20", "f21", "f22", "f23", "f24",
    // Punctuation
    "plus", "space", "tab", "capslock", "numlock", "scrolllock", "backspace",
    "delete", "insert", "return", "enter", "up", "down", "left", "right",
    "home", "end", "pageup", "pagedown", "escape", "esc",
    // Media keys
    "volumeup", "volumedown", "volumemute", "medianexttrack", "mediaprevioustrack",
    "mediastop", "mediaplaypause",
    // Numpad
    "num0", "num1", "num2", "num3", "num4", "num5", "num6", "num7", "num8", "num9",
    "numdec", "numadd", "numsub", "nummult", "numdiv",
    // Special
    "printscreen", "pause",
  ];

  let allowedEventKeybinds: {
    [key: string]: {
      label: string,
      args?: string[],
      unique?: boolean
    }
  } = $state({})

  // Helper function to parse keybind into modifier and key
  function parseKeybind(keybind: string): { modifier: string; key: string } {
    const parts = keybind.split('+');
    if (parts.length === 1) {
      return { modifier: "", key: keybind };
    }
    const key = parts[parts.length - 1];
    const modifier = parts.slice(0, -1).join('+');
    return { modifier, key };
  }

  // Helper function to build keybind from modifier and key
  function buildKeybind(modifier: string, key: string): string {
    if (!modifier || modifier === "") {
      return key;
    }
    return key ? `${modifier}+${key}` : modifier;
  }

  const electronApi = getContext<IpcRenderer>("electronApi");
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");
  onMount(async () => {
    allowedEventKeybinds = await electronApi.invoke("config.get_available_event_keybinds");
  });

  let dummy: any = $state(null);

  // State for combobox - store open state per keybind
  let comboboxStates: Array<{ open: boolean; modifierOpen: boolean }> = $state([]);

  // Initialize combobox states when keybinds change
  $effect(() => {
    const neededLength = neuzosConfig.keyBinds.length;
    while (comboboxStates.length < neededLength) {
      comboboxStates.push({ open: false, modifierOpen: false });
    }
    // Clean up if keybinds were removed
    if (comboboxStates.length > neededLength) {
      comboboxStates.length = neededLength;
    }
  });

  $effect(() => {
    if (dummy !== null) {
      dummy = null;
    }
  });

</script>
<Card.Root class="h-full  overflow-y-auto">
  <Card.Content class="flex flex-col gap-4">
    <p class="text-sm">
      Manage your keyboard shortcuts for various NeuzOS actions. Click on a key or modifier to change it.
    </p>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="font-bold"></Table.Head>
          <Table.Head class="font-bold">Modifier</Table.Head>
          <Table.Head class="font-bold">Key</Table.Head>
          <Table.Head class="font-bold">Event</Table.Head>
          <Table.Head></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each neuzosConfig.keyBinds as keyBind, index}
          {@const eventInfo = allowedEventKeybinds[keyBind.event]}
          {@const parsed = parseKeybind(keyBind.key)}
          {#if comboboxStates[index]}
            {@const state = comboboxStates[index]}
          <Table.Row>
            <Table.Cell class="text-sm text-muted-foreground">
              <Button variant="outline" size="xs" class="w-6 h-6" onclick={() => {
                neuzosConfig.keyBinds.splice(neuzosConfig.keyBinds.indexOf(keyBind), 1)
              }}>
                <Trash2 class="size-3"/>
              </Button>
            </Table.Cell>
            <Table.Cell>
              {@const modifierState = comboboxStates[index]}
              <Popover.Root bind:open={modifierState.modifierOpen}>
                <Popover.Trigger class="w-48 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                  {@const selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                  <span class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">
                    {selectedMod}
                  </span>
                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50" />
                </Popover.Trigger>
                <Popover.Content class="w-[220px] p-0">
                  <Command.Root shouldFilter={true}>
                    <Command.Input placeholder="Search modifier..." class="h-10" />
                    <Command.Empty>No modifier found.</Command.Empty>
                    <Command.List class="max-h-[320px]">
                      <Command.Group>
                        {#each modifierOptions as modifier}
                          <Command.Item
                            value={modifier.value}
                            keywords={[modifier.label.toLowerCase()]}
                            onSelect={() => {
                              keyBind.key = buildKeybind(modifier.value, parsed.key);
                              modifierState.modifierOpen = false;
                            }}
                            class="font-medium py-2.5"
                          >
                            <Check class={parsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"} />
                            <span class={parsed.modifier === modifier.value ? "text-primary" : ""}>{modifier.label}</span>
                          </Command.Item>
                        {/each}
                      </Command.Group>
                    </Command.List>
                  </Command.Root>
                </Popover.Content>
              </Popover.Root>
            </Table.Cell>
            <Table.Cell>
              {@const keyOnly = parsed.key}
              <Popover.Root bind:open={state.open}>
                <Popover.Trigger class="w-40 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                  <span class="truncate {keyOnly ? 'text-foreground uppercase' : 'text-muted-foreground font-sans font-normal lowercase'}">
                    {keyOnly || "select key..."}
                  </span>
                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50" />
                </Popover.Trigger>
                <Popover.Content class="w-[220px] p-0">
                  <Command.Root shouldFilter={true}>
                    <Command.Input placeholder="Search key..." class="h-10" />
                    <Command.Empty>No key found.</Command.Empty>
                    <Command.List class="max-h-[320px]">
                      <Command.Group>
                        {#each allowedKeys as key}
                          <Command.Item
                            value={key}
                            onSelect={() => {
                              keyBind.key = buildKeybind(parsed.modifier, key);
                              state.open = false;
                            }}
                            class="font-mono font-semibold uppercase py-2.5"
                          >
                            <Check class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"} />
                            <span class={keyOnly === key ? "text-primary" : ""}>{key}</span>
                          </Command.Item>
                        {/each}
                      </Command.Group>
                    </Command.List>
                  </Command.Root>
                </Popover.Content>
              </Popover.Root>
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
          {/if}
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
