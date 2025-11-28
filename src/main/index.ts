import {app, shell, BrowserWindow, Menu,dialog, session, ipcMain, globalShortcut, screen} from "electron";
import {join} from "path";
import {electronApp, optimizer, is} from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import * as fs from "node:fs";
import {rimraf} from "rimraf";

// Performance Presets System
app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");

const allowedCommandLineSwitches = [
  // Thanks to Kumara finding this one flag to be useful
  {flag: "site-per-process", description: "Enable site isolation for each site"},
  // 🚀 Rendering / GPU Performance
  {flag: "enable-gpu-rasterization", description: "Force GPU rasterization"},
  {flag: "enable-zero-copy", description: "Use zero-copy textures for better WebGL performance"},
  {flag: "enable-gpu-compositing", description: "Force GPU compositing"},
  {flag: "enable-native-gpu-memory-buffers", description: "Use native GPU memory buffers"},
  {flag: "enable-oop-rasterization", description: "Out-of-process rasterization"},
  {flag: "enable-accelerated-2d-canvas", description: "Speed up canvas rendering"},
  {flag: "enable-accelerated-video-decode", description: "Use GPU for video decoding"},
  {flag: "disable-software-rasterizer", description: "Avoid CPU fallback for rendering"},
  {flag: "enforce-gl-minimums", description: "Enforce OpenGL minimum requirements"},
  {flag: "enable-webgl-draft-extensions", description: "Enable experimental WebGL extensions"},
  {flag: "enable-gpu-memory-buffer-compositor-resources", description: "GPU memory buffer optimizations"},
  {flag: "enable-gpu-memory-buffer-video-frames", description: "GPU memory buffer for video frames"},
  {flag: "video-capture-use-gpu-memory-buffer", description: "Use GPU memory buffer for video capture"},

  // 🧠 GPU Stability & Speed
  {flag: "ignore-gpu-blocklist", description: "Forces all GPU features on all drivers"},
  {flag: "enable-gpu-driver-workarounds", description: "Keep driver optimizations active"},
  {flag: "enable-unsafe-webgpu", description: "Enable unsafe WebGPU features"},

  // ⚡ FPS & Frame Timing
  {flag: "disable-frame-rate-limit", description: "Uncap FPS"},
  {flag: "disable-gpu-vsync", description: "Disable vsync for uncapped rendering"},
  {flag: "enable-fast-unload", description: "Speeds up tab/window destruction"},
  {flag: "max-active-webgl-contexts=16", description: "Allow more active WebGL contexts"},

  // 💤 Prevent Throttling / Background Slowdown
  {flag: "disable-backgrounding-occluded-windows", description: "Keep background windows active"},
  {flag: "disable-background-timer-throttling", description: "Prevent timers from slowing in background"},
  {flag: "disable-renderer-backgrounding", description: "Prevent renderer throttling"},

  // 🔧 Misc Performance Tweaks
  {flag: "disable-low-res-tiling", description: "Avoid low-resolution tiles"},
  {flag: "enable-gpu-shader-disk-cache", description: "Cache shaders to disk"},
  {flag: "enable-threaded-compositing", description: "Use multi-threaded compositor"},
  {flag: "enable-low-end-device-mode", description: "Enable low-end device mode optimizations"},
  {flag: "no-proxy-server", description: "Reduce network latency from proxy lookups"},
];

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

let exitCount: number = 0;

let neuzosConfig: any = null;
const defaultNeuzosConfig = {
  chromium: {
    commandLineSwitches: [
      "disable-frame-rate-limit",
      "disable-gpu-vsync"
    ]
  },
  sessions: [],
  layouts: [],
  defaultLayouts: [],
  keyBinds: [
    {
      "key": "CommandOrControl+Tab",
      "event": "layout_swap",
    },
    {
      "key": "F11",
      "event": "fullscreen_toggle"
    }
  ],
};

const allowedEventKeybinds = {
  "layout_swap": {
    label: "Swap to Previous Layout",
    unique: true,
  },
  "fullscreen_toggle": {
    label: "Toggle Fullscreen",
    unique: true,
  },
  "layout_switch": {
    label: "Switch to Layout",
    args: [
      "layout_id"
    ],
  }
}
const configDirectoryPath = join(app.getPath("userData"), "/neuzos_config/");

if (!app.getPath("userData").includes("neuzos_config")) {
  fs.mkdirSync(configDirectoryPath, {recursive: true});
}


function saveConfig(conf: any): void {
  console.log("Saving config...");
  const configPath = join(configDirectoryPath, "/config.json");
  console.log("Saving config to:", configPath);
  fs.writeFileSync(configPath, JSON.stringify(conf, null, 2));
}

