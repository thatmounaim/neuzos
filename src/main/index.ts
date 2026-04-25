import {app, shell, BrowserWindow, Menu, dialog, session, ipcMain, globalShortcut, screen, protocol} from "electron";
import {join} from "path";
import {pathToFileURL} from "url";
import {electronApp, optimizer, is} from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import * as fs from "node:fs";
import {rimraf} from "rimraf";
import {buildRegistry, checkRegistry, loadRegistry, type ProgressEvent} from "./flyff-registry";

type UIActionDescriptor = {
  id: string;
  label: string;
  category: string;
  defaultKey?: string;
};

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

// Maps sessionId -> webContentsId for mouse-bind interception via before-input-event
const mouseBindWebContents = new Map<string, number>();

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

type ConfigExportPayload = {
  schemaVersion: 1;
  exportedAt: string;
  sessionActions: any[];
  keyBinds: any[];
  keyBindProfiles: any[];
  activeKeyBindProfileId: string | null;
};

type ExportCategory =
  | 'keybinds'
  | 'session-actions'
  | 'ui-layout'
  | 'general-settings'
  | 'quest-log';

type ConfigExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  categories: ExportCategory[];
  _sanitized?: true;
  keyBinds?: any[];
  keyBindProfiles?: any[];
  activeKeyBindProfileId?: string | null;
  sessionActions?: any[];
  sessionGroups?: any[];
  window?: any;
  sessionZoomLevels?: Record<string, number>;
  fullscreen?: any;
  autoSaveSettings?: boolean;
  defaultLaunchMode?: string;
  userAgent?: string;
  titleBarButtons?: any;
  questLogTemplates?: never[];
};

type ConfigImportPayload = ConfigExportPayload | ConfigExportPayloadV2;

type ConfigImportResult =
  | { valid: true; payload: ConfigImportPayload; warnings: string[] }
  | { valid: false; error: string };

type ConfigApplyImportArgsV2 = {
  payload: ConfigImportPayload;
  mode: 'replace' | 'merge';
  categories: ExportCategory[];
};

const exportCategoryOrder: ExportCategory[] = ['keybinds', 'session-actions', 'ui-layout', 'general-settings', 'quest-log'];
const exportCategorySet = new Set<ExportCategory>(exportCategoryOrder);

function isExportCategory(value: unknown): value is ExportCategory {
  return typeof value === 'string' && exportCategorySet.has(value as ExportCategory);
}

function normalizeCategories(categories: unknown): ExportCategory[] {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories.filter(isExportCategory);
}

function inferPayloadCategories(payload: any): ExportCategory[] {
  const categories: ExportCategory[] = [];

  if (Array.isArray(payload?.keyBinds) || Array.isArray(payload?.keyBindProfiles) || payload?.activeKeyBindProfileId !== undefined) {
    categories.push('keybinds');
  }
  if (Array.isArray(payload?.sessionActions)) {
    categories.push('session-actions');
  }
  if (payload?.window !== undefined || payload?.sessionZoomLevels !== undefined || payload?.fullscreen !== undefined || Array.isArray(payload?.sessionGroups)) {
    categories.push('ui-layout');
  }
  if (payload?.autoSaveSettings !== undefined || payload?.defaultLaunchMode !== undefined || payload?.userAgent !== undefined || payload?.titleBarButtons !== undefined) {
    categories.push('general-settings');
  }
  if (Array.isArray(payload?.questLogTemplates)) {
    categories.push('quest-log');
  }

  return categories;
}

function getPayloadCategories(payload: ConfigImportPayload): ExportCategory[] {
  if (payload.schemaVersion === 1) {
    return ['keybinds', 'session-actions'];
  }

  const explicitCategories = normalizeCategories(payload.categories);
  return explicitCategories.length > 0 ? explicitCategories : inferPayloadCategories(payload);
}

