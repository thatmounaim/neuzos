<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import * as Popover from "$lib/components/ui/popover";
  import * as Command from "$lib/components/ui/command";

  import { getContext, onMount } from "svelte";
  import type { IpcRenderer } from "@electron-toolkit/preload";
  import { Button } from "$lib/components/ui/button";

  import type { NeuzConfig } from "$lib/types";
  import { Plus, Trash2, ChevronsUpDown, Check } from "@lucide/svelte";

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
    { value: "altgr", label: "AltGr" }
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
    // Punctuation
    ")", "!", "@", "#", "$", "%", "^", "&", "*", "(", ":", ";", ":", "+", "=", "<", ",", "_", "-", ">", ".", "?", "/", "~", "`", "{", "]", "[", "|", "\\", "}",
  ];

  let allowedEventKeybinds: {
    [key: string]: {
      label: string,
      args?: string[],
      unique?: boolean
    }
  } = $state({});

  // Helper function to parse keybind into modifier and key
  function parseKeybind(keybind: string): { modifier: string; key: string } {
    const parts = keybind.split("+");
    if (parts.length === 1) {
      return { modifier: "", key: keybind };
    }
    const key = parts[parts.length - 1];
    const modifier = parts.slice(0, -1).join("+");
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

  // State for combobox - store open state per keybind
  let comboboxStates: Array<{ open: boolean; modifierOpen: boolean }> = $state([]);

  // State for add keybind popover
  let addKeybindPopoverOpen = $state(false);

  // State for layout selector popovers (keyed by keybind index)
  let layoutSelectorStates: { [index: number]: boolean } = $state({});

  // State for session selector popovers (keyed by keybind index)
  let sessionSelectorStates: { [index: number]: boolean } = $state({});

  // State for action selector popovers (keyed by keybind index)
  let actionSelectorStates: { [index: number]: boolean } = $state({});

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
          <Table.Head class="w-full"></Table.Head>
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
                  <Trash2 class="size-3" />
                </Button>
              </Table.Cell>
              <Table.Cell>
                {@const modifierState = comboboxStates[index]}
                <Popover.Root bind:open={modifierState.modifierOpen}>
                  <Popover.Trigger
                    class="w-48 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
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
                              <Check
                                class={parsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"} />
                              <span
                                class={parsed.modifier === modifier.value ? "text-primary" : ""}>{modifier.label}</span>
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
                <Popover.Root open={state.open} onOpenChange={(open) => { state.open = open; }}>
                  <Popover.Trigger
                    class="w-40 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                  <span
                    class="truncate {keyOnly ? 'text-foreground uppercase' : 'text-muted-foreground font-sans font-normal lowercase'}">
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
                  <div class="flex flex-wrap items-start gap-2">
                    {#each eventInfo?.args ?? [] as arg, argIndex}
                      {#if arg === 'layout_id'}
                        {@const isLayoutSelectorOpen = layoutSelectorStates[index] ?? false}
                        {@const
                          selectedLayout = neuzosConfig.layouts.find(layout => layout.id === keyBind.args[argIndex])}
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-muted-foreground whitespace-nowrap">Layout:</span>
                          <Popover.Root open={isLayoutSelectorOpen}
                                        onOpenChange={(open) => { layoutSelectorStates[index] = open; }}>
                            <Popover.Trigger>
                              <Button variant="outline" size="sm" class="h-9">
                                {#if selectedLayout}
                                  <img class="w-4 h-4 mr-2" src="icons/{selectedLayout.icon.slug}.png" alt="" />
                                  {selectedLayout.label}
                                {:else}
                                  Select Layout
                                {/if}
                              </Button>
                            </Popover.Trigger>
                            <Popover.Content class="w-[280px] p-0">
                              <Command.Root shouldFilter={true}>
                                <Command.Input placeholder="Search layouts..." class="h-10" />
                                <Command.Empty>No layout found.</Command.Empty>
                                <Command.List class="max-h-[320px]">
                                  <Command.Group>
                                    {#each neuzosConfig.layouts as layout}
                                      <Command.Item
                                        value={layout.id}
                                        keywords={[layout.label.toLowerCase()]}
                                        onSelect={() => {
                                        keyBind.args[argIndex] = layout.id;
                                        layoutSelectorStates[index] = false;
                                      }}
                                        class="py-2"
                                      >
                                        <img class="size-5 mr-2" src="icons/{layout.icon.slug}.png" alt="" />
                                        <span>{layout.label}</span>
                                      </Command.Item>
                                    {/each}
                                  </Command.Group>
                                </Command.List>
                              </Command.Root>
                            </Popover.Content>
                          </Popover.Root>
                        </div>
                      {:else if arg === 'session_id'}
                        {@const isSessionSelectorOpen = sessionSelectorStates[index] ?? false}
                        {@const
                          selectedSession = neuzosConfig.sessions.find(session => session.id === keyBind.args[argIndex])}
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-muted-foreground whitespace-nowrap">Session:</span>
                          <Popover.Root open={isSessionSelectorOpen}
                                        onOpenChange={(open) => { sessionSelectorStates[index] = open; }}>
                            <Popover.Trigger>
                              <Button variant="outline" size="sm" class="h-9">
                                {#if selectedSession}
                                  <img class="w-4 h-4 mr-2" src="icons/{selectedSession.icon.slug}.png" alt="" />
                                  {selectedSession.label}
                                {:else}
                                  Select Session
                                {/if}
                              </Button>
                            </Popover.Trigger>
                            <Popover.Content class="w-[280px] p-0">
                              <Command.Root shouldFilter={true}>
                                <Command.Input placeholder="Search sessions..." class="h-10" />
                                <Command.Empty>No session found.</Command.Empty>
                                <Command.List class="max-h-[320px]">
                                  <Command.Group>
                                    {#each neuzosConfig.sessions as session}
                                      <Command.Item
                                        value={session.id}
                                        keywords={[session.label.toLowerCase()]}
                                        onSelect={() => {
                                        keyBind.args[argIndex] = session.id;
                                        sessionSelectorStates[index] = false;
                                      }}
                                        class="py-2"
                                      >
                                        <img class="size-5 mr-2" src="icons/{session.icon.slug}.png" alt="" />
                                        <span>{session.label}</span>
                                      </Command.Item>
                                    {/each}
                                  </Command.Group>
                                </Command.List>
                              </Command.Root>
                            </Popover.Content>
                          </Popover.Root>
                        </div>
                      {:else if arg === 'action_id'}
                        {@const isActionSelectorOpen = actionSelectorStates[index] ?? false}
                        {@const sessionId = keyBind.args[argIndex - 1]}
                        {@const
                          sessionActionsData = neuzosConfig.sessionActions?.find(sa => sa.sessionId === sessionId)}
                        {@const
                          selectedAction = sessionActionsData?.actions.find(action => action.id === keyBind.args[argIndex])}
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-muted-foreground whitespace-nowrap">Action:</span>
                          <Popover.Root open={isActionSelectorOpen}
                                        onOpenChange={(open) => { actionSelectorStates[index] = open; }}>
                            <Popover.Trigger>
                              <Button variant="outline" size="sm" class="h-9"
                                      disabled={!sessionId || !sessionActionsData}>
                                {#if selectedAction}
                                  <img class="w-4 h-4 mr-2" src="icons/{selectedAction.icon.slug}.png" alt="" />
                                  {selectedAction.label}
                                {:else}
                                  Select Action
                                {/if}
                              </Button>
                            </Popover.Trigger>
                            <Popover.Content class="w-[280px] p-0">
                              <Command.Root shouldFilter={true}>
                                <Command.Input placeholder="Search actions..." class="h-10" />
                                <Command.Empty>No action found.</Command.Empty>
                                <Command.List class="max-h-[320px]">
                                  <Command.Group>
                                    {#if sessionActionsData}
                                      {#each sessionActionsData.actions as action}
                                        <Command.Item
                                          value={action.id}
                                          keywords={[action.label.toLowerCase()]}
                                          onSelect={() => {
                                          keyBind.args[argIndex] = action.id;
                                          actionSelectorStates[index] = false;
                                        }}
                                          class="py-2"
                                        >
                                          <img class="size-5 mr-2" src="icons/{action.icon.slug}.png" alt="" />
                                          <span>{action.label}</span>
                                        </Command.Item>
                                      {/each}
                                    {/if}
                                  </Command.Group>
                                </Command.List>
                              </Command.Root>
                            </Popover.Content>
                          </Popover.Root>
                        </div>
                      {:else if arg === 'event_name'}
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-muted-foreground whitespace-nowrap">Event Name:</span>
                          <input
                            type="text"
                            class="w-48 h-9 px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            placeholder="Enter event name..."
                            bind:value={keyBind.args[argIndex]}
                          />
                        </div>
                      {:else if arg === 'event_data'}
                        <div class="flex flex-col gap-1 w-full">
                          <span class="text-xs text-muted-foreground">Event Data:</span>
                          <textarea
                            class="w-full min-h-[80px] px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-y"
                            placeholder="Enter event data..."
                            bind:value={keyBind.args[argIndex]}
                          ></textarea>
                        </div>
                      {:else}
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-muted-foreground whitespace-nowrap">{arg}:</span>
                          <input
                            type="text"
                            class="w-48 h-9 px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            placeholder="Enter {arg}..."
                            bind:value={keyBind.args[argIndex]}
                          />
                        </div>
                      {/if}
                    {/each}
                  </div>
                {:else}
                  <i class="text-accent-foreground opacity-50"> No extra data is needed for this event.</i>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/if}
        {/each}
      </Table.Body>
    </Table.Root>
    <Popover.Root open={addKeybindPopoverOpen} onOpenChange={(open) => { addKeybindPopoverOpen = open; }}>
      <Popover.Trigger>
        <Button variant="outline" size="sm">
          <Plus class="size-4 mr-2" />
          Add Keybind
        </Button>
      </Popover.Trigger>
      <Popover.Content class="w-[320px] p-0">
        <Command.Root shouldFilter={true}>
          <Command.Input placeholder="Search events..." class="h-10" />
          <Command.Empty>No event found.</Command.Empty>
          <Command.List class="max-h-[320px]">
            <Command.Group>
              {#each Object.keys(allowedEventKeybinds) as event (event)}
                {#if !(allowedEventKeybinds[event]?.unique && neuzosConfig.keyBinds.find(keyBind => keyBind.event === event))}
                  {@const eventInfo = allowedEventKeybinds[event]}
                  <Command.Item
                    value={event}
                    keywords={[eventInfo?.label.toLowerCase()]}
                    onSelect={() => {
                      const argCount = eventInfo?.args?.length || 0;
                      neuzosConfig.keyBinds.push({
                        key: '',
                        event: event,
                        args: new Array(argCount).fill('')
                      });
                      addKeybindPopoverOpen = false;
                    }}
                    class="py-2"
                  >
                    <span>{eventInfo?.label}</span>
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
