<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import * as Popover from "$lib/components/ui/popover";
  import * as Command from "$lib/components/ui/command";
  import * as Collapsible from "$lib/components/ui/collapsible";

  import {getContext} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import {Switch} from "$lib/components/ui/switch";
  import * as Alert from "$lib/components/ui/alert";
  import KeyBinder from "../../Shared/KeyBinder.svelte";
  import type {NeuzConfig, SessionActions} from "$lib/types";
  import IconPicker from "../../Shared/IconPicker.svelte";
  import {Plus, Trash2, ChevronsUpDown, Check, ChevronDown, ChevronUp, AlertCircleIcon} from "@lucide/svelte";

  const modifierOptions = [
    {value: "", label: "None"},
    {value: "alt", label: "Alt"},
    {value: "shift", label: "Shift"},
    {value: "control", label: "Control"},
    {value: "command", label: "Command"},
    {value: "meta", label: "Meta"},
    {value: "control+alt", label: "Ctrl+Alt"},
    {value: "control+shift", label: "Ctrl+Shift"},

    {value: "command+control", label: "Cmd+Ctrl"},
    {value: "command+alt", label: "Cmd+Alt"},
    {value: "command+shift", label: "Cmd+Shift"},

    {value: "alt+shift", label: "Alt+Shift"},
    {value: "control+alt+shift", label: "Ctrl+Alt+Shift"},
    {value: "command+control+shift", label: "Cmd+Ctrl+Shift"},
    {value: "command+control+alt", label: "Cmd+Ctrl+Alt"},
    {value: "command+alt+shift", label: "Cmd+Alt+Shift"}
  ];

  const cooldownCategoryOptions = [
    {value: "", label: "None"},
    {value: "food", label: "Food"},
    {value: "pill", label: "Pill"},
    {value: "refresher", label: "Refresher"},
    {value: "vital", label: "Vital"}
  ];

  const allowedKeys = [
    // Numbers
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    // Letters
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    // Function keys
    "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
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
    "printscreen",
    // Punctuation
    ")", "!", "@", "#", "$", "%", "^", "&", "*", "(", ":", ";", ":", "+", "=", "<", ",", "_", "-", ">", ".", "?", "/", "~", "`", "{", "]", "[", "|", "\\", "}"
  ];

  function parseKeybind(keybind: string): { modifier: string; key: string } {
    const parts = keybind.split("+");
    if (parts.length === 1) {
      return {modifier: "", key: keybind};
    }
    const key = parts[parts.length - 1];
    const modifier = parts.slice(0, -1).join("+");
    return {modifier, key};
  }

  function buildKeybind(modifier: string, key: string): string {
    if (!modifier || modifier === "") {
      return key;
    }
    return key ? `${modifier}+${key}` : modifier;
  }

  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

  // Initialize sessionActions if it doesn't exist
  if (!neuzosConfig.sessionActions) {
    neuzosConfig.sessionActions = [];
  }

  let comboboxStates: {
    [sessionId: string]: Array<{ keyOpen: boolean; modifierOpen: boolean; iconOpen: boolean; categoryOpen: boolean }>
  } = $state({});

  // Track open state for each collapsible
  let openSessions: { [sessionId: string]: boolean } = $state({});

  // Track open state for add sessions popover
  let addSessionPopoverOpen = $state(false);

  function addSessionToManage(sessionId: string) {
    const existing = neuzosConfig.sessionActions.find(sa => sa.sessionId === sessionId);
    if (!existing) {
      neuzosConfig.sessionActions.push({
        sessionId: sessionId,
        actions: []
      });
      openSessions[sessionId] = true;
    }
    addSessionPopoverOpen = false;
  }

  function removeSessionActions(sessionId: string) {
    neuzosConfig.sessionActions = neuzosConfig.sessionActions.filter(sa => sa.sessionId !== sessionId);
    delete openSessions[sessionId];
    delete comboboxStates[sessionId];
  }

  function addAction(sessionActions: SessionActions) {
    sessionActions.actions.push({
      id: Date.now().toString() + Math.random(),
      icon: {slug: "neuzos_pang"},
      label: "New Action",
      ingameKey: "",
      castTime: 0,
      cooldown: 0,
      pinned: false,
      cooldownCategory: ""
    });
  }

  function removeAction(sessionActions: SessionActions, actionId: string) {
    sessionActions.actions = sessionActions.actions.filter(a => a.id !== actionId);
  }

  function moveActionUp(sessionActions: SessionActions, index: number) {
    if (index > 0) {
      const temp = sessionActions.actions[index];
      sessionActions.actions[index] = sessionActions.actions[index - 1];
      sessionActions.actions[index - 1] = temp;

      // Also swap the combobox states
      if (comboboxStates[sessionActions.sessionId]) {
        const tempState = comboboxStates[sessionActions.sessionId][index];
        comboboxStates[sessionActions.sessionId][index] = comboboxStates[sessionActions.sessionId][index - 1];
        comboboxStates[sessionActions.sessionId][index - 1] = tempState;
      }
    }
  }

  function moveActionDown(sessionActions: SessionActions, index: number) {
    if (index < sessionActions.actions.length - 1) {
      const temp = sessionActions.actions[index];
      sessionActions.actions[index] = sessionActions.actions[index + 1];
      sessionActions.actions[index + 1] = temp;

      // Also swap the combobox states
      if (comboboxStates[sessionActions.sessionId]) {
        const tempState = comboboxStates[sessionActions.sessionId][index];
        comboboxStates[sessionActions.sessionId][index] = comboboxStates[sessionActions.sessionId][index + 1];
        comboboxStates[sessionActions.sessionId][index + 1] = tempState;
      }
    }
  }

  function moveSessionUp(index: number) {
    if (index > 0) {
      const sessions = [...neuzosConfig.sessionActions];
      [sessions[index], sessions[index - 1]] = [sessions[index - 1], sessions[index]];
      neuzosConfig.sessionActions = sessions;
    }
  }

  function moveSessionDown(index: number) {
    if (index < neuzosConfig.sessionActions.length - 1) {
      const sessions = [...neuzosConfig.sessionActions];
      [sessions[index], sessions[index + 1]] = [sessions[index + 1], sessions[index]];
      neuzosConfig.sessionActions = sessions;
    }
  }

  function getSessionLabel(sessionId: string): string {
    const session = neuzosConfig.sessions.find(s => s.id === sessionId);
    return session?.label || "Unknown Session";
  }

  function getSessionIcon(sessionId: string): string {
    const session = neuzosConfig.sessions.find(s => s.id === sessionId);
    return session?.icon.slug || "misc/browser";
  }

  $effect(() => {
    // Ensure combobox states match action counts
    neuzosConfig.sessionActions.forEach(sa => {
      if (!comboboxStates[sa.sessionId]) {
        comboboxStates[sa.sessionId] = [];
      }
      const neededLength = sa.actions.length;
      while (comboboxStates[sa.sessionId].length < neededLength) {
        comboboxStates[sa.sessionId].push({
          keyOpen: false,
          modifierOpen: false,
          iconOpen: false,
          categoryOpen: false
        });
      }
      if (comboboxStates[sa.sessionId].length > neededLength) {
        comboboxStates[sa.sessionId].length = neededLength;
      }

      // Initialize pinned property for existing actions
      sa.actions.forEach(action => {
        if (action.pinned === undefined) {
          action.pinned = false;
        }
      });
    });
  });

