<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {onMount, setContext, untrack} from "svelte";
  import {neuzosBridge, initElectronApi} from "$lib/core";
  import type {NeuzConfig} from "$lib/types";
  import SharedEvents from "./components/Shared/SharedEvents.svelte";
  import SettingsBar from "./components/SettingsWindow/SettingsBar.svelte";
  import KeybindsSettings from "./components/SettingsWindow/Tabs/KeybindsSettings.svelte";
  import * as Tabs from "$lib/components/ui/tabs";

  import LaunchSettings from "./components/SettingsWindow/Tabs/LaunchSettings.svelte";
  import SessionSettings from "./components/SettingsWindow/Tabs/SessionSettings.svelte";
  import LayoutSettings from "./components/SettingsWindow/Tabs/LayoutSettings.svelte";
  import SessionActionsSettings from "./components/SettingsWindow/Tabs/SessionActionsSettings.svelte";
  import GeneralSettings from "./components/SettingsWindow/Tabs/GeneralSettings.svelte";
  import {Button} from "$lib/components/ui/button";
  import {setElectronContext} from "$lib/contexts/electronContext";
  import {setNeuzosBridgeContext} from "$lib/contexts/neuzosBridgeContext";
  import {toast} from "svelte-sonner";
  import {Toaster} from "$lib/components/ui/sonner";

  let isLoading = $state(true);

  setElectronContext(window.electron.ipcRenderer);
  setNeuzosBridgeContext(neuzosBridge);

  initElectronApi(window.electron.ipcRenderer);

  let neuzosConfig: NeuzConfig = $state({
    defaultLaunchMode: 'normal',
    sessions: [],
    layouts: [],
    chromium: {
      commandLineSwitches: []
    },
    defaultLayouts: [],
    keyBinds: [],
    sessionActions: [],
    titleBarButtons: {
      darkModeToggle: true,
      fullscreenToggle: true,
      keybindToggle: true
    },
    autoSaveSettings: false
  });

  const electronApi = window.electron.ipcRenderer;

  setContext("neuzosConfig", neuzosConfig);

  async function loadConfig() {
    isLoading = true;
    const conf = await electronApi.invoke("config.load", true);
    neuzosConfig.defaultLaunchMode = conf.defaultLaunchMode;
    neuzosConfig.sessions = conf.sessions;
    neuzosConfig.layouts = conf.layouts;
    neuzosConfig.chromium = conf.chromium;
    neuzosConfig.defaultLayouts = conf.defaultLayouts;
    neuzosConfig.keyBinds = conf.keyBinds;
    neuzosConfig.sessionActions = conf.sessionActions || [];
    neuzosConfig.userAgent = conf.userAgent;
    neuzosConfig.titleBarButtons = conf.titleBarButtons;
    neuzosConfig.window = conf.window;
    neuzosConfig.autoSaveSettings = conf.autoSaveSettings ?? false;

    // Initialize snapshot after config is loaded
    lastConfigSnapshot = JSON.stringify(neuzosConfig);

    // Wait a bit to ensure contexts are initialized
    setTimeout(() => {
      isLoading = false;
    }, 100);
  }

  onMount(async () => {
    loadConfig()
  });

  const allowedKeybindModifiers = [
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

  const sanitizeConfig = async () => {
    // trim all spaces from keybinds
    neuzosConfig.keyBinds = neuzosConfig.keyBinds.map((bind) => {
      return {
        ...bind,
        key: bind.key.trim()
      }
    })
    // filter empty keybinds
    neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
      return bind.key !== "";
    })

    // filter empty event
    neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
      return bind.event !== "";
    })
    // remove keys that are modifiers only example : key = Shift


    // if it ends with a + remove it

    neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
      return bind.key.endsWith("+") ? false : true;
    })

    // remove duplicate keybinds
    neuzosConfig.keyBinds = [...new Set(neuzosConfig.keyBinds.map((bind) => bind.key + bind.event))].map((key) => {
      return neuzosConfig.keyBinds.find((bind) => bind.key + bind.event === key)!;
    })

    //lowercase all
    neuzosConfig.keyBinds = neuzosConfig.keyBinds.map((bind) => {
      return {
        ...bind,
        key: bind.key.toLowerCase()
      }
    })

    neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
      return !allowedKeybindModifiers.includes(bind.key);
    })


  }

  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let isSaving = $state(false);
  let lastConfigSnapshot = $state("");

  const saveSettings = async (showToast: boolean = true) => {
    if (isSaving) return;

    try {
      isSaving = true;
      await sanitizeConfig();
      await electronApi.invoke("config.save", JSON.stringify(neuzosConfig));

      // Update snapshot after successful save
      lastConfigSnapshot = JSON.stringify(neuzosConfig);

      if (showToast) {
        toast.success("Settings saved successfully!", {position: "top-right", duration: 1000});
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings. Please try again.", {position: "top-right"});
    } finally {
      isSaving = false;
    }
  };

  const autoSave = () => {
    if (!neuzosConfig.autoSaveSettings || isLoading || isSaving) return;

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Debounce auto-save by 500ms
    autoSaveTimeout = setTimeout(() => {
      saveSettings(false); // Don't show toast for auto-save
    }, 500);
  };

  // Watch for config changes and trigger auto-save
  $effect(() => {
    // Create a deep snapshot of the config to detect any changes
    const currentSnapshot = JSON.stringify(neuzosConfig);

    // Only trigger auto-save if config actually changed and we're not loading/saving
    if (currentSnapshot !== lastConfigSnapshot && !isLoading && !isSaving && lastConfigSnapshot !== "") {
      untrack(() => {
        autoSave();
      });
    }
  })


</script>
<ModeWatcher/>
<Toaster/>
{#if isLoading}
  <div class="w-full h-full flex items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-4">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p class="text-muted-foreground">Loading Settings...</p>
    </div>
  </div>
{:else}
  <SharedEvents/>
  <div class="w-full h-full flex flex-col border-2 ">
    <SettingsBar/>
    <div class="flex w-full flex-col gap-6 p-4 flex-1 overflow-hidden">
      <Tabs.Root value="general" class="h-full w-full">
        <Tabs.List class="relative w-full">
          <div class="flex items-center justify-start gap-2">
            <Tabs.Trigger value="general">General</Tabs.Trigger>
            <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
            <Tabs.Trigger value="layouts">Layouts</Tabs.Trigger>
            <Tabs.Trigger value="keybinds">Keybinds</Tabs.Trigger>
            <Tabs.Trigger value="session-actions">Session Actions</Tabs.Trigger>
            <Tabs.Trigger value="launch">Launch Settings</Tabs.Trigger>

          </div>
          <div class="flex-1"></div>
          <div class="flex items-center gap-2 px-0.5 py-0.5">
            {#if !neuzosConfig.autoSaveSettings}

            <Button
              size="xs"
              variant="outline"
              class="text-xs px-4 py-1.5 h-auto"
              onclick={() => loadConfig()}
              disabled={isLoading || isSaving}
            >
              Reload Settings
            </Button>
              <Button
                size="xs"
                class="text-xs px-4 py-1.5 h-auto"
                onclick={() => saveSettings()}
                disabled={isSaving}
              >
                Save Settings
              </Button>
            {/if}
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
        <Tabs.Content value="session-actions" class="h-full overflow-y-auto">
          <SessionActionsSettings/>
        </Tabs.Content>
        <Tabs.Content value="general" class="h-full overflow-y-auto">
          <GeneralSettings/>
        </Tabs.Content>
        <Tabs.Content value="launch" class="h-full overflow-y-auto">
          <LaunchSettings/>
        </Tabs.Content>
      </Tabs.Root>
    </div>

  </div>
{/if}
