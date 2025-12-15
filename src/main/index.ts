import {app, shell, BrowserWindow, Menu, dialog, session, ipcMain, globalShortcut, screen} from "electron";
import {join} from "path";
import {electronApp, optimizer, is} from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import * as fs from "node:fs";
import {rimraf} from "rimraf";

// Performance Presets System
app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");

const allowedCommandLineSwitches = [
  // Thanks to Kumara finding this one flag to be useful
  //{flag: "site-per-process", description: "Enable site isolation for each site"},
  // 🚀 Rendering / GPU Performance
  {flag: "force_high_performance_gpu", description: "Use high performance GPU on hybrid systems"},
  //{flag: "force_low_power_gpu", description: "Use integrated GPU on hybrid systems"},
  {flag: "enable-gpu-rasterization", description: "Force GPU rasterization"},
  {flag: "enable-zero-copy", description: "Use zero-copy textures for better WebGL performance"},
 // {flag: "enable-gpu-compositing", description: "Force GPU compositing"},
  //{flag: "enable-native-gpu-memory-buffers", description: "Use native GPU memory buffers"},
  {flag: "enable-oop-rasterization", description: "Out-of-process rasterization"},
  {flag: "enable-accelerated-2d-canvas", description: "Speed up canvas rendering"},
  //{flag: "enable-accelerated-video-decode", description: "Use GPU for video decoding"},
  {flag: "disable-software-rasterizer", description: "Avoid CPU fallback for rendering"},
  //{flag: "enforce-gl-minimums", description: "Enforce OpenGL minimum requirements"},
  //{flag: "enable-webgl-draft-extensions", description: "Enable experimental WebGL extensions"},
  {flag: "enable-gpu-memory-buffer-compositor-resources", description: "GPU memory buffer optimizations"},
 // {flag: "enable-gpu-memory-buffer-video-frames", description: "GPU memory buffer for video frames"},
  //{flag: "video-capture-use-gpu-memory-buffer", description: "Use GPU memory buffer for video capture"},

  // 🧠 GPU Stability & Speed
  {flag: "ignore-gpu-blocklist", description: "Forces all GPU features on all drivers"},
  {flag: "enable-gpu-driver-workarounds", description: "GPU driver stability workarounds"},
  //{flag: "enable-unsafe-webgpu", description: "Enable unsafe WebGPU features"},

  // ⚡ FPS & Frame Timing
  {flag: "disable-frame-rate-limit", description: "Uncap FPS"},
  {flag: "disable-gpu-vsync", description: "Disable vsync for uncapped rendering"},
  //{flag: "enable-fast-unload", description: "Speeds up tab/window destruction"},
  {flag: "disable-backgrounding-occluded-windows", description: "Keep background windows active"},

  // 💤 Prevent Throttling / Background Slowdown
  {flag: "disable-background-timer-throttling", description: "Prevent timers from slowing in background"},
  {flag: "disable-renderer-backgrounding", description: "Prevent renderer throttling"},
  {flag: "enable-gpu-shader-disk-cache", description: "Cache shaders to disk"},

  // 🔧 Misc Performance Tweaks
  //{flag: "disable-low-res-tiling", description: "Avoid low-resolution tiles"},
  {flag: "enable-threaded-compositing", description: "Use multi-threaded compositor"},
  {flag: "max-active-webgl-contexts=16", description: "Allow more active WebGL contexts (16)"},
  {flag: "max-active-webgl-contexts=32", description: "Allow more active WebGL contexts (32)"},
  //{flag: "no-proxy-server", description: "Reduce network latency from proxy lookups"},
  {flag: "enable-low-end-device-mode", description: "Low-end device mode optimizations (Reduced Performance)"},
];

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let sessionWindow: BrowserWindow | null = null;

let exitCount: number = 0;

// Parse command-line arguments
type LaunchMode = 'normal' | 'session_launcher' | 'session' | 'focus' | 'focus_fullscreen';

interface LaunchArgs {
  mode: LaunchMode;
  sessionId?: string;
}

