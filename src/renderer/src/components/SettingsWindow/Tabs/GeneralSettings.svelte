<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {Switch} from "$lib/components/ui/switch";
  import {Input} from "$lib/components/ui/input";
  import {Label} from "$lib/components/ui/label";
  import {Button} from "$lib/components/ui/button";
  import {Separator} from "$lib/components/ui/separator";
  import {Fullscreen, Keyboard, Moon, SquareArrowOutUpRight} from "@lucide/svelte";

  import {getContext, onMount} from "svelte";
  import {getElectronContext} from "$lib/contexts/electronContext";
  import type {NeuzConfig} from "$lib/types";

  const electronApi = getElectronContext();
  const neuzosConfig = getContext<NeuzConfig>("neuzosConfig");

  let appDataPath = $state("");
  let currentWindowWidth = $state(0);
  let currentWindowHeight = $state(0);

  // Initialize window config if it doesn't exist
  if (!neuzosConfig.window) {
    neuzosConfig.window = {
      main: {
        width: 1200,
        height: 800,
        zoom: 1.0,
        maximized: true
      },
      settings: {
        width: 1200,
        height: 800,
        zoom: 1.0,
        maximized: false
      },
      session: {
        width: 1024,
        height: 768,
        zoom: 1.0,
        maximized: true
      }
    };
  }
  if (!neuzosConfig.window.main) {
    neuzosConfig.window.main = {
      width: 1200,
      height: 800,
      zoom: 1.0,
      maximized: true
    };
  }
  if (!neuzosConfig.window.settings) {
    neuzosConfig.window.settings = {
      width: 1200,
      height: 800,
      zoom: 1.0,
      maximized: false
    };
  }
  if (!neuzosConfig.window.session) {
    neuzosConfig.window.session = {
      width: 1024,
      height: 768,
      zoom: 1.0,
      maximized: true
    };
  }

  // Initialize titleBarButtons if it doesn't exist
  if (!neuzosConfig.titleBarButtons) {
    neuzosConfig.titleBarButtons = {
      darkModeToggle: false,
      fullscreenToggle: true,
      keybindToggle: true
    };
  }

  // Initialize fullscreen config if it doesn't exist
  if (!neuzosConfig.fullscreen) {
    neuzosConfig.fullscreen = {
      hideTitleBarInMainWindow: true,
      hideTitleBarInSessionLayouts: true
    };
  }

  onMount(async () => {
    // Get app data path
    try {
      appDataPath = await electronApi.invoke("app.get_app_data_path");
    } catch (e) {
      console.error("Failed to get app data path:", e);
      appDataPath = "";
    }

    // Get initial window dimensions
    updateWindowDimensions();
  });

  // Handle window resize with $effect for proper cleanup
  $effect(() => {
    const handleResize = updateWindowDimensions;
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  // Update current window dimensions
  function updateWindowDimensions() {
    currentWindowWidth = window.innerWidth;
    currentWindowHeight = window.innerHeight;
  }

  // Apply current dimensions to main window settings
  function applyToMainWindow() {
    handleMainWindowWidth(currentWindowWidth);
    handleMainWindowHeight(currentWindowHeight);
  }

  // Apply current dimensions to settings window settings
  function applyToSettingsWindow() {
    handleSettingsWindowWidth(currentWindowWidth);
    handleSettingsWindowHeight(currentWindowHeight);
  }

  // Apply current dimensions to session window settings
  function applyToSessionWindow() {
    handleSessionWindowWidth(currentWindowWidth);
    handleSessionWindowHeight(currentWindowHeight);
  }

  // Handle opening app data folder
  async function handleOpenAppDataFolder() {
    try {
      await electronApi.invoke("app.open_app_data_folder");
    } catch (e) {
      console.error("Failed to open app data folder:", e);
    }
  }

  // Handle title bar button toggles
  function handleDarkModeToggle(enabled: boolean) {
    if (!neuzosConfig.titleBarButtons) {
      neuzosConfig.titleBarButtons = {} as NonNullable<NeuzConfig['titleBarButtons']>;
    }
    neuzosConfig.titleBarButtons.darkModeToggle = enabled;
  }

  function handleFullscreenToggle(enabled: boolean) {
    if (!neuzosConfig.titleBarButtons) {
      neuzosConfig.titleBarButtons = {} as NonNullable<NeuzConfig['titleBarButtons']>;
    }
    neuzosConfig.titleBarButtons.fullscreenToggle = enabled;
  }

  function handleKeybindToggle(enabled: boolean) {
    if (!neuzosConfig.titleBarButtons) {
      neuzosConfig.titleBarButtons = {} as NonNullable<NeuzConfig['titleBarButtons']>;
    }
    neuzosConfig.titleBarButtons.keybindToggle = enabled;
  }

  // Handle auto-save toggle
  function handleAutoSaveToggle(enabled: boolean) {
    neuzosConfig.autoSaveSettings = enabled;
  }

  function handleStartupCacheToggle(enabled: boolean) {
    neuzosConfig.autoDeleteAllCachesOnStartup = enabled;
  }

  // Handle fullscreen settings
  function handleHideTitleBarInMainWindow(enabled: boolean) {
    if (!neuzosConfig.fullscreen) {
      neuzosConfig.fullscreen = {
        hideTitleBarInMainWindow: true,
        hideTitleBarInSessionLayouts: true
      };
    }
    neuzosConfig.fullscreen.hideTitleBarInMainWindow = enabled;
  }

  function handleHideTitleBarInSessionLayouts(enabled: boolean) {
    if (!neuzosConfig.fullscreen) {
      neuzosConfig.fullscreen = {
        hideTitleBarInMainWindow: true,
        hideTitleBarInSessionLayouts: true
      };
    }
    neuzosConfig.fullscreen.hideTitleBarInSessionLayouts = enabled;
  }

  // Handle main window settings
  function handleMainWindowWidth(value: number) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.main) neuzosConfig.window.main = {width: 1200, height: 800, zoom: 1.0, maximized: true};
    neuzosConfig.window.main.width = value;
  }

  function handleMainWindowHeight(value: number) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.main) neuzosConfig.window.main = {width: 1200, height: 800, zoom: 1.0, maximized: true};
    neuzosConfig.window.main.height = value;
  }

  function handleMainWindowZoom(value: number) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.main) neuzosConfig.window.main = {width: 1200, height: 800, zoom: 1.0, maximized: true};
    neuzosConfig.window.main.zoom = value;
  }

  function handleMainWindowMaximized(enabled: boolean) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.main) neuzosConfig.window.main = {width: 1200, height: 800, zoom: 1.0, maximized: true};
    neuzosConfig.window.main.maximized = enabled;
  }

  // Handle settings window settings
  function handleSettingsWindowWidth(value: number) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.settings) neuzosConfig.window.settings = {width: 1200, height: 800, zoom: 1.0, maximized: false};
    neuzosConfig.window.settings.width = value;
  }

  function handleSettingsWindowHeight(value: number) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.settings) neuzosConfig.window.settings = {width: 1200, height: 800, zoom: 1.0, maximized: false};
    neuzosConfig.window.settings.height = value;
  }

  function handleSettingsWindowZoom(value: number) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.settings) neuzosConfig.window.settings = {width: 1200, height: 800, zoom: 1.0, maximized: false};
    neuzosConfig.window.settings.zoom = value;
  }

  function handleSettingsWindowMaximized(enabled: boolean) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.settings) neuzosConfig.window.settings = {width: 1200, height: 800, zoom: 1.0, maximized: false};
    neuzosConfig.window.settings.maximized = enabled;
  }

  // Handle session window settings
  function handleSessionWindowWidth(value: number) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.session) neuzosConfig.window.session = {
      width: 1024,
      height: 768,
      zoom: 1.0,
      maximized: true
    };
    neuzosConfig.window.session.width = value;
  }

  function handleSessionWindowHeight(value: number) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.session) neuzosConfig.window.session = {
      width: 1024,
      height: 768,
      zoom: 1.0,
      maximized: true
    };
    neuzosConfig.window.session.height = value;
  }

  function handleSessionWindowZoom(value: number) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.session) neuzosConfig.window.session = {
      width: 1024,
      height: 768,
      zoom: 1.0,
      maximized: true
    };
    neuzosConfig.window.session.zoom = value;
  }

  function handleSessionWindowMaximized(enabled: boolean) {
    if (!neuzosConfig.window) neuzosConfig.window = {} as NonNullable<NeuzConfig['window']>;
    if (!neuzosConfig.window.session) neuzosConfig.window.session = {
      width: 1024,
      height: 768,
      zoom: 1.0,
      maximized: true
    };
    neuzosConfig.window.session.maximized = enabled;
  }