function loadConfig(reload: boolean = false): Promise<any> {
  return new Promise((resolve, reject) => {
    if (neuzosConfig && !reload) {
      resolve(neuzosConfig);
    } else {
      console.log("Loading config...");
      const configPath = join(configDirectoryPath, "/config.json");
      console.log("Loading config from:", configPath);
      // Check if file exists first
      if (!fs.existsSync(configPath)) {
        console.log("File does not exist, creating default config.json...");
        // Create default config.json
        saveConfig(defaultNeuzosConfig);
        neuzosConfig = JSON.parse(JSON.stringify(defaultNeuzosConfig));
        resolve(neuzosConfig);
      } else {
        // File exists, read it
        console.log("File exists, reading...");
        try {
          const conf = fs.readFileSync(configPath, "utf8");
          neuzosConfig = JSON.parse(conf);
          console.log("Merging possible missing fields from default config");
          neuzosConfig = {...defaultNeuzosConfig, ...neuzosConfig};
          checkKeybinds()
          saveConfig(neuzosConfig);
          resolve(neuzosConfig);
        } catch (err) {
          reject(err);
        }
      }
    }
  });
}


function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const toPixels = (units: number) => {
    return Math.floor(units / primaryDisplay.scaleFactor);
  };

  const {width, height} = primaryDisplay.workAreaSize;
  const aspectRatio = width / height;

  const windowWidth = aspectRatio >= 2 ? width / 2 : width - width / 12;
  const windowHeight = height - height / 12;

  // Create smaller window for settings
  settingsWindow = new BrowserWindow({
    width: toPixels(windowWidth),
    height: toPixels(windowHeight),
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      zoomFactor: 1.0 / primaryDisplay.scaleFactor,
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });

  // Fix for MacOS Command Shortcuts
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
  } else {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{role: "appMenu"}, {role: "editMenu"}]));
    settingsWindow.setMenuBarVisibility(false);
  }

  settingsWindow.on("ready-to-show", () => {
    settingsWindow?.show();
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return {action: "deny"};
  });

  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    settingsWindow.webContents.loadURL(process.env["ELECTRON_RENDERER_URL"] + "/settings.html");
  } else {
    settingsWindow.webContents.loadFile(join(__dirname, "../renderer/settings.html"));
  }
}

function createMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }
  const primaryDisplay = screen.getPrimaryDisplay();
  const toPixels = (units: number) => {
    return Math.floor(units / primaryDisplay.scaleFactor);
  };

  const {width, height} = primaryDisplay.workAreaSize;
  const aspectRatio = width / height;

  const windowWidth = aspectRatio >= 2 ? width / 2 : width - width / 12;
  const windowHeight = height - height / 12;
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: toPixels(windowWidth),
    height: toPixels(windowHeight),
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      zoomFactor: 1.0 / primaryDisplay.scaleFactor,
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true
    }
  });

  mainWindow.on("close", (event) => {
    if (exitCount < 2) {
      event.preventDefault();
      console.log("Prevented manual close");
      exitCount++;
      setTimeout(() => {
        exitCount--;
        exitCount = exitCount < 0 ? 0 : exitCount;
      }, 2000);
    } else {
      exitCount = 0;
    }
  });

  // Fix for MacOS Command Shortcuts
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
  } else {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{role: "appMenu"}, {role: "editMenu"}]));
    mainWindow.setMenuBarVisibility(false);
  }

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("focus", () => {
    registerKeybinds()
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return {action: "deny"};
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.webContents.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.webContents.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function checkKeybinds() {
  neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
    return Object.keys(allowedEventKeybinds).includes(bind.event);
  })

  // filter empty keybinds
  neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
    return bind.key !== "";
  })

  // filter empty event
  neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
    return bind.event !== "";
  })
}

function registerKeybinds() {
  globalShortcut.unregisterAll()
  neuzosConfig.keyBinds.forEach((bind) => {
    try {
      globalShortcut.register(bind.key, () => {
        switch (bind.event) {
          case "fullscreen_toggle":
            mainWindow?.setFullScreen(!mainWindow?.isFullScreen())
            break
          case "layout_swap":
            mainWindow?.webContents.send("event.layout_swap");
            break
          case "layout_switch":
            if (bind.args.length > 0)
              mainWindow?.webContents.send("event.layout_switch", ...(bind.args ?? []));
        }
      })
    } catch (e) {
      dialog.showErrorBox("Failed to register keybind", "Please fix your config manually found at \n" + join(configDirectoryPath, "/config.json"));
      globalShortcut.unregisterAll();
      exitCount = 3
      app.quit();
      return
    }
  })
}

