<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import * as Popover from "$lib/components/ui/popover";
  import * as Command from "$lib/components/ui/command";
  import * as Alert from "$lib/components/ui/alert";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import {getContext, onMount} from "svelte";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import {getElectronContext} from "$lib/contexts/electronContext";

  import type {NeuzConfig, NeuzKeyBindProfile, NeuzKeybind} from "$lib/types";
  import {Plus, Trash2, ChevronsUpDown, Check, AlertCircleIcon, ChevronUp, ChevronDown, Pencil} from "@lucide/svelte";

  const modifierOptions = [
    {value: "", label: "None"},
    {value: "commandorcontrol", label: "Ctrl/Cmd"},
    {value: "alt", label: "Alt"},
    {value: "shift", label: "Shift"},
    {value: "commandorcontrol+alt", label: "Ctrl/Cmd+Alt"},
    {value: "commandorcontrol+shift", label: "Ctrl/Cmd+Shift"},
    {value: "alt+shift", label: "Alt+Shift"},
    {value: "commandorcontrol+alt+shift", label: "Ctrl/Cmd+Alt+Shift"},
    {value: "control", label: "Control"},
    {value: "command", label: "Command"},
    {value: "cmdorctrl", label: "CmdOrCtrl"},
    {value: "cmd", label: "Cmd"},
    {value: "super", label: "Super"},
    {value: "meta", label: "Meta"},
    {value: "option", label: "Option"},
    {value: "altgr", label: "AltGr"}
  ];

  const allowedKeys = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
    "f13", "f14", "f15", "f16", "f17", "f18", "f19", "f20", "f21", "f22", "f23", "f24",
    "plus", "space", "tab", "capslock", "numlock", "scrolllock", "backspace",
    "delete", "insert", "return", "enter", "up", "down", "left", "right",
    "home", "end", "pageup", "pagedown", "escape", "esc",
    "volumeup", "volumedown", "volumemute", "medianexttrack", "mediaprevioustrack",
    "mediastop", "mediaplaypause",
    "num0", "num1", "num2", "num3", "num4", "num5", "num6", "num7", "num8", "num9",
    "numdec", "numadd", "numsub", "nummult", "numdiv",
    "printscreen", "pause",
    ")", "!", "@", "#", "$", "%", "^", "&", "*", "(", ":", ";", ":", "+", "=", "<", ",", "_", "-", ">", ".", "?", "/", "~", "`", "{", "]", "[", "|", "\\", "}",
  ];

  let allowedEventKeybinds: {
    [key: string]: { label: string, args?: string[], unique?: boolean }
  } = $state({});

  function parseKeybind(keybind: string): { modifier: string; key: string } {
    const parts = keybind.split("+");
    if (parts.length === 1) return {modifier: "", key: keybind};
    const key = parts[parts.length - 1];
    const modifier = parts.slice(0, -1).join("+");
    return {modifier, key};
  }

  function buildKeybind(modifier: string, key: string): string {
    if (!modifier || modifier === "") return key;
    return key ? `${modifier}+${key}` : modifier;
  }

  const electronApi = getElectronContext();
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

  onMount(async () => {
    allowedEventKeybinds = await electronApi.invoke("config.get_available_event_keybinds");
  });

  // ── Global keybind combobox states ──────────────────────────────────────────
  let comboboxStates: Array<{ open: boolean; modifierOpen: boolean }> = $state([]);
  let addKeybindPopoverOpen = $state(false);
  let layoutSelectorStates: { [index: number]: boolean } = $state({});
  let sessionSelectorStates: { [index: number]: boolean } = $state({});
  let actionSelectorStates: { [index: number]: boolean } = $state({});

  $effect(() => {
    const neededLength = neuzosConfig.keyBinds.length;
    while (comboboxStates.length < neededLength) comboboxStates.push({open: false, modifierOpen: false});
    if (comboboxStates.length > neededLength) comboboxStates.length = neededLength;
  });

  function moveKeybindUp(index: number) {
    if (index > 0) {
      const keybinds = [...neuzosConfig.keyBinds];
      [keybinds[index], keybinds[index - 1]] = [keybinds[index - 1], keybinds[index]];
      neuzosConfig.keyBinds = keybinds;
      const states = [...comboboxStates];
      [states[index], states[index - 1]] = [states[index - 1], states[index]];
      comboboxStates = states;
    }
  }

  function moveKeybindDown(index: number) {
    if (index < neuzosConfig.keyBinds.length - 1) {
      const keybinds = [...neuzosConfig.keyBinds];
      [keybinds[index], keybinds[index + 1]] = [keybinds[index + 1], keybinds[index]];
      neuzosConfig.keyBinds = keybinds;
      const states = [...comboboxStates];
      [states[index], states[index + 1]] = [states[index + 1], states[index]];
      comboboxStates = states;
    }
  }

  // ── Profile management ───────────────────────────────────────────────────────
  let editingProfileId: string | null = $state(null);
  let editingProfileName: string = $state("");
  let openProfiles: { [profileId: string]: boolean } = $state({});

  // Per-profile combobox states keyed by profileId then keybind index
  let profileComboboxStates: {
    [profileId: string]: Array<{ open: boolean; modifierOpen: boolean }>
  } = $state({});

  // Per-profile add-keybind popover states
  let profileAddKeybindPopovers: { [profileId: string]: boolean } = $state({});

  // Per-profile layout/session/action selector states
  let profileLayoutStates: { [profileId: string]: { [index: number]: boolean } } = $state({});
  let profileSessionStates: { [profileId: string]: { [index: number]: boolean } } = $state({});
  let profileActionStates: { [profileId: string]: { [index: number]: boolean } } = $state({});
  let profileIngameKeyModifierStates: { [profileId: string]: { [index: number]: boolean } } = $state({});
  let profileIngameKeyStates: { [profileId: string]: { [index: number]: boolean } } = $state({});

  // Global ingame_key selector states
  let ingameKeyModifierStates: { [index: number]: boolean } = $state({});
  let ingameKeyStates: { [index: number]: boolean } = $state({});

  $effect(() => {
    ensureDefaultProfile();
    // Sync combobox states for each profile's keybinds
    (neuzosConfig.keyBindProfiles ?? []).forEach(profile => {
      if (!profileComboboxStates[profile.id]) profileComboboxStates[profile.id] = [];
      const needed = profile.keybinds.length;
      while (profileComboboxStates[profile.id].length < needed)
        profileComboboxStates[profile.id].push({open: false, modifierOpen: false});
      if (profileComboboxStates[profile.id].length > needed)
        profileComboboxStates[profile.id].length = needed;
    });
  });

  function ensureDefaultProfile() {
    if (!neuzosConfig.keyBindProfiles) neuzosConfig.keyBindProfiles = [];
    if (neuzosConfig.keyBindProfiles.length === 0) {
      neuzosConfig.keyBindProfiles.push({id: "default", name: "Default", keybinds: []});
    }
    const ids = neuzosConfig.keyBindProfiles.map(p => p.id);
    if (!neuzosConfig.activeKeyBindProfileId || !ids.includes(neuzosConfig.activeKeyBindProfileId)) {
      neuzosConfig.activeKeyBindProfileId = neuzosConfig.keyBindProfiles[0].id;
    }
  }

  function addProfile() {
    ensureDefaultProfile();
    const id = Date.now().toString();
    neuzosConfig.keyBindProfiles.push({id, name: "New Profile", keybinds: []});
    neuzosConfig.activeKeyBindProfileId = id;
    openProfiles[id] = true;
    editingProfileId = id;
    editingProfileName = "New Profile";
  }

  function deleteProfile(id: string) {
    const idx = neuzosConfig.keyBindProfiles.findIndex(p => p.id === id);
    if (idx === -1) return;
    neuzosConfig.keyBindProfiles.splice(idx, 1);
    delete openProfiles[id];
    delete profileComboboxStates[id];
    ensureDefaultProfile();
    if (neuzosConfig.activeKeyBindProfileId === id) {
      neuzosConfig.activeKeyBindProfileId = neuzosConfig.keyBindProfiles[0]?.id ?? null;
    }
  }

  function moveProfileUp(index: number) {
    if (index <= 0) return;
    const profiles = [...neuzosConfig.keyBindProfiles];
    [profiles[index], profiles[index - 1]] = [profiles[index - 1], profiles[index]];
    neuzosConfig.keyBindProfiles = profiles;
  }

  function moveProfileDown(index: number) {
    if (index >= neuzosConfig.keyBindProfiles.length - 1) return;
    const profiles = [...neuzosConfig.keyBindProfiles];
    [profiles[index], profiles[index + 1]] = [profiles[index + 1], profiles[index]];
    neuzosConfig.keyBindProfiles = profiles;
  }

  function startRenameProfile(profile: NeuzKeyBindProfile) {
    editingProfileId = profile.id;
    editingProfileName = profile.name;
  }

  function commitRenameProfile() {
    if (!editingProfileId) return;
    const profile = neuzosConfig.keyBindProfiles.find(p => p.id === editingProfileId);
    if (profile) profile.name = editingProfileName.trim() || profile.name;
    editingProfileId = null;
    editingProfileName = "";
  }

  // ── Per-profile keybind helpers ──────────────────────────────────────────────
  function addProfileKeybind(profile: NeuzKeyBindProfile, event: string) {
    const argCount = allowedEventKeybinds[event]?.args?.length || 0;
    profile.keybinds.push({key: '', event, args: new Array(argCount).fill('')});
    profileAddKeybindPopovers[profile.id] = false;
  }

  function removeProfileKeybind(profile: NeuzKeyBindProfile, index: number) {
    profile.keybinds.splice(index, 1);
  }

  function moveProfileKeybindUp(profile: NeuzKeyBindProfile, index: number) {
    if (index <= 0) return;
    const keybinds = [...profile.keybinds];
    [keybinds[index], keybinds[index - 1]] = [keybinds[index - 1], keybinds[index]];
    profile.keybinds = keybinds;
    if (profileComboboxStates[profile.id]) {
      const states = [...profileComboboxStates[profile.id]];
      [states[index], states[index - 1]] = [states[index - 1], states[index]];
      profileComboboxStates[profile.id] = states;
    }
  }

  function moveProfileKeybindDown(profile: NeuzKeyBindProfile, index: number) {
    if (index >= profile.keybinds.length - 1) return;
    const keybinds = [...profile.keybinds];
    [keybinds[index], keybinds[index + 1]] = [keybinds[index + 1], keybinds[index]];
    profile.keybinds = keybinds;
    if (profileComboboxStates[profile.id]) {
      const states = [...profileComboboxStates[profile.id]];
      [states[index], states[index + 1]] = [states[index + 1], states[index]];
      profileComboboxStates[profile.id] = states;
    }
  }