function parseLaunchArgs(config: any): LaunchArgs {
  const args = process.argv.slice(1);
  let mode: LaunchMode | null = null;
  let sessionId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--mode=')) {
      const modeValue = arg.split('=')[1] as LaunchMode;
      if (['normal', 'session_launcher', 'session', 'focus', 'focus_fullscreen'].includes(modeValue)) {
        mode = modeValue;
      }
    } else if (arg.startsWith('--session_id=')) {
      sessionId = arg.split('=')[1];
    }
  }

  // If no mode specified via command line, use defaultLaunchMode from config
  // Only 'normal' and 'session_launcher' are allowed as default modes
  if (mode === null) {
    const defaultMode = config?.defaultLaunchMode || 'normal';
    mode = (['normal', 'session_launcher'].includes(defaultMode) ? defaultMode : 'normal') as LaunchMode;
  }

  return {mode, sessionId};
}

let launchArgs: LaunchArgs;

let neuzosConfig: any = null;
const defaultNeuzosConfig = {
  defaultLaunchMode : "normal",
  chromium: {
    commandLineSwitches: [
      "force_high_performance_gpu",
      "disable-frame-rate-limit",
      "enable-accelerated-2d-canvas",
      "enable-gpu-rasterization",
      "enable-oop-rasterization",
      "ignore-gpu-blocklist",
      "max-active-webgl-contexts=16",
      "enable-gpu-memory-buffer-compositor-resources",
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
  sessionActions: []
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
  },
  "send_session_action": {
    label: "Send Action to Session",
    args: [
      "session_id",
      "action_id"
    ],
  },
  "custom_event": {
    label: "Custom Event",
    args: [
      "event_name",
      "event_data"
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

function createSessionLauncherWindow(): void {
  if (sessionWindow && !sessionWindow.isDestroyed()) {
    sessionWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const toPixels = (units: number) => {
    return Math.floor(units / primaryDisplay.scaleFactor);
  };

  // Small window for session launcher
  sessionWindow = new BrowserWindow({
    width: toPixels(600),
    height: toPixels(400),
    show: false,
    frame: false,
    autoHideMenuBar: true,
    resizable: false,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      zoomFactor: 1.0 / primaryDisplay.scaleFactor,
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });

  // Single-click exit for session launcher
  sessionWindow.on("close", () => {
    globalShortcut.unregisterAll();
  });

  // Fix for MacOS Command Shortcuts
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
  } else {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{role: "appMenu"}, {role: "editMenu"}]));
    sessionWindow.setMenuBarVisibility(false);
  }

  sessionWindow.on("ready-to-show", () => {
    sessionWindow?.show();
  });

  sessionWindow.on("closed", () => {
    sessionWindow = null;
  });

  sessionWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return {action: "deny"};
  });

  // Load the session launcher HTML
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    sessionWindow.webContents.loadURL(process.env["ELECTRON_RENDERER_URL"] + "/session_launcher.html");
  } else {
    sessionWindow.webContents.loadFile(join(__dirname, "../renderer/session_launcher.html"));
  }
}

