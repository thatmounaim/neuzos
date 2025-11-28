<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {onMount, setContext} from "svelte";
  import {neuzosBridge, initElectronApi} from "$lib/core";
  import type {NeuzConfig} from "$lib/types";
  import SharedEvents from "./components/SharedEvents.svelte";
  import SettingsBar from "./components/SettingsWindow/SettingsBar.svelte";
  import KeybindsSettings from "./components/SettingsWindow/Tabs/KeybindsSettings.svelte";
  import * as Tabs from "$lib/components/ui/tabs";

  import CliSettings from "./components/SettingsWindow/Tabs/CliSettings.svelte";
  import SessionSettings from "./components/SettingsWindow/Tabs/SessionSettings.svelte";
  import LayoutSettings from "./components/SettingsWindow/Tabs/LayoutSettings.svelte";
  import {Button} from "$lib/components/ui/button";


  setContext("electronApi", window.electron.ipcRenderer);
  setContext("neuzosBridge", neuzosBridge);

  initElectronApi(window.electron.ipcRenderer);

  let neuzosConfig: NeuzConfig = $state({
    sessions: [],
    layouts: [],
    chromium: {
      commandLineSwitches: []
    },
    defaultLayouts: []
  });

  const electronApi = window.electron.ipcRenderer;

  setContext("neuzosConfig", neuzosConfig);


  onMount(async () => {
    const conf = await electronApi.invoke("config.load", true);
    neuzosConfig.sessions = conf.sessions;
    neuzosConfig.layouts = conf.layouts;
    neuzosConfig.chromium = conf.chromium;
    neuzosConfig.defaultLayouts = conf.defaultLayouts;
    neuzosConfig.keyBinds = conf.keyBinds;
  });

  const sanitizeConfig = async () => {
    // filter empty keybinds
    neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
      return bind.key !== "";
    })

    // filter empty event
    neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
      return bind.event !== "";
    })
  }

  const saveSettings = async () => {
    await sanitizeConfig();
    await electronApi.invoke("config.save", JSON.stringify(neuzosConfig));
  };


</script>
<ModeWatcher/>
<SharedEvents/>
<div class="w-full h-full flex flex-col border-2 ">
  <SettingsBar/>
  <div class="flex w-full flex-col gap-6 p-4 flex-1 overflow-hidden">
    <Tabs.Root value="sessions" class="h-full w-full">
      <Tabs.List class="relative w-full">
        <div class="flex items-center justify-start gap-2">
          <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
          <Tabs.Trigger value="layouts">Layouts</Tabs.Trigger>
          <Tabs.Trigger value="keybinds">Keybinds</Tabs.Trigger>
          <Tabs.Trigger value="cli">Command Line Switches</Tabs.Trigger>

        </div>
        <div class="flex-1"></div>
        <div class="px-0.5 py-0.5">
          <Button size="xs" class="text-xs px-4 py-1.5 h-auto " onclick={saveSettings}>
            Save Settings
          </Button>
        </div>

      </Tabs.List>
      <Tabs.Content value="sessions" class="h-full overflow-y-auto">
        <SessionSettings/>
      </Tabs.Content>
      <Tabs.Content value="layouts" class="h-full overflow-y-auto">
        <LayoutSettings/>
      </Tabs.Content>
      <Tabs.Content value="keybinds" class="h-full overflow-y-auto">
        <KeybindsSettings/>
      </Tabs.Content>
      <Tabs.Content value="cli" class="h-full overflow-y-auto">
        <CliSettings/>
      </Tabs.Content>
    </Tabs.Root>
  </div>

</div>