</script>

<Card.Root class="h-full overflow-y-auto">
  <Card.Header>

    <Card.Title class="text-lg font-semibold">Session Actions</Card.Title>
    <Card.Description class="flex flex-col">
      <p class="text-sm">
        Manage actions for your sessions. Each session can have multiple actions with customizable icons, labels, ingame
        keys, cast times, and cooldowns.
      </p>
      <Alert.Root variant="destructive" class="mt-4">
        <AlertCircleIcon/>
        <Alert.Title>Important Note.</Alert.Title>
        <Alert.Description class="pt-2">
          <ul>
            <li>- While it complies with TOS of 1 Human Action = 1 InGame Action, use this feature at your own risk.
            </li>
            <li>- It's still in a gray area, and if checked by a mod and failing to respond might cause you issues.</li>
          </ul>
        </Alert.Description>
      </Alert.Root>
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <!-- Add Session Selector -->
    <div class="flex items-center gap-2">
      <Popover.Root open={addSessionPopoverOpen} onOpenChange={(open) => { addSessionPopoverOpen = open; }}>
        <Popover.Trigger>
          <Button variant="outline" size="sm">
            <Plus class="size-4 mr-2"/>
            Add Session to Manage
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-[280px] p-0">
          <Command.Root shouldFilter={true}>
            <Command.Input placeholder="Search sessions..." class="h-10"/>
            <Command.Empty>No session found.</Command.Empty>
            <Command.List class="max-h-[320px]">
              <Command.Group>
                {#each neuzosConfig.sessions as session}
                  {@const alreadyAdded = neuzosConfig.sessionActions.find(sa => sa.sessionId === session.id)}
                  {#if !alreadyAdded}
                    <Command.Item
                      value={session.id}
                      keywords={[session.label.toLowerCase()]}
                      onSelect={() => addSessionToManage(session.id)}
                      class="py-2.5"
                    >
                      <img class="size-4 mr-2" src="icons/{session.icon.slug}.png" alt=""/>
                      <span>{session.label}</span>
                    </Command.Item>
                  {/if}
                {/each}
              </Command.Group>
            </Command.List>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>
    </div>

    <!-- Session Actions Cards -->
    <div class="flex flex-col gap-3">
      {#each neuzosConfig.sessionActions as sessionActions, sessionIndex (sessionActions.sessionId)}
        {@const sessionLabel = getSessionLabel(sessionActions.sessionId)}
        {@const sessionIcon = getSessionIcon(sessionActions.sessionId)}
        {@const isSessionOpen = openSessions[sessionActions.sessionId] ?? false}
        <Collapsible.Root open={isSessionOpen}
                          onOpenChange={(open) => { openSessions[sessionActions.sessionId] = open; }}
                          class="group border rounded-lg bg-card">
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 mr-2">
                <div class="flex flex-col gap-0.5">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onclick={() => moveSessionUp(sessionIndex)}
                    disabled={sessionIndex === 0}
                  >
                    <ChevronUp class="h-3 w-3"/>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onclick={() => moveSessionDown(sessionIndex)}
                    disabled={sessionIndex >= neuzosConfig.sessionActions.length - 1}
                  >
                    <ChevronDown class="h-3 w-3"/>
                  </Button>
                </div>
              </div>
              <Collapsible.Trigger class="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 text-left">
                <img class="w-6 h-6 rounded" src="icons/{sessionIcon}.png" alt=""/>
                <div class="flex flex-col">
                  <span class="font-medium">{sessionLabel}</span>
                  <span class="text-sm text-muted-foreground">{sessionActions.actions.length}
                    action{sessionActions.actions.length !== 1 ? 's' : ''}</span>
                </div>
                <ChevronDown
                  class="h-4 w-4 ml-auto transition-transform {openSessions[sessionActions.sessionId] ? 'rotate-180' : ''}"/>
              </Collapsible.Trigger>
              <Button
                variant="ghost"
                size="icon"
                onclick={() => removeSessionActions(sessionActions.sessionId)}
                class="ml-2 h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 class="h-4 w-4"/>
              </Button>
            </div>

            <Collapsible.Content class="pt-4">
              <div class="space-y-4">
                <!-- Actions Table -->
                {#if sessionActions.actions.length > 0}
                  <div class="rounded-md border">
                    <Table.Root>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head class="w-[20px]"></Table.Head>
                          <Table.Head class="w-[60px]">Icon</Table.Head>
                          <Table.Head class="w-[200px]">Label</Table.Head>
                          <Table.Head class="w-[120px]">Modifier</Table.Head>
                          <Table.Head class="w-[120px]">Key</Table.Head>
                          <Table.Head class="w-[120px]">Record</Table.Head>
                          <Table.Head class="w-[100px]">Cast Time(s)</Table.Head>
                          <Table.Head class="w-[100px]">Cooldown(s)</Table.Head>
                          <Table.Head class="w-[120px]">CD Category</Table.Head>
                          <Table.Head class="w-[70px] text-center">Pinned</Table.Head>
                          <Table.Head class="w-[40px]"></Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {#each sessionActions.actions as action, index (action.id)}
                          {@const parsed = parseKeybind(action.ingameKey)}
                          {@const state = comboboxStates[sessionActions.sessionId]?.[index] || {
                            keyOpen: false,
                            modifierOpen: false,
                            iconOpen: false,
                            categoryOpen: false
                          }}
                          <Table.Row class="hover:bg-muted/50">
                            <!-- Order -->
                            <Table.Cell class="py-3">
                              <div class="flex flex-col items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  onclick={() => moveActionUp(sessionActions, index)}
                                  disabled={index === 0}
                                >
                                  <ChevronUp class="h-4 w-4"/>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  onclick={() => moveActionDown(sessionActions, index)}
                                  disabled={index === sessionActions.actions.length - 1}
                                >
                                  <ChevronDown class="h-4 w-4"/>
                                </Button>
                              </div>
                            </Table.Cell>                            <!-- Icon -->
                            <Table.Cell class="py-3">
                              <IconPicker
                                bind:selected={action.icon}
                                onSelect={(iconSlug, previousIconSlug) => {
                                  const displayName = iconSlug.includes('/') ? iconSlug.split('/').at(-1) ?? iconSlug : iconSlug;
                                  const previousDisplayName = previousIconSlug
                                    ? (previousIconSlug.includes('/') ? previousIconSlug.split('/').at(-1) ?? previousIconSlug : previousIconSlug)
                                    : null;

                                  if (action.label === 'New Action' || (previousDisplayName && action.label === previousDisplayName)) {
                                    action.label = displayName;
                                  }

                                  if (comboboxStates[sessionActions.sessionId]?.[index]) {
                                    comboboxStates[sessionActions.sessionId][index].iconOpen = false;
                                  }
                                }}
                              />
                            </Table.Cell>

                            <!-- Label -->
                            <Table.Cell class="py-3">
                              <Input
                                class="h-9 text-sm"
                                bind:value={action.label}
                                placeholder="Action label"
                              />
                            </Table.Cell>

                            <!-- Modifier -->
                            <Table.Cell class="py-3">
                              <Popover.Root open={state.modifierOpen}
                                            onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].modifierOpen = open; }}>
                                <Popover.Trigger
                                  class="w-full h-9 px-3 py-2 inline-flex items-center justify-between rounded-md border border-input bg-background text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                  {@const
                                    selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                                  <span
                                    class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">
                                      {selectedMod}
                                    </span>
                                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                </Popover.Trigger>
                                <Popover.Content class="w-[220px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search modifier..." class="h-10"/>
                                    <Command.Empty>No modifier found.</Command.Empty>
                                    <Command.List class="max-h-[320px]">
                                      <Command.Group>
                                        {#each modifierOptions as modifier}
                                          <Command.Item
                                            value={modifier.value}
                                            keywords={[modifier.label.toLowerCase()]}
                                            onSelect={() => {
                                                action.ingameKey = buildKeybind(modifier.value, parsed.key);
                                                state.modifierOpen = false;
                                              }}
                                            class="py-2.5"
                                          >
                                            <Check
                                              class={parsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
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

                            <!-- Key -->
                            <Table.Cell class="py-3">
                              {@const keyOnly = parsed.key}
                              <Popover.Root open={state.keyOpen}
                                            onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].keyOpen = open; }}>
                                <Popover.Trigger
                                  class="w-full h-9 px-3 py-2 inline-flex items-center justify-between rounded-md border border-input bg-background text-sm font-mono shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                    <span
                                      class="truncate {keyOnly ? 'text-foreground uppercase font-semibold' : 'text-muted-foreground font-sans font-normal lowercase'}">
                                      {keyOnly || "select key..."}
                                    </span>
                                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                </Popover.Trigger>
                                <Popover.Content class="w-[220px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search key..." class="h-10"/>
                                    <Command.Empty>No key found.</Command.Empty>
                                    <Command.List class="max-h-[320px]">
                                      <Command.Group>
                                        {#each allowedKeys as key}
                                          <Command.Item
                                            value={key}
                                            onSelect={() => {
                                                action.ingameKey = buildKeybind(parsed.modifier, key);
                                                state.keyOpen = false;
                                              }}
                                            class="font-mono font-semibold uppercase py-2.5"
                                          >
                                            <Check
                                              class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                            <span class={keyOnly === key ? "text-primary" : ""}>{key}</span>
                                          </Command.Item>
                                        {/each}
                                      </Command.Group>
                                    </Command.List>
                                  </Command.Root>
                                </Popover.Content>
                              </Popover.Root>
                            </Table.Cell>

                            <!-- Record -->
                            <Table.Cell class="py-3">
                              <KeyBinder
                                actionId={action.id}
                                currentKey={action.ingameKey}
                                onBind={(key) => {
                                  action.ingameKey = key;
                                  return true;
                                }}
                                onCancel={() => {}}
                              />
                            </Table.Cell>

                            <!-- Cast Time -->
                            <Table.Cell class="py-3">
                              <Input
                                type="number"
                                class="h-9 text-sm"
                                bind:value={action.castTime}
                                min="0"
                                step="0.1"
                                placeholder="0"
                              />
                            </Table.Cell>

                            <!-- Cooldown -->
                            <Table.Cell class="py-3">
                              <Input
                                type="number"
                                class="h-9 text-sm"
                                bind:value={action.cooldown}
                                min="0"
                                step="0.1"
                                placeholder="0"
                              />
                            </Table.Cell>

                            <!-- Cooldown Category -->
                            <Table.Cell class="py-3">
                              <Popover.Root open={state.categoryOpen}
                                            onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].categoryOpen = open; }}>
                                <Popover.Trigger
                                  class="w-full h-9 px-3 py-2 inline-flex items-center justify-between rounded-md border border-input bg-background text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                  {@const
                                    selectedCategory = cooldownCategoryOptions.find(c => c.value === (action.cooldownCategory || ""))?.label ?? 'None'}
                                  <span
                                    class="truncate {action.cooldownCategory ? 'text-foreground' : 'text-muted-foreground'}">
                                      {selectedCategory}
                                    </span>
                                  <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                </Popover.Trigger>
                                <Popover.Content class="w-[220px] p-0">
                                  <Command.Root shouldFilter={true}>
                                    <Command.Input placeholder="Search category..." class="h-10"/>
                                    <Command.Empty>No category found.</Command.Empty>
                                    <Command.List class="max-h-[320px]">
                                      <Command.Group>
                                        {#each cooldownCategoryOptions as category}
                                          <Command.Item
                                            value={category.value}
                                            keywords={[category.label.toLowerCase()]}
                                            onSelect={() => {
                                                action.cooldownCategory = category.value;
                                                state.categoryOpen = false;
                                              }}
                                            class="py-2.5"
                                          >
                                            <Check
                                              class={(action.cooldownCategory || "") === category.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                            <span
                                              class={(action.cooldownCategory || "") === category.value ? "text-primary" : ""}>{category.label}</span>
                                          </Command.Item>
                                        {/each}
                                      </Command.Group>
                                    </Command.List>
                                  </Command.Root>
                                </Popover.Content>
                              </Popover.Root>
                            </Table.Cell>

                            <!-- Pinned -->
                            <Table.Cell class="py-3">
                              <div class="flex items-center justify-center">
                                <Switch checked={action.pinned ?? false}
                                        onCheckedChange={(checked) => { action.pinned = checked; }}/>
                              </div>
                            </Table.Cell>
                            <!-- Delete -->
                            <Table.Cell class="py-3">
                              <Button
                                variant="outline"
                                size="icon"
                                onclick={() => removeAction(sessionActions, action.id)}
                                class="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 class="h-4 w-4"/>
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        {/each}
                      </Table.Body>
                    </Table.Root>
                  </div>
                {:else}
                  <p class="text-sm text-muted-foreground text-center py-4">
                    No actions yet. Click the button below to add your first action.
                  </p>
                {/if}

                <!-- Add Action Button -->
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => addAction(sessionActions)}
                  class="w-full"
                >
                  <Plus class="h-4 w-4 mr-2"/>
                  Add Action
                </Button>
              </div>
            </Collapsible.Content>
          </div>
        </Collapsible.Root>
      {/each}
    </div>

    {#if neuzosConfig.sessionActions.length === 0}
      <div class="text-center py-8 text-muted-foreground">
        <p>No sessions configured yet.</p>
        <p class="text-sm">Add a session above to start managing actions.</p>
      </div>
    {/if}
  </Card.Content>
</Card.Root>



