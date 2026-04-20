import {app, shell, BrowserWindow, Menu, dialog, session, ipcMain, globalShortcut, screen, protocol} from "electron";
import {join} from "path";
import {pathToFileURL} from "url";
import {electronApp, optimizer, is} from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import * as fs from "node:fs";
import {rimraf} from "rimraf";
import {buildRegistry, checkRegistry, loadRegistry, type ProgressEvent} from "./flyff-registry";

// Register custom protocol for serving flyff registry assets (icons etc.)
// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'flyff-asset', privileges: { standard: true, secure: true, corsEnabled: true, supportFetchAPI: true } },
]);

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

type ViewerWindowType = 'navi_guide' | 'flyffipedia';
type SidebarSide = 'left' | 'right';

type ViewerWindowConfig = {
  x: number | null;
  y: number | null;
  width: number;
  height: number;
  alwaysOnTop: boolean;
};

type ViewerWindowBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const viewerWindowTypes: ViewerWindowType[] = ['navi_guide', 'flyffipedia'];
const defaultViewerWindowConfig: ViewerWindowConfig = {
  x: null,
  y: null,
  width: 1100,
  height: 700,
  alwaysOnTop: true,
};

const defaultSidebarSide: SidebarSide = 'left';

const viewerWindows: Map<ViewerWindowType, BrowserWindow> = new Map();
const viewerBoundsSaveTimers: Map<ViewerWindowType, ReturnType<typeof setTimeout>> = new Map();

let exitCount: number = 0;
let mainWindowShortcutsEnabled: boolean = true;
let sessionWindowShortcutsEnabled: boolean = true;

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