(async () => {
  try {
    await loadConfig(true);
    neuzosConfig.chromium.commandLineSwitches = neuzosConfig.chromium.commandLineSwitches.filter((switchName) => {
      return allowedCommandLineSwitches.some(item => item.flag === switchName);
    });

    neuzosConfig.chromium.commandLineSwitches.forEach((switchName) => {
      const spl = switchName.split("=");
      const swtch = spl[0];
      const value = spl[1] ?? true;
      console.log("Appending switch:", swtch, value);
      app.commandLine.appendSwitch(swtch, value);
    });
  } catch (err) {
    console.error("Failed to load config:", err);
  }
})().then(() => {
  app.whenReady().then(async () => {
    // Set app user model id for windows
    electronApp.setAppUserModelId("com.neuzos");
    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    ipcMain.on("main_window.fullscreen_toggle", () => {
      mainWindow?.setFullScreen(!mainWindow?.isFullScreen())
    })

    ipcMain.on("main_window.minimize", () => {
      mainWindow?.minimize();
    });

    ipcMain.on("main_window.maximize", () => {
      if (mainWindow?.isMaximized()) {
        mainWindow?.unmaximize();
      } else {
        mainWindow?.maximize();
      }
    });

    ipcMain.on("main_window.close", () => {
      globalShortcut.unregisterAll();
      mainWindow?.destroy();
      mainWindow = null;
    });

    ipcMain.on("main_window.reload_config", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.reload_config");
      registerKeybinds()
    });


    ipcMain.on("settings_window.open", (_) => {
      createSettingsWindow();
    });

    ipcMain.on("settings_window.close", () => {
      settingsWindow?.destroy();
      settingsWindow = null;
    });

    ipcMain.on("settings_window.minimize", () => {
      settingsWindow?.minimize();
    });

    ipcMain.on("settings_window.minimize", () => {
      if (settingsWindow?.isMaximized()) {
        settingsWindow?.unmaximize();
      } else {
        settingsWindow?.maximize();
      }
    });


    ipcMain.on("tabs.add", (event, layoutId: string) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.layout_add", layoutId);
    });

    ipcMain.on("tabs.switch", (event, layoutId: string) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.layout_switch", layoutId);
    });

    ipcMain.on("tabs.close_all", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.layout_close_all");
    });

    ipcMain.on("tabs.close", (event, layoutId: string) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.layout_close", layoutId);
    });

    ipcMain.on("session.stop", (event, sessionId: string) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.stop_session", sessionId);
    });

    ipcMain.on("session.start", (event, sessionId: string, layoutId: string) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.start_session", sessionId, layoutId);
    });

    ipcMain.on("session.restart", (event, sessionId: string, layoutId: string) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.stop_session", sessionId);
      win?.webContents.send("event.start_session", sessionId, layoutId);
    });

    ipcMain.on("session.clear_storage", async function (event, sessionId: string) {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.stop_session", sessionId);
      const sess = session.fromPartition("persist:" + sessionId);
      await sess.clearStorageData();
      // delete partition folder
      try {
        if (sessionId) {
          const partitionFolderPath = join(app.getPath("userData"), "/Partitions", sessionId);
          if (partitionFolderPath && partitionFolderPath.startsWith(app.getPath("userData"))) {
            rimraf.sync(partitionFolderPath, {
              maxRetries: 2
            });
          }
        }

      } catch (err) {
        console.log("Partition folder not found");
      }
    });

    ipcMain.on("session.clear_cache", async function (event, sessionId: string) {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.stop_session", sessionId);
      const sess = session.fromPartition("persist:" + sessionId);
      await sess.clearCache();
    });

    ipcMain.on("preferences.set_theme_mode", async function (_, themeMode: string) {
      mainWindow?.webContents.send("event.theme_mode_changed", themeMode);
    });

    ipcMain.handle("config.load", async (_, force: boolean = false) => {
      const conf = await loadConfig(force);
      return conf;
    });

    ipcMain.handle("config.save", async (_, config: any) => {
      saveConfig(JSON.parse(config));
      neuzosConfig = JSON.parse(config);
      checkKeybinds()
      mainWindow?.webContents?.send("event.config_changed", config);
    });

    ipcMain.handle("config.get_available_command_line_switches", async () => {
      return allowedCommandLineSwitches;
    });

    ipcMain.handle("config.get_available_event_keybinds", async () => {
      return allowedEventKeybinds;
    })

    createMainWindow();
    app.on("activate", function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("browser-window-blur", () => {
    if (BrowserWindow.getFocusedWindow() == mainWindow) {
      globalShortcut.unregisterAll();
    }
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