function cloneData<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function normalizeSessionGroups(groups: unknown, knownSessionIds: Set<string>): any[] {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups.flatMap((group: any) => {
    if (!group || typeof group !== 'object') {
      return [];
    }

    const id = typeof group.id === 'string' && group.id.trim() !== '' ? group.id.trim() : null;
    if (!id) {
      return [];
    }

    const label = typeof group.label === 'string' && group.label.trim() !== '' ? group.label.trim() : 'New Group';
    const sessionIds = Array.isArray(group.sessionIds)
      ? [...new Set(group.sessionIds.filter((sessionId: any) => typeof sessionId === 'string' && knownSessionIds.has(sessionId)))]
      : [];

    return [{id, label, sessionIds}];
  });
}

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
  syncReceiverSessionId: null,
  sessionActions: [],
  sessionGroups: [],
  sessionZoomLevels: {},
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
  "send_to_receiver": {
    label: "Send Key to Active Receiver",
    args: [
      "ingame_key"
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

const allowedUiActionKeybinds: Record<string, UIActionDescriptor> = {
  "ui.toggle_quest_log": {
    id: "ui.toggle_quest_log",
    label: "Toggle Quest Log",
    category: "Interface",
  },
};

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
          neuzosConfig.sessionGroups = neuzosConfig.sessionGroups ?? [];
          neuzosConfig.sessionZoomLevels = neuzosConfig.sessionZoomLevels ?? {};

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

          const knownSessionIds = new Set((neuzosConfig.sessions ?? []).map((session: any) => session.id));
          neuzosConfig.sessionGroups = normalizeSessionGroups(neuzosConfig.sessionGroups, knownSessionIds);

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

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Main window render process gone:', details.reason, details.exitCode);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Main window failed to load:', errorCode, errorDescription, validatedURL);
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

  const allowedKeybindEvents = new Set([
    ...Object.keys(allowedEventKeybinds),
    ...Object.keys(allowedUiActionKeybinds),
  ]);

  neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind: any) => {
    return allowedKeybindEvents.has(bind.event);
  })

  const activeProfile = neuzosConfig.keyBindProfiles.find(
    (profile: any) => profile.id === neuzosConfig.activeKeyBindProfileId
  );
  if (activeProfile) {
    activeProfile.keybinds = activeProfile.keybinds.filter((bind: any) => {
      return allowedKeybindEvents.has(bind.event);
    });
  }

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
  if (bind.event?.startsWith("ui.")) {
    mainWindow?.webContents.send("event.ui_action_fired", {actionId: bind.event});
    return;
  }

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
    case "send_to_receiver":
      if (bind.args?.length > 0)
        mainWindow?.webContents.send("event.send_to_receiver", bind.args[0]);
      break;
    case "custom_event":
      if (bind.args?.length > 1) {
        // Allowlist: only permit known safe custom renderer event channel names
        const allowedCustomEvents = new Set(['event.custom_action', 'event.user_command']);
        const channel = String(bind.args[0]);
        if (allowedCustomEvents.has(channel)) {
          mainWindow?.webContents.send(channel, bind.args[1]);
        }
      }
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
    const normalizedKey = String(bind.key).toLowerCase();
    if (normalizedKey.startsWith('mouse') || normalizedKey.startsWith('gamepad')) {
      return;
    }
    try {
      globalShortcut.register(bind.key, () => dispatchKeybindEvent(bind));
    } catch (e) {
      console.warn("Skipping invalid keybind:", bind.key, bind.event, e);
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

    // ── Mouse-button keybind interception for session webviews ──────────────
    // Keyboard binds use globalShortcut (OS-level, works while webview has focus).
    // Mouse extra buttons (Middle, Mouse4, Mouse5) cannot use globalShortcut, so
    // we intercept them via before-input-event on each registered webview webContents.
    app.on("web-contents-created", (_e, wc) => {
      wc.on("before-input-event", (_event, input) => {
        if (input.type !== "mouseDown") return;
        // Only handle extra mouse buttons (1=middle, 3=Mouse4, 4=Mouse5)
        const buttonMap: Record<number, string> = { 1: "middle", 3: "mouse4", 4: "mouse5" };
        const key = buttonMap[input.button as unknown as number];
        if (!key) return;
        // Check if this webContents belongs to a registered session webview
        const wcId = wc.id;
        let matched = false;
        for (const registeredId of mouseBindWebContents.values()) {
          if (registeredId === wcId) { matched = true; break; }
        }
        if (!matched) return;
        // Find matching bind and dispatch
        const activeProfile = neuzosConfig?.keyBindProfiles?.find(
          (p: any) => p.id === neuzosConfig.activeKeyBindProfileId
        );
        const allBinds: any[] = [...(neuzosConfig?.keyBinds ?? []), ...(activeProfile?.keybinds ?? [])];
        const bind = allBinds.find((b: any) => b.key && b.key.toLowerCase() === key);
        if (bind) {
          dispatchKeybindEvent(bind);
        }
      });
    });

    // ── Flyff registry custom protocol ──────────────────────────────────────
    // Serves downloaded icons and assets from userData/flyff-registry/
    protocol.handle('flyff-asset', async (request) => {
      const rawPath = request.url.replace('flyff-asset://', '');
      const decoded = decodeURIComponent(rawPath);
      const registryBase = path.resolve(registryDirectoryPath);
      const filePath = path.resolve(registryBase, decoded);
      // Path traversal guard: resolved path must stay inside registryDirectoryPath
      if (filePath !== registryBase && !filePath.startsWith(registryBase + path.sep)) {
        return new Response(null, { status: 403 });
      }
      if (!fs.existsSync(filePath)) {
        return new Response(null, { status: 404 });
      }
      const data = await fs.promises.readFile(filePath);
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

    ipcMain.handle("session_launcher.get_groups", async () => {
      return neuzosConfig.sessionGroups ?? [];
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

    ipcMain.on("keybinds.dispatch", (_, bind: any) => {
      try {
        dispatchKeybindEvent(bind);
      } catch (e) {
        console.warn("Failed to dispatch keybind from renderer:", bind?.key, bind?.event, e);
      }
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

    ipcMain.on("webview.register_mouse", (_event, payload: { sessionId: string; webContentsId: number }) => {
      const { sessionId, webContentsId } = payload ?? {};
      if (typeof sessionId !== 'string' || typeof webContentsId !== 'number') return;
      mouseBindWebContents.set(sessionId, webContentsId);
    });

    ipcMain.on("webview.unregister_mouse", (_event, payload: { sessionId: string }) => {
      const { sessionId } = payload ?? {};
      if (typeof sessionId === 'string') {
        mouseBindWebContents.delete(sessionId);
      }
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
      // delete partition folder — validate sessionId to prevent path traversal
      try {
        if (typeof sessionId === 'string' && /^[a-zA-Z0-9_\-]+$/.test(sessionId)) {
          const partitionsBase = path.resolve(join(app.getPath("userData"), "Partitions"));
          const partitionFolderPath = path.resolve(partitionsBase, sessionId);
          if (partitionFolderPath.startsWith(partitionsBase + path.sep)) {
            rimraf.sync(partitionFolderPath, {
              maxRetries: 2
            });
          }
        }
      } catch (err) {
        console.warn("Failed to delete partition folder:", err);
      }
    });

    ipcMain.handle("session.delete", async function (_event, sessionId: string): Promise<{ success: boolean; error?: string }> {
      if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(sessionId)) {
        return { success: false, error: "Invalid session ID." };
      }
      // Stop the session in the renderer (fire-and-forget to main window)
      mainWindow?.webContents.send("event.stop_session", sessionId);
      // Wait for the webview process to release file handles (Windows needs this).
      // 5 s gives Chromium enough time to flush and close partition handles on Windows.
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Clear Electron session storage
      try {
        const sess = session.fromPartition("persist:" + sessionId);
        await sess.clearStorageData();
      } catch (_err) {
        // Non-fatal — partition may already be gone
      }
      // Delete partition folder with retries to handle delayed handle release.
      // Electron stores persist:<id> partitions under Partitions/persist/<id>.
      const partitionsBase = path.resolve(join(app.getPath("userData"), "Partitions"));
      const partitionFolderPath = path.resolve(partitionsBase, 'persist', sessionId);
      if (!partitionFolderPath.startsWith(partitionsBase + path.sep)) {
        return { success: false, error: "Path validation failed." };
      }
      const maxAttempts = 5;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await rimraf(partitionFolderPath);
          return { success: true };
        } catch (err: any) {
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            return { success: false, error: `Could not delete session data: ${err?.message ?? String(err)}` };
          }
        }
      }
      return { success: true };
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
      const parsed = JSON.parse(config);
      saveConfig(parsed);
      neuzosConfig = parsed;
      checkKeybinds();
      registerKeybinds();
      mainWindow?.webContents?.send("event.config_changed", config);
    });

    ipcMain.handle("config.export", async (event, payload: ConfigExportPayloadV2) => {
      try {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return {success: false, error: 'Invalid export payload.'};
        }

        const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow
        const saveOptions = {
          defaultPath: `neuzos-config-export-${new Date().toISOString().slice(0, 10)}.json`,
          filters: [{name: 'JSON', extensions: ['json']}],
        };
        const saveResult = await (parentWindow
          ? dialog.showSaveDialog(parentWindow, saveOptions)
          : dialog.showSaveDialog(saveOptions));

        if (saveResult.canceled || !saveResult.filePath) {
          return {success: false, error: 'canceled'};
        }

        await fs.promises.writeFile(saveResult.filePath, JSON.stringify(payload, null, 2), 'utf8');
        return {success: true, filePath: saveResult.filePath};
      } catch (error: any) {
        return {success: false, error: error?.message ?? String(error)};
      }
    });

    ipcMain.handle("config.import", async (event) => {
      try {
        const openWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
        const openOptions = {
          properties: ['openFile' as const],
          filters: [{name: 'JSON', extensions: ['json']}],
        };
        const openResult = await (openWindow
          ? dialog.showOpenDialog(openWindow, openOptions)
          : dialog.showOpenDialog(openOptions));

        if (openResult.canceled || openResult.filePaths.length === 0) {
          return {valid: false, error: 'canceled'};
        }

        const filePath = openResult.filePaths[0];
        const stats = await fs.promises.stat(filePath);
        if (stats.size > 5 * 1024 * 1024) {
          return {valid: false, error: 'Import file exceeds 5 MB limit.'};
        }

        const rawText = await fs.promises.readFile(filePath, 'utf8');
        let parsed: any;
        try {
          parsed = JSON.parse(rawText);
        } catch (error: any) {
          return {valid: false, error: `Invalid JSON: ${error?.message ?? String(error)}`};
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return {valid: false, error: 'Invalid config file: expected a JSON object.'};
        }

        const importedSchemaVersion = parsed.schemaVersion;
        if (typeof importedSchemaVersion !== 'number' || !Number.isFinite(importedSchemaVersion)) {
          return {valid: false, error: 'Missing or invalid schemaVersion.'};
        }

        if (typeof parsed.exportedAt !== 'string') {
          return {valid: false, error: 'Missing or invalid exportedAt.'};
        }

        let payload: ConfigImportPayload;
        if (importedSchemaVersion === 1) {
          const requiredFields: Array<[string, string]> = [
            ['sessionActions', 'array'],
            ['keyBinds', 'array'],
            ['keyBindProfiles', 'array'],
            ['activeKeyBindProfileId', 'string|null'],
          ];

          for (const [fieldName, fieldType] of requiredFields) {
            if (!(fieldName in parsed)) {
              return {valid: false, error: `Missing required field: ${fieldName}`};
            }
            const value = parsed[fieldName];
            const isArray = fieldType === 'array' && Array.isArray(value);
            const isString = fieldType === 'string' && typeof value === 'string';
            const isNumber = fieldType === 'number' && typeof value === 'number' && Number.isFinite(value);
            const isStringOrNull = fieldType === 'string|null' && (typeof value === 'string' || value === null);
            if (!(isArray || isString || isNumber || isStringOrNull)) {
              return {valid: false, error: `Invalid field type for ${fieldName}: expected ${fieldType}`};
            }
          }

          payload = {
            schemaVersion: 1,
            exportedAt: parsed.exportedAt,
            sessionActions: parsed.sessionActions,
            keyBinds: parsed.keyBinds,
            keyBindProfiles: parsed.keyBindProfiles,
            activeKeyBindProfileId: parsed.activeKeyBindProfileId,
          };
        } else {
          const categories = normalizeCategories(parsed.categories);
          payload = {
            schemaVersion: 2,
            exportedAt: parsed.exportedAt,
            categories: categories.length > 0 ? categories : inferPayloadCategories(parsed),
            ...(Array.isArray(parsed.keyBinds) ? {keyBinds: parsed.keyBinds} : {}),
            ...(Array.isArray(parsed.keyBindProfiles) ? {keyBindProfiles: parsed.keyBindProfiles} : {}),
            ...(parsed.activeKeyBindProfileId !== undefined ? {activeKeyBindProfileId: parsed.activeKeyBindProfileId} : {}),
            ...(Array.isArray(parsed.sessionActions) ? {sessionActions: parsed.sessionActions} : {}),
            ...(Array.isArray(parsed.sessionGroups) ? {sessionGroups: parsed.sessionGroups} : {}),
            ...(parsed.window !== undefined ? {window: parsed.window} : {}),
            ...(parsed.sessionZoomLevels !== undefined ? {sessionZoomLevels: parsed.sessionZoomLevels} : {}),
            ...(parsed.fullscreen !== undefined ? {fullscreen: parsed.fullscreen} : {}),
            ...(parsed.autoSaveSettings !== undefined ? {autoSaveSettings: parsed.autoSaveSettings} : {}),
            ...(parsed.defaultLaunchMode !== undefined ? {defaultLaunchMode: parsed.defaultLaunchMode} : {}),
            ...(parsed.userAgent !== undefined ? {userAgent: parsed.userAgent} : {}),
            ...(parsed.titleBarButtons !== undefined ? {titleBarButtons: parsed.titleBarButtons} : {}),
            ...(Array.isArray(parsed.questLogTemplates) ? {questLogTemplates: parsed.questLogTemplates} : {}),
          };
        }

        const warnings: string[] = [];
        if (importedSchemaVersion > 2) {
          warnings.push(`Imported schema version ${importedSchemaVersion} is newer than this app.`);
        }

        const knownSessionIds = new Set((neuzosConfig.sessions ?? []).map((session: any) => session.id));
        const orphanedSessionIds = [...new Set((payload.sessionActions ?? [])
          .map((action: any) => action?.sessionId)
          .filter((sessionId: any) => typeof sessionId === 'string' && sessionId !== '' && !knownSessionIds.has(sessionId)))];
        if (orphanedSessionIds.length > 0) {
          warnings.push(`Imported session actions reference unknown session IDs: ${orphanedSessionIds.join(', ')}`);
        }

        return {valid: true, payload, warnings} satisfies ConfigImportResult;
      } catch (error: any) {
        return {valid: false, error: error?.message ?? String(error)};
      }
    });

    ipcMain.handle("config.apply_import", async (_, args: ConfigApplyImportArgsV2) => {
      try {
        const payload = args?.payload;
        const mode = args?.mode;
        const requestedCategories = normalizeCategories(args?.categories);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || (mode !== 'replace' && mode !== 'merge') || requestedCategories.length === 0) {
          return {success: false, error: 'Invalid import payload.'};
        }

        const payloadCategories = new Set(getPayloadCategories(payload));
        const categoriesToApply = requestedCategories.filter((category) => payloadCategories.has(category));
        if (categoriesToApply.length === 0) {
          return {success: true, added: {actions: 0, binds: 0, profiles: 0}};
        }

        let addedActions = 0;
        let addedBinds = 0;
        let addedProfiles = 0;
        let didModify = false;

        const applyKeybinds = () => {
          const incomingPayload = payload as ConfigExportPayloadV2;
          if (mode === 'replace') {
            neuzosConfig.keyBinds = cloneData(incomingPayload.keyBinds ?? []);
            neuzosConfig.keyBindProfiles = cloneData(incomingPayload.keyBindProfiles ?? []);
            neuzosConfig.activeKeyBindProfileId = incomingPayload.activeKeyBindProfileId ?? null;
            didModify = true;
            return;
          }

          const incomingKeyBinds = incomingPayload.keyBinds ?? [];
          const incomingProfiles = incomingPayload.keyBindProfiles ?? [];

          const existingKeyBinds = [...(neuzosConfig.keyBinds ?? [])];
          const existingKeyBindKeys = new Set(existingKeyBinds.map((bind: any) => String(bind?.key ?? '').trim().toLowerCase()));
          for (const bind of incomingKeyBinds) {
            const normalizedKey = String(bind?.key ?? '').trim().toLowerCase();
            if (normalizedKey && !existingKeyBindKeys.has(normalizedKey)) {
              existingKeyBinds.push(cloneData(bind));
              existingKeyBindKeys.add(normalizedKey);
              addedBinds++;
              didModify = true;
            }
          }
          neuzosConfig.keyBinds = existingKeyBinds;

          const existingProfiles = [...(neuzosConfig.keyBindProfiles ?? [])];
          const existingProfileMap = new Map(existingProfiles.map((p: any) => [p?.id, p]));
          for (const importProfile of incomingProfiles) {
            const existingProfile = existingProfileMap.get(importProfile?.id);
            if (!existingProfile) {
              existingProfiles.push(cloneData(importProfile));
              existingProfileMap.set(importProfile?.id, importProfile);
              addedProfiles++;
              didModify = true;
            } else {
              const existingProfileKeybinds: any[] = existingProfile.keybinds ?? [];
              const existingBindKeys = new Set(existingProfileKeybinds.map((b: any) => String(b?.key ?? '').trim().toLowerCase()));
              let innerAdded = 0;
              for (const bind of (importProfile?.keybinds ?? [])) {
                const normalizedKey = String(bind?.key ?? '').trim().toLowerCase();
                if (normalizedKey && !existingBindKeys.has(normalizedKey)) {
                  existingProfileKeybinds.push(cloneData(bind));
                  existingBindKeys.add(normalizedKey);
                  innerAdded++;
                }
              }
              if (innerAdded > 0) {
                didModify = true;
              }
              existingProfile.keybinds = existingProfileKeybinds;
              addedProfiles += innerAdded;
            }
          }
          neuzosConfig.keyBindProfiles = existingProfiles;

          if (!neuzosConfig.activeKeyBindProfileId) {
            neuzosConfig.activeKeyBindProfileId = incomingPayload.activeKeyBindProfileId ?? null;
            didModify = true;
          }
        };

        const applySessionActions = () => {
          const incomingPayload = payload as ConfigExportPayloadV2;
          if (mode === 'replace') {
            neuzosConfig.sessionActions = cloneData(incomingPayload.sessionActions ?? []);
            didModify = true;
            return;
          }

          const existingSessionActions = [...(neuzosConfig.sessionActions ?? [])];
          const existingSessionMap = new Map(existingSessionActions.map((sa: any) => [sa?.sessionId, sa]));
          for (const importSA of (incomingPayload.sessionActions ?? [])) {
            const existing = existingSessionMap.get(importSA?.sessionId);
            if (!existing) {
              existingSessionActions.push(cloneData(importSA));
              existingSessionMap.set(importSA?.sessionId, importSA);
              addedActions++;
              didModify = true;
            } else {
              const existingActions: any[] = existing.actions ?? [];
              const existingActionIds = new Set(existingActions.map((a: any) => a?.id));
              for (const action of (importSA?.actions ?? [])) {
                if (action?.id && !existingActionIds.has(action.id)) {
                  existingActions.push(cloneData(action));
                  existingActionIds.add(action.id);
                  addedActions++;
                  didModify = true;
                }
              }
              existing.actions = existingActions;
            }
          }
          neuzosConfig.sessionActions = existingSessionActions;
        };

        const applyUiLayout = () => {
          const incomingPayload = payload as ConfigExportPayloadV2;
          const knownSessionIds = new Set((neuzosConfig.sessions ?? []).map((session: any) => session.id));
          if (incomingPayload.window !== undefined) {
            neuzosConfig.window = cloneData(incomingPayload.window);
            didModify = true;
          }

          if (incomingPayload.sessionZoomLevels !== undefined) {
            const filteredZoomLevels: Record<string, number> = {};
            for (const [sessionId, zoomLevel] of Object.entries(incomingPayload.sessionZoomLevels ?? {})) {
              if (knownSessionIds.has(sessionId)) {
                filteredZoomLevels[sessionId] = zoomLevel as number;
              }
            }
            neuzosConfig.sessionZoomLevels = filteredZoomLevels;
            didModify = true;
          }

          if (incomingPayload.fullscreen !== undefined) {
            neuzosConfig.fullscreen = cloneData(incomingPayload.fullscreen);
            didModify = true;
          }

          if (Array.isArray(incomingPayload.sessionGroups)) {
            const normalizedIncomingGroups = normalizeSessionGroups(incomingPayload.sessionGroups, knownSessionIds);
            if (mode === 'replace') {
              neuzosConfig.sessionGroups = normalizedIncomingGroups;
            } else {
              const existingGroups = [...(neuzosConfig.sessionGroups ?? [])];
              const existingGroupMap = new Map(existingGroups.map((group: any) => [group.id, group]));

              for (const importGroup of normalizedIncomingGroups) {
                const existingGroup = existingGroupMap.get(importGroup.id);
                if (!existingGroup) {
                  const nextGroup = cloneData({
                    ...importGroup,
                    sessionIds: [...importGroup.sessionIds],
                  });
                  existingGroups.push(nextGroup);
                  existingGroupMap.set(nextGroup.id, nextGroup);
                } else {
                  existingGroup.label = importGroup.label ?? existingGroup.label;
                  existingGroup.sessionIds = [...importGroup.sessionIds];
                }
              }

              neuzosConfig.sessionGroups = existingGroups;
            }
            didModify = true;
          }
        };

        const applyGeneralSettings = () => {
          const incomingPayload = payload as ConfigExportPayloadV2;
          if (incomingPayload.autoSaveSettings !== undefined) {
            neuzosConfig.autoSaveSettings = incomingPayload.autoSaveSettings;
            didModify = true;
          }
          if (incomingPayload.defaultLaunchMode !== undefined) {
            const allowedLaunchModes = ['normal', 'session_launcher'];
            if (allowedLaunchModes.includes(incomingPayload.defaultLaunchMode as string)) {
              neuzosConfig.defaultLaunchMode = incomingPayload.defaultLaunchMode;
              didModify = true;
            }
          }
          if (typeof incomingPayload.userAgent === 'string' && incomingPayload.userAgent.length <= 1024) {
            neuzosConfig.userAgent = incomingPayload.userAgent;
            didModify = true;
          }
          if (incomingPayload.titleBarButtons !== undefined) {
            neuzosConfig.titleBarButtons = cloneData(incomingPayload.titleBarButtons);
            didModify = true;
          }
        };

        for (const category of categoriesToApply) {
          switch (category) {
            case 'keybinds':
              applyKeybinds();
              break;
            case 'session-actions':
              applySessionActions();
              break;
            case 'ui-layout':
              applyUiLayout();
              break;
            case 'general-settings':
              applyGeneralSettings();
              break;
            case 'quest-log':
              break;
          }
        }

        if (didModify) {
          saveConfig(neuzosConfig);
          checkKeybinds();
          registerKeybinds();
          mainWindow?.webContents?.send("event.config_changed", JSON.stringify(neuzosConfig));
        }

        return mode === 'merge'
          ? {success: true, added: {actions: addedActions, binds: addedBinds, profiles: addedProfiles}}
          : {success: true};
      } catch (error: any) {
        return {success: false, error: error?.message ?? String(error)};
      }
    });

    ipcMain.handle("config.set_session_zoom", async (_, sessionId: string, zoomLevel: number) => {
      try {
        if (typeof sessionId !== 'string' || sessionId.trim() === '') {
          return {success: false, error: 'Invalid session ID.'};
        }
        if (typeof zoomLevel !== 'number' || !Number.isFinite(zoomLevel) || zoomLevel < 0.5 || zoomLevel > 1.5) {
          return {success: false, error: 'Invalid zoom level.'};
        }

        neuzosConfig.sessionZoomLevels = neuzosConfig.sessionZoomLevels ?? {};
        neuzosConfig.sessionZoomLevels[sessionId] = zoomLevel;
        saveConfig(neuzosConfig);
        mainWindow?.webContents?.send("event.config_changed", JSON.stringify(neuzosConfig));
        return {success: true};
      } catch (error: any) {
        return {success: false, error: error?.message ?? String(error)};
      }
    });

    ipcMain.handle("config.set_sync_receiver", async (_, sessionId: string | null) => {
      try {
        neuzosConfig.syncReceiverSessionId = sessionId ?? null;
        saveConfig(neuzosConfig);
        mainWindow?.webContents?.send("event.sync_receiver_changed", sessionId ?? null);
      } catch (err) {
        console.error("Failed to update sync receiver:", err);
      }
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

    ipcMain.handle("config.get_available_ui_actions", async () => {
      return Object.values(allowedUiActionKeybinds);
    });

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

        let userAgent: string;
        try {
          userAgent = testWindow.webContents.getUserAgent();
        } finally {
          testWindow.destroy();
        }

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