function createSessionWindow(mode: LaunchMode, sessionId: string): void {
  // Load config first
  if (!neuzosConfig) {
    dialog.showErrorBox("Configuration Error", "Failed to load configuration.");
    app.quit();
    return;
  }

  // Find the session
  const sessionData = neuzosConfig.sessions.find((s: any) => s.id === sessionId);
  if (!sessionData) {
    dialog.showErrorBox("Session Not Found", `Session with ID "${sessionId}" was not found in configuration.`);
    app.quit();
    return;
  }

  // Check if session has browser partition overwrite
  if (sessionData.partitionOverwrite === "browser") {
    dialog.showErrorBox("Invalid Session", `Session "${sessionData.label}" cannot be launched in standalone mode (browser partition).`);
    app.quit();
    return;
  }

  if (sessionWindow && !sessionWindow.isDestroyed()) {
    sessionWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const toPixels = (units: number) => {
    return Math.floor(units / primaryDisplay.scaleFactor);
  };

  const {width, height} = primaryDisplay.workAreaSize;

  // Determine if we should start fullscreen
  const startFullscreen = mode === 'focus_fullscreen';

  // Create the session window
  sessionWindow = new BrowserWindow({
    width: toPixels(width),
    height: toPixels(height),
    show: false,
    frame: false,
    autoHideMenuBar: true,
    fullscreen: startFullscreen,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      zoomFactor: 1.0 / primaryDisplay.scaleFactor,
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
      partition: `persist:${sessionId}`
    }
  });

  // Exit behavior similar to main window
  sessionWindow.on("close", (event) => {
    // Always unregister shortcuts when session window is closing
    globalShortcut.unregisterAll();
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
      globalShortcut.unregisterAll();
    }
  });

  // Fix for MacOS Command Shortcuts
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
  } else {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{role: "appMenu"}, {role: "editMenu"}]));
    sessionWindow.setMenuBarVisibility(false);
  }

  sessionWindow.on("ready-to-show", () => {
    sessionWindow?.show();
  });

  sessionWindow.on("closed", () => {
    // Ensure shortcuts are unregistered when session window is destroyed
    globalShortcut.unregisterAll();
    sessionWindow = null;
  });

  sessionWindow.on("focus", () => {
    registerSessionKeybinds(mode);
  });

  sessionWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return {action: "deny"};
  });

  // Store session data for IPC handlers
  (sessionWindow as any).sessionData = {
    mode,
    sessionId,
    sessionConfig: sessionData
  };

  // Load the session HTML
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    sessionWindow.webContents.loadURL(process.env["ELECTRON_RENDERER_URL"] + "/session.html");
  } else {
    sessionWindow.webContents.loadFile(join(__dirname, "../renderer/session.html"));
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
    // Always unregister shortcuts when main window is closing
    globalShortcut.unregisterAll();
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
    // Ensure shortcuts are unregistered when window is destroyed
    globalShortcut.unregisterAll();
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
            break
          case "send_session_action":
            if (bind.args.length > 1)
              mainWindow?.webContents.send("event.send_session_action", ...(bind.args ?? []));
            break
          case "custom_event":
            if (bind.args.length > 1)
              mainWindow?.webContents.send(bind.args[0], bind.args[1]);
            break
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

function registerSessionKeybinds(mode: LaunchMode) {
  globalShortcut.unregisterAll();

  // Find fullscreen keybind
  const fullscreenBind = neuzosConfig.keyBinds.find((bind: any) => bind.event === "fullscreen_toggle");

  if (!fullscreenBind) {
    return;
  }

  try {
    switch (mode) {
      case 'session':
        // Allow fullscreen toggle
        globalShortcut.register(fullscreenBind.key, () => {
          sessionWindow?.setFullScreen(!sessionWindow?.isFullScreen());
        });
        break;
      case 'focus':
        // Prevent fullscreen
        globalShortcut.register(fullscreenBind.key, () => {
          // Do nothing - prevent fullscreen
        });
        break;
      case 'focus_fullscreen':
        // Prevent removing fullscreen
        globalShortcut.register(fullscreenBind.key, () => {
          if (!sessionWindow?.isFullScreen()) {
            sessionWindow?.setFullScreen(true);
          }
        });
        break;
    }
  } catch (e) {
    console.error("Failed to register session keybind:", e);
  }
}

(async () => {
  try {
    await loadConfig(true);

    // Parse launch args after config is loaded to use defaultLaunchMode
    launchArgs = parseLaunchArgs(neuzosConfig);

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

    // Setup IPC handlers for session launcher
    ipcMain.handle("session_launcher.get_sessions", async () => {
      return neuzosConfig.sessions.filter((s: any) => s.partitionOverwrite !== "browser");
    });

    ipcMain.on("session_launcher.launch_session", (_, sessionId: string, mode: LaunchMode) => {
      const execPath = process.execPath;
      const args = [`--mode=${mode}`, `--session_id=${sessionId}`];

      // Spawn new process
      const {spawn} = require('child_process');
      spawn(execPath, args, {
        detached: true,
        stdio: 'ignore'
      }).unref();
    });

    ipcMain.on("session_launcher.close", () => {
      globalShortcut.unregisterAll();
      sessionWindow?.destroy();
      sessionWindow = null;
    });

    ipcMain.on("session_launcher.minimize", () => {
      sessionWindow?.minimize();
    });

    // Setup IPC handlers for session window
    ipcMain.handle("session_window.get_data", async () => {
      return (sessionWindow as any)?.sessionData || null;
    });

    ipcMain.on("session_window.fullscreen_toggle", () => {
      const mode = (sessionWindow as any)?.sessionData?.mode;
      if (mode === 'session') {
        sessionWindow?.setFullScreen(!sessionWindow?.isFullScreen());
      } else if (mode === 'focus_fullscreen') {
        // Keep fullscreen
        if (!sessionWindow?.isFullScreen()) {
          sessionWindow?.setFullScreen(true);
        }
      }
      // For 'focus' mode, do nothing (prevent fullscreen)
    });

    ipcMain.on("session_window.minimize", () => {
      sessionWindow?.minimize();
    });

    ipcMain.on("session_window.maximize", () => {
      if (sessionWindow?.isMaximized()) {
        sessionWindow?.unmaximize();
      } else {
        sessionWindow?.maximize();
      }
    });

    ipcMain.on("session_window.close", () => {
      globalShortcut.unregisterAll();
      sessionWindow?.destroy();
      sessionWindow = null;
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

    ipcMain.handle('fetch.flyff_news', async () => {
      try {
        const data = await fetch('https://universe.flyff.com/news')
        return data?.text() ?? ''
      } catch (e) {
        return ''
      }
    })

    ipcMain.handle('app.get_default_user_agent', async () => {
      try {
        // Get the default user agent from a BrowserWindow's webContents
        const testWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });

        const userAgent = testWindow.webContents.getUserAgent();
        testWindow.destroy();

        return userAgent;
      } catch (e) {
        // Fallback user agent if the above fails
        return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      }
    })

    // Handle different launch modes
    switch (launchArgs.mode) {
      case 'session_launcher':
        createSessionLauncherWindow();
        break;
      case 'session':
      case 'focus':
      case 'focus_fullscreen':
        if (!launchArgs.sessionId) {
          dialog.showErrorBox("Missing Session ID", "Session ID is required for this launch mode.");
          app.quit();
          return;
        }
        createSessionWindow(launchArgs.mode, launchArgs.sessionId);
        break;
      default:
        createMainWindow();
        break;
    }

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
    globalShortcut.unregisterAll();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("browser-window-blur", () => {
    // Unregister shortcuts when any window loses focus to prevent conflicts
    globalShortcut.unregisterAll();
  });

  app.on("browser-window-focus", () => {
    // Re-register appropriate shortcuts when any window gains focus
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow === mainWindow) {
      registerKeybinds();
    } else if (focusedWindow === sessionWindow && (sessionWindow as any)?.sessionData) {
      registerSessionKeybinds((sessionWindow as any).sessionData.mode);
    }
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  // Add additional safety cleanup on process events
  app.on("before-quit", () => {
    globalShortcut.unregisterAll();
  });

  // Handle unexpected process termination
  process.on('exit', () => {
    try {
      globalShortcut.unregisterAll();
    } catch (e) {
      console.error("Error cleaning up shortcuts on exit:", e);
    }
  });

  process.on('SIGINT', () => {
    try {
      globalShortcut.unregisterAll();
    } catch (e) {
      console.error("Error cleaning up shortcuts on SIGINT:", e);
    }
    app.quit();
  });

  process.on('SIGTERM', () => {
    try {
      globalShortcut.unregisterAll();
    } catch (e) {
      console.error("Error cleaning up shortcuts on SIGTERM:", e);
    }
    app.quit();
  });
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
