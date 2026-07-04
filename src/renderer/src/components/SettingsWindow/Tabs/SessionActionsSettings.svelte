<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import * as Popover from "$lib/components/ui/popover";
  import * as Command from "$lib/components/ui/command";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as Tooltip from "$lib/components/ui/tooltip";

  import {getContext, onMount} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import {Switch} from "$lib/components/ui/switch";
  import * as Alert from "$lib/components/ui/alert";
  import KeyBinder from "../../Shared/KeyBinder.svelte";
  import type {NeuzConfig, SessionActions} from "$lib/types";
  import IconPicker from "../../Shared/IconPicker.svelte";
  import {
    Plus,
    Trash2,
    ChevronsUpDown,
    Check,
    ChevronDown,
    ChevronUp,
    AlertCircleIcon,
    GripVertical,
    ArrowDownUp
  } from "@lucide/svelte";

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
    ")", "!", "@", "#", "$", "%", "^", "&", "*", "(", ":", ";", ":", "+", "=", "<", ",", "_", "-", ">", ".", "?", "/", "~", "`", "´", "ß", "{", "]", "[", "|", "\\", "}"
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

  function formatKeyLabel(key: string): string {
    return key === 'ß' ? 'ß' : key.toUpperCase();
  }

  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");
  const actionSortModeStorageKey = 'neuzos.sessionActions.sortMode'

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
  let useDragActionSorting = $state(false);
  let draggedAction: { sessionId: string; actionId: string } | null = $state(null);
  let actionDropTarget: { sessionId: string; index: number } | null = $state(null);
  let sessionActionsScrollContainer: HTMLElement | null = $state(null);

  onMount(() => {
    useDragActionSorting = localStorage.getItem(actionSortModeStorageKey) === 'drag';
  });

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

  function toggleActionSortMode() {
    useDragActionSorting = !useDragActionSorting;
    localStorage.setItem(actionSortModeStorageKey, useDragActionSorting ? 'drag' : 'buttons');
    draggedAction = null;
    actionDropTarget = null;
  }

  function reorderAction(sessionActions: SessionActions, actionId: string, targetIndex: number) {
    const currentIndex = sessionActions.actions.findIndex((action) => action.id === actionId);
    if (currentIndex === -1) return;

    const actions = [...sessionActions.actions];
    const [movedAction] = actions.splice(currentIndex, 1);
    const nextIndex = Math.max(0, Math.min(targetIndex > currentIndex ? targetIndex - 1 : targetIndex, actions.length));
    actions.splice(nextIndex, 0, movedAction);
    sessionActions.actions = actions;

    if (comboboxStates[sessionActions.sessionId]) {
      const states = [...comboboxStates[sessionActions.sessionId]];
      const [movedState] = states.splice(currentIndex, 1);
      states.splice(nextIndex, 0, movedState);
      comboboxStates[sessionActions.sessionId] = states;
    }
  }

  function handleActionDragStart(event: DragEvent, sessionId: string, actionId: string) {
    if (!useDragActionSorting) {
      event.preventDefault();
      return;
    }

    draggedAction = {sessionId, actionId};
    event.dataTransfer?.setData('text/plain', actionId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function getActionRowDropIndex(event: DragEvent, actionIndex: number) {
    const row = event.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    return event.clientY > rect.top + rect.height / 2 ? actionIndex + 1 : actionIndex;
  }

  function handleActionDragOver(event: DragEvent, sessionId: string, index: number) {
    if (!useDragActionSorting || !draggedAction || draggedAction.sessionId !== sessionId) {
      return;
    }

    event.preventDefault();
    scrollSessionActionsNearEdge(event);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    actionDropTarget = {sessionId, index};
  }

  function handleActionRowDragOver(event: DragEvent, sessionId: string, actionIndex: number) {
    handleActionDragOver(event, sessionId, getActionRowDropIndex(event, actionIndex));
  }

  function handleActionDrop(event: DragEvent, sessionActions: SessionActions, index: number) {
    event.preventDefault();
    if (draggedAction && draggedAction.sessionId === sessionActions.sessionId) {
      reorderAction(sessionActions, draggedAction.actionId, index);
    }
    draggedAction = null;
    actionDropTarget = null;
  }

  function handleActionRowDrop(event: DragEvent, sessionActions: SessionActions, actionIndex: number) {
    handleActionDrop(event, sessionActions, getActionRowDropIndex(event, actionIndex));
  }

  function handleActionDragEnd() {
    draggedAction = null;
    actionDropTarget = null;
  }

  function isActionDropTarget(sessionId: string, index: number) {
    return actionDropTarget?.sessionId === sessionId && actionDropTarget.index === index;
  }

  function scrollSessionActionsNearEdge(event: DragEvent) {
    if (!sessionActionsScrollContainer) {
      return;
    }

    const rect = sessionActionsScrollContainer.getBoundingClientRect();
    const edgeSize = 36;
    const scrollStep = 5;

    if (event.clientY < rect.top + edgeSize) {
      sessionActionsScrollContainer.scrollTop -= scrollStep;
    } else if (event.clientY > rect.bottom - edgeSize) {
      sessionActionsScrollContainer.scrollTop += scrollStep;
    }
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

{#snippet actionDropZone(sessionActions, index)}
  {@const active = isActionDropTarget(sessionActions.sessionId, index)}
  {#if useDragActionSorting}
    <Table.Row class="border-b-0 hover:[&,&>svelte-css-wrapper]:[&>th,td]:bg-transparent">
      <Table.Cell
        colspan={9}
        class={`p-0 transition-[height] duration-150 ${active ? 'h-10' : 'h-1'}`}
        ondragover={(event) => handleActionDragOver(event, sessionActions.sessionId, index)}
        ondrop={(event) => handleActionDrop(event, sessionActions, index)}
      >
        <div class={`mx-2 rounded-md transition-all duration-150 ${active ? 'h-8 border border-dashed border-primary/70 bg-primary/10 shadow-sm' : 'h-1 bg-transparent'}`}></div>
      </Table.Cell>
    </Table.Row>
  {/if}
{/snippet}

{#snippet addSessionToManageSelector()}
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
          <Command.Input placeholder="Search Sessions..." class="h-10"/>
          <Command.Empty>No Session found.</Command.Empty>
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
{/snippet}

<Card.Root bind:ref={sessionActionsScrollContainer} class="h-full overflow-y-auto">
  <Card.Header>

    <div class="flex items-center justify-between gap-3">
      <Card.Title class="text-lg font-semibold">Session Actions</Card.Title>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">Sorting:</span>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button variant="outline" size="sm" class="h-8 gap-2" onclick={toggleActionSortMode}>
                {#if useDragActionSorting}
                  <GripVertical class="h-4 w-4"></GripVertical>
                  Drag & Drop
                {:else}
                  <ArrowDownUp class="h-4 w-4"></ArrowDownUp>
                  Arrows
                {/if}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{useDragActionSorting ? 'Drag & Drop Sorting' : 'Arrow Sorting'}</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
    <Card.Description class="flex flex-col">
      <p class="text-sm">
        Manage Actions for your Sessions. These are required for various NeuzOS features, such as Keybinds and Widgets.
      </p>
      <Alert.Root class="mt-4">
        <AlertCircleIcon/>
        <Alert.Title>Important Note!</Alert.Title>
        <Alert.Description class="pt-2">
          Please configure the Key here to match the one used by the corresponding Skill/ Item In-Game.
        </Alert.Description>
      </Alert.Root>
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
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
              <Collapsible.Trigger class="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 text-left">
                <ChevronDown
                  class="h-4 w-4 shrink-0 transition-transform {openSessions[sessionActions.sessionId] ? 'rotate-180' : ''}"/>
                <img class="w-6 h-6 rounded" src="icons/{sessionIcon}.png" alt=""/>
                <div class="flex flex-col">
                  <span class="font-medium">{sessionLabel}</span>
                  <span class="text-sm text-muted-foreground">
                    {sessionActions.actions.length} {sessionActions.actions.length === 1 ? 'Action' : 'Actions'}
                  </span>
                </div>
              </Collapsible.Trigger>
              <div class="ml-2 flex items-center gap-1">
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
                          <Table.Head class="w-[40px] px-1"></Table.Head>
                          <Table.Head class="w-[52px] px-1">Icon</Table.Head>
                          <Table.Head class="w-[200px]">Label</Table.Head>
                          <Table.Head class="w-[390px]">In-Game Modifier + Key</Table.Head>
                          <Table.Head class="w-[100px]">
                            <Tooltip.Provider>
                              <Tooltip.Root>
                                <Tooltip.Trigger>
                                  <span class="inline-flex cursor-help items-center">Cast Time(s)</span>
                                </Tooltip.Trigger>
                                <Tooltip.Content class="max-w-xs">
                                  Enter the Casting Time for your specific Skill/ Item. This Value is necessary for some Widgets.
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                          </Table.Head>
                          <Table.Head class="w-[100px]">
                            <Tooltip.Provider>
                              <Tooltip.Root>
                                <Tooltip.Trigger>
                                  <span class="inline-flex cursor-help items-center">Cooldown(s)</span>
                                </Tooltip.Trigger>
                                <Tooltip.Content class="max-w-xs">
                                  Enter the Cooldown Time for your specific Skill/ Item. This Value is necessary for some Widgets.
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                          </Table.Head>
                          <Table.Head class="w-[120px]">
                            <Tooltip.Provider>
                              <Tooltip.Root>
                                <Tooltip.Trigger>
                                  <span class="inline-flex cursor-help items-center">CD Category</span>
                                </Tooltip.Trigger>
                                <Tooltip.Content class="max-w-xs">
                                  Choose which Category your specific Skill/ Item is. This Value is necessary for some Widgets.
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                          </Table.Head>
                          <Table.Head class="w-[70px] text-center">
                            <Tooltip.Provider>
                              <Tooltip.Root>
                                <Tooltip.Trigger>
                                  <span class="inline-flex cursor-help items-center justify-center">Pinned</span>
                                </Tooltip.Trigger>
                                <Tooltip.Content class="max-w-xs">
                                  Pin this Skill/ Item to your Mainbar. Required for the Action Pins Widget.
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                          </Table.Head>
                          <Table.Head class="w-[40px]"></Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {#each sessionActions.actions as action, index (action.id)}
                          {@render actionDropZone(sessionActions, index)}
                          {@const parsed = parseKeybind(action.ingameKey)}
                          {@const state = comboboxStates[sessionActions.sessionId]?.[index] || {
                            keyOpen: false,
                            modifierOpen: false,
                            iconOpen: false,
                            categoryOpen: false
                          }}
                          <Table.Row
                            class="hover:bg-muted/50 {useDragActionSorting && draggedAction?.sessionId === sessionActions.sessionId && draggedAction?.actionId === action.id ? 'opacity-50' : ''}"
                            ondragover={(event) => handleActionRowDragOver(event, sessionActions.sessionId, index)}
                            ondrop={(event) => handleActionRowDrop(event, sessionActions, index)}
                          >
                            <!-- Order -->
                            <Table.Cell class="py-3 pl-2 pr-0">
                              {#if useDragActionSorting}
                                <button
                                  type="button"
                                  draggable="true"
                                  class="flex h-8 w-8 cursor-grab items-center justify-center rounded-md border text-muted-foreground active:cursor-grabbing"
                                  ondragstart={(event) => handleActionDragStart(event, sessionActions.sessionId, action.id)}
                                  ondragend={handleActionDragEnd}
                                  aria-label="Drag action to reorder"
                                >
                                  <GripVertical class="h-4 w-4"></GripVertical>
                                </button>
                              {:else}
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
                              {/if}
                            </Table.Cell>                            <!-- Icon -->
                            <Table.Cell class="py-3 px-1">
                              <IconPicker
                                bind:selected={action.icon}
                                onSelect={(_, _previousIconSlug, displayName, previousDisplayName) => {
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

                            <!-- In-Game Modifier + Key -->
                            <Table.Cell class="py-3">
                              {@const keyOnly = parsed.key}
                              {@const selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                              <div class="flex items-center gap-2">
                                <Popover.Root open={state.modifierOpen}
                                              onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].modifierOpen = open; }}>
                                  <Popover.Trigger
                                    class="h-9 w-36 px-3 py-2 inline-flex items-center justify-between rounded-md border border-input bg-background text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                    <span
                                      class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">
                                        {selectedMod}
                                      </span>
                                    <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                  </Popover.Trigger>
                                  <Popover.Content class="w-[220px] p-0">
                                    <Command.Root shouldFilter={true}>
                                      <Command.Input placeholder="Search Modifier..." class="h-10"/>
                                      <Command.Empty>No Modifier found.</Command.Empty>
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
                                <Popover.Root open={state.keyOpen}
                                              onOpenChange={(open) => { if (comboboxStates[sessionActions.sessionId]?.[index]) comboboxStates[sessionActions.sessionId][index].keyOpen = open; }}>
                                  <Popover.Trigger
                                    class="h-9 w-32 px-3 py-2 inline-flex items-center justify-between rounded-md border border-input bg-background text-sm font-mono shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                      <span
                                        class="truncate {keyOnly ? 'text-foreground font-semibold' : 'text-muted-foreground font-sans font-normal'}">
                                        {keyOnly ? formatKeyLabel(keyOnly) : "Select Key..."}
                                      </span>
                                    <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                  </Popover.Trigger>
                                  <Popover.Content class="w-[220px] p-0">
                                    <Command.Root shouldFilter={true}>
                                      <Command.Input placeholder="Search Key..." class="h-10"/>
                                      <Command.Empty>No Key found.</Command.Empty>
                                      <Command.List class="max-h-[320px]">
                                        <Command.Group>
                                          {#each allowedKeys as key}
                                            <Command.Item
                                              value={key}
                                              onSelect={() => {
                                                  action.ingameKey = buildKeybind(parsed.modifier, key);
                                                  state.keyOpen = false;
                                                }}
                                              class="font-mono font-semibold py-2.5"
                                            >
                                              <Check
                                                class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                              <span class={keyOnly === key ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
                                            </Command.Item>
                                          {/each}
                                        </Command.Group>
                                      </Command.List>
                                    </Command.Root>
                                  </Popover.Content>
                                </Popover.Root>
                                <KeyBinder
                                  actionId={action.id}
                                  currentKey={action.ingameKey}
                                  onBind={(key) => {
                                    action.ingameKey = key;
                                    return true;
                                  }}
                                  onCancel={() => {}}
                                />
                              </div>
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
                                    <Command.Input placeholder="Search Category..." class="h-10"/>
                                    <Command.Empty>No Category found.</Command.Empty>
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
                        {@render actionDropZone(sessionActions, sessionActions.actions.length)}
                      </Table.Body>
                    </Table.Root>
                  </div>
                {:else}
                  <p class="text-sm text-muted-foreground text-center py-4">
                    No Actions configured. Click the Button below to Add your first Action.
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
        <p>No Sessions configured yet.</p>
        <p class="text-sm">Add a Session below to start managing Actions.</p>
      </div>
    {/if}

    {@render addSessionToManageSelector()}
  </Card.Content>
</Card.Root>



