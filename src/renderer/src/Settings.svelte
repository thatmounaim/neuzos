<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import { onMount, setContext } from "svelte";
  import { neuzosBridge, initElectronApi } from "$lib/core";
  import type { NeuzConfig, NeuzLayout, NeuzSession } from "$lib/types";
  import SharedEvents from "./components/SharedEvents.svelte";
  import SettingsBar from "./components/SettingsWindow/SettingsBar.svelte";

  import * as Tabs from "$lib/components/ui/tabs";

  import GeneralSettings from "./components/SettingsWindow/Tabs/GeneralSettings.svelte";
  import SessionSettings from "./components/SettingsWindow/Tabs/SessionSettings.svelte";
  import LayoutSettings from "./components/SettingsWindow/Tabs/LayoutSettings.svelte";
  import { Button } from "$lib/components/ui/button";


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
  });

  const saveSettings = async () => {
    await electronApi.invoke("config.save", JSON.stringify(neuzosConfig));
  };


</script>
<ModeWatcher />
<SharedEvents />
<div class="w-full h-full flex flex-col border-2 ">
  <SettingsBar />
  <div class="flex w-full flex-col gap-6 p-4 flex-1 overflow-hidden">
    <Tabs.Root value="sessions" class="h-full w-full">
      <Tabs.List class="relative w-full">
        <div class="flex items-center justify-start gap-2">
          <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
          <Tabs.Trigger value="layouts">Layouts</Tabs.Trigger>
          <Tabs.Trigger value="general">General</Tabs.Trigger>

        </div>
        <div class="flex-1"></div>
        <div class="px-0.5 py-0.5">
          <Button size="xs" class="text-xs px-4 py-1.5 h-auto " onclick={saveSettings}>
            Save Settings
          </Button>
        </div>

      </Tabs.List>
      <Tabs.Content value="general" class="h-full overflow-y-auto">
        <GeneralSettings />
      </Tabs.Content>
      <Tabs.Content value="sessions" class="h-full overflow-y-auto">
        <SessionSettings />
      </Tabs.Content>
      <Tabs.Content value="layouts" class="h-full overflow-y-auto">
        <LayoutSettings />
      </Tabs.Content>
    </Tabs.Root>
  </div>

</div>