const defaultNeuzosConfig: any = {
  window: undefined,
  autoSaveSettings: false,
  defaultLaunchMode: "normal",
  chromium: {
    commandLineSwitches: [
      "force_high_performance_gpu",
      //"disable-frame-rate-limit",
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
  keyBindProfiles: [],
  activeKeyBindProfileId: null,
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
  sessionActions: [],
  titleBarButtons: {
    darkModeToggle: true,
    fullscreenToggle: true,
    keybindToggle: true,
  },
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

const userDataPath = app.getPath("userData");
const configDirectoryPath = join(userDataPath, "/neuzos_config/");
const registryDirectoryPath = join(userDataPath, "flyff-registry");

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

          // Deep merge for window config to ensure all window types (main, settings, session) exist
          const loadedWindow = neuzosConfig.window;
          neuzosConfig = {...defaultNeuzosConfig, ...neuzosConfig};

          // Deep merge window config specifically
          if (loadedWindow) {
            neuzosConfig.window = {
              ...defaultNeuzosConfig.window,
              ...loadedWindow,
              main: {...(defaultNeuzosConfig.window?.main || {}), ...(loadedWindow.main || {})},
              settings: {...(defaultNeuzosConfig.window?.settings || {}), ...(loadedWindow.settings || {})},
              session: {...(defaultNeuzosConfig.window?.session || {}), ...(loadedWindow.session || {})},
              viewers: {
                ...(defaultNeuzosConfig.window?.viewers || {}),
                ...(loadedWindow.viewers || {}),
                navi_guide: {
                  ...defaultViewerWindowConfig,
                  ...(loadedWindow.viewers?.navi_guide || {}),
                },
                flyffipedia: {
                  ...defaultViewerWindowConfig,
                  ...(loadedWindow.viewers?.flyffipedia || {}),
                },
              },
              sidebarSide: loadedWindow.sidebarSide || defaultSidebarSide,
            };
          }

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

function createDefaultViewerWindowConfigs(): Record<ViewerWindowType, ViewerWindowConfig> {
  return {
    navi_guide: {...defaultViewerWindowConfig},
    flyffipedia: {...defaultViewerWindowConfig},
  };
}

function ensureViewerWindowState(): Record<ViewerWindowType, ViewerWindowConfig> {
  if (!neuzosConfig.window) {
    neuzosConfig.window = {};
  }

  if (!neuzosConfig.window.viewers) {
    neuzosConfig.window.viewers = createDefaultViewerWindowConfigs();
  }

  for (const type of viewerWindowTypes) {
    neuzosConfig.window.viewers[type] = {
      ...defaultViewerWindowConfig,
      ...(neuzosConfig.window.viewers[type] || {}),
    };
  }

  if (!neuzosConfig.window.sidebarSide) {
    neuzosConfig.window.sidebarSide = defaultSidebarSide;
  }

  return neuzosConfig.window.viewers;
}

function getViewerWindowConfig(type: ViewerWindowType): ViewerWindowConfig {
  const viewers = ensureViewerWindowState();
  return viewers[type] ?? {...defaultViewerWindowConfig};
}

function getViewerWindowTypeFromWindow(win: BrowserWindow | null): ViewerWindowType | null {
  if (!win) {
    return null;
  }

  for (const [type, viewerWindow] of viewerWindows.entries()) {
    if (viewerWindow === win) {
      return type;
    }
  }

  return (win as any).viewerType ?? null;
}

function isViewerWindowBoundsVisible(bounds: { x: number; y: number; width: number; height: number }): boolean {
  const displays = screen.getAllDisplays();
  return displays.some(display => {
    const area = display.workArea;
    const horizontalOverlap = bounds.x < area.x + area.width && bounds.x + bounds.width > area.x;
    const verticalOverlap = bounds.y < area.y + area.height && bounds.y + bounds.height > area.y;
    return horizontalOverlap && verticalOverlap;
  });
}

function getSanitizedViewerBounds(type: ViewerWindowType): Partial<ViewerWindowBounds> {
  const viewerConfig = getViewerWindowConfig(type);

  if (viewerConfig.x === null || viewerConfig.y === null) {
    return {};
  }

  const bounds = {
    x: viewerConfig.x,
    y: viewerConfig.y,
    width: viewerConfig.width,
    height: viewerConfig.height,
  };

  if (!isViewerWindowBoundsVisible(bounds)) {
    return {};
  }

  return bounds;
}

function persistViewerWindowBounds(type: ViewerWindowType, win: BrowserWindow): void {
  const bounds = win.getBounds();
  const viewers = ensureViewerWindowState();
  viewers[type] = {
    ...defaultViewerWindowConfig,
    ...viewers[type],
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    alwaysOnTop: win.isAlwaysOnTop(),
  };
  saveConfig(neuzosConfig);
}

function scheduleViewerWindowBoundsSave(type: ViewerWindowType, win: BrowserWindow): void {
  const existingTimer = viewerBoundsSaveTimers.get(type);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    if (!win.isDestroyed()) {
      persistViewerWindowBounds(type, win);
    }
    viewerBoundsSaveTimers.delete(type);
  }, 200);

  viewerBoundsSaveTimers.set(type, timer);
}

function createViewerWindow(type: ViewerWindowType): BrowserWindow | null {
  const existingWindow = viewerWindows.get(type);
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus();
    return existingWindow;
  }

  const viewerConfig = getViewerWindowConfig(type);
  const viewerBounds = getSanitizedViewerBounds(type);

  const window = new BrowserWindow({
    width: viewerConfig.width,
    height: viewerConfig.height,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(viewerBounds.x !== undefined && viewerBounds.y !== undefined ? {x: viewerBounds.x, y: viewerBounds.y} : {}),
    ...(process.platform === 'linux' ? {icon} : {}),
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
      zoomFactor: 1.0,
    }
  });

  (window as any).viewerType = type;
  viewerWindows.set(type, window);

  const cleanup = () => {
    const timer = viewerBoundsSaveTimers.get(type);
    if (timer) {
      clearTimeout(timer);
      viewerBoundsSaveTimers.delete(type);
    }

    if (!window.isDestroyed()) {
      persistViewerWindowBounds(type, window);
    }

    if (viewerWindows.get(type) === window) {
      viewerWindows.delete(type);
    }
  };

  window.on('move', () => scheduleViewerWindowBoundsSave(type, window));
  window.on('resize', () => scheduleViewerWindowBoundsSave(type, window));
  window.on('closed', cleanup);

  window.on('ready-to-show', () => {
    const config = getViewerWindowConfig(type);
    if (config.alwaysOnTop) {
      window.setAlwaysOnTop(true, 'screen-saver');
    }

    if (viewerBounds.x === undefined || viewerBounds.y === undefined) {
      window.center();
    }

    window.show();
  });

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return {action: 'deny'};
  });

  const viewerUrl = is.dev && process.env["ELECTRON_RENDERER_URL"]
    ? `${process.env["ELECTRON_RENDERER_URL"]}/viewer.html?type=${type}`
    : `${pathToFileURL(join(__dirname, "../renderer/viewer.html")).href}?type=${type}`;

  window.webContents.loadURL(viewerUrl).catch((error) => {
    console.error('Failed to load viewer window:', error);
  });

  return window;
}


