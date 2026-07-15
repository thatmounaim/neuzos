<script lang="ts">
  import {ModeWatcher} from "mode-watcher";
  import {onMount, setContext, untrack} from "svelte";
  import {neuzosBridge, initElectronApi} from "$lib/core";
  import type {NeuzConfig, NeuzConfigPatch} from "$lib/types";
  import SharedEvents from "./components/Shared/SharedEvents.svelte";
  import SettingsBar from "./components/SettingsWindow/SettingsBar.svelte";
  import KeybindsSettings from "./components/SettingsWindow/Tabs/KeybindsSettings.svelte";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Dialog from "$lib/components/ui/dialog";

  import LaunchSettings from "./components/SettingsWindow/Tabs/LaunchSettings.svelte";
  import SessionSettings from "./components/SettingsWindow/Tabs/SessionSettings.svelte";
  import BackupSettings from "./components/SettingsWindow/Tabs/BackupSettings.svelte";
  import LayoutSettings from "./components/SettingsWindow/Tabs/LayoutSettings.svelte";
  import SessionActionsSettings from "./components/SettingsWindow/Tabs/SessionActionsSettings.svelte";
  import GeneralSettings from "./components/SettingsWindow/Tabs/GeneralSettings.svelte";
  import {Button} from "$lib/components/ui/button";
  import {setElectronContext} from "$lib/contexts/electronContext";
  import {setNeuzosBridgeContext} from "$lib/contexts/neuzosBridgeContext";
  import {toast} from "svelte-sonner";
  import {Toaster} from "$lib/components/ui/sonner";

  let isLoading = $state(true);
  let activeTab = $state('general');

  setElectronContext(window.electron.ipcRenderer);
  setNeuzosBridgeContext(neuzosBridge);

  initElectronApi(window.electron.ipcRenderer);

  let neuzosConfig: NeuzConfig = $state({
    defaultLaunchMode: 'normal',
    sessions: [],
    sessionGroups: [],
    layouts: [],
    chromium: {
      commandLineSwitches: []
    },
    defaultLayouts: [],
    keyBindProfiles: [],
    activeKeyBindProfileId: null,
    keyBinds: [],
    sessionActions: [],
    titleBarButtons: {
      darkModeToggle: false,
      fullscreenToggle: true,
      keybindToggle: true
    },
    autoSaveSettings: false,
    fullscreen: {
      hideTitleBarInMainWindow: true,
      hideTitleBarInSessionLayouts: true
    }
  });

  const electronApi = window.electron.ipcRenderer;

  setContext("neuzosConfig", neuzosConfig);
  setContext("loadConfig", loadConfig);

  const restoreSavedZoomPreview = (snapshot: string = lastConfigSnapshot) => {
    if (!snapshot) return

    try {
      const savedConfig = JSON.parse(snapshot) as NeuzConfig
      const sessionIds = new Set([
        ...(neuzosConfig.sessions ?? []).map((session) => session.id),
        ...(savedConfig.sessions ?? []).map((session) => session.id)
      ])

      sessionIds.forEach((sessionId) => {
        const zoom = savedConfig.sessions?.find((session) => session.id === sessionId)?.zoom ?? 1.0
        void neuzosBridge.sessions.previewZoom(sessionId, zoom)
      })
    } catch (error) {
      console.error('Failed to restore saved zoom preview:', error)
    }
  }

  async function loadConfig() {
    isLoading = true;
    const conf = await electronApi.invoke("config.load", true);
    neuzosConfig.defaultLaunchMode = conf.defaultLaunchMode;
    neuzosConfig.sessions = conf.sessions;
    neuzosConfig.layouts = conf.layouts;
    neuzosConfig.chromium = conf.chromium;
    neuzosConfig.defaultLayouts = conf.defaultLayouts;
    neuzosConfig.keyBinds = conf.keyBinds;
    neuzosConfig.keyBindProfiles = conf.keyBindProfiles || [];
    neuzosConfig.activeKeyBindProfileId = conf.activeKeyBindProfileId ?? null;
    neuzosConfig.sessionActions = conf.sessionActions || [];
    neuzosConfig.sessionGroups = conf.sessionGroups ?? [];
    neuzosConfig.syncReceiverSessionId = conf.syncReceiverSessionId ?? null;
    neuzosConfig.userAgent = conf.userAgent;
    neuzosConfig.titleBarButtons = conf.titleBarButtons;
    neuzosConfig.window = conf.window;
    neuzosConfig.autoSaveSettings = conf.autoSaveSettings ?? false;
    neuzosConfig.fullscreen = conf.fullscreen ?? {
      hideTitleBarInMainWindow: true,
      hideTitleBarInSessionLayouts: true
    };

    // Initialize snapshot after config is loaded
    lastConfigSnapshot = JSON.stringify(neuzosConfig);
    restoreSavedZoomPreview();

    // Wait a bit to ensure contexts are initialized
    setTimeout(() => {
      isLoading = false;
    }, 100);
  }

  const applyConfigPatch = (patch: NeuzConfigPatch) => {
    if (patch.sessions !== undefined) {
      neuzosConfig.sessions = patch.sessions;
    }
    if (patch.layouts !== undefined) {
      neuzosConfig.layouts = patch.layouts;
    }
    if (patch.defaultLayouts !== undefined) {
      neuzosConfig.defaultLayouts = patch.defaultLayouts;
    }

    if (lastConfigSnapshot) {
      try {
        const savedConfig = JSON.parse(lastConfigSnapshot) as NeuzConfig;
        if (patch.sessions !== undefined) savedConfig.sessions = patch.sessions;
        if (patch.layouts !== undefined) savedConfig.layouts = patch.layouts;
        if (patch.defaultLayouts !== undefined) savedConfig.defaultLayouts = patch.defaultLayouts;
        lastConfigSnapshot = JSON.stringify(savedConfig);
      } catch (error) {
        console.error('Failed to apply config patch to settings snapshot:', error);
      }
    }
  }

  onMount(() => {
    void loadConfig()
    const setTab = (_: unknown, tab?: string) => {
      if (tab) {
        activeTab = tab;
      }
    };
    const handleConfigPatch = (_: unknown, patch: NeuzConfigPatch) => {
      applyConfigPatch(patch);
    };

    electronApi.on("settings_window.set_tab", setTab);
    electronApi.on("event.config_patch", handleConfigPatch);

    return () => {
      electronApi.removeListener("settings_window.set_tab", setTab);
      electronApi.removeListener("event.config_patch", handleConfigPatch);
    };
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

    // Ensure keyBindProfiles exists
    if (!neuzosConfig.keyBindProfiles) {
      neuzosConfig.keyBindProfiles = [];
    }

    // If no profiles exist, create a default one
    if (neuzosConfig.keyBindProfiles.length === 0) {
      neuzosConfig.keyBindProfiles.push({ id: "default", name: "Default", keybinds: [] });
    }

    // Ensure activeKeyBindProfileId points to a valid profile
    const profileIds = neuzosConfig.keyBindProfiles.map(p => p.id);
    if (!neuzosConfig.activeKeyBindProfileId || !profileIds.includes(neuzosConfig.activeKeyBindProfileId)) {
      neuzosConfig.activeKeyBindProfileId = neuzosConfig.keyBindProfiles[0].id;
    }

    // Build the set of global keybind keys for conflict checking
    const globalKeys = new Set(neuzosConfig.keyBinds.map(b => b.key.toLowerCase()));

    neuzosConfig.keyBindProfiles = neuzosConfig.keyBindProfiles.map(profile => {
      let keybinds = profile.keybinds;

      // Trim, lowercase, strip trailing +
      keybinds = keybinds.map(b => ({ ...b, key: b.key.trim().toLowerCase() }));

      // Filter empty key / empty event / modifier-only / trailing +
      keybinds = keybinds.filter(b =>
        b.key !== "" &&
        b.event !== "" &&
        !b.key.endsWith("+") &&
        !allowedKeybindModifiers.includes(b.key)
      );

      // Remove duplicates within the profile (same key+event)
      keybinds = [...new Map(keybinds.map(b => [b.key + b.event, b])).values()];

      // Remove keybinds whose key is already taken by a global keybind
      keybinds = keybinds.filter(b => !globalKeys.has(b.key));

      return { ...profile, keybinds };
    });

    if (typeof neuzosConfig.userAgent === 'string') {
      try {
        const defaultUserAgent = await electronApi.invoke("app.get_default_user_agent");
        if (neuzosConfig.userAgent.trim() === defaultUserAgent.trim()) {
          delete neuzosConfig.userAgent;
        }
      } catch (error) {
        console.error("Failed to normalize user agent:", error);
      }
    }

  }

  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let isSaving = $state(false);
  let lastConfigSnapshot = $state("");
  let unsavedCloseDialogOpen = $state(false);

  const hasUnsavedChanges = () => {
    return lastConfigSnapshot !== "" && JSON.stringify(neuzosConfig) !== lastConfigSnapshot;
  };

  const normalizeSingleSessionLayouts = () => {
    neuzosConfig.layouts = (neuzosConfig.layouts ?? []).map((layout) => {
      const sessionIds = (layout.rows ?? []).flatMap((row) => row.sessionIds ?? []);
      if (sessionIds.length > 1) {
        return layout;
      }

      const [sessionId] = sessionIds;
      const normalizedLayout = {
        ...layout,
        rows: [{sessionIds: sessionId ? [sessionId] : []}]
      };

      delete normalizedLayout.autoFocus;
      delete normalizedLayout.locked;
      delete normalizedLayout.columnFirst;

      return normalizedLayout;
    });
  };

  const cleanDefaultConfigValues = () => {
    neuzosConfig.sessions = (neuzosConfig.sessions ?? []).map((session) => {
      const cleanedSession = {...session};
      if (cleanedSession.floatable === false) {
        delete cleanedSession.floatable;
      }
      if (cleanedSession.autoDeleteCache === false) {
        delete cleanedSession.autoDeleteCache;
      }
      return cleanedSession;
    });
  };

  const saveSettings = async (showToast: boolean = true) => {
    if (isSaving) return;

    try {
      isSaving = true;
      await sanitizeConfig();
      normalizeSingleSessionLayouts();
      cleanDefaultConfigValues();
      await electronApi.invoke("config.save", JSON.stringify(neuzosConfig));
      window.dispatchEvent(new CustomEvent("neuzos:settings-saved"));

      // Update snapshot after successful save
      lastConfigSnapshot = JSON.stringify(neuzosConfig);

      if (showToast) {
        toast.success("Settings Saved Successfully!", {position: "top-right", duration: 1000});
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to Save Settings. Please Try Again.", {position: "top-right"});
    } finally {
      isSaving = false;
    }
  };

  const autoSave = () => {
    if (!neuzosConfig.autoSaveSettings || activeTab === 'keybinds' || isLoading || isSaving) return;

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Debounce auto-save by 500ms
    autoSaveTimeout = setTimeout(() => {
      if (activeTab !== 'keybinds') {
        saveSettings(false); // Don't show toast for auto-save
      }
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

  const requestCloseSettings = () => {
    if (hasUnsavedChanges()) {
      unsavedCloseDialogOpen = true;
      return;
    }

    neuzosBridge.settingsWindow.close();
  };

  const closeWithoutSaving = () => {
    restoreSavedZoomPreview();
    unsavedCloseDialogOpen = false;
    neuzosBridge.settingsWindow.close();
  };

  const saveAndClose = async () => {
    await saveSettings();
    unsavedCloseDialogOpen = false;
    neuzosBridge.settingsWindow.close();
  };


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
    <SettingsBar onRequestClose={requestCloseSettings}/>
    <div class="flex w-full flex-col gap-6 p-4 flex-1 overflow-hidden">
      <Tabs.Root bind:value={activeTab} class="h-full w-full">
        <Tabs.List class="relative w-full">
          <div class="flex items-center justify-start gap-2">
            <Tabs.Trigger value="general">General</Tabs.Trigger>
            <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
            <Tabs.Trigger value="layouts">Layouts</Tabs.Trigger>
            <Tabs.Trigger value="keybinds">Keybinds</Tabs.Trigger>
            <Tabs.Trigger value="session-actions">Session Actions</Tabs.Trigger>
            <Tabs.Trigger value="launch">Launch Settings</Tabs.Trigger>
            <Tabs.Trigger value="backup">Backup</Tabs.Trigger>

          </div>
          <div class="flex-1"></div>
          <div class="flex items-center gap-2 px-0.5 py-0.5">
            {#if !neuzosConfig.autoSaveSettings || activeTab === 'keybinds'}

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
        <Tabs.Content value="backup" class="h-full overflow-y-auto">
          <BackupSettings/>
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

  <Dialog.Root bind:open={unsavedCloseDialogOpen}>
    <Dialog.Content class="sm:max-w-md">
      <Dialog.Header>
        <Dialog.Title>Unsaved Changes</Dialog.Title>
        <Dialog.Description>
          You have unsaved Settings Changes. Save them before closing?
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="gap-2">
        <Button onclick={saveAndClose} disabled={isSaving}>
          Save and Close
        </Button>
        <Button variant="outline" onclick={closeWithoutSaving}>
          Close without Saving
        </Button>
        <Button variant="ghost" onclick={() => unsavedCloseDialogOpen = false}>
          Cancel
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if}