</script>

<Card.Root class="h-full overflow-y-auto">
  <Card.Header>
    <Card.Title class="text-lg font-semibold">General Settings</Card.Title>
    <Card.Description>
      Configure General Settings for Application, Windows and Webviews.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-6">

    <!-- Auto Save Settings Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between py-2">
        <div class="space-y-0.5">
          <Label for="auto-save-settings" class="text-sm font-medium">Auto Save</Label>
          <p class="text-xs text-muted-foreground">
            Automatically Save Settings when Changes are made.
          </p>
        </div>
        <Switch
          id="auto-save-settings"
          checked={neuzosConfig.autoSaveSettings ?? false}
          onCheckedChange={handleAutoSaveToggle}
        />
      </div>
    </div>

    <!-- Startup Cache Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between py-2">
        <div class="space-y-0.5">
          <Label for="startup-cache-clear" class="text-sm font-medium">Clear All Caches on Startup</Label>
          <p class="text-xs text-muted-foreground">
            All Session Caches are cleared silently during every Startup.
          </p>
        </div>
        <Switch
          id="startup-cache-clear"
          checked={neuzosConfig.autoDeleteAllCachesOnStartup ?? false}
          onCheckedChange={handleStartupCacheToggle}
        />
      </div>
    </div>

    <Separator/>

    <!-- Window Settings Section -->
    <div class="space-y-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold">Window Settings</h3>
        <p class="text-sm text-muted-foreground">
          Configure Default Window Sizes and Zoom Levels.
        </p>
      </div>

      <!-- Current Window Dimensions Display -->
      <div class="bg-muted/50 rounded-lg p-3 space-y-2">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label class="text-xs font-medium">Current Settings Window Size</Label>
            <p class="text-xs text-muted-foreground">
              {currentWindowWidth} × {currentWindowHeight} px
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              class="text-xs px-3 h-7"
              onclick={applyToMainWindow}
            >
              Apply to Main
            </Button>
            <Button
              size="sm"
              variant="outline"
              class="text-xs px-3 h-7"
              onclick={applyToSettingsWindow}
            >
              Apply to Settings
            </Button>
            <Button
              size="sm"
              variant="outline"
              class="text-xs px-3 h-7"
              onclick={applyToSessionWindow}
            >
              Apply to Session
            </Button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4 w-full">
        <!-- Main Window Column -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium">Main Window</h4>
          <div class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <Label for="main-window-width" class="text-xs">Width</Label>
                <Input
                  id="main-window-width"
                  type="number"
                  min="400"
                  max="3840"
                  value={neuzosConfig.window?.main?.width ?? 1200}
                  oninput={(e) => {
                    const target = e.target as HTMLInputElement;
                    handleMainWindowWidth(parseInt(target.value, 10));
                  }}
                  class="h-8 text-sm"
                />
              </div>
              <div class="space-y-1">
                <Label for="main-window-height" class="text-xs">Height</Label>
                <Input
                  id="main-window-height"
                  type="number"
                  min="300"
                  max="2160"
                  value={neuzosConfig.window?.main?.height ?? 800}
                  oninput={(e) => {
                    const target = e.target as HTMLInputElement;
                    handleMainWindowHeight(parseInt(target.value, 10));
                  }}
                  class="h-8 text-sm"
                />
              </div>
            </div>
            <div class="space-y-1">
              <Label for="main-window-zoom" class="text-xs">Zoom (%)</Label>
              <Input
                id="main-window-zoom"
                type="number"
                min="25"
                max="300"
                step="5"
                value={Math.round((neuzosConfig.window?.main?.zoom ?? 1.0) * 100)}
                oninput={(e) => {
                  const target = e.target as HTMLInputElement;
                  handleMainWindowZoom(parseInt(target.value, 10) / 100);
                }}
                class="h-8 text-sm"
              />
            </div>
            <div class="flex items-center justify-between pt-1">
              <Label for="main-window-maximized" class="text-xs">Start Maximized</Label>
              <Switch
                id="main-window-maximized"
                checked={neuzosConfig.window?.main?.maximized ?? false}
                onCheckedChange={handleMainWindowMaximized}
              />
            </div>
          </div>
        </div>

        <!-- Settings Window Column -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium">Settings Window</h4>
          <div class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <Label for="settings-window-width" class="text-xs">Width</Label>
                <Input
                  id="settings-window-width"
                  type="number"
                  min="400"
                  max="3840"
                  value={neuzosConfig.window?.settings?.width ?? 1200}
                  oninput={(e) => {
                    const target = e.target as HTMLInputElement;
                    handleSettingsWindowWidth(parseInt(target.value, 10));
                  }}
                  class="h-8 text-sm"
                />
              </div>
              <div class="space-y-1">
                <Label for="settings-window-height" class="text-xs">Height</Label>
                <Input
                  id="settings-window-height"
                  type="number"
                  min="300"
                  max="2160"
                  value={neuzosConfig.window?.settings?.height ?? 800}
                  oninput={(e) => {
                    const target = e.target as HTMLInputElement;
                    handleSettingsWindowHeight(parseInt(target.value, 10));
                  }}
                  class="h-8 text-sm"
                />
              </div>
            </div>
            <div class="space-y-1">
              <Label for="settings-window-zoom" class="text-xs">Zoom (%)</Label>
              <Input
                id="settings-window-zoom"
                type="number"
                min="25"
                max="300"
                step="5"
                value={Math.round((neuzosConfig.window?.settings?.zoom ?? 1.0) * 100)}
                oninput={(e) => {
                  const target = e.target as HTMLInputElement;
                  handleSettingsWindowZoom(parseInt(target.value, 10) / 100);
                }}
                class="h-8 text-sm"
              />
            </div>
            <div class="flex items-center justify-between pt-1">
              <Label for="settings-window-maximized" class="text-xs">Start Maximized</Label>
              <Switch
                id="settings-window-maximized"
                checked={neuzosConfig.window?.settings?.maximized ?? false}
                onCheckedChange={handleSettingsWindowMaximized}
              />
            </div>
          </div>
        </div>

        <!-- Session Window Column -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium">Session Window</h4>
          <div class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <Label for="session-window-width" class="text-xs">Width</Label>
                <Input
                  id="session-window-width"
                  type="number"
                  min="400"
                  max="3840"
                  value={neuzosConfig.window?.session?.width ?? 1024}
                  oninput={(e) => {
                    const target = e.target as HTMLInputElement;
                    handleSessionWindowWidth(parseInt(target.value, 10));
                  }}
                  class="h-8 text-sm"
                />
              </div>
              <div class="space-y-1">
                <Label for="session-window-height" class="text-xs">Height</Label>
                <Input
                  id="session-window-height"
                  type="number"
                  min="300"
                  max="2160"
                  value={neuzosConfig.window?.session?.height ?? 768}
                  oninput={(e) => {
                    const target = e.target as HTMLInputElement;
                    handleSessionWindowHeight(parseInt(target.value, 10));
                  }}
                  class="h-8 text-sm"
                />
              </div>
            </div>
            <div class="space-y-1">
              <Label for="session-window-zoom" class="text-xs">Zoom (%)</Label>
              <Input
                id="session-window-zoom"
                type="number"
                min="25"
                max="300"
                step="5"
                value={Math.round((neuzosConfig.window?.session?.zoom ?? 1.0) * 100)}
                oninput={(e) => {
                  const target = e.target as HTMLInputElement;
                  handleSessionWindowZoom(parseInt(target.value, 10) / 100);
                }}
                class="h-8 text-sm"
              />
            </div>
            <div class="flex items-center justify-between pt-1">
              <Label for="session-window-maximized" class="text-xs">Start Maximized</Label>
              <Switch
                id="session-window-maximized"
                checked={neuzosConfig.window?.session?.maximized ?? false}
                onCheckedChange={handleSessionWindowMaximized}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <Separator/>

    <!-- Main Bar Buttons Section -->
    <div class="space-y-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold">Main Bar Buttons</h3>
        <p class="text-sm text-muted-foreground">
          Choose which Buttons are visible in the Main Bar.
        </p>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between py-2">
          <div class="flex items-start gap-3">
            <div class="h-9 w-9 shrink-0 rounded-md border bg-muted/60 flex items-center justify-center">
              <Moon class="h-4 w-4"/>
            </div>
            <div class="space-y-0.5">
              <Label for="darkmode-toggle" class="text-sm font-medium">Light/ Dark Mode Toggle</Label>
              <p class="text-xs text-muted-foreground">
                Switch between Light/Dark Mode.
              </p>
            </div>
          </div>
          <Switch
            id="darkmode-toggle"
            checked={neuzosConfig.titleBarButtons?.darkModeToggle ?? false}
            onCheckedChange={handleDarkModeToggle}
          />
        </div>

        <div class="flex items-center justify-between py-2">
          <div class="flex items-start gap-3">
            <div class="h-9 w-9 shrink-0 rounded-md border bg-muted/60 flex items-center justify-center">
              <Fullscreen class="h-4 w-4"/>
            </div>
            <div class="space-y-0.5">
              <Label for="fullscreen-toggle" class="text-sm font-medium">Fullscreen Toggle</Label>
              <p class="text-xs text-muted-foreground">
                Switch to Fullscreen Mode
              </p>
            </div>
          </div>
          <Switch
            id="fullscreen-toggle"
            checked={neuzosConfig.titleBarButtons?.fullscreenToggle ?? true}
            onCheckedChange={handleFullscreenToggle}
          />
        </div>

        <div class="flex items-center justify-between py-2">
          <div class="flex items-start gap-3">
            <div class="h-9 w-9 shrink-0 rounded-md border bg-muted/60 flex items-center justify-center">
              <Keyboard class="h-4 w-4"/>
            </div>
            <div class="space-y-0.5">
              <Label for="keybind-toggle" class="text-sm font-medium">Keybind Toggle</Label>
              <p class="text-xs text-muted-foreground">
                Enable/ Disable Keybinds & Switch Keybind Profiles
              </p>
            </div>
          </div>
          <Switch
            id="keybind-toggle"
            checked={neuzosConfig.titleBarButtons?.keybindToggle ?? true}
            onCheckedChange={handleKeybindToggle}
          />
        </div>
      </div>
    </div>

    <Separator/>

    <!-- Fullscreen Behavior Section -->
    <div class="space-y-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold">Fullscreen Behavior</h3>
        <p class="text-sm text-muted-foreground">
          Configure Fullscreen Mode Behavior in different Window Types.
        </p>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between py-2">
          <div class="space-y-0.5">
            <Label for="hide-titlebar-main" class="text-sm font-medium">Hide Main Bar in the Main Window Fullscreen</Label>
            <p class="text-xs text-muted-foreground">
              Hides the Main Bar in Fullscreen Mode.
            </p>
          </div>
          <Switch
            id="hide-titlebar-main"
            checked={neuzosConfig.fullscreen?.hideTitleBarInMainWindow ?? true}
            onCheckedChange={handleHideTitleBarInMainWindow}
          />
        </div>

        <div class="flex items-center justify-between py-2">
          <div class="space-y-0.5">
            <Label for="hide-titlebar-session" class="text-sm font-medium">Hide Main Bar in the Session Window Fullscreen</Label>
            <p class="text-xs text-muted-foreground">
              Hides the Main Bar in Fullscreen Mode.
            </p>
          </div>
          <Switch
            id="hide-titlebar-session"
            checked={neuzosConfig.fullscreen?.hideTitleBarInSessionLayouts ?? true}
            onCheckedChange={handleHideTitleBarInSessionLayouts}
          />
        </div>
      </div>
    </div>

    <Separator/>

    <!-- App Data Folder Section -->
    <div class="space-y-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold">App Data Folder</h3>
        <p class="text-sm text-muted-foreground">
          Location where Configuration and Data Files are stored.
        </p>
      </div>

      <div class="space-y-3">
        <div class="space-y-2">
          <Label class="text-xs">Folder Path</Label>
          <div class="flex items-center gap-2">
            <code class="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all">
              {appDataPath || "Loading..."}
            </code>
            <Button
              size="sm"
              variant="outline"
              class="text-xs px-3 shrink-0 gap-2"
              onclick={handleOpenAppDataFolder}
              disabled={!appDataPath}
            >
              <SquareArrowOutUpRight class="h-4 w-4"/>
              Open Folder
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Card.Content>
</Card.Root>