</script>

<Card.Root class="h-full overflow-y-auto">
  <Card.Header>
    <Card.Title class="text-lg font-semibold">Keybind Settings</Card.Title>
    <Card.Description class="flex flex-col">
      <p>Manage your keyboard shortcuts for various NeuzOS actions. Click on a key or modifier to change it.</p>
      <Alert.Root class="mt-4">
        <AlertCircleIcon/>
        <Alert.Title>Important Note.</Alert.Title>
        <Alert.Description class="pt-2">
          <ul>
            <li>- Keybinds used here will be bound globaly while using neuzos, that specific key won't be available inside webviews.</li>
            <li>- Keybinds can be toggled in the client's title bar keyboard icon.</li>
          </ul>
        </Alert.Description>
      </Alert.Root>
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-6 items-start">

    <!-- ── Keybind Profiles ───────────────────────────────────────────────── -->
    <div class="w-full flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" onclick={addProfile}>
          <Plus class="size-4 mr-2"/>
          Add Profile
        </Button>
      </div>

      <div class="flex flex-col gap-3">
        {#each neuzosConfig.keyBindProfiles ?? [] as profile, profileIndex (profile.id)}
          {@const isActive = neuzosConfig.activeKeyBindProfileId === profile.id}
          {@const isProfileOpen = openProfiles[profile.id] ?? false}
          {@const profileStates = profileComboboxStates[profile.id] ?? []}

          <Collapsible.Root
            open={isProfileOpen}
            onOpenChange={(open) => { openProfiles[profile.id] = open; }}
            class="group border rounded-lg bg-card {isActive ? 'border-primary' : ''}"
          >
            <div class="p-4">
              <div class="flex items-center justify-between">
                <!-- Order buttons -->
                <div class="flex items-center gap-2 mr-2">
                  <div class="flex flex-col gap-0.5">
                    <Button variant="outline" size="icon-xs" onclick={() => moveProfileUp(profileIndex)} disabled={profileIndex === 0}>
                      <ChevronUp class="h-3 w-3"/>
                    </Button>
                    <Button variant="outline" size="icon-xs" onclick={() => moveProfileDown(profileIndex)} disabled={profileIndex >= (neuzosConfig.keyBindProfiles?.length ?? 0) - 1}>
                      <ChevronDown class="h-3 w-3"/>
                    </Button>
                  </div>
                </div>

                <!-- Collapsible trigger / name -->
                <Collapsible.Trigger class="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 text-left">
                  <div class="flex flex-col flex-1">
                    {#if editingProfileId === profile.id}
                      <!-- stop click bubbling so the collapsible doesn't toggle while editing -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div onclick={(e) => e.stopPropagation()}>
                        <Input
                          class="h-7 text-sm w-48"
                          bind:value={editingProfileName}
                          onblur={commitRenameProfile}
                          onkeydown={(e) => { if (e.key === 'Enter') commitRenameProfile(); }}
                          autofocus
                        />
                      </div>
                    {:else}
                      <span class="font-medium">{profile.name}</span>
                    {/if}
                    <span class="text-sm text-muted-foreground">
                      {profile.keybinds.length} keybind{profile.keybinds.length !== 1 ? 's' : ''}
                      {#if isActive}<span class="ml-1 text-primary font-semibold">· Active</span>{/if}
                    </span>
                  </div>
                  <ChevronDown class="h-4 w-4 ml-auto shrink-0 transition-transform {isProfileOpen ? 'rotate-180' : ''}"/>
                </Collapsible.Trigger>

                <!-- Header actions -->
                <div class="flex items-center gap-1 ml-2 shrink-0">
                  {#if !isActive}
                    <Button variant="outline" size="sm" class="h-8 text-xs" onclick={() => { neuzosConfig.activeKeyBindProfileId = profile.id; }}>
                      Set Active
                    </Button>
                  {/if}
                  <Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => startRenameProfile(profile)}>
                    <Pencil class="h-4 w-4"/>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                    onclick={() => deleteProfile(profile.id)}
                    disabled={(neuzosConfig.keyBindProfiles?.length ?? 0) <= 1}
                  >
                    <Trash2 class="h-4 w-4"/>
                  </Button>
                </div>
              </div>

              <Collapsible.Content class="pt-4">
                <div class="space-y-3">
                  {#if profile.keybinds.length > 0}
                    <div class="rounded-md border">
                      <Table.Root>
                        <Table.Header>
                          <Table.Row>
                            <Table.Head class="font-bold w-[60px]">Order</Table.Head>
                            <Table.Head class="font-bold">Modifier</Table.Head>
                            <Table.Head class="font-bold">Key</Table.Head>
                            <Table.Head class="font-bold">Event</Table.Head>
                            <Table.Head class="w-full"></Table.Head>
                            <Table.Head></Table.Head>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {#each profile.keybinds as keyBind, index (index)}
                            {@const eventInfo = allowedEventKeybinds[keyBind.event]}
                            {@const parsed = parseKeybind(keyBind.key)}
                            {@const state = profileStates[index] ?? {open: false, modifierOpen: false}}
                            <Table.Row class="hover:bg-muted/50">
                              <Table.Cell>
                                <div class="flex flex-col gap-0.5">
                                  <Button variant="outline" size="icon-xs" onclick={() => moveProfileKeybindUp(profile, index)} disabled={index === 0}>
                                    <ChevronUp class="h-3 w-3"/>
                                  </Button>
                                  <Button variant="outline" size="icon-xs" onclick={() => moveProfileKeybindDown(profile, index)} disabled={index >= profile.keybinds.length - 1}>
                                    <ChevronDown class="h-3 w-3"/>
                                  </Button>
                                </div>
                              </Table.Cell>
                              <!-- Modifier -->
                              <Table.Cell>
                                <Popover.Root bind:open={state.modifierOpen}>
                                  <Popover.Trigger class="w-48 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                    {@const selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                                    <span class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">{selectedMod}</span>
                                    <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                  </Popover.Trigger>
                                  <Popover.Content class="w-[220px] p-0">
                                    <Command.Root shouldFilter={true}>
                                      <Command.Input placeholder="Search modifier..." class="h-10"/>
                                      <Command.Empty>No modifier found.</Command.Empty>
                                      <Command.List class="max-h-[320px]">
                                        <Command.Group>
                                          {#each modifierOptions as modifier}
                                            <Command.Item value={modifier.value} keywords={[modifier.label.toLowerCase()]} onSelect={() => { keyBind.key = buildKeybind(modifier.value, parsed.key); state.modifierOpen = false; }} class="font-medium py-2.5">
                                              <Check class={parsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                              <span class={parsed.modifier === modifier.value ? "text-primary" : ""}>{modifier.label}</span>
                                            </Command.Item>
                                          {/each}
                                        </Command.Group>
                                      </Command.List>
                                    </Command.Root>
                                  </Popover.Content>
                                </Popover.Root>
                              </Table.Cell>
                              <!-- Key -->
                              <Table.Cell>
                                {@const keyOnly = parsed.key}
                                <Popover.Root open={state.open} onOpenChange={(open) => { state.open = open; }}>
                                  <Popover.Trigger class="w-40 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                    <span class="truncate {keyOnly ? 'text-foreground uppercase' : 'text-muted-foreground font-sans font-normal lowercase'}">{keyOnly || "select key..."}</span>
                                    <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                  </Popover.Trigger>
                                  <Popover.Content class="w-[220px] p-0">
                                    <Command.Root shouldFilter={true}>
                                      <Command.Input placeholder="Search key..." class="h-10"/>
                                      <Command.Empty>No key found.</Command.Empty>
                                      <Command.List class="max-h-[320px]">
                                        <Command.Group>
                                          {#each allowedKeys as key}
                                            <Command.Item value={key} onSelect={() => { keyBind.key = buildKeybind(parsed.modifier, key); state.open = false; }} class="font-mono font-semibold uppercase py-2.5">
                                              <Check class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                              <span class={keyOnly === key ? "text-primary" : ""}>{key}</span>
                                            </Command.Item>
                                          {/each}
                                        </Command.Group>
                                      </Command.List>
                                    </Command.Root>
                                  </Popover.Content>
                                </Popover.Root>
                              </Table.Cell>
                              <!-- Event label -->
                              <Table.Cell class="text-sm text-muted-foreground">{eventInfo?.label}</Table.Cell>
                              <!-- Args -->
                              <Table.Cell>
                                {#if eventInfo?.args?.length > 0}
                                  <div class="flex flex-wrap items-start gap-2">
                                    {#each eventInfo?.args ?? [] as arg, argIndex}
                                      {#if arg === 'layout_id'}
                                        {@const isOpen = (profileLayoutStates[profile.id]?.[index]) ?? false}
                                        {@const selectedLayout = neuzosConfig.layouts.find(l => l.id === keyBind.args?.[argIndex])}
                                        <div class="flex items-center gap-2">
                                          <span class="text-xs text-muted-foreground whitespace-nowrap">Layout:</span>
                                          <Popover.Root open={isOpen} onOpenChange={(open) => { if (!profileLayoutStates[profile.id]) profileLayoutStates[profile.id] = {}; profileLayoutStates[profile.id][index] = open; }}>
                                            <Popover.Trigger>
                                              <Button variant="outline" size="sm" class="h-9">
                                                {#if selectedLayout}<img class="w-4 h-4 mr-2" src="icons/{selectedLayout.icon.slug}.png" alt=""/>{selectedLayout.label}{:else}Select Layout{/if}
                                              </Button>
                                            </Popover.Trigger>
                                            <Popover.Content class="w-[280px] p-0">
                                              <Command.Root shouldFilter={true}>
                                                <Command.Input placeholder="Search layouts..." class="h-10"/>
                                                <Command.Empty>No layout found.</Command.Empty>
                                                <Command.List class="max-h-[320px]">
                                                  <Command.Group>
                                                    {#each neuzosConfig.layouts as layout}
                                                      <Command.Item value={layout.id} keywords={[layout.label.toLowerCase()]} onSelect={() => { if (!keyBind.args) keyBind.args = []; keyBind.args[argIndex] = layout.id; if (!profileLayoutStates[profile.id]) profileLayoutStates[profile.id] = {}; profileLayoutStates[profile.id][index] = false; }} class="py-2">
                                                        <img class="size-5 mr-2" src="icons/{layout.icon.slug}.png" alt=""/><span>{layout.label}</span>
                                                      </Command.Item>
                                                    {/each}
                                                  </Command.Group>
                                                </Command.List>
                                              </Command.Root>
                                            </Popover.Content>
                                          </Popover.Root>
                                        </div>
                                      {:else if arg === 'session_id'}
                                        {@const isOpen = (profileSessionStates[profile.id]?.[index]) ?? false}
                                        {@const selectedSession = neuzosConfig.sessions.find(s => s.id === keyBind.args?.[argIndex])}
                                        <div class="flex items-center gap-2">
                                          <span class="text-xs text-muted-foreground whitespace-nowrap">Session:</span>
                                          <Popover.Root open={isOpen} onOpenChange={(open) => { if (!profileSessionStates[profile.id]) profileSessionStates[profile.id] = {}; profileSessionStates[profile.id][index] = open; }}>
                                            <Popover.Trigger>
                                              <Button variant="outline" size="sm" class="h-9">
                                                {#if selectedSession}<img class="w-4 h-4 mr-2" src="icons/{selectedSession.icon.slug}.png" alt=""/>{selectedSession.label}{:else}Select Session{/if}
                                              </Button>
                                            </Popover.Trigger>
                                            <Popover.Content class="w-[280px] p-0">
                                              <Command.Root shouldFilter={true}>
                                                <Command.Input placeholder="Search sessions..." class="h-10"/>
                                                <Command.Empty>No session found.</Command.Empty>
                                                <Command.List class="max-h-[320px]">
                                                  <Command.Group>
                                                    {#each neuzosConfig.sessions as session}
                                                      <Command.Item value={session.id} keywords={[session.label.toLowerCase()]} onSelect={() => { if (!keyBind.args) keyBind.args = []; keyBind.args[argIndex] = session.id; if (!profileSessionStates[profile.id]) profileSessionStates[profile.id] = {}; profileSessionStates[profile.id][index] = false; }} class="py-2">
                                                        <img class="size-5 mr-2" src="icons/{session.icon.slug}.png" alt=""/><span>{session.label}</span>
                                                      </Command.Item>
                                                    {/each}
                                                  </Command.Group>
                                                </Command.List>
                                              </Command.Root>
                                            </Popover.Content>
                                          </Popover.Root>
                                        </div>
                                      {:else if arg === 'action_id'}
                                        {@const isOpen = (profileActionStates[profile.id]?.[index]) ?? false}
                                        {@const sessionId = keyBind.args?.[argIndex - 1]}
                                        {@const sessionActionsData = neuzosConfig.sessionActions?.find(sa => sa.sessionId === sessionId)}
                                        {@const selectedAction = sessionActionsData?.actions.find(a => a.id === keyBind.args?.[argIndex])}
                                        <div class="flex items-center gap-2">
                                          <span class="text-xs text-muted-foreground whitespace-nowrap">Action:</span>
                                          <Popover.Root open={isOpen} onOpenChange={(open) => { if (!profileActionStates[profile.id]) profileActionStates[profile.id] = {}; profileActionStates[profile.id][index] = open; }}>
                                            <Popover.Trigger>
                                              <Button variant="outline" size="sm" class="h-9" disabled={!sessionId || !sessionActionsData}>
                                                {#if selectedAction}<img class="w-4 h-4 mr-2" src="icons/{selectedAction.icon.slug}.png" alt=""/>{selectedAction.label}{:else}Select Action{/if}
                                              </Button>
                                            </Popover.Trigger>
                                            <Popover.Content class="w-[280px] p-0">
                                              <Command.Root shouldFilter={true}>
                                                <Command.Input placeholder="Search actions..." class="h-10"/>
                                                <Command.Empty>No action found.</Command.Empty>
                                                <Command.List class="max-h-[320px]">
                                                  <Command.Group>
                                                    {#if sessionActionsData}
                                                      {#each sessionActionsData.actions as action}
                                                        <Command.Item value={action.id} keywords={[action.label.toLowerCase()]} onSelect={() => { if (!keyBind.args) keyBind.args = []; keyBind.args[argIndex] = action.id; if (!profileActionStates[profile.id]) profileActionStates[profile.id] = {}; profileActionStates[profile.id][index] = false; }} class="py-2">
                                                          <img class="size-5 mr-2" src="icons/{action.icon.slug}.png" alt=""/><span>{action.label}</span>
                                                        </Command.Item>
                                                      {/each}
                                                    {/if}
                                                  </Command.Group>
                                                </Command.List>
                                              </Command.Root>
                                            </Popover.Content>
                                          </Popover.Root>
                                        </div>
                                      {:else if arg === 'ingame_key'}
                                        {@const ingameParsed = parseKeybind(keyBind.args?.[argIndex] ?? '')}
                                        {@const isModOpen = (profileIngameKeyModifierStates[profile.id]?.[index]) ?? false}
                                        {@const isKeyOpen = (profileIngameKeyStates[profile.id]?.[index]) ?? false}
                                        <div class="flex items-center gap-2">
                                          <span class="text-xs text-muted-foreground whitespace-nowrap">In-Game Key:</span>
                                          <Popover.Root open={isModOpen} onOpenChange={(open) => { if (!profileIngameKeyModifierStates[profile.id]) profileIngameKeyModifierStates[profile.id] = {}; profileIngameKeyModifierStates[profile.id][index] = open; }}>
                                            <Popover.Trigger class="w-36 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                              {@const selMod = modifierOptions.find(m => m.value === ingameParsed.modifier)?.label ?? 'None'}
                                              <span class="truncate {ingameParsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">{selMod}</span>
                                              <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                            </Popover.Trigger>
                                            <Popover.Content class="w-[220px] p-0">
                                              <Command.Root shouldFilter={true}>
                                                <Command.Input placeholder="Search modifier..." class="h-10"/>
                                                <Command.Empty>No modifier found.</Command.Empty>
                                                <Command.List class="max-h-[320px]">
                                                  <Command.Group>
                                                    {#each modifierOptions as modifier}
                                                      <Command.Item value={modifier.value} keywords={[modifier.label.toLowerCase()]} onSelect={() => { if (!keyBind.args) keyBind.args = []; keyBind.args[argIndex] = buildKeybind(modifier.value, ingameParsed.key); if (!profileIngameKeyModifierStates[profile.id]) profileIngameKeyModifierStates[profile.id] = {}; profileIngameKeyModifierStates[profile.id][index] = false; }} class="font-medium py-2.5">
                                                        <Check class={ingameParsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                                        <span class={ingameParsed.modifier === modifier.value ? "text-primary" : ""}>{modifier.label}</span>
                                                      </Command.Item>
                                                    {/each}
                                                  </Command.Group>
                                                </Command.List>
                                              </Command.Root>
                                            </Popover.Content>
                                          </Popover.Root>
                                          <Popover.Root open={isKeyOpen} onOpenChange={(open) => { if (!profileIngameKeyStates[profile.id]) profileIngameKeyStates[profile.id] = {}; profileIngameKeyStates[profile.id][index] = open; }}>
                                            <Popover.Trigger class="w-32 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                              <span class="truncate {ingameParsed.key ? 'text-foreground uppercase' : 'text-muted-foreground font-sans font-normal lowercase'}">{ingameParsed.key || 'select key...'}</span>
                                              <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                            </Popover.Trigger>
                                            <Popover.Content class="w-[220px] p-0">
                                              <Command.Root shouldFilter={true}>
                                                <Command.Input placeholder="Search key..." class="h-10"/>
                                                <Command.Empty>No key found.</Command.Empty>
                                                <Command.List class="max-h-[320px]">
                                                  <Command.Group>
                                                    {#each allowedKeys as key}
                                                      <Command.Item value={key} onSelect={() => { if (!keyBind.args) keyBind.args = []; keyBind.args[argIndex] = buildKeybind(ingameParsed.modifier, key); if (!profileIngameKeyStates[profile.id]) profileIngameKeyStates[profile.id] = {}; profileIngameKeyStates[profile.id][index] = false; }} class="font-mono font-semibold uppercase py-2.5">
                                                        <Check class={ingameParsed.key === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                                        <span class={ingameParsed.key === key ? "text-primary" : ""}>{key}</span>
                                                      </Command.Item>
                                                    {/each}
                                                  </Command.Group>
                                                </Command.List>
                                              </Command.Root>
                                            </Popover.Content>
                                          </Popover.Root>
                                        </div>
                                      {:else if arg === 'event_name'}
                                        <div class="flex items-center gap-2">
                                          <span class="text-xs text-muted-foreground whitespace-nowrap">Event Name:</span>
                                          <input type="text" class="w-48 h-9 px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" placeholder="Enter event name..." bind:value={keyBind.args[argIndex]}/>
                                        </div>
                                      {:else if arg === 'event_data'}
                                        <div class="flex flex-col gap-1 w-full">
                                          <span class="text-xs text-muted-foreground">Event Data:</span>
                                          <textarea class="w-full min-h-[80px] px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-y" placeholder="Enter event data..." bind:value={keyBind.args[argIndex]}></textarea>
                                        </div>
                                      {:else}
                                        <div class="flex items-center gap-2">
                                          <span class="text-xs text-muted-foreground whitespace-nowrap">{arg}:</span>
                                          <input type="text" class="w-48 h-9 px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" placeholder="Enter {arg}..." bind:value={keyBind.args[argIndex]}/>
                                        </div>
                                      {/if}
                                    {/each}
                                  </div>
                                {:else}
                                  <i class="text-accent-foreground opacity-50">No extra data needed.</i>
                                {/if}
                              </Table.Cell>
                              <Table.Cell>
                                <Button variant="outline" size="sm" onclick={() => removeProfileKeybind(profile, index)}>
                                  <Trash2 class="size-4"/>
                                </Button>
                              </Table.Cell>
                            </Table.Row>
                          {/each}
                        </Table.Body>
                      </Table.Root>
                    </div>
                  {:else}
                    <p class="text-sm text-muted-foreground italic">No keybinds yet. Add one below.</p>
                  {/if}

                  <!-- Add keybind to profile -->
                  <Popover.Root open={profileAddKeybindPopovers[profile.id] ?? false} onOpenChange={(open) => { profileAddKeybindPopovers[profile.id] = open; }}>
                    <Popover.Trigger>
                      <Button variant="outline" size="sm">
                        <Plus class="size-4 mr-2"/>
                        Add Keybind
                      </Button>
                    </Popover.Trigger>
                    <Popover.Content class="w-[320px] p-0">
                      <Command.Root shouldFilter={true}>
                        <Command.Input placeholder="Search events..." class="h-10"/>
                        <Command.Empty>No event found.</Command.Empty>
                        <Command.List class="max-h-[320px]">
                          <Command.Group>
                            {#each Object.keys(allowedEventKeybinds) as event (event)}
                              {#if !(allowedEventKeybinds[event]?.unique && profile.keybinds.find(kb => kb.event === event))}
                                {@const eventInfo = allowedEventKeybinds[event]}
                                <Command.Item value={event} keywords={[eventInfo?.label.toLowerCase()]} onSelect={() => addProfileKeybind(profile, event)} class="py-2">
                                  <span>{eventInfo?.label}</span>
                                </Command.Item>
                              {/if}
                            {/each}
                          </Command.Group>
                        </Command.List>
                      </Command.Root>
                    </Popover.Content>
                  </Popover.Root>
                </div>
              </Collapsible.Content>
            </div>
          </Collapsible.Root>
        {/each}
      </div>
    </div>

    <div class="w-full border-t border-border"></div>

    <!-- ── Global Keybinds ────────────────────────────────────────────────── -->
    <div class="w-full flex flex-col gap-3">
      <div>
        <h3 class="text-sm font-semibold">Global Keybinds</h3>
        <p class="text-xs text-muted-foreground mt-1">These keybinds are always active regardless of the selected profile.</p>
      </div>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="font-bold w-[60px]">Order</Table.Head>
            <Table.Head class="font-bold">Modifier</Table.Head>
            <Table.Head class="font-bold">Key</Table.Head>
            <Table.Head class="font-bold">Event</Table.Head>
            <Table.Head class="w-full"></Table.Head>
            <Table.Head class="font-bold"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each neuzosConfig.keyBinds as keyBind, index}
            {@const eventInfo = allowedEventKeybinds[keyBind.event]}
            {@const parsed = parseKeybind(keyBind.key)}
            {#if comboboxStates[index]}
              {@const state = comboboxStates[index]}
              <Table.Row>
                <Table.Cell>
                  <div class="flex flex-col gap-0.5">
                    <Button variant="outline" size="icon-xs" onclick={() => moveKeybindUp(index)} disabled={index === 0}>
                      <ChevronUp class="h-3 w-3"/>
                    </Button>
                    <Button variant="outline" size="icon-xs" onclick={() => moveKeybindDown(index)} disabled={index >= neuzosConfig.keyBinds.length - 1}>
                      <ChevronDown class="h-3 w-3"/>
                    </Button>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {@const modifierState = comboboxStates[index]}
                  <Popover.Root bind:open={modifierState.modifierOpen}>
                    <Popover.Trigger class="w-48 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                      {@const selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                      <span class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">{selectedMod}</span>
                      <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                    </Popover.Trigger>
                    <Popover.Content class="w-[220px] p-0">
                      <Command.Root shouldFilter={true}>
                        <Command.Input placeholder="Search modifier..." class="h-10"/>
                        <Command.Empty>No modifier found.</Command.Empty>
                        <Command.List class="max-h-[320px]">
                          <Command.Group>
                            {#each modifierOptions as modifier}
                              <Command.Item value={modifier.value} keywords={[modifier.label.toLowerCase()]} onSelect={() => { keyBind.key = buildKeybind(modifier.value, parsed.key); modifierState.modifierOpen = false; }} class="font-medium py-2.5">
                                <Check class={parsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
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
                  <Popover.Root open={state.open} onOpenChange={(open) => { state.open = open; }}>
                    <Popover.Trigger class="w-40 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                      <span class="truncate {keyOnly ? 'text-foreground uppercase' : 'text-muted-foreground font-sans font-normal lowercase'}">{keyOnly || "select key..."}</span>
                      <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                    </Popover.Trigger>
                    <Popover.Content class="w-[220px] p-0">
                      <Command.Root shouldFilter={true}>
                        <Command.Input placeholder="Search key..." class="h-10"/>
                        <Command.Empty>No key found.</Command.Empty>
                        <Command.List class="max-h-[320px]">
                          <Command.Group>
                            {#each allowedKeys as key}
                              <Command.Item value={key} onSelect={() => { keyBind.key = buildKeybind(parsed.modifier, key); state.open = false; }} class="font-mono font-semibold uppercase py-2.5">
                                <Check class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
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
                          {@const selectedLayout = neuzosConfig.layouts.find(layout => layout.id === keyBind.args[argIndex])}
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground whitespace-nowrap">Layout:</span>
                            <Popover.Root open={isLayoutSelectorOpen} onOpenChange={(open) => { layoutSelectorStates[index] = open; }}>
                              <Popover.Trigger>
                                <Button variant="outline" size="sm" class="h-9">
                                  {#if selectedLayout}<img class="w-4 h-4 mr-2" src="icons/{selectedLayout.icon.slug}.png" alt=""/>{selectedLayout.label}{:else}Select Layout{/if}
                                </Button>
                              </Popover.Trigger>
                              <Popover.Content class="w-[280px] p-0">
                                <Command.Root shouldFilter={true}>
                                  <Command.Input placeholder="Search layouts..." class="h-10"/>
                                  <Command.Empty>No layout found.</Command.Empty>
                                  <Command.List class="max-h-[320px]">
                                    <Command.Group>
                                      {#each neuzosConfig.layouts as layout}
                                        <Command.Item value={layout.id} keywords={[layout.label.toLowerCase()]} onSelect={() => { keyBind.args[argIndex] = layout.id; layoutSelectorStates[index] = false; }} class="py-2">
                                          <img class="size-5 mr-2" src="icons/{layout.icon.slug}.png" alt=""/><span>{layout.label}</span>
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
                          {@const selectedSession = neuzosConfig.sessions.find(session => session.id === keyBind.args[argIndex])}
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground whitespace-nowrap">Session:</span>
                            <Popover.Root open={isSessionSelectorOpen} onOpenChange={(open) => { sessionSelectorStates[index] = open; }}>
                              <Popover.Trigger>
                                <Button variant="outline" size="sm" class="h-9">
                                  {#if selectedSession}<img class="w-4 h-4 mr-2" src="icons/{selectedSession.icon.slug}.png" alt=""/>{selectedSession.label}{:else}Select Session{/if}
                                </Button>
                              </Popover.Trigger>
                              <Popover.Content class="w-[280px] p-0">
                                <Command.Root shouldFilter={true}>
                                  <Command.Input placeholder="Search sessions..." class="h-10"/>
                                  <Command.Empty>No session found.</Command.Empty>
                                  <Command.List class="max-h-[320px]">
                                    <Command.Group>
                                      {#each neuzosConfig.sessions as session}
                                        <Command.Item value={session.id} keywords={[session.label.toLowerCase()]} onSelect={() => { keyBind.args[argIndex] = session.id; sessionSelectorStates[index] = false; }} class="py-2">
                                          <img class="size-5 mr-2" src="icons/{session.icon.slug}.png" alt=""/><span>{session.label}</span>
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
                          {@const sessionActionsData = neuzosConfig.sessionActions?.find(sa => sa.sessionId === sessionId)}
                          {@const selectedAction = sessionActionsData?.actions.find(action => action.id === keyBind.args[argIndex])}
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground whitespace-nowrap">Action:</span>
                            <Popover.Root open={isActionSelectorOpen} onOpenChange={(open) => { actionSelectorStates[index] = open; }}>
                              <Popover.Trigger>
                                <Button variant="outline" size="sm" class="h-9" disabled={!sessionId || !sessionActionsData}>
                                  {#if selectedAction}<img class="w-4 h-4 mr-2" src="icons/{selectedAction.icon.slug}.png" alt=""/>{selectedAction.label}{:else}Select Action{/if}
                                </Button>
                              </Popover.Trigger>
                              <Popover.Content class="w-[280px] p-0">
                                <Command.Root shouldFilter={true}>
                                  <Command.Input placeholder="Search actions..." class="h-10"/>
                                  <Command.Empty>No action found.</Command.Empty>
                                  <Command.List class="max-h-[320px]">
                                    <Command.Group>
                                      {#if sessionActionsData}
                                        {#each sessionActionsData.actions as action}
                                          <Command.Item value={action.id} keywords={[action.label.toLowerCase()]} onSelect={() => { keyBind.args[argIndex] = action.id; actionSelectorStates[index] = false; }} class="py-2">
                                            <img class="size-5 mr-2" src="icons/{action.icon.slug}.png" alt=""/><span>{action.label}</span>
                                          </Command.Item>
                                        {/each}
                                      {/if}
                                    </Command.Group>
                                  </Command.List>
                                </Command.Root>
                              </Popover.Content>
                            </Popover.Root>
                          </div>
                        {:else if arg === 'ingame_key'}
                          {@const ingameParsed = parseKeybind(keyBind.args?.[argIndex] ?? '')}
                          {@const isModOpen = ingameKeyModifierStates[index] ?? false}
                          {@const isKeyOpen = ingameKeyStates[index] ?? false}
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground whitespace-nowrap">In-Game Key:</span>
                            <Popover.Root open={isModOpen} onOpenChange={(open) => { ingameKeyModifierStates[index] = open; }}>
                              <Popover.Trigger class="w-36 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                {@const selMod = modifierOptions.find(m => m.value === ingameParsed.modifier)?.label ?? 'None'}
                                <span class="truncate {ingameParsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">{selMod}</span>
                                <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                              </Popover.Trigger>
                              <Popover.Content class="w-[220px] p-0">
                                <Command.Root shouldFilter={true}>
                                  <Command.Input placeholder="Search modifier..." class="h-10"/>
                                  <Command.Empty>No modifier found.</Command.Empty>
                                  <Command.List class="max-h-[320px]">
                                    <Command.Group>
                                      {#each modifierOptions as modifier}
                                        <Command.Item value={modifier.value} keywords={[modifier.label.toLowerCase()]} onSelect={() => { keyBind.args[argIndex] = buildKeybind(modifier.value, ingameParsed.key); ingameKeyModifierStates[index] = false; }} class="font-medium py-2.5">
                                          <Check class={ingameParsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                          <span class={ingameParsed.modifier === modifier.value ? "text-primary" : ""}>{modifier.label}</span>
                                        </Command.Item>
                                      {/each}
                                    </Command.Group>
                                  </Command.List>
                                </Command.Root>
                              </Popover.Content>
                            </Popover.Root>
                            <Popover.Root open={isKeyOpen} onOpenChange={(open) => { ingameKeyStates[index] = open; }}>
                              <Popover.Trigger class="w-32 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                <span class="truncate {ingameParsed.key ? 'text-foreground uppercase' : 'text-muted-foreground font-sans font-normal lowercase'}">{ingameParsed.key || 'select key...'}</span>
                                <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                              </Popover.Trigger>
                              <Popover.Content class="w-[220px] p-0">
                                <Command.Root shouldFilter={true}>
                                  <Command.Input placeholder="Search key..." class="h-10"/>
                                  <Command.Empty>No key found.</Command.Empty>
                                  <Command.List class="max-h-[320px]">
                                    <Command.Group>
                                      {#each allowedKeys as key}
                                        <Command.Item value={key} onSelect={() => { keyBind.args[argIndex] = buildKeybind(ingameParsed.modifier, key); ingameKeyStates[index] = false; }} class="font-mono font-semibold uppercase py-2.5">
                                          <Check class={ingameParsed.key === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                          <span class={ingameParsed.key === key ? "text-primary" : ""}>{key}</span>
                                        </Command.Item>
                                      {/each}
                                    </Command.Group>
                                  </Command.List>
                                </Command.Root>
                              </Popover.Content>
                            </Popover.Root>
                          </div>
                        {:else if arg === 'event_name'}
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground whitespace-nowrap">Event Name:</span>
                            <input type="text" class="w-48 h-9 px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" placeholder="Enter event name..." bind:value={keyBind.args[argIndex]}/>
                          </div>
                        {:else if arg === 'event_data'}
                          <div class="flex flex-col gap-1 w-full">
                            <span class="text-xs text-muted-foreground">Event Data:</span>
                            <textarea class="w-full min-h-[80px] px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-y" placeholder="Enter event data..." bind:value={keyBind.args[argIndex]}></textarea>
                          </div>
                        {:else}
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground whitespace-nowrap">{arg}:</span>
                            <input type="text" class="w-48 h-9 px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" placeholder="Enter {arg}..." bind:value={keyBind.args[argIndex]}/>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  {:else}
                    <i class="text-accent-foreground opacity-50"> No extra data is needed for this event.</i>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-sm text-muted-foreground">
                  <Button variant="outline" size="sm" onclick={() => { neuzosConfig.keyBinds.splice(neuzosConfig.keyBinds.indexOf(keyBind), 1) }}>
                    <Trash2 class="size-4"/>
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/if}
          {/each}
        </Table.Body>
      </Table.Root>
      <Popover.Root open={addKeybindPopoverOpen} onOpenChange={(open) => { addKeybindPopoverOpen = open; }}>
        <Popover.Trigger>
          <Button variant="outline" size="sm">
            <Plus class="size-4 mr-2"/>
            Add a Global Shortcut Keybind
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-[320px] p-0">
          <Command.Root shouldFilter={true}>
            <Command.Input placeholder="Search events..." class="h-10"/>
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
    </div><!-- end Global Keybinds section -->
  </Card.Content>
</Card.Root>