function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  // Create smaller window for settings
  settingsWindow = new BrowserWindow({
    width: neuzosConfig.window.settings.width,
    height: neuzosConfig.window.settings.height,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      zoomFactor: neuzosConfig.window.settings.zoom ?? 1.0,
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
    settingsWindow?.webContents.setZoomFactor(neuzosConfig.window.settings.zoom);

    // Maximize if configured - must happen after show() with slight delay
    if (neuzosConfig.window.settings.maximized) {
      setImmediate(() => {
        settingsWindow?.maximize();
      });
    }
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

  // Small window for session launcher
  sessionWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    resizable: false,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      zoomFactor: neuzosConfig.window.main.zoom ?? 1.0,
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
    sessionWindow?.webContents.setZoomFactor(neuzosConfig.window.main.zoom)
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

  // Determine if we should start fullscreen
  const startFullscreen = mode === 'focus_fullscreen';

  // Create the session window
  sessionWindow = new BrowserWindow({
    width: neuzosConfig.window.session.width,
    height: neuzosConfig.window.session.height,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    fullscreen: startFullscreen,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
      partition: `persist:${sessionId}`,
      zoomFactor: neuzosConfig.window.session.zoom ?? 1.0,
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
    sessionWindow?.webContents.setZoomFactor(neuzosConfig.window.session.zoom);

    // Maximize if configured and not starting in fullscreen - must happen after show() with slight delay
    if (!startFullscreen && neuzosConfig.window.session.maximized) {
      setImmediate(() => {
        sessionWindow?.maximize();
      });
    }
  });

  sessionWindow.on("closed", () => {
    // Ensure shortcuts are unregistered when session window is destroyed
    globalShortcut.unregisterAll();
    sessionWindow = null;
  });

  sessionWindow.on("focus", () => {
    registerSessionKeybinds(mode);
  });

  // Track fullscreen state changes
  sessionWindow.on("enter-full-screen", () => {
    sessionWindow?.webContents.send("event.fullscreen_changed", true);
  });

  sessionWindow.on("leave-full-screen", () => {
    sessionWindow?.webContents.send("event.fullscreen_changed", false);
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

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: neuzosConfig.window.main.width,
    height: neuzosConfig.window.main.height,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
      zoomFactor: neuzosConfig.window.main.zoom ?? 1.0,
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
    mainWindow?.webContents.setZoomFactor(neuzosConfig.window.main.zoom);

    // Maximize if configured - must happen after show() with slight delay
    if (neuzosConfig.window.main.maximized) {
      setImmediate(() => {
        mainWindow?.maximize();
      });
    }
  });

  mainWindow.on("closed", () => {
    // Ensure shortcuts are unregistered when window is destroyed
    globalShortcut.unregisterAll();
    mainWindow = null;

    // Close all viewer windows so they don't orphan the process
    for (const [, win] of viewerWindows) {
      if (!win.isDestroyed()) {
        win.destroy();
      }
    }
    viewerWindows.clear();
  });

  mainWindow.on("focus", () => {
    registerKeybinds()
  });

  // Track fullscreen state changes
  mainWindow.on("enter-full-screen", () => {
    mainWindow?.webContents.send("event.fullscreen_changed", true);
  });

  mainWindow.on("leave-full-screen", () => {
    mainWindow?.webContents.send("event.fullscreen_changed", false);
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
  // Ensure keyBindProfiles array exists
  if (!neuzosConfig.keyBindProfiles) {
    neuzosConfig.keyBindProfiles = [];
  }

  // If no profiles exist, create a default one
  if (neuzosConfig.keyBindProfiles.length === 0) {
    neuzosConfig.keyBindProfiles.push({
      id: "default",
      name: "Default",
      keybinds: [],
    });
  }

  // Ensure activeKeyBindProfileId is set to a valid profile
  const profileIds = neuzosConfig.keyBindProfiles.map((p: any) => p.id);
  if (!neuzosConfig.activeKeyBindProfileId || !profileIds.includes(neuzosConfig.activeKeyBindProfileId)) {
    neuzosConfig.activeKeyBindProfileId = neuzosConfig.keyBindProfiles[0].id;
  }

  neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind: any) => {
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

function dispatchKeybindEvent(bind: any) {
  switch (bind.event) {
    case "fullscreen_toggle":
      mainWindow?.setFullScreen(!mainWindow?.isFullScreen());
      break;
    case "layout_swap":
      mainWindow?.webContents.send("event.layout_swap");
      break;
    case "layout_switch":
      if (bind.args?.length > 0)
        mainWindow?.webContents.send("event.layout_switch", ...(bind.args ?? []));
      break;
    case "send_session_action":
      if (bind.args?.length > 1)
        mainWindow?.webContents.send("event.send_session_action", ...(bind.args ?? []));
      break;
    case "custom_event":
      if (bind.args?.length > 1)
        mainWindow?.webContents.send(bind.args[0], bind.args[1]);
      break;
  }
}

function registerKeybinds() {
  globalShortcut.unregisterAll()

  // Only register shortcuts if they are enabled for main window
  if (!mainWindowShortcutsEnabled) {
    return;
  }

  // Collect all binds: global first, then active profile
  const activeProfile = neuzosConfig.keyBindProfiles?.find(
    (p: any) => p.id === neuzosConfig.activeKeyBindProfileId
  );
  const profileBinds: any[] = activeProfile?.keybinds ?? [];
  const allBinds: any[] = [...neuzosConfig.keyBinds, ...profileBinds];

  allBinds.forEach((bind) => {
    if (!bind.key) return;
    try {
      globalShortcut.register(bind.key, () => dispatchKeybindEvent(bind));
    } catch (e) {
      dialog.showErrorBox("Failed to register keybind", "Please fix your config manually found at \n" + join(configDirectoryPath, "/config.json"));
      globalShortcut.unregisterAll();
      exitCount = 3;
      app.quit();
      return;
    }
  });
}

function registerSessionKeybinds(mode: LaunchMode) {
  globalShortcut.unregisterAll();

  // Only register shortcuts if they are enabled for session window
  if (!sessionWindowShortcutsEnabled) {
    return;
  }

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

    // ── Flyff registry custom protocol ──────────────────────────────────────
    // Serves downloaded icons and assets from userData/flyff-registry/
    protocol.handle('flyff-asset', (request) => {
      const rawPath = request.url.replace('flyff-asset://', '');
      const decoded = decodeURIComponent(rawPath);
      const filePath = join(registryDirectoryPath, decoded);
      if (!fs.existsSync(filePath)) {
        return new Response(null, { status: 404 });
      }
      const data = fs.readFileSync(filePath);
      const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
      const mime =
        ext === 'png' ? 'image/png' :
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        ext === 'webp' ? 'image/webp' :
        ext === 'json' ? 'application/json' :
        'application/octet-stream';
      return new Response(data, { status: 200, headers: { 'Content-Type': mime } });
    });

    // ── Flyff registry IPC handlers ─────────────────────────────────────────
    ipcMain.handle('registry.check', () => {
      return checkRegistry(registryDirectoryPath);
    });

    ipcMain.handle('registry.load', () => {
      return loadRegistry(registryDirectoryPath);
    });

    ipcMain.handle('registry.build', async (_event) => {
      fs.mkdirSync(registryDirectoryPath, { recursive: true });
      const onProgress = (progress: ProgressEvent) => {
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('registry:progress', progress);
        });
      };
      try {
        const registry = await buildRegistry(registryDirectoryPath, onProgress);
        return { success: true, registry };
      } catch (err: any) {
        return { success: false, error: err?.message ?? String(err) };
      }
    });

    // Key tracking is handled in the renderer via the webview preload script.
    // The preload (src/preload/webview.ts) sends keydown events to the embedder
    // via ipcRenderer.sendToHost → NeuzClient dispatches 'neuz:keydown' on document
    // → CooldownOverlay Widget.svelte listens and starts cooldowns.

    ipcMain.handle('registry.rebuild', async () => {
      // Delete existing registry and rebuild
      const registryPath = join(registryDirectoryPath, 'registry.json');
      if (fs.existsSync(registryPath)) fs.unlinkSync(registryPath);
      const onProgress = (progress: ProgressEvent) => {
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('registry:progress', progress);
        });
      };
      try {
        const registry = await buildRegistry(registryDirectoryPath, onProgress);
        return { success: true, registry };
      } catch (err: any) {
        return { success: false, error: err?.message ?? String(err) };
      }
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
        const newFullscreenState = !sessionWindow?.isFullScreen();
        sessionWindow?.setFullScreen(newFullscreenState);
        // Event will be sent by enter-full-screen/leave-full-screen handlers
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
      const newFullscreenState = !mainWindow?.isFullScreen();
      mainWindow?.setFullScreen(newFullscreenState);
      // Event will be sent by enter-full-screen/leave-full-screen handlers
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

    // IPC handlers for global shortcuts toggle
    ipcMain.on("main_window.toggle_shortcuts", (event, enabled: boolean) => {
      mainWindowShortcutsEnabled = enabled;
      const win = BrowserWindow.fromWebContents(event.sender);
      if (enabled) {
        registerKeybinds();
      } else {
        globalShortcut.unregisterAll();
      }
      win?.webContents.send("event.shortcuts_state_changed", enabled);
    });

    ipcMain.on("session_window.toggle_shortcuts", (event, enabled: boolean) => {
      sessionWindowShortcutsEnabled = enabled;
      const win = BrowserWindow.fromWebContents(event.sender);
      const mode = (sessionWindow as any)?.sessionData?.mode;
      if (enabled && mode) {
        registerSessionKeybinds(mode);
      } else {
        globalShortcut.unregisterAll();
      }
      win?.webContents.send("event.shortcuts_state_changed", enabled);
    });

    ipcMain.on('viewer_window.open', (_event, type: ViewerWindowType) => {
      try {
        if (!viewerWindowTypes.includes(type)) return;
        createViewerWindow(type);
      } catch (error) {
        console.error('Failed to open viewer window:', error);
      }
    });

    ipcMain.on('viewer_window.close', (event) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.close();
      } catch (error) {
        console.error('Failed to close viewer window:', error);
      }
    });

    ipcMain.on('viewer_window.minimize', (event) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.minimize();
      } catch (error) {
        console.error('Failed to minimize viewer window:', error);
      }
    });

    ipcMain.on('viewer_window.set_always_on_top', (event, alwaysOnTop: boolean) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const type = getViewerWindowTypeFromWindow(win);
        if (!win || !type) return;

        if (alwaysOnTop) {
          win.setAlwaysOnTop(true, 'screen-saver');
        } else {
          win.setAlwaysOnTop(false);
        }
        const viewers = ensureViewerWindowState();
        viewers[type] = {
          ...getViewerWindowConfig(type),
          alwaysOnTop,
        };
        saveConfig(neuzosConfig);
      } catch (error) {
        console.error('Failed to update always-on-top state:', error);
      }
    });

    ipcMain.handle('viewer_window.get_config', (event) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const type = getViewerWindowTypeFromWindow(win);
        if (!type) {
          return { error: 'Viewer window type not found' };
        }

        return {
          type,
          config: getViewerWindowConfig(type),
        };
      } catch (error: any) {
        return { error: error?.message ?? String(error) };
      }
    });

    ipcMain.handle('sidebar_panel.get_side', () => {
      ensureViewerWindowState();
      return neuzosConfig.window.sidebarSide || defaultSidebarSide;
    });

    ipcMain.on('sidebar_panel.set_side', (event, side: SidebarSide) => {
      try {
        if (side !== 'left' && side !== 'right') return;
        ensureViewerWindowState();
        neuzosConfig.window.sidebarSide = side;
        saveConfig(neuzosConfig);
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.webContents.send('event.sidebar_side_changed', side);
      } catch (error) {
        console.error('Failed to persist sidebar side:', error);
      }
    });

    ipcMain.handle("shortcuts.get_state", () => {
      return {
        mainWindow: mainWindowShortcutsEnabled,
        sessionWindow: sessionWindowShortcutsEnabled,
      };
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

    ipcMain.on("settings_window.maximize", () => {
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
      checkKeybinds();
      registerKeybinds();
      mainWindow?.webContents?.send("event.config_changed", config);
    });

    ipcMain.handle("keybinds.swap_profile", async (_, profileId: string) => {
      const profile = neuzosConfig.keyBindProfiles?.find((p: any) => p.id === profileId);
      if (!profile) return { success: false, error: "Profile not found" };

      neuzosConfig.activeKeyBindProfileId = profileId;
      saveConfig(neuzosConfig);
      registerKeybinds();
      mainWindow?.webContents?.send("event.active_keybind_profile_changed", profileId);

      return { success: true, profileId };
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

    ipcMain.handle('app.get_app_data_path', async () => {
      return userDataPath;
    })

    ipcMain.handle('app.open_app_data_folder', async () => {
      try {
        await shell.openPath(userDataPath);
        return true;
      } catch (e) {
        console.error('Failed to open app data folder:', e);
        return false;
      }
    })

    const primaryDisplay = screen.getPrimaryDisplay();
    const {width: defaultScreenWidth, height: defaultScreenHeight} = primaryDisplay.workAreaSize;
    const aspectRatio = defaultScreenWidth / defaultScreenHeight;
    const defaultWindowWidth = aspectRatio >= 2 ? defaultScreenWidth / 2 : defaultScreenWidth - defaultScreenWidth / 12;
    const defaultWindowHeight = defaultScreenHeight - (defaultScreenHeight / 12);

    // Ensure window config exists
    // Calculate default window sizes
    const defaultMainWindowConfig = {
      width: defaultWindowWidth,
      height: defaultWindowHeight,
      maximized: false,
      zoom: 1.0
    };

    const defaultSessionWindowConfig = {
      width: defaultWindowWidth,
      height: defaultWindowHeight,
      maximized: false,
      zoom: 1.0
    };

    // Settings window should be slightly smaller by default
    const defaultSettingsWindowConfig = {
      width: Math.floor(defaultWindowWidth * 0.85),
      height: Math.floor(defaultWindowHeight * 0.85),
      maximized: false,
      zoom: 1.0
    };

    // Ensure defaultNeuzosConfig has window config
    if (!defaultNeuzosConfig.window) {
      defaultNeuzosConfig.window = {
        main: defaultMainWindowConfig,
        settings: defaultSettingsWindowConfig,
        session: defaultSessionWindowConfig,
        viewers: createDefaultViewerWindowConfigs(),
        sidebarSide: defaultSidebarSide,
      };
    }

    // Merge neuzosConfig with defaults (user config takes precedence)
    neuzosConfig = {...defaultNeuzosConfig, ...neuzosConfig};

    // Ensure window object exists before accessing sub-properties
    if (!neuzosConfig.window) {
      neuzosConfig.window = {};
    }

    // Merge window config at the top level
    neuzosConfig.window = {...defaultNeuzosConfig.window, ...neuzosConfig.window};

    // Ensure each window sub-config exists and merge with defaults
    // This handles old configs that might not have all three window types (main, settings, session)
    neuzosConfig.window.main = {
      ...defaultNeuzosConfig.window.main,
      ...(neuzosConfig.window.main || {})
    };

    neuzosConfig.window.settings = {
      ...defaultNeuzosConfig.window.settings,
      ...(neuzosConfig.window.settings || {})
    };

    neuzosConfig.window.session = {
      ...defaultNeuzosConfig.window.session,
      ...(neuzosConfig.window.session || {})
    };

    neuzosConfig.window.viewers = {
      ...defaultNeuzosConfig.window.viewers,
      ...(neuzosConfig.window.viewers || {}),
      navi_guide: {
        ...defaultViewerWindowConfig,
        ...(neuzosConfig.window.viewers?.navi_guide || {}),
      },
      flyffipedia: {
        ...defaultViewerWindowConfig,
        ...(neuzosConfig.window.viewers?.flyffipedia || {}),
      },
    };

    neuzosConfig.window.sidebarSide = neuzosConfig.window.sidebarSide || defaultSidebarSide;

    ensureViewerWindowState();
    saveConfig(neuzosConfig);

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
