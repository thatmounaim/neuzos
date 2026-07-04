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
  import KeyBinder from "../../Shared/KeyBinder.svelte";

  import type {NeuzConfig, NeuzKeyBindProfile, NeuzKeybind, UIActionDescriptor} from "$lib/types";
  import {Plus, Trash2, ChevronsUpDown, Check, AlertCircleIcon, ChevronUp, ChevronDown} from "@lucide/svelte";

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
    ")", "!", "@", "#", "$", "%", "^", "&", "*", "(", ":", ";", ":", "+", "=", "<", ",", "_", "-", ">", ".", "?", "/", "~", "`", "´", "ß", "{", "]", "[", "|", "\\", "}",
  ];
  const mouseButtonKeys = ["Middle", "Mouse4", "Mouse5"];

  let allowedEventKeybinds: {
    [key: string]: { label: string, args?: string[], unique?: boolean }
  } = $state({});
  let uiActions: UIActionDescriptor[] = $state([]);
  const systemActionEventIds = [
    'ui.toggle_quest_log',
    'fullscreen_toggle',
    'close_focus_session',
    'toggle_keybinds',
    'layout_swap',
    'layout_switch',
    'layout_cycle_forward',
    'layout_cycle_backward'
  ];

  const isSystemActionEvent = (event: string) => systemActionEventIds.includes(event);
  const isHiddenAddEvent = (event: string) => event === 'custom_event';

  function getSystemActionInfo(event: string): { label: string; category: string } {
    const uiAction = uiActions.find(action => action.id === event);
    if (uiAction) {
      return {label: uiAction.label, category: uiAction.category};
    }

    if (['layout_swap', 'layout_switch', 'layout_cycle_forward', 'layout_cycle_backward'].includes(event)) {
      return {
        label: allowedEventKeybinds[event]?.label ?? event,
        category: 'Layout'
      };
    }

    if (event === 'fullscreen_toggle' || event === 'close_focus_session') {
      return {
        label: allowedEventKeybinds[event]?.label ?? event,
        category: 'Window'
      };
    }

    return {
      label: allowedEventKeybinds[event]?.label ?? event,
      category: 'System'
    };
  }

  function getKeybindActionCategory(event: string, fallback: string): string {
    if (event === 'send_session_action' || event === 'send_to_receiver') {
      return 'Action';
    }

    if (['layout_swap', 'layout_switch', 'layout_cycle_forward', 'layout_cycle_backward'].includes(event)) {
      return 'Layout';
    }

    if (event === 'fullscreen_toggle' || event === 'close_focus_session') {
      return 'Window';
    }

    if (event === 'custom_event') {
      return 'Custom';
    }

    return fallback;
  }

  function getKeybindEventDescription(event: string): string {
    switch (event) {
      case 'ui.toggle_quest_log':
        return 'Show / Hide the Quest Log Panel.';
      case 'fullscreen_toggle':
        return 'Toggles Fullscreen Mode.';
      case 'close_focus_session':
        return 'Closes the active Focus Session Window.';
      case 'toggle_keybinds':
        return 'Enable or Disable NeuzOS Keybinds.\nThis Keybind is executable even if Keybinds are Disabled!';
      case 'layout_swap':
        return 'Switches between the two last used Layouts.';
      case 'layout_cycle_forward':
        return 'Cycles to the Next Layout.';
      case 'layout_cycle_backward':
        return 'Cycles to the Previous Layout.';
      case 'send_session_action':
        return 'Sends the Selected Action to the Selected Session.';
      case 'send_to_receiver':
        return 'Sends the Selected Key to the Active Receiver Session.';
      case 'custom_event':
        return 'Dispatches a Custom NeuzOS Event.';
      default:
        return 'No Additional Event Data Required.';
    }
  }

  function getKeybindEventDataDescription(event: string): string | null {
    switch (event) {
      case 'layout_switch':
        return 'Jump to a Specific Layout.';
      case 'send_session_action':
        return 'Choose the Session and Action for this Keybind.';
      case 'send_to_receiver':
        return 'Choose the Key sent to the Active Receiver Session.';
      default:
        return null;
    }
  }

  function getAddableGlobalEventIds(): string[] {
    return Object.keys(allowedEventKeybinds).filter(event => !isSystemActionEvent(event) && !isHiddenAddEvent(event));
  }

  function getAddableProfileEventIds(): string[] {
    return Object.keys(allowedEventKeybinds).filter(event => {
      return !allowedEventKeybinds[event]?.unique && !isSystemActionEvent(event) && !isHiddenAddEvent(event);
    });
  }

  function getAddableGlobalSystemEventIds(): string[] {
    return systemActionEventIds.filter(event => {
      return event.startsWith('ui.') || allowedEventKeybinds[event];
    });
  }

  function getAddableGlobalActionEventIds(): string[] {
    return getAddableGlobalEventIds().filter(event => !isSystemActionEvent(event));
  }

  function getSystemKeybindDropdownGroups(): Array<{ heading: string; events: string[] }> {
    const events = getAddableGlobalSystemEventIds().filter(canAddGlobalKeybind);
    const groups = [
      {
        heading: 'System Keybinds',
        events: events.filter(event => getSystemActionInfo(event).category === 'System')
      },
      {
        heading: 'Window Keybinds',
        events: events.filter(event => getSystemActionInfo(event).category === 'Window')
      },
      {
        heading: 'Interface',
        events: events.filter(event => getSystemActionInfo(event).category === 'Interface')
      },
      {
        heading: 'Layout Keybinds',
        events: events.filter(event => getSystemActionInfo(event).category === 'Layout')
      }
    ];

    return groups.filter(group => group.events.length > 0);
  }

  function canAddGlobalKeybind(event: string): boolean {
    const existing = neuzosConfig.keyBinds.find(keyBind => keyBind.event === event);
    if (event === 'layout_switch') {
      return true;
    }

    if (isSystemActionEvent(event)) {
      return !existing;
    }

    return !(allowedEventKeybinds[event]?.unique && existing);
  }

  function addGlobalKeybind(event: string) {
    const argCount = allowedEventKeybinds[event]?.args?.length || 0;
    neuzosConfig.keyBinds.push({
      key: '',
      event,
      args: new Array(argCount).fill('')
    });
    addKeybindPopoverOpen = false;
  }

  function addSystemKeybind(event: string) {
    const argCount = allowedEventKeybinds[event]?.args?.length || 0;
    neuzosConfig.keyBinds.push({
      key: '',
      event,
      args: new Array(argCount).fill('')
    });
    addSystemKeybindPopoverOpen = false;
  }

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

  function formatKeyLabel(key: string): string {
    return key === 'ß' ? 'ß' : key.toUpperCase();
  }

  const electronApi = getElectronContext();
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

  const systemActionKeybinds = $derived(
    neuzosConfig.keyBinds.filter(keyBind => isSystemActionEvent(keyBind.event))
  );

  const regularGlobalKeybinds = $derived(
    neuzosConfig.keyBinds.filter(keyBind => !isSystemActionEvent(keyBind.event))
  );

  onMount(async () => {
    allowedEventKeybinds = await electronApi.invoke("config.get_available_event_keybinds");
    uiActions = await electronApi.invoke("config.get_available_ui_actions");
  });

  // ── Global keybind combobox states ──────────────────────────────────────────
  let comboboxStates: Array<{ open: boolean; modifierOpen: boolean }> = $state([]);
  let addKeybindPopoverOpen = $state(false);
  let addSystemKeybindPopoverOpen = $state(false);
  let layoutSelectorStates: { [index: number]: boolean } = $state({});
  let sessionSelectorStates: { [index: number]: boolean } = $state({});
  let actionSelectorStates: { [index: number]: boolean } = $state({});
  let systemActionConflictWarnings: { [index: number]: string } = $state({});

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

  function moveSystemActionUp(keyBind: NeuzKeybind) {
    const currentSystemIndex = systemActionKeybinds.indexOf(keyBind);
    if (currentSystemIndex <= 0) return;

    const previousSystemBind = systemActionKeybinds[currentSystemIndex - 1];
    const currentIndex = neuzosConfig.keyBinds.indexOf(keyBind);
    const previousIndex = neuzosConfig.keyBinds.indexOf(previousSystemBind);
    if (currentIndex < 0 || previousIndex < 0) return;

    const keybinds = [...neuzosConfig.keyBinds];
    [keybinds[currentIndex], keybinds[previousIndex]] = [keybinds[previousIndex], keybinds[currentIndex]];
    neuzosConfig.keyBinds = keybinds;
  }

  function moveSystemActionDown(keyBind: NeuzKeybind) {
    const currentSystemIndex = systemActionKeybinds.indexOf(keyBind);
    if (currentSystemIndex < 0 || currentSystemIndex >= systemActionKeybinds.length - 1) return;

    const nextSystemBind = systemActionKeybinds[currentSystemIndex + 1];
    const currentIndex = neuzosConfig.keyBinds.indexOf(keyBind);
    const nextIndex = neuzosConfig.keyBinds.indexOf(nextSystemBind);
    if (currentIndex < 0 || nextIndex < 0) return;

    const keybinds = [...neuzosConfig.keyBinds];
    [keybinds[currentIndex], keybinds[nextIndex]] = [keybinds[nextIndex], keybinds[currentIndex]];
    neuzosConfig.keyBinds = keybinds;
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
  let globalKeybindConflictWarnings: { [index: number]: string } = $state({});

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

  function getActiveProfile(): NeuzKeyBindProfile | null {
    ensureDefaultProfile();
    return neuzosConfig.keyBindProfiles.find(p => p.id === neuzosConfig.activeKeyBindProfileId) ?? null;
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

  function applySystemActionKeybind(keyBind: NeuzKeybind, keybind: string): boolean {
    const keyBindIndex = neuzosConfig.keyBinds.indexOf(keyBind);
    if (keyBindIndex < 0) return false;

    if (!keybind) {
      removeSystemActionKeybind(keyBind);
      delete systemActionConflictWarnings[keyBindIndex];
      return true;
    }

    const conflictLabel = getSystemActionConflict(keyBind, keybind);
    if (conflictLabel) {
      systemActionConflictWarnings[keyBindIndex] = conflictLabel;
      return false;
    }

    delete systemActionConflictWarnings[keyBindIndex];
    keyBind.key = keybind;
    return true;
  }

  function removeSystemActionKeybind(keyBind: NeuzKeybind) {
    const keyBindIndex = neuzosConfig.keyBinds.indexOf(keyBind);
    if (keyBindIndex < 0) return;

    delete systemActionConflictWarnings[keyBindIndex];
    neuzosConfig.keyBinds.splice(keyBindIndex, 1);
  }

  function getSystemActionConflict(currentKeyBind: NeuzKeybind, keybind: string): string | null {
    if (!keybind) return null;

    const conflict = neuzosConfig.keyBinds.find(existingBind => {
      return existingBind !== currentKeyBind && existingBind.key.toLowerCase() === keybind.toLowerCase();
    });

    if (!conflict) return null;

    return uiActions.find(action => action.id === conflict.event)?.label
      ?? allowedEventKeybinds[conflict.event]?.label
      ?? conflict.event;
  }

  function getKeybindLabel(keyBind: NeuzKeybind): string {
    return uiActions.find(action => action.id === keyBind.event)?.label
      ?? allowedEventKeybinds[keyBind.event]?.label
      ?? keyBind.event;
  }

  function getGlobalKeybindConflict(currentKeyBind: NeuzKeybind, keybind: string): string | null {
    if (!keybind) return null;

    const conflict = neuzosConfig.keyBinds.find(existingBind => {
      return existingBind !== currentKeyBind && existingBind.key?.toLowerCase() === keybind.toLowerCase();
    });

    return conflict ? getKeybindLabel(conflict) : null;
  }

  function applyGlobalKeybind(keyBind: NeuzKeybind, keybind: string): boolean {
    const keyBindIndex = neuzosConfig.keyBinds.indexOf(keyBind);
    if (keyBindIndex < 0) return false;

    const conflictLabel = getGlobalKeybindConflict(keyBind, keybind);
    if (conflictLabel) {
      globalKeybindConflictWarnings[keyBindIndex] = conflictLabel;
      return false;
    }

    delete globalKeybindConflictWarnings[keyBindIndex];
    keyBind.key = keybind;
    return true;
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
      <p>Manage Keybinds for various NeuzOS Actions.</p>
      <Alert.Root class="mt-4">
        <AlertCircleIcon/>
        <Alert.Title>Important Note!</Alert.Title>
        <Alert.Description class="pt-2">
          <div class="space-y-0">
            <p class="leading-snug">Keybind Keys are registered globally while NeuzOS is running. A registered Key cannot be used inside Webviews and is reserved exclusively for its assigned Keybind Action.</p>
            <p class="leading-snug">In-Game Action Keybinds can only execute one Action at a time to comply with the Flyff Universe Terms of Service (ToS).</p>
          </div>
        </Alert.Description>
      </Alert.Root>
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-6 items-start">
    <!-- ── Keybind Profiles ───────────────────────────────────────────────── -->
    <div class="w-full flex flex-col gap-3 rounded-lg border-2 border-border/80 bg-card p-4 shadow-sm">
      <div>
        <h3 class="text-sm font-semibold">Profile Keybinds</h3>
        <p class="text-xs text-muted-foreground mt-1">These Keybinds are only active while their assigned Profile is active.</p>
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
              <div class="flex items-center justify-between gap-3">
                <div
                  role="button"
                  tabindex="0"
                  class="flex flex-1 items-center gap-3 text-left transition-opacity hover:opacity-80"
                  onclick={() => { openProfiles[profile.id] = !isProfileOpen; }}
                  onkeydown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openProfiles[profile.id] = !isProfileOpen;
                    }
                  }}
                >
                  <span class="inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                  {#if isProfileOpen}
                    <ChevronUp class="h-4 w-4"/>
                  {:else}
                    <ChevronDown class="h-4 w-4"/>
                  {/if}
                  </span>

                <div class="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <div class="flex min-w-0 flex-col">
                    {#if editingProfileId === profile.id}
                      <div class="relative w-56 max-w-full">
                        <Input
                          class="h-8 w-full pr-8 text-sm"
                          bind:value={editingProfileName}
                          onclick={(event) => event.stopPropagation()}
                          onblur={commitRenameProfile}
                          onkeydown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitRenameProfile();
                            }
                          }}
                          autofocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          class="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                          onmousedown={(event) => event.preventDefault()}
                          onclick={(event) => {
                            event.stopPropagation();
                            commitRenameProfile();
                          }}
                        >
                          <Check class="h-4 w-4"/>
                        </Button>
                      </div>
                    {:else}
                      <button
                        type="button"
                        class="min-w-0 truncate text-left text-sm font-medium hover:underline"
                        onclick={(event) => {
                          event.stopPropagation();
                          startRenameProfile(profile);
                        }}
                      >
                        {profile.name}
                      </button>
                    {/if}
                    <span class="text-sm text-muted-foreground">
                      {profile.keybinds.length} Keybind{profile.keybinds.length !== 1 ? 's' : ''}
                      {#if isActive}<span class="ml-1 text-primary font-semibold">· Active</span>{/if}
                    </span>
                  </div>
                </div>
                </div>

                <!-- Header actions -->
                <div class="flex items-center gap-1 ml-2 shrink-0">
                  {#if !isActive}
                    <Button
                      variant="outline"
                      size="sm"
                      class="mr-1.5 h-6 px-2 py-0 text-[11px]"
                      onclick={(event) => {
                        event.stopPropagation();
                        neuzosConfig.activeKeyBindProfileId = profile.id;
                      }}
                    >
                      Set Active
                    </Button>
                  {/if}
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onclick={(event) => {
                      event.stopPropagation();
                      moveProfileUp(profileIndex);
                    }}
                    disabled={profileIndex === 0}
                  >
                    <ChevronUp class="h-4 w-4"/>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onclick={(event) => {
                      event.stopPropagation();
                      moveProfileDown(profileIndex);
                    }}
                    disabled={profileIndex >= (neuzosConfig.keyBindProfiles?.length ?? 0) - 1}
                  >
                    <ChevronDown class="h-4 w-4"/>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    class="hover:bg-destructive hover:text-destructive-foreground"
                    onclick={(event) => {
                      event.stopPropagation();
                      deleteProfile(profile.id);
                    }}
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
                      <Table.Root class="table-fixed min-w-[1040px]">
                        <Table.Header>
                          <Table.Row>
                            <Table.Head class="font-bold w-[60px]"></Table.Head>
                            <Table.Head class="font-bold w-[220px]">Action</Table.Head>
                            <Table.Head class="font-bold w-[460px]">Modifier + Key</Table.Head>
                            <Table.Head class="font-bold">Event</Table.Head>
                            <Table.Head class="w-[56px]"></Table.Head>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {#each profile.keybinds as keyBind, index (index)}
                            {#if !isSystemActionEvent(keyBind.event)}
                              {@const eventInfo = allowedEventKeybinds[keyBind.event]}
                              {@const parsed = parseKeybind(keyBind.key)}
                              {@const keyOnly = parsed.key}
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
                              <Table.Cell class="font-medium">
                                <div class="flex flex-col gap-0.5">
                                  <span>{eventInfo?.label}</span>
                                  <span class="text-xs text-muted-foreground">{getKeybindActionCategory(keyBind.event, 'Profile')}</span>
                                </div>
                              </Table.Cell>
                              <Table.Cell>
                                <div class="flex items-center gap-2">
                                  <Popover.Root open={state.modifierOpen} onOpenChange={(open) => { state.modifierOpen = open; }}>
                                    <Popover.Trigger class="w-36 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                      {@const selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                                      <span class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">{selectedMod}</span>
                                      <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                    </Popover.Trigger>
                                    <Popover.Content class="w-[220px] p-0">
                                      <Command.Root shouldFilter={true}>
                                        <Command.Input placeholder="Search Modifier..." class="h-10"/>
                                        <Command.Empty>No Modifier found.</Command.Empty>
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
                                  <Popover.Root open={state.open} onOpenChange={(open) => { state.open = open; }}>
                                    <Popover.Trigger class="w-32 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                                      <span class="truncate {keyOnly ? 'text-foreground' : 'text-muted-foreground font-sans font-normal'}">{keyOnly ? formatKeyLabel(keyOnly) : "Select Key..."}</span>
                                      <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                    </Popover.Trigger>
                                    <Popover.Content class="w-[220px] p-0">
                                      <Command.Root shouldFilter={true}>
                                        <Command.Input placeholder="Search Key..." class="h-10"/>
                                        <Command.Empty>No Key found.</Command.Empty>
                                        <Command.List class="max-h-[320px]">
                                          <Command.Group>
                                            {#each allowedKeys as key}
                                              <Command.Item value={key} onSelect={() => { keyBind.key = buildKeybind(parsed.modifier, key); state.open = false; }} class="font-mono font-semibold py-2.5">
                                                <Check class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                                <span class={keyOnly === key ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
                                              </Command.Item>
                                            {/each}
                                          </Command.Group>
                                          <Command.Separator/>
                                          <Command.Group heading="Mouse Buttons">
                                            {#each mouseButtonKeys as key}
                                              <Command.Item value={key} onSelect={() => { keyBind.key = buildKeybind(parsed.modifier, key); state.open = false; }} class="font-mono font-semibold py-2.5">
                                                <Check class={keyOnly.toLowerCase() === key.toLowerCase() ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                                <span class={keyOnly.toLowerCase() === key.toLowerCase() ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
                                              </Command.Item>
                                            {/each}
                                          </Command.Group>
                                        </Command.List>
                                      </Command.Root>
                                    </Popover.Content>
                                  </Popover.Root>
                                  <KeyBinder
                                    actionId={keyBind.event}
                                    currentKey={keyBind.key}
                                    onBind={(capturedKey) => { keyBind.key = capturedKey; return true; }}
                                    onCancel={() => {}}
                                  />
                                </div>
                              </Table.Cell>
                              <!-- Args -->
                              <Table.Cell>
                                {#if eventInfo?.args?.length > 0}
                                  {@const eventDataDescription = getKeybindEventDataDescription(keyBind.event)}
                                  <div class="flex flex-col gap-2">
                                    {#if eventDataDescription}
                                      <span class="text-xs text-muted-foreground">{eventDataDescription}</span>
                                    {/if}
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
                                                <Command.Input placeholder="Search Layouts..." class="h-10"/>
                                                <Command.Empty>No Layout found.</Command.Empty>
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
                                                <Command.Input placeholder="Search Sessions..." class="h-10"/>
                                                <Command.Empty>No Session found.</Command.Empty>
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
                                                <Command.Input placeholder="Search Actions..." class="h-10"/>
                                                <Command.Empty>No Action found.</Command.Empty>
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
                                                <Command.Input placeholder="Search Modifier..." class="h-10"/>
                                                <Command.Empty>No Modifier found.</Command.Empty>
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
                                              <span class="truncate {ingameParsed.key ? 'text-foreground' : 'text-muted-foreground font-sans font-normal'}">{ingameParsed.key ? formatKeyLabel(ingameParsed.key) : 'Select Key...'}</span>
                                              <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                                            </Popover.Trigger>
                                            <Popover.Content class="w-[220px] p-0">
                                              <Command.Root shouldFilter={true}>
                                                <Command.Input placeholder="Search Key..." class="h-10"/>
                                                <Command.Empty>No Key found.</Command.Empty>
                                                <Command.List class="max-h-[320px]">
                                                  <Command.Group>
                                                    {#each allowedKeys as key}
                                                      <Command.Item value={key} onSelect={() => { if (!keyBind.args) keyBind.args = []; keyBind.args[argIndex] = buildKeybind(ingameParsed.modifier, key); if (!profileIngameKeyStates[profile.id]) profileIngameKeyStates[profile.id] = {}; profileIngameKeyStates[profile.id][index] = false; }} class="font-mono font-semibold py-2.5">
                                                        <Check class={ingameParsed.key === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                                        <span class={ingameParsed.key === key ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
                                                      </Command.Item>
                                                    {/each}
                                                  </Command.Group>
                                                  <Command.Separator/>
                                                  <Command.Group heading="Mouse Buttons">
                                                    {#each mouseButtonKeys as key}
                                                      <Command.Item value={key} onSelect={() => { if (!keyBind.args) keyBind.args = []; keyBind.args[argIndex] = buildKeybind(ingameParsed.modifier, key); if (!profileIngameKeyStates[profile.id]) profileIngameKeyStates[profile.id] = {}; profileIngameKeyStates[profile.id][index] = false; }} class="font-mono font-semibold py-2.5">
                                                        <Check class={ingameParsed.key.toLowerCase() === key.toLowerCase() ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                                        <span class={ingameParsed.key.toLowerCase() === key.toLowerCase() ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
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
                                  </div>
                                {:else}
                                  <span class="whitespace-pre-line text-xs text-muted-foreground">{getKeybindEventDescription(keyBind.event)}</span>
                                {/if}
                              </Table.Cell>
                              <Table.Cell>
                                <Button variant="outline" size="sm" onclick={() => removeProfileKeybind(profile, index)}>
                                  <Trash2 class="size-4"/>
                                </Button>
                              </Table.Cell>
                              </Table.Row>
                            {/if}
                          {/each}
                        </Table.Body>
                      </Table.Root>
                    </div>
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
                        <Command.Input placeholder="Search Events..." class="h-10"/>
                        <Command.Empty>No Event found.</Command.Empty>
                        <Command.List class="max-h-[320px]">
                          <Command.Group heading="Action Keybinds">
                            {#each getAddableProfileEventIds() as event (event)}
                              {@const eventInfo = allowedEventKeybinds[event]}
                              <Command.Item value={event} keywords={[eventInfo?.label.toLowerCase()]} onSelect={() => addProfileKeybind(profile, event)} class="py-2">
                                <span>{eventInfo?.label}</span>
                              </Command.Item>
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
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" onclick={addProfile}>
          <Plus class="size-4 mr-2"/>
          Add Profile
        </Button>
      </div>
    </div>
    <div class="w-full flex flex-col gap-3 rounded-lg border-2 border-border/80 bg-card p-4 shadow-sm">
      <div>
        <h3 class="text-sm font-semibold">System Keybinds</h3>
        <p class="text-xs text-muted-foreground mt-1">These Keybinds control System Features, User Interface and Window Behavior. They are independent of Profiles.</p>
      </div>

      <Table.Root class="table-fixed min-w-[1040px]">
        <Table.Header>
          <Table.Row>
            <Table.Head class="font-bold w-[60px]"></Table.Head>
            <Table.Head class="font-bold w-[220px]">Action</Table.Head>
            <Table.Head class="font-bold w-[460px]">Modifier + Key</Table.Head>
            <Table.Head class="font-bold">Event</Table.Head>
            <Table.Head class="w-[56px]"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
            {#each systemActionKeybinds as keyBind, actionIndex (keyBind)}
              {@const action = getSystemActionInfo(keyBind.event)}
              {@const eventInfo = allowedEventKeybinds[keyBind.event]}
              {@const parsed = parseKeybind(keyBind.key)}
              {@const keyOnly = parsed.key}
              {@const globalIndex = neuzosConfig.keyBinds.indexOf(keyBind)}
              {@const state = comboboxStates[globalIndex] ?? {open: false, modifierOpen: false}}
              {@const conflictLabel = systemActionConflictWarnings[globalIndex] ?? getSystemActionConflict(keyBind, keyBind.key)}
              <Table.Row>
                <Table.Cell>
                  <div class="flex flex-col gap-0.5">
                    <Button variant="outline" size="icon-xs" onclick={() => moveSystemActionUp(keyBind)} disabled={actionIndex === 0}>
                      <ChevronUp class="h-3 w-3"/>
                    </Button>
                    <Button variant="outline" size="icon-xs" onclick={() => moveSystemActionDown(keyBind)} disabled={actionIndex >= systemActionKeybinds.length - 1}>
                      <ChevronDown class="h-3 w-3"/>
                    </Button>
                  </div>
                </Table.Cell>
                <Table.Cell class="font-medium">
                  <div class="flex flex-col gap-0.5">
                    <span>{action.label}</span>
                    <span class="text-xs text-muted-foreground">{action.category}</span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div class="flex items-center gap-2">
                    <Popover.Root open={state.modifierOpen} onOpenChange={(open) => { state.modifierOpen = open; }}>
                      <Popover.Trigger class="w-36 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                        {@const selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                        <span class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">{selectedMod}</span>
                        <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                      </Popover.Trigger>
                      <Popover.Content class="w-[220px] p-0">
                        <Command.Root shouldFilter={true}>
                          <Command.Input placeholder="Search Modifier..." class="h-10"/>
                          <Command.Empty>No Modifier found.</Command.Empty>
                          <Command.List class="max-h-[320px]">
                            <Command.Group>
                              {#each modifierOptions as modifier}
                                <Command.Item value={modifier.value} keywords={[modifier.label.toLowerCase()]} onSelect={() => { if (applySystemActionKeybind(keyBind, buildKeybind(modifier.value, parsed.key))) state.modifierOpen = false; }} class="font-medium py-2.5">
                                  <Check class={parsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                  <span class={parsed.modifier === modifier.value ? "text-primary" : ""}>{modifier.label}</span>
                                </Command.Item>
                              {/each}
                            </Command.Group>
                          </Command.List>
                        </Command.Root>
                      </Popover.Content>
                    </Popover.Root>
                    <Popover.Root open={state.open} onOpenChange={(open) => { state.open = open; }}>
                      <Popover.Trigger class="w-32 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                        <span class="truncate {keyOnly ? 'text-foreground' : 'text-muted-foreground font-sans font-normal'}">{keyOnly ? formatKeyLabel(keyOnly) : "Select Key..."}</span>
                        <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                      </Popover.Trigger>
                      <Popover.Content class="w-[220px] p-0">
                        <Command.Root shouldFilter={true}>
                          <Command.Input placeholder="Search Key..." class="h-10"/>
                          <Command.Empty>No Key found.</Command.Empty>
                          <Command.List class="max-h-[320px]">
                            <Command.Group>
                              {#each allowedKeys as key}
                                <Command.Item value={key} onSelect={() => { if (applySystemActionKeybind(keyBind, buildKeybind(parsed.modifier, key))) state.open = false; }} class="font-mono font-semibold py-2.5">
                                  <Check class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                  <span class={keyOnly === key ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
                                </Command.Item>
                              {/each}
                            </Command.Group>
                            <Command.Separator/>
                            <Command.Group heading="Mouse Buttons">
                              {#each mouseButtonKeys as key}
                                <Command.Item value={key} onSelect={() => { if (applySystemActionKeybind(keyBind, buildKeybind(parsed.modifier, key))) state.open = false; }} class="font-mono font-semibold py-2.5">
                                  <Check class={keyOnly.toLowerCase() === key.toLowerCase() ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                  <span class={keyOnly.toLowerCase() === key.toLowerCase() ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
                                </Command.Item>
                              {/each}
                            </Command.Group>
                          </Command.List>
                        </Command.Root>
                      </Popover.Content>
                    </Popover.Root>
                    <div>
                      <KeyBinder
                        actionId={keyBind.event}
                        currentKey={keyBind.key}
                        conflictLabel={conflictLabel ?? undefined}
                        onBind={(key) => applySystemActionKeybind(keyBind, key)}
                        onCancel={() => { delete systemActionConflictWarnings[globalIndex]; }}
                      />
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {#if eventInfo?.args?.length > 0}
                    {@const eventDataDescription = getKeybindEventDataDescription(keyBind.event)}
                    <div class="flex flex-col gap-2">
                      {#if eventDataDescription}
                        <span class="text-xs text-muted-foreground">{eventDataDescription}</span>
                      {/if}
                      <div class="flex flex-wrap items-start gap-2">
                      {#each eventInfo?.args ?? [] as arg, argIndex}
                        {#if arg === 'layout_id'}
                          {@const isLayoutSelectorOpen = layoutSelectorStates[globalIndex] ?? false}
                          {@const selectedLayout = neuzosConfig.layouts.find(layout => layout.id === keyBind.args?.[argIndex])}
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground whitespace-nowrap">Layout:</span>
                            <Popover.Root open={isLayoutSelectorOpen} onOpenChange={(open) => { layoutSelectorStates[globalIndex] = open; }}>
                              <Popover.Trigger>
                                <Button variant="outline" size="sm" class="h-9">
                                  {#if selectedLayout}<img class="w-4 h-4 mr-2" src="icons/{selectedLayout.icon.slug}.png" alt=""/>{selectedLayout.label}{:else}Select Layout{/if}
                                </Button>
                              </Popover.Trigger>
                              <Popover.Content class="w-[280px] p-0">
                                <Command.Root shouldFilter={true}>
                                  <Command.Input placeholder="Search Layouts..." class="h-10"/>
                                  <Command.Empty>No Layout found.</Command.Empty>
                                  <Command.List class="max-h-[320px]">
                                    <Command.Group>
                                      {#each neuzosConfig.layouts as layout}
                                        <Command.Item value={layout.id} keywords={[layout.label.toLowerCase()]} onSelect={() => { if (!keyBind.args) keyBind.args = []; keyBind.args[argIndex] = layout.id; layoutSelectorStates[globalIndex] = false; }} class="py-2">
                                          <img class="size-5 mr-2" src="icons/{layout.icon.slug}.png" alt=""/><span>{layout.label}</span>
                                        </Command.Item>
                                      {/each}
                                    </Command.Group>
                                  </Command.List>
                                </Command.Root>
                              </Popover.Content>
                            </Popover.Root>
                          </div>
                        {:else}
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground whitespace-nowrap">{arg}:</span>
                            <input type="text" class="w-48 h-9 px-3 py-2 rounded-md text-sm border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" placeholder="Enter {arg}..." bind:value={keyBind.args[argIndex]}/>
                          </div>
                        {/if}
                      {/each}
                      </div>
                    </div>
                  {:else}
                    <span class="whitespace-pre-line text-xs text-muted-foreground">{getKeybindEventDescription(keyBind.event)}</span>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-right">
                  <Button variant="outline" size="sm" onclick={() => removeSystemActionKeybind(keyBind)}>
                    <Trash2 class="size-4"/>
                  </Button>
                </Table.Cell>
              </Table.Row>
              {#if conflictLabel}
                <Table.Row>
                  <Table.Cell colspan={5} class="pt-0 text-xs text-destructive">
                    Conflicts with: {conflictLabel}
                  </Table.Cell>
                </Table.Row>
              {/if}
            {/each}
        </Table.Body>
      </Table.Root>
      <Popover.Root open={addSystemKeybindPopoverOpen} onOpenChange={(open) => { addSystemKeybindPopoverOpen = open; }}>
        <Popover.Trigger class="self-start">
          <Button variant="outline" size="sm">
            <Plus class="size-4 mr-2"/>
            Add System Keybind
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-[320px] p-0">
          <Command.Root shouldFilter={true}>
            <Command.Input placeholder="Search Events..." class="h-10"/>
            <Command.Empty>No Event found.</Command.Empty>
            <Command.List class="max-h-[320px]">
              {#each getSystemKeybindDropdownGroups() as group, groupIndex (group.heading)}
                {#if groupIndex > 0}
                  <Command.Separator/>
                {/if}
                <Command.Group heading={group.heading}>
                  {#each group.events as event (event)}
                    {@const eventInfo = getSystemActionInfo(event)}
                    <Command.Item
                      value={event}
                      keywords={[eventInfo?.label.toLowerCase()]}
                      onSelect={() => addSystemKeybind(event)}
                      class="py-2"
                    >
                      <span>{eventInfo?.label}</span>
                    </Command.Item>
                  {/each}
                </Command.Group>
              {/each}
            </Command.List>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>
    </div>

    <!-- ── Global Keybinds ────────────────────────────────────────────────── -->
    <div class="w-full flex flex-col gap-3 rounded-lg border-2 border-border/80 bg-card p-4 shadow-sm">
      <div>
        <h3 class="text-sm font-semibold">Global Keybinds</h3>
        <p class="text-xs text-muted-foreground mt-1">These Keybinds are always active regardless of the selected Profile.</p>
      </div>
      {#if regularGlobalKeybinds.length > 0}
      <Table.Root class="table-fixed min-w-[1040px]">
        <Table.Header>
          <Table.Row>
            <Table.Head class="font-bold w-[60px]"></Table.Head>
            <Table.Head class="font-bold w-[220px]">Action</Table.Head>
            <Table.Head class="font-bold w-[460px]">Modifier + Key</Table.Head>
            <Table.Head class="font-bold">Event</Table.Head>
            <Table.Head class="font-bold w-[56px]"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each neuzosConfig.keyBinds as keyBind, index}
            {@const eventInfo = allowedEventKeybinds[keyBind.event]}
            {@const parsed = parseKeybind(keyBind.key)}
            {@const keyOnly = parsed.key}
            {#if !isSystemActionEvent(keyBind.event) && comboboxStates[index]}
              {@const state = comboboxStates[index]}
              {@const conflictLabel = globalKeybindConflictWarnings[index] ?? getGlobalKeybindConflict(keyBind, keyBind.key)}
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
                <Table.Cell class="font-medium">
                  <div class="flex flex-col gap-0.5">
                    <span>{eventInfo?.label}</span>
                    <span class="text-xs text-muted-foreground">{getKeybindActionCategory(keyBind.event, 'Global')}</span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {@const modifierState = comboboxStates[index]}
                  <div class="flex items-center gap-2">
                    <Popover.Root open={modifierState.modifierOpen} onOpenChange={(open) => { modifierState.modifierOpen = open; }}>
                      <Popover.Trigger class="w-36 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                        {@const selectedMod = modifierOptions.find(m => m.value === parsed.modifier)?.label ?? 'None'}
                        <span class="truncate {parsed.modifier ? 'text-foreground' : 'text-muted-foreground'}">{selectedMod}</span>
                        <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                      </Popover.Trigger>
                      <Popover.Content class="w-[220px] p-0">
                        <Command.Root shouldFilter={true}>
                          <Command.Input placeholder="Search Modifier..." class="h-10"/>
                          <Command.Empty>No Modifier found.</Command.Empty>
                          <Command.List class="max-h-[320px]">
                            <Command.Group>
                              {#each modifierOptions as modifier}
                                <Command.Item value={modifier.value} keywords={[modifier.label.toLowerCase()]} onSelect={() => { if (applyGlobalKeybind(keyBind, buildKeybind(modifier.value, parsed.key))) modifierState.modifierOpen = false; }} class="font-medium py-2.5">
                                  <Check class={parsed.modifier === modifier.value ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                  <span class={parsed.modifier === modifier.value ? "text-primary" : ""}>{modifier.label}</span>
                                </Command.Item>
                              {/each}
                            </Command.Group>
                          </Command.List>
                        </Command.Root>
                      </Popover.Content>
                    </Popover.Root>
                    <Popover.Root open={state.open} onOpenChange={(open) => { state.open = open; }}>
                      <Popover.Trigger class="w-32 h-9 px-3 py-2 inline-flex items-center justify-between gap-2 rounded-md text-sm font-mono font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 shadow-sm">
                        <span class="truncate {keyOnly ? 'text-foreground' : 'text-muted-foreground font-sans font-normal'}">{keyOnly ? formatKeyLabel(keyOnly) : "Select Key..."}</span>
                        <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                      </Popover.Trigger>
                      <Popover.Content class="w-[220px] p-0">
                        <Command.Root shouldFilter={true}>
                          <Command.Input placeholder="Search Key..." class="h-10"/>
                          <Command.Empty>No Key found.</Command.Empty>
                          <Command.List class="max-h-[320px]">
                            <Command.Group>
                              {#each allowedKeys as key}
                                <Command.Item value={key} onSelect={() => { if (applyGlobalKeybind(keyBind, buildKeybind(parsed.modifier, key))) state.open = false; }} class="font-mono font-semibold py-2.5">
                                  <Check class={keyOnly === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                  <span class={keyOnly === key ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
                                </Command.Item>
                              {/each}
                            </Command.Group>
                            <Command.Separator/>
                            <Command.Group heading="Mouse Buttons">
                              {#each mouseButtonKeys as key}
                                <Command.Item value={key} onSelect={() => { if (applyGlobalKeybind(keyBind, buildKeybind(parsed.modifier, key))) state.open = false; }} class="font-mono font-semibold py-2.5">
                                  <Check class={keyOnly.toLowerCase() === key.toLowerCase() ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                  <span class={keyOnly.toLowerCase() === key.toLowerCase() ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
                                </Command.Item>
                              {/each}
                            </Command.Group>
                          </Command.List>
                        </Command.Root>
                      </Popover.Content>
                    </Popover.Root>
                    <KeyBinder
                      actionId={keyBind.event}
                      currentKey={keyBind.key}
                      conflictLabel={conflictLabel ?? undefined}
                      onBind={(key) => {
                        return applyGlobalKeybind(keyBind, key);
                      }}
                      onCancel={() => { delete globalKeybindConflictWarnings[index]; }}
                    />
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {#if eventInfo?.args?.length > 0}
                    {@const eventDataDescription = getKeybindEventDataDescription(keyBind.event)}
                    <div class="flex flex-col gap-2">
                      {#if eventDataDescription}
                        <span class="text-xs text-muted-foreground">{eventDataDescription}</span>
                      {/if}
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
                                  <Command.Input placeholder="Search Layouts..." class="h-10"/>
                                  <Command.Empty>No Layout found.</Command.Empty>
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
                                  <Command.Input placeholder="Search Sessions..." class="h-10"/>
                                  <Command.Empty>No Session found.</Command.Empty>
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
                                  <Command.Input placeholder="Search Actions..." class="h-10"/>
                                  <Command.Empty>No Action found.</Command.Empty>
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
                                  <Command.Input placeholder="Search Modifier..." class="h-10"/>
                                  <Command.Empty>No Modifier found.</Command.Empty>
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
                                <span class="truncate {ingameParsed.key ? 'text-foreground' : 'text-muted-foreground font-sans font-normal'}">{ingameParsed.key ? formatKeyLabel(ingameParsed.key) : 'Select Key...'}</span>
                                <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50"/>
                              </Popover.Trigger>
                              <Popover.Content class="w-[220px] p-0">
                                <Command.Root shouldFilter={true}>
                                  <Command.Input placeholder="Search Key..." class="h-10"/>
                                  <Command.Empty>No Key found.</Command.Empty>
                                  <Command.List class="max-h-[320px]">
                                    <Command.Group>
                                      {#each allowedKeys as key}
                                        <Command.Item value={key} onSelect={() => { keyBind.args[argIndex] = buildKeybind(ingameParsed.modifier, key); ingameKeyStates[index] = false; }} class="font-mono font-semibold py-2.5">
                                          <Check class={ingameParsed.key === key ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                          <span class={ingameParsed.key === key ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
                                        </Command.Item>
                                      {/each}
                                    </Command.Group>
                                    <Command.Separator/>
                                    <Command.Group heading="Mouse Buttons">
                                      {#each mouseButtonKeys as key}
                                        <Command.Item value={key} onSelect={() => { keyBind.args[argIndex] = buildKeybind(ingameParsed.modifier, key); ingameKeyStates[index] = false; }} class="font-mono font-semibold py-2.5">
                                          <Check class={ingameParsed.key.toLowerCase() === key.toLowerCase() ? "mr-2 h-4 w-4 text-primary" : "mr-2 h-4 w-4 opacity-0"}/>
                                          <span class={ingameParsed.key.toLowerCase() === key.toLowerCase() ? "text-primary" : ""}>{formatKeyLabel(key)}</span>
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
                    </div>
                  {:else}
                    <span class="whitespace-pre-line text-xs text-muted-foreground">{getKeybindEventDescription(keyBind.event)}</span>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-right">
                  <Button variant="outline" size="sm" onclick={() => { neuzosConfig.keyBinds.splice(neuzosConfig.keyBinds.indexOf(keyBind), 1) }}>
                    <Trash2 class="size-4"/>
                  </Button>
                </Table.Cell>
              </Table.Row>
              {#if conflictLabel}
                <Table.Row>
                  <Table.Cell colspan={5} class="pt-0 text-xs text-destructive">
                    Conflicts with: {conflictLabel}
                  </Table.Cell>
                </Table.Row>
              {/if}
            {/if}
          {/each}
        </Table.Body>
      </Table.Root>
      {/if}
      <Popover.Root open={addKeybindPopoverOpen} onOpenChange={(open) => { addKeybindPopoverOpen = open; }}>
        <Popover.Trigger class="self-start">
          <Button variant="outline" size="sm">
            <Plus class="size-4 mr-2"/>
            Add Global Keybind
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-[320px] p-0">
          <Command.Root shouldFilter={true}>
            <Command.Input placeholder="Search Events..." class="h-10"/>
            <Command.Empty>No Event found.</Command.Empty>
            <Command.List class="max-h-[320px]">
              <Command.Group heading="Action Keybinds">
                {#each getAddableGlobalActionEventIds() as event (event)}
                  {#if canAddGlobalKeybind(event)}
                    {@const eventInfo = getSystemActionInfo(event)}
                    <Command.Item
                      value={event}
                      keywords={[eventInfo?.label.toLowerCase()]}
                      onSelect={() => addGlobalKeybind(event)}
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
