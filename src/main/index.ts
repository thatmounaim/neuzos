import {app, shell, BrowserWindow, Menu, dialog, session, ipcMain, globalShortcut, screen, protocol} from "electron";
import {join} from "path";
import * as path from "node:path";
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
  // SEC-004: corsEnabled is false so game webviews (universe.flyff.com) cannot\n  // fetch local registry assets cross-origin. Only trusted renderer contexts need\n  // these files and they do not require CORS headers.\n  { scheme: 'flyff-asset', privileges: { standard: true, secure: true, corsEnabled: false, supportFetchAPI: true } },
]);

// Performance Presets System
app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");

const allowedCommandLineSwitches = [
  // Thanks to Kumara finding this one flag to be useful
  //{flag: "site-per-process", description: "Enable site isolation for each site"},
  // 🚀 Rendering / GPU Performance
  {flag: "force_high_performance_gpu", description: "Forces the Application to use the Dedicated GPU instead of an Integrated GPU on Hybrid Systems like Laptops.", tooltip: "This ensures Maximum Graphical Performance and avoids the Application running on the slower Integrated GPU."},
  //{flag: "force_low_power_gpu", description: "Use integrated GPU on hybrid systems"},
  {flag: "enable-gpu-rasterization", description: "Enables GPU Rasterization.", tooltip: "Forces the GPU to perform Rasterization instead of the CPU, which can significantly improve Rendering Performance in Graphics-Heavy Applications."},
  {flag: "enable-zero-copy", description: "Enables Zero-Copy Texture Uploads.", tooltip: "Allows the GPU to access Textures directly instead of copying them multiple times between CPU and GPU Memory, reducing Memory Bandwidth Usage and improving WebGL Performance."},
  // {flag: "enable-gpu-compositing", description: "Force GPU compositing"},
  //{flag: "enable-native-gpu-memory-buffers", description: "Use native GPU memory buffers"},
  {flag: "enable-oop-rasterization", description: "Enables Out-Of-Process Rasterization.", tooltip: "Moves Rasterization into a separate GPU Process, improving Stability because Rasterization Crashes will not crash the Main Application."},
  {flag: "enable-accelerated-2d-canvas", description: "Enables GPU Acceleration for HTML5 2D Canvas Rendering.", tooltip: "Offloads Canvas Rendering Operations such as Shapes, Images, and Animations to the GPU, significantly improving Canvas Performance."},
  //{flag: "enable-accelerated-video-decode", description: "Use GPU for video decoding"},
  {flag: "disable-software-rasterizer", description: "Disables the Software Rasterizer Fallback.", tooltip: "Prevents Chromium from falling back to CPU Rendering if GPU Acceleration fails, forcing the Application to use GPU Rendering only."},
  //{flag: "enforce-gl-minimums", description: "Enforce OpenGL minimum requirements"},
  //{flag: "enable-webgl-draft-extensions", description: "Enable experimental WebGL extensions"},
  {flag: "enable-gpu-memory-buffer-compositor-resources", description: "Enables GPU Memory Buffers for Compositor Resources.", tooltip: "Improves Memory Sharing between the GPU and Compositor, reducing Copy Overhead and increasing Rendering Efficiency."},
  // {flag: "enable-gpu-memory-buffer-video-frames", description: "GPU memory buffer for video frames"},
  //{flag: "video-capture-use-gpu-memory-buffer", description: "Use GPU memory buffer for video capture"},

  // 🧠 GPU Stability & Speed
  {flag: "ignore-gpu-blocklist", description: "Ignores Chromium's GPU Blocklist.", tooltip: "Forces GPU Features to remain enabled even on unsupported Hardware or Drivers. This may improve Performance but can reduce Stability."},
  {flag: "enable-gpu-driver-workarounds", description: "Enables GPU Driver Workarounds.", tooltip: "Keeps Chromium's Driver-Specific Compatibility Fixes enabled to improve Stability on GPUs with known Driver Issues."},
  //{flag: "enable-unsafe-webgpu", description: "Enable unsafe WebGPU features"},

  // ⚡ FPS & Frame Timing
  {flag: "disable-frame-rate-limit", description: "Disables the Internal Frame Rate Limit.", tooltip: "Allows the Application to render Frames as fast as possible instead of respecting an internal FPS Limit."},
  {flag: "disable-gpu-vsync", description: "Disables GPU Vertical Synchronization (VSync).", tooltip: "Removes VSync to allow uncapped Frame Rates, which may improve Responsiveness but can cause Screen Tearing."},
  //{flag: "enable-fast-unload", description: "Speeds up tab/window destruction"},
  {flag: "disable-backgrounding-occluded-windows", description: "Disables Background Throttling for Occluded Windows.", tooltip: "Prevents Windows that are covered or hidden from being throttled, allowing them to continue Rendering at full Performance."},

  // 💤 Prevent Throttling / Background Slowdown
  {flag: "disable-background-timer-throttling", description: "Disables Background Timer Throttling.", tooltip: "Prevents JavaScript Timers from being slowed down while the Application is running in the Background."},
  {flag: "disable-renderer-backgrounding", description: "Disables Renderer Background Prioritization.", tooltip: "Keeps the Renderer Process running at full CPU Priority even when the Application is minimized or inactive."},
  {flag: "enable-gpu-shader-disk-cache", description: "Enables the GPU Shader Disk Cache.", tooltip: "Stores compiled GPU Shaders on Disk to reduce Shader Compilation Times, improve Startup Performance, and minimize Rendering Stutter."},

  // 🔧 Misc Performance Tweaks
  //{flag: "disable-low-res-tiling", description: "Avoid low-resolution tiles"},
  {flag: "enable-threaded-compositing", description: "Enables Threaded Compositing.", tooltip: "Moves Compositing Tasks onto multiple Threads to improve Rendering Performance and Application Responsiveness."},
  {flag: "max-active-webgl-contexts=16", description: "Sets the Maximum Number of active WebGL Contexts to 16.", tooltip: "Allows up to 16 simultaneous WebGL Contexts, which is useful for Applications using multiple WebGL Canvases."},
  {flag: "max-active-webgl-contexts=32", description: "Sets the Maximum Number of active WebGL Contexts to 32.", tooltip: "Allows up to 32 simultaneous WebGL Contexts for Applications with heavy WebGL Usage."},
  //{flag: "no-proxy-server", description: "Reduce network latency from proxy lookups"},
  {flag: "enable-low-end-device-mode", description: "Enables Low-End Device Optimizations.", tooltip: "Reduces Memory Usage and simplifies Rendering to improve Performance on Low-End Hardware."},
];

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let sessionWindow: BrowserWindow | null = null;
const sessionWindows = new Map<string, BrowserWindow>();
let sessionLauncherWindow: BrowserWindow | null = null;
let lastKeybindToggleAt = 0;

type ViewerWindowType = 'navi_guide' | 'flyffipedia';
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

const viewerWindows: Map<ViewerWindowType, BrowserWindow> = new Map();
const viewerBoundsSaveTimers: Map<ViewerWindowType, ReturnType<typeof setTimeout>> = new Map();
const viewerLocalStorageKeys: Record<ViewerWindowType, string> = {
  navi_guide: 'widget.viewer.naviGuide',
  flyffipedia: 'widget.viewer.flyffipedia',
};
const viewerWindowConfigCache: Record<ViewerWindowType, ViewerWindowConfig> = {
  navi_guide: {...defaultViewerWindowConfig},
  flyffipedia: {...defaultViewerWindowConfig},
};

let exitCount: number = 0;
let mainWindowShortcutsEnabled: boolean = true;
let sessionWindowShortcutsEnabled: boolean = true;

const runningSessionIds = new Set<string>();
// Tracks sessions actively being deleted so session.clear_cache does not recreate their partition folder
const deletingSessionIds = new Set<string>();

/**
 * SEC-001: Only allow http/https URLs to be opened externally.
 * Prevents exploitation via dangerous protocol handlers (ms-msdt:, search-ms:,
 * telnet:, file:, etc.) that could be triggered by a malicious game webview page.
 */
function openExternalSafe(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      console.warn('[openExternalSafe] Blocked non-http(s) URL:', url);
      return;
    }
  } catch {
    console.warn('[openExternalSafe] Blocked malformed URL:', url);
    return;
  }
  shell.openExternal(url);
}

function getSessionPartitionPaths(sessionId: string): { partitionsBase: string; paths: string[] } {
  const partitionsBase = path.resolve(join(app.getPath("userData"), "Partitions"));
  const candidates = [
    path.resolve(partitionsBase, sessionId),
    path.resolve(partitionsBase, 'persist', sessionId),
  ];
  const paths = Array.from(new Set(candidates)).filter((candidate) => candidate.startsWith(partitionsBase + path.sep));
  return { partitionsBase, paths };
}

function pruneSessionReferences(config: any): void {
  const knownSessionIds = new Set<string>((config.sessions ?? []).map((session: any) => session.id as string));

  if (Array.isArray(config.layouts)) {
    config.layouts = config.layouts.map((layout: any) => {
      const rows = Array.isArray(layout?.rows)
        ? layout.rows
            .map((row: any) => {
              const sessionIds = Array.isArray(row?.sessionIds)
                ? row.sessionIds.filter((id: string) => knownSessionIds.has(id))
                : [];
              return { ...row, sessionIds };
            })
            .filter((row: any) => row.sessionIds.length > 0)
        : [];
      const nextLayout = { ...layout, rows };
      if (nextLayout.mutedSessionIds !== undefined) {
        delete nextLayout.mutedSessionIds;
      }

      return nextLayout;
    });
  }

  if (Array.isArray(config.sessionActions)) {
    config.sessionActions = config.sessionActions.filter((entry: any) => knownSessionIds.has(entry?.sessionId));
  }

  if (Array.isArray(config.sessions)) {
    config.sessions = config.sessions.map((sessionConfig: any) => {
      const cleanedSession = {...sessionConfig};
      if (typeof cleanedSession.zoom !== 'number' || !Number.isFinite(cleanedSession.zoom) || cleanedSession.zoom === 1.0) {
        delete cleanedSession.zoom;
      }
      if (cleanedSession.muted !== true) {
        delete cleanedSession.muted;
      }
      return cleanedSession;
    });
  }

  if (config.sessionZoomLevels !== undefined) {
    delete config.sessionZoomLevels;
  }

  if (config.syncReceiverSessionId && !knownSessionIds.has(config.syncReceiverSessionId)) {
    config.syncReceiverSessionId = null;
  }

  config.sessionGroups = normalizeSessionGroups(config.sessionGroups, knownSessionIds);
}

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
  | 'sessions'
  | 'layouts'
  | 'general-settings'
  | 'launch-settings'
  | 'ui-layout';

type ConfigExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  categories: ExportCategory[];
  _sanitized?: true;
  keyBinds?: any[];
  keyBindProfiles?: any[];
  activeKeyBindProfileId?: string | null;
  sessions?: any[];
  layouts?: any[];
  defaultLayouts?: string[];
  sessionActions?: any[];
  sessionGroups?: any[];
  window?: any;
  fullscreen?: any;
  autoSaveSettings?: boolean;
  autoDeleteAllCachesOnStartup?: boolean;
  defaultLaunchMode?: string;
  chromium?: { commandLineSwitches?: string[] };
  userAgent?: string;
  titleBarButtons?: any;
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

const exportCategoryOrder: ExportCategory[] = ['general-settings', 'sessions', 'layouts', 'keybinds', 'session-actions', 'launch-settings'];
const legacyCategoryOrder: ExportCategory[] = ['ui-layout'];
const exportCategorySet = new Set<ExportCategory>([...exportCategoryOrder, ...legacyCategoryOrder]);

function isExportCategory(value: unknown): value is ExportCategory {
  return typeof value === 'string' && exportCategorySet.has(value as ExportCategory);
}

function normalizeCategories(categories: unknown): ExportCategory[] {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories.filter(isExportCategory);
}

function expandLegacyCategories(categories: ExportCategory[]): ExportCategory[] {
  const expanded = new Set<ExportCategory>();
  for (const category of categories) {
    if (category === 'ui-layout') {
      expanded.add('general-settings');
      expanded.add('sessions');
      expanded.add('layouts');
      continue;
    }
    expanded.add(category);
  }

  return exportCategoryOrder.filter((category) => expanded.has(category));
}

function inferPayloadCategories(payload: any): ExportCategory[] {
  const categories: ExportCategory[] = [];

  if (Array.isArray(payload?.keyBinds) || Array.isArray(payload?.keyBindProfiles) || payload?.activeKeyBindProfileId !== undefined) {
    categories.push('keybinds');
  }
  if (Array.isArray(payload?.sessionActions)) {
    categories.push('session-actions');
  }
  if (payload?.window !== undefined || payload?.autoSaveSettings !== undefined || payload?.autoDeleteAllCachesOnStartup !== undefined || payload?.titleBarButtons !== undefined || payload?.fullscreen !== undefined) {
    categories.push('general-settings');
  }
  if (Array.isArray(payload?.sessions) || Array.isArray(payload?.sessionGroups)) {
    categories.push('sessions');
  }
  if (Array.isArray(payload?.layouts) || Array.isArray(payload?.defaultLayouts)) {
    categories.push('layouts');
  }
  if (payload?.defaultLaunchMode !== undefined || payload?.userAgent !== undefined || payload?.chromium !== undefined) {
    categories.push('launch-settings');
  }

  return categories;
}

function getPayloadCategories(payload: ConfigImportPayload): ExportCategory[] {
  if (payload.schemaVersion === 1) {
    return ['keybinds', 'session-actions'];
  }

  const explicitCategories = normalizeCategories(payload.categories);
  return explicitCategories.length > 0 ? expandLegacyCategories(explicitCategories) : inferPayloadCategories(payload);
}

function cloneData<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function getKeybindSignature(keybind: any): string {
  const key = String(keybind?.key ?? '').trim().toLowerCase();
  const event = String(keybind?.event ?? '').trim().toLowerCase();
  return key && event ? `${key}::${event}` : '';
}

function getKeybindKey(keybind: any): string {
  return String(keybind?.key ?? '').trim().toLowerCase();
}

function isUniqueGlobalKeybindEvent(event: string): boolean {
  return event === 'ui.toggle_quest_log' || Boolean((allowedEventKeybinds as Record<string, any>)[event]?.unique);
}

function normalizeSessionGroups(groups: unknown, knownSessionIds: Set<string>): any[] {
  if (!Array.isArray(groups)) {
    return [];
  }

  let hasUngroupedMarker = false;
  return groups.flatMap<any>((group: any) => {
    if (!group || typeof group !== 'object') {
      return [];
    }

    const id = typeof group.id === 'string' && group.id.trim() !== '' ? group.id.trim() : null;
    if (!id) {
      return [];
    }

    if (id === 'ungrouped' || group.type === 'ungrouped') {
      if (hasUngroupedMarker) {
        return [];
      }
      hasUngroupedMarker = true;
      return [{id: 'ungrouped'}];
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
  autoDeleteAllCachesOnStartup: false,
  defaultLaunchMode: "normal",
  chromium: {
    commandLineSwitches: []
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
      "key": "CommandOrControl+Delete",
      "event": "close_focus_session"
    },
    {
      "key": "F11",
      "event": "fullscreen_toggle"
    }
  ],
  syncReceiverSessionId: null,
  sessionActions: [],
  sessionGroups: [],
  pendingPartitionDeletes: [],
  titleBarButtons: {
    darkModeToggle: false,
    fullscreenToggle: true,
    keybindToggle: true,
  },
  fullscreen: {
    hideTitleBarInMainWindow: true,
    hideTitleBarInSessionLayouts: true,
  },
};

const allowedEventKeybinds = {
  "layout_swap": {
    label: "Swap to Previous Layout",
    unique: true,
  },
  "layout_cycle_forward": {
    label: "Cycle Layout Forward",
    unique: true,
  },
  "layout_cycle_backward": {
    label: "Cycle Layout Backward",
    unique: true,
  },
  "fullscreen_toggle": {
    label: "Toggle Fullscreen",
    unique: true,
  },
  "close_focus_session": {
    label: "Close Focus Session",
    unique: true,
  },
  "toggle_keybinds": {
    label: "Enable / Disable Keybinds",
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
const configDirectoryPath = path.join(userDataPath, "/neuzos_config/");
const registryDirectoryPath = path.join(userDataPath, "flyff-registry");

if (!app.getPath("userData").includes("neuzos_config")) {
  fs.mkdirSync(configDirectoryPath, {recursive: true});
}


function saveConfig(conf: any): void {
  console.log("Saving config...");
  const configPath = path.join(configDirectoryPath, "/config.json");
  console.log("Saving config to:", configPath);
  fs.writeFileSync(configPath, JSON.stringify(cleanConfigForSave(conf), null, 2));
}

function cleanConfigForSave(conf: any): any {
  const cleaned = JSON.parse(JSON.stringify(conf));

  if (cleaned.changed !== undefined) {
    delete cleaned.changed;
  }

  if (cleaned.window?.sidebarSide !== undefined) {
    delete cleaned.window.sidebarSide;
  }

  if (cleaned.window?.viewers !== undefined) {
    delete cleaned.window.viewers;
  }

  if (cleaned.sessionZoomLevels !== undefined) {
    delete cleaned.sessionZoomLevels;
  }

  if (cleaned.window && Object.keys(cleaned.window).length === 0) {
    delete cleaned.window;
  }

  if (cleaned.autoSaveSettings === false) {
    delete cleaned.autoSaveSettings;
  }

  if (cleaned.autoDeleteAllCachesOnStartup === false) {
    delete cleaned.autoDeleteAllCachesOnStartup;
  }

  if (cleaned.defaultLaunchMode === 'normal') {
    delete cleaned.defaultLaunchMode;
  }

  if (cleaned.chromium?.commandLineSwitches !== undefined && Array.isArray(cleaned.chromium.commandLineSwitches) && cleaned.chromium.commandLineSwitches.length === 0) {
    delete cleaned.chromium.commandLineSwitches;
  }

  if (cleaned.chromium && Object.keys(cleaned.chromium).length === 0) {
    delete cleaned.chromium;
  }

  if (cleaned.syncReceiverSessionId === null) {
    delete cleaned.syncReceiverSessionId;
  }

  if (Array.isArray(cleaned.pendingPartitionDeletes) && cleaned.pendingPartitionDeletes.length === 0) {
    delete cleaned.pendingPartitionDeletes;
  }

  if (Array.isArray(cleaned.sessionGroups)) {
    cleaned.sessionGroups = cleaned.sessionGroups.map((group: any) => {
      if (group?.id === 'ungrouped' || group?.type === 'ungrouped') {
        return {id: 'ungrouped'};
      }
      return group;
    });
  }

  if (Array.isArray(cleaned.sessions)) {
    cleaned.sessions = cleaned.sessions.map((sessionConfig: any) => {
      const cleanedSession = {...sessionConfig};
      if (cleanedSession.floatable === false) {
        delete cleanedSession.floatable;
      }
      if (cleanedSession.autoDeleteCache === false) {
        delete cleanedSession.autoDeleteCache;
      }
      if (typeof cleanedSession.zoom !== 'number' || !Number.isFinite(cleanedSession.zoom) || cleanedSession.zoom === 1.0) {
        delete cleanedSession.zoom;
      }
      if (cleanedSession.muted !== true) {
        delete cleanedSession.muted;
      }
      return cleanedSession;
    });
  }

  if (Array.isArray(cleaned.layouts)) {
    cleaned.layouts = cleaned.layouts.map((layout: any) => {
      const cleanedLayout = {...layout};
      if (cleanedLayout.mutedSessionIds !== undefined) {
        delete cleanedLayout.mutedSessionIds;
      }
      return cleanedLayout;
    });
  }

  return orderConfigForSave(cleaned);
}

function orderConfigForSave(config: any): any {
  const ordered: any = {};
  const keyOrder = [
    'syncReceiverSessionId',
    'activeKeyBindProfileId',
    'autoSaveSettings',
    'autoDeleteAllCachesOnStartup',
    'window',
    'titleBarButtons',
    'fullscreen',
    'sessions',
    'sessionGroups',
    'defaultLayouts',
    'layouts',
    'keyBindProfiles',
    'keyBinds',
    'sessionActions',
    'defaultLaunchMode',
    'userAgent',
    'chromium',
  ];

  for (const key of keyOrder) {
    if (config[key] !== undefined) {
      ordered[key] = config[key];
    }
  }

  for (const key of Object.keys(config)) {
    if (!(key in ordered)) {
      ordered[key] = config[key];
    }
  }

  return ordered;
}

function cleanConfigExportPayload(payload: ConfigExportPayloadV2): ConfigExportPayloadV2 {
  const cleaned = JSON.parse(JSON.stringify(payload));

  if (cleaned.changed !== undefined) {
    delete cleaned.changed;
  }

  if (cleaned.window?.sidebarSide !== undefined) {
    delete cleaned.window.sidebarSide;
  }

  if (cleaned.window?.viewers !== undefined) {
    delete cleaned.window.viewers;
  }

  if (cleaned.sessionZoomLevels !== undefined) {
    delete cleaned.sessionZoomLevels;
  }

  if (cleaned.window && Object.keys(cleaned.window).length === 0) {
    delete cleaned.window;
  }

  if (cleaned.chromium?.commandLineSwitches !== undefined && Array.isArray(cleaned.chromium.commandLineSwitches) && cleaned.chromium.commandLineSwitches.length === 0) {
    delete cleaned.chromium.commandLineSwitches;
  }

  if (cleaned.chromium && Object.keys(cleaned.chromium).length === 0) {
    delete cleaned.chromium;
  }

  if (Array.isArray(cleaned.sessionGroups)) {
    cleaned.sessionGroups = cleaned.sessionGroups.map((group: any) => {
      if (group?.id === 'ungrouped' || group?.type === 'ungrouped') {
        return {id: 'ungrouped'};
      }
      return group;
    });
  }

  if (Array.isArray(cleaned.layouts)) {
    cleaned.layouts = cleaned.layouts.map((layout: any) => {
      const cleanedLayout = {...layout};
      if (cleanedLayout.mutedSessionIds !== undefined) {
        delete cleanedLayout.mutedSessionIds;
      }
      return cleanedLayout;
    });
  }

  return cleaned;
}

function loadConfig(reload: boolean = false): Promise<any> {
  return new Promise((resolve, reject) => {
    if (neuzosConfig && !reload) {
      resolve(neuzosConfig);
    } else {
      console.log("Loading config...");
      const configPath = path.join(configDirectoryPath, "/config.json");
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
          if (neuzosConfig.changed !== undefined) {
            delete neuzosConfig.changed;
          }
          neuzosConfig.sessionGroups = neuzosConfig.sessionGroups ?? [];
          if (neuzosConfig.sessionZoomLevels !== undefined) {
            delete neuzosConfig.sessionZoomLevels;
          }
          neuzosConfig.pendingPartitionDeletes = Array.isArray(neuzosConfig.pendingPartitionDeletes)
            ? [...new Set(neuzosConfig.pendingPartitionDeletes.filter((sessionId: any) => typeof sessionId === 'string'))]
            : [];

          // Deep merge window config specifically
          if (loadedWindow) {
            neuzosConfig.window = {
              ...defaultNeuzosConfig.window,
              ...loadedWindow,
              main: {...(defaultNeuzosConfig.window?.main || {}), ...(loadedWindow.main || {})},
              settings: {...(defaultNeuzosConfig.window?.settings || {}), ...(loadedWindow.settings || {})},
              session: {...(defaultNeuzosConfig.window?.session || {}), ...(loadedWindow.session || {})},
            };
            delete neuzosConfig.window.viewers;
          }

          pruneSessionReferences(neuzosConfig);

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

async function cleanupQueuedSessionPartitions(config: any): Promise<void> {
  const queuedSessionIds: string[] = Array.isArray(config?.pendingPartitionDeletes)
    ? [...new Set<string>(config.pendingPartitionDeletes.filter((sessionId: any) => typeof sessionId === 'string') as string[])]
    : [];

  if (queuedSessionIds.length === 0) {
    return;
  }

  const stillQueued: string[] = [];
  for (const sessionId of queuedSessionIds) {
    try {
      const { paths: partitionPathCandidates } = getSessionPartitionPaths(sessionId);
      const partitionPaths = partitionPathCandidates.filter((partitionPath) => fs.existsSync(partitionPath));
      for (const partitionPath of partitionPaths) {
        await rimraf(partitionPath, { maxRetries: 6, retryDelay: 1500 });
      }
      const recreatedPath = partitionPaths.find((partitionPath) => fs.existsSync(partitionPath));
      if (recreatedPath) {
        stillQueued.push(sessionId);
      }
    } catch {
      stillQueued.push(sessionId);
    }
  }

  config.pendingPartitionDeletes = stillQueued;
  saveConfig(config);
}

function sanitizeViewerWindowConfig(value: any): ViewerWindowConfig {
  return {
    x: typeof value?.x === 'number' ? value.x : null,
    y: typeof value?.y === 'number' ? value.y : null,
    width: typeof value?.width === 'number' && value.width > 0 ? value.width : defaultViewerWindowConfig.width,
    height: typeof value?.height === 'number' && value.height > 0 ? value.height : defaultViewerWindowConfig.height,
    alwaysOnTop: typeof value?.alwaysOnTop === 'boolean' ? value.alwaysOnTop : defaultViewerWindowConfig.alwaysOnTop,
  };
}

function setViewerWindowConfigCache(type: ViewerWindowType, value: Partial<ViewerWindowConfig> | undefined): ViewerWindowConfig {
  viewerWindowConfigCache[type] = sanitizeViewerWindowConfig({
    ...viewerWindowConfigCache[type],
    ...(value || {}),
  });
  return viewerWindowConfigCache[type];
}

function parseViewerWindowConfig(value: string | null | undefined): Partial<ViewerWindowConfig> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function getViewerWindowConfig(type: ViewerWindowType): ViewerWindowConfig {
  return viewerWindowConfigCache[type] ?? {...defaultViewerWindowConfig};
}

function getLocalStorageWindow(): BrowserWindow | null {
  const candidates = [mainWindow, settingsWindow, ...viewerWindows.values()];
  return candidates.find((win) => win && !win.isDestroyed() && !win.webContents.isDestroyed()) ?? null;
}

function escapeJavaScriptString(value: string): string {
  return JSON.stringify(value);
}

function syncViewerWindowConfigToLocalStorage(type: ViewerWindowType): void {
  const win = getLocalStorageWindow();
  if (!win) {
    return;
  }

  const key = viewerLocalStorageKeys[type];
  const value = JSON.stringify(getViewerWindowConfig(type));
  void win.webContents.executeJavaScript(
    `window.localStorage.setItem(${escapeJavaScriptString(key)}, ${escapeJavaScriptString(value)})`,
    true,
  ).catch((error: any) => {
    console.warn('Failed to sync viewer window config to Local Storage:', error);
  });
}


async function readViewerWindowConfigFromLocalStorage(type: ViewerWindowType): Promise<Partial<ViewerWindowConfig> | null> {
  const win = getLocalStorageWindow();
  if (!win) {
    return null;
  }

  try {
    const key = viewerLocalStorageKeys[type];
    const value = await win.webContents.executeJavaScript(
      `window.localStorage.getItem(${escapeJavaScriptString(key)})`,
      true,
    );
    return parseViewerWindowConfig(typeof value === 'string' ? value : null);
  } catch (error) {
    console.warn('Failed to read viewer window config from Local Storage:', error);
    return null;
  }
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

function sendViewerWindowStateChanged(): void {
  mainWindow?.webContents.send('viewer_window.state_changed');
  settingsWindow?.webContents.send('viewer_window.state_changed');
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
  setViewerWindowConfigCache(type, {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    alwaysOnTop: win.isAlwaysOnTop(),
  });
  syncViewerWindowConfigToLocalStorage(type);
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

async function createViewerWindow(type: ViewerWindowType): Promise<BrowserWindow | null> {
  const existingWindow = viewerWindows.get(type);
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus();
    return existingWindow;
  }

  const storedConfig = await readViewerWindowConfigFromLocalStorage(type);
  setViewerWindowConfigCache(type, storedConfig ?? defaultViewerWindowConfig);

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
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
      zoomFactor: 1.0,
    }
  });

  (window as any).viewerType = type;
  viewerWindows.set(type, window);
  sendViewerWindowStateChanged();

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

    sendViewerWindowStateChanged();
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
    openExternalSafe(details.url);
    return {action: 'deny'};
  });

  const viewerUrl = is.dev && process.env["ELECTRON_RENDERER_URL"]
    ? `${process.env["ELECTRON_RENDERER_URL"]}/viewer.html?type=${type}`
    : `${pathToFileURL(path.join(__dirname, "../renderer/viewer.html")).href}?type=${type}`;

  window.webContents.loadURL(viewerUrl).catch((error) => {
    console.error('Failed to load viewer window:', error);
  });

  return window;
}


function createSettingsWindow(initialTab?: string): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    if (initialTab) {
      settingsWindow.webContents.send("settings_window.set_tab", initialTab);
    }
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
      preload: path.join(__dirname, "../preload/index.js"),
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
    if (initialTab) {
      settingsWindow?.webContents.send("settings_window.set_tab", initialTab);
    }

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
    openExternalSafe(details.url);
    return {action: "deny"};
  });

  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    settingsWindow.webContents.loadURL(process.env["ELECTRON_RENDERER_URL"] + "/settings.html");
  } else {
    settingsWindow.webContents.loadFile(path.join(__dirname, "../renderer/settings.html"));
  }
}

function createSessionLauncherWindow(): void {
  if (sessionLauncherWindow && !sessionLauncherWindow.isDestroyed()) {
    sessionLauncherWindow.focus();
    return;
  }

  // Small window for session launcher
  sessionLauncherWindow = new BrowserWindow({
    width: 600,
    height: 400,
    minWidth: 600,
    minHeight: 400,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    resizable: true,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      zoomFactor: neuzosConfig.window.main.zoom ?? 1.0,
    }
  });

  // Single-click exit for session launcher
  sessionLauncherWindow.on("close", () => {
    globalShortcut.unregisterAll();
  });

  // Fix for MacOS Command Shortcuts
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
  } else {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{role: "appMenu"}, {role: "editMenu"}]));
    sessionLauncherWindow.setMenuBarVisibility(false);
  }

  sessionLauncherWindow.on("ready-to-show", () => {
    sessionLauncherWindow?.show();
    sessionLauncherWindow?.webContents.setZoomFactor(neuzosConfig.window.main.zoom)
  });

  sessionLauncherWindow.on("closed", () => {
    sessionLauncherWindow = null;
  });

  sessionLauncherWindow.webContents.setWindowOpenHandler((details) => {
    openExternalSafe(details.url);
    return {action: "deny"};
  });

  // Load the session launcher HTML
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    sessionLauncherWindow.webContents.loadURL(process.env["ELECTRON_RENDERER_URL"] + "/session_launcher.html");
  } else {
    sessionLauncherWindow.webContents.loadFile(path.join(__dirname, "../renderer/session_launcher.html"));
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

  const existingSessionWindow = sessionWindows.get(sessionId);
  if (existingSessionWindow && !existingSessionWindow.isDestroyed()) {
    sessionWindow = existingSessionWindow;
    existingSessionWindow.focus();
    return;
  }

  // Determine if we should start fullscreen
  const startFullscreen = mode === 'focus_fullscreen';

  // Create the session window
  const window = new BrowserWindow({
    width: neuzosConfig.window.session.width,
    height: neuzosConfig.window.session.height,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    fullscreen: startFullscreen,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
      partition: `persist:${sessionId}`,
      zoomFactor: neuzosConfig.window.session.zoom ?? 1.0,
    }
  });
  sessionWindow = window;
  sessionWindows.set(sessionId, window);

  // Exit behavior similar to main window
  window.on("close", (event) => {
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
    window.setMenuBarVisibility(false);
  }

  window.on("ready-to-show", () => {
    window.show();
    window.webContents.setZoomFactor(neuzosConfig.window.session.zoom);

    // Maximize if configured and not starting in fullscreen - must happen after show() with slight delay
    if (!startFullscreen && neuzosConfig.window.session.maximized) {
      setImmediate(() => {
        if (!window.isDestroyed()) {
          window.maximize();
        }
      });
    }
  });

  window.on("closed", () => {
    // Ensure shortcuts are unregistered when session window is destroyed
    globalShortcut.unregisterAll();
    sessionWindows.delete(sessionId);
    if (sessionWindow === window) {
      sessionWindow = null;
    }
  });

  window.on("focus", () => {
    sessionWindow = window;
    registerSessionKeybinds(mode);
  });

  // Track fullscreen state changes
  window.on("enter-full-screen", () => {
    window.webContents.send("event.fullscreen_changed", true);
  });

  window.on("leave-full-screen", () => {
    window.webContents.send("event.fullscreen_changed", false);
  });

  window.webContents.setWindowOpenHandler((details) => {
    openExternalSafe(details.url);
    return {action: "deny"};
  });

  // Store session data for IPC handlers
  (window as any).sessionData = {
    mode,
    sessionId,
    sessionConfig: sessionData
  };

  // Load the session HTML
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    window.webContents.loadURL(process.env["ELECTRON_RENDERER_URL"] + "/session.html");
  } else {
    window.webContents.loadFile(path.join(__dirname, "../renderer/session.html"));
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
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
      zoomFactor: neuzosConfig.window.main.zoom ?? 1.0,
    }
  });

  mainWindow.webContents.on('console-message', (event) => {
    const messageEvent = event as any;
    console.log(`[renderer:${messageEvent.level}] ${messageEvent.message} (${messageEvent.sourceId}:${messageEvent.lineNumber})`);
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
    openExternalSafe(details.url);
    return {action: "deny"};
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.webContents.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.webContents.loadFile(path.join(__dirname, "../renderer/index.html"));
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

  const globalOnlyKeybindEvents = [
    "ui.toggle_quest_log",
    "fullscreen_toggle",
    "close_focus_session",
    "toggle_keybinds",
    "layout_swap",
    "layout_switch",
    "layout_cycle_forward",
    "layout_cycle_backward",
  ];

  globalOnlyKeybindEvents.forEach((event) => {
    const profileBind = neuzosConfig.keyBindProfiles
      .flatMap((profile: any) => profile.keybinds ?? [])
      .find((bind: any) => bind?.event === event && typeof bind?.key === "string" && bind.key !== "");
    const hasGlobalBind = neuzosConfig.keyBinds.some((bind: any) => bind?.event === event);

    if (profileBind && !hasGlobalBind) {
      neuzosConfig.keyBinds.push({
        key: profileBind.key,
        event,
        args: Array.isArray(profileBind.args) ? profileBind.args : undefined,
      });
    }
  });

  neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind: any) => {
    return allowedKeybindEvents.has(bind.event);
  })

  neuzosConfig.keyBindProfiles.forEach((profile: any) => {
    profile.keybinds = (profile.keybinds ?? []).filter((bind: any) => {
      return allowedKeybindEvents.has(bind.event) && !globalOnlyKeybindEvents.includes(bind.event);
    });
  });

  // filter empty keybinds
  neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
    return bind.key !== "";
  })

  // filter empty event
  neuzosConfig.keyBinds = neuzosConfig.keyBinds.filter((bind) => {
    return bind.event !== "";
  })
}

function closeFocusSessionWindow() {
  const mode = (sessionWindow as any)?.sessionData?.mode as LaunchMode | undefined;
  if (mode !== 'focus' && mode !== 'focus_fullscreen') {
    return;
  }

  globalShortcut.unregisterAll();
  sessionWindow?.destroy();
  sessionWindow = null;
}

function setMainWindowShortcutsEnabled(enabled: boolean) {
  mainWindowShortcutsEnabled = enabled;
  if (enabled) {
    registerKeybinds();
  } else {
    globalShortcut.unregisterAll();
    registerKeybindToggleShortcut();
  }
  mainWindow?.webContents.send("event.shortcuts_state_changed", enabled);
}

function registerKeybindToggleShortcut() {
  const toggleBind = neuzosConfig?.keyBinds?.find((bind: any) => bind.event === "toggle_keybinds");
  if (!toggleBind?.key || !canRegisterGlobalShortcutKey(toggleBind.key)) return;

  try {
    globalShortcut.unregister(toggleBind.key);
    globalShortcut.register(toggleBind.key, () => {
      const now = Date.now();
      if (now - lastKeybindToggleAt < 500) {
        return;
      }
      lastKeybindToggleAt = now;
      setMainWindowShortcutsEnabled(!mainWindowShortcutsEnabled);
    });
  } catch (e) {
    console.warn("Failed to register keybind toggle shortcut:", toggleBind.key, e);
  }
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
    case "close_focus_session":
      closeFocusSessionWindow();
      break;
    case "toggle_keybinds":
      {
        const now = Date.now();
        if (now - lastKeybindToggleAt < 500) {
          break;
        }
        lastKeybindToggleAt = now;
      }
      setMainWindowShortcutsEnabled(!mainWindowShortcutsEnabled);
      break;
    case "layout_swap":
      mainWindow?.webContents.send("event.layout_swap");
      break;
    case "layout_cycle_forward":
      mainWindow?.webContents.send("event.layout_cycle_forward");
      break;
    case "layout_cycle_backward":
      mainWindow?.webContents.send("event.layout_cycle_backward");
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

const inputFallbackKeybindKeys = new Set(["delete", "^", "<", ">", ".", "`", "\u00b4", "\u00df"]);

function isInputFallbackKeybind(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return inputFallbackKeybindKeys.has(normalizedKey);
}

function canRegisterGlobalShortcutKey(key: string): boolean {
  const normalizedKey = String(key).toLowerCase();
  return (
    normalizedKey !== "middle" &&
    !normalizedKey.startsWith("mouse") &&
    !normalizedKey.startsWith("gamepad") &&
    !isInputFallbackKeybind(normalizedKey)
  );
}

function normalizeWebviewInputKey(input: any): string | null {
  let key = "";

  if (input.code === "Backquote") {
    key = input.shift ? "`" : "^";
  } else if (input.code === "Equal") {
    key = input.shift ? "`" : "\u00b4";
  } else if (input.code === "IntlBackslash") {
    key = input.shift ? ">" : "<";
  } else if (input.code === "Minus") {
    key = "\u00df";
  } else if (input.code === "Period") {
    key = ".";
  } else if (input.code === "Delete") {
    key = "delete";
  } else if (input.key === "Dead") {
    if (input.code === "Backquote") key = "^";
    if (input.code === "Equal") key = "\u00b4";
  } else if (input.key === "Delete") {
    key = "delete";
  } else if (typeof input.key === "string" && input.key.length === 1) {
    key = input.key.toLowerCase();
  }

  if (!key || !inputFallbackKeybindKeys.has(key)) {
    return null;
  }

  const modifiers: string[] = [];
  if (input.control || input.meta) modifiers.push("commandorcontrol");
  if (input.alt) modifiers.push("alt");
  if (input.shift) modifiers.push("shift");

  return modifiers.length > 0 ? `${modifiers.join("+")}+${key}` : key;
}

function isSettingsWindowInputWebContents(wc: Electron.WebContents): boolean {
  return settingsWindow?.webContents.id === wc.id;
}

function isSettingsWindowFocused(): boolean {
  return Boolean(settingsWindow && !settingsWindow.isDestroyed() && settingsWindow.isFocused());
}

function registerKeybinds() {
  globalShortcut.unregisterAll()

  // Config changes can request a re-registration while the separate settings
  // window has focus. Keep every key available for typing/searching there.
  if (isSettingsWindowFocused()) {
    return;
  }

  // Only register shortcuts if they are enabled for main window
  if (!mainWindowShortcutsEnabled) {
    registerKeybindToggleShortcut();
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
    if (!canRegisterGlobalShortcutKey(bind.key)) {
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
  const closeFocusSessionBind = neuzosConfig.keyBinds.find((bind: any) => bind.event === "close_focus_session");

  if (!fullscreenBind && !closeFocusSessionBind && mode !== 'focus' && mode !== 'focus_fullscreen') {
    return;
  }

  try {
    if ((mode === 'focus' || mode === 'focus_fullscreen') && closeFocusSessionBind?.key) {
      globalShortcut.register(closeFocusSessionBind.key, () => {
        closeFocusSessionWindow();
      });
    }

    switch (mode) {
      case 'session':
        // Allow fullscreen toggle
        if (fullscreenBind?.key) globalShortcut.register(fullscreenBind.key, () => {
          sessionWindow?.setFullScreen(!sessionWindow?.isFullScreen());
        });
        break;
      case 'focus':
        // Prevent fullscreen
        if (fullscreenBind?.key) globalShortcut.register(fullscreenBind.key, () => {
          // Do nothing - prevent fullscreen
        });
        break;
      case 'focus_fullscreen':
        // Prevent removing fullscreen
        if (fullscreenBind?.key) globalShortcut.register(fullscreenBind.key, () => {
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

    // Run deferred partition cleanup from previous session(s). Runs here — after Chromium
    // is ready but before any windows/sessions are created — so no utility process holds
    // handles on the target folders, and no session startup can recreate them mid-delete.
    await cleanupQueuedSessionPartitions(neuzosConfig);

    // Some keyboard keys cannot be handled reliably via globalShortcut.
    // Intercept them through before-input-event.
    app.on("web-contents-created", (_e, wc) => {
      wc.on("before-input-event", (event, input) => {
        if (input.type !== "keyDown" || (input as any).isAutoRepeat) return;
        const key = normalizeWebviewInputKey(input);
        if (!key) return;
        if (isSettingsWindowInputWebContents(wc)) return;

        // Find matching bind and dispatch
        const activeProfile = neuzosConfig?.keyBindProfiles?.find(
          (p: any) => p.id === neuzosConfig.activeKeyBindProfileId
        );
        const allBinds: any[] = [...(neuzosConfig?.keyBinds ?? []), ...(activeProfile?.keybinds ?? [])];
        const bind = allBinds.find((b: any) => b.key && b.key.toLowerCase() === key);
        if (bind) {
          if (!mainWindowShortcutsEnabled && bind.event !== "toggle_keybinds") {
            return;
          }
          event.preventDefault();
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
      const registryPath = path.join(registryDirectoryPath, 'registry.json');
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
      // SEC-002: Validate both params before using them as CLI args.
      const validModes: LaunchMode[] = ['normal', 'session_launcher', 'session', 'focus', 'focus_fullscreen'];
      if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(sessionId)) {
        console.warn('[session_launcher.launch_session] Blocked invalid sessionId:', sessionId);
        return;
      }
      if (!validModes.includes(mode)) {
        console.warn('[session_launcher.launch_session] Blocked invalid mode:', mode);
        return;
      }
      createSessionWindow(mode, sessionId);
    });

    ipcMain.on("session_launcher.close", () => {
      globalShortcut.unregisterAll();
      sessionLauncherWindow?.destroy();
      sessionLauncherWindow = null;
    });

    ipcMain.on("session_launcher.minimize", () => {
      sessionLauncherWindow?.minimize();
    });

    // Setup IPC handlers for session window
    ipcMain.handle("session_window.get_data", async (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      return (win as any)?.sessionData || null;
    });

    ipcMain.on("session_window.fullscreen_toggle", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const mode = (win as any)?.sessionData?.mode;
      if (mode === 'session') {
        const newFullscreenState = !win?.isFullScreen();
        win?.setFullScreen(newFullscreenState);
        // Event will be sent by enter-full-screen/leave-full-screen handlers
      } else if (mode === 'focus_fullscreen') {
        // Keep fullscreen
        if (!win?.isFullScreen()) {
          win?.setFullScreen(true);
        }
      }
      // For 'focus' mode, do nothing (prevent fullscreen)
    });

    ipcMain.on("session_window.minimize", (event) => {
      BrowserWindow.fromWebContents(event.sender)?.minimize();
    });

    ipcMain.on("session_window.maximize", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win?.isMaximized()) {
        win.unmaximize();
      } else {
        win?.maximize();
      }
    });

    ipcMain.on("session_window.close", (event) => {
      globalShortcut.unregisterAll();
      BrowserWindow.fromWebContents(event.sender)?.destroy();
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
    ipcMain.on("main_window.toggle_shortcuts", (_event, enabled: boolean) => {
      setMainWindowShortcutsEnabled(enabled);
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
      const mode = (win as any)?.sessionData?.mode;
      if (enabled && mode) {
        registerSessionKeybinds(mode);
      } else {
        globalShortcut.unregisterAll();
      }
      win?.webContents.send("event.shortcuts_state_changed", enabled);
    });

    ipcMain.on('viewer_window.open', async (_event, type: ViewerWindowType) => {
      try {
        if (!viewerWindowTypes.includes(type)) return;
        await createViewerWindow(type);
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

    ipcMain.on('viewer_window.close_type', (_event, type: ViewerWindowType) => {
      try {
        if (!viewerWindowTypes.includes(type)) return;
        const win = viewerWindows.get(type);
        if (win && !win.isDestroyed()) {
          win.close();
        }
      } catch (error) {
        console.error('Failed to close viewer window by type:', error);
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

    ipcMain.on('viewer_window.maximize', (event) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;

        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      } catch (error) {
        console.error('Failed to maximize viewer window:', error);
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
        setViewerWindowConfigCache(type, {
          ...getViewerWindowConfig(type),
          alwaysOnTop,
        });
        syncViewerWindowConfigToLocalStorage(type);
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

    ipcMain.handle('viewer_window.get_open_types', () => {
      return viewerWindowTypes.filter((type) => {
        const win = viewerWindows.get(type);
        return Boolean(win && !win.isDestroyed());
      });
    });

    ipcMain.handle("shortcuts.get_state", () => {
      return {
        mainWindow: mainWindowShortcutsEnabled,
        sessionWindow: sessionWindowShortcutsEnabled,
      };
    });

    ipcMain.handle("app.get_version", () => {
      return app.getVersion();
    });


    ipcMain.on("settings_window.open", (_, tab?: string) => {
      createSettingsWindow(tab);
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
      runningSessionIds.delete(sessionId);
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.stop_session", sessionId);
    });

    ipcMain.on("session.start", (event, sessionId: string, layoutId: string) => {
      runningSessionIds.add(sessionId);
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.start_session", sessionId, layoutId);
    });

    ipcMain.on("session.restart", (event, sessionId: string, layoutId: string) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.stop_session", sessionId);
      win?.webContents.send("event.start_session", sessionId, layoutId);
    });

    ipcMain.on("session.clear_storage", async function (event, sessionId: string) {
      if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(sessionId)) {
        return;
      }
      if (deletingSessionIds.has(sessionId)) {
        return;
      }
      const { paths: partitionPaths } = getSessionPartitionPaths(sessionId);
      if (partitionPaths.length === 0) {
        return;
      }
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send("event.stop_session", sessionId);

      try {
        const sess = session.fromPartition("persist:" + sessionId);
        await sess.clearStorageData();
      } catch (err) {
        console.warn("Failed to clear session storage:", err);
      }

      for (const partitionPath of partitionPaths) {
        try {
          rimraf.sync(partitionPath, {
            maxRetries: 2
          });
        } catch (err) {
          console.warn("Failed to delete partition folder:", partitionPath, err);
        }
      }
    });

    ipcMain.handle("session.delete", async function (_event, sessionId: string): Promise<{ success: boolean; error?: string; deferred?: boolean; pendingPartitionDeletes?: string[] }> {
      if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(sessionId)) {
        return { success: false, error: "Invalid session ID." };
      }
      deletingSessionIds.add(sessionId);
      try {
        const stopAckSenderIds = new Set<number>();
        if (mainWindow && !mainWindow.isDestroyed()) {
          stopAckSenderIds.add(mainWindow.webContents.id);
        }
        // Only expect ACKs from standalone session windows actually showing THIS session.
        const standaloneSessionWindow = sessionWindows.get(sessionId);
        if (standaloneSessionWindow && !standaloneSessionWindow.isDestroyed()) {
          stopAckSenderIds.add(standaloneSessionWindow.webContents.id);
        }
        const stopAckPromise = stopAckSenderIds.size === 0
          ? Promise.resolve(false)
          : new Promise<boolean>((resolve) => {
              const ackTimeoutMs = 5000;
              const pendingAckSenderIds = new Set<number>(stopAckSenderIds);
              const timeoutId = setTimeout(() => {
                cleanup();
                resolve(false);
              }, ackTimeoutMs);
              const cleanup = () => {
                clearTimeout(timeoutId);
                ipcMain.removeListener('event.stop_session_ack', ackHandler);
              };
              const ackHandler = (ackEvent: any, ackSessionId: string) => {
                if (ackSessionId !== sessionId) {
                  return;
                }
                if (!pendingAckSenderIds.has(ackEvent.sender.id)) {
                  return;
                }
                pendingAckSenderIds.delete(ackEvent.sender.id);
                if (pendingAckSenderIds.size === 0) {
                  cleanup();
                  resolve(true);
                }
              };
              ipcMain.on('event.stop_session_ack', ackHandler);
            });

        mainWindow?.webContents.send("event.stop_session", sessionId);
        standaloneSessionWindow?.webContents.send("event.stop_session", sessionId);
        const stopAckReceived = await stopAckPromise;
        if (!stopAckReceived) {
          console.warn("Timed out waiting for stop_session_ack during delete for session", sessionId);
        }

        if (standaloneSessionWindow && !standaloneSessionWindow.isDestroyed()) {
          try {
            standaloneSessionWindow.destroy();
          } catch (error) {
            console.warn("Failed to destroy session window during delete for session", sessionId, error);
          }
          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // Use an adaptive grace period: fast path when stop ACK arrived from all expected
        // windows, fallback to a longer wait when ACK timed out.
        // NOTE: session.fromPartition() is intentionally NOT called here. Calling it
        // creates the Partitions/<id> directory even for sessions that never ran, and
        // keeps Chromium's storage/network service holding file handles — the opposite of
        // what we want. The grace period + rimraf retries are sufficient for handle release.
        const graceMs = stopAckReceived ? 1200 : 4000;
        await new Promise(resolve => setTimeout(resolve, graceMs));
        runningSessionIds.delete(sessionId);

        // Delete partition folders with retries to handle delayed handle release.
        // Electron partitions may be stored under Partitions/<id> (current) or
        // legacy/variant paths such as Partitions/persist/<id>.
        const { paths: partitionPathCandidates } = getSessionPartitionPaths(sessionId);
        const partitionPaths = partitionPathCandidates.filter((partitionPath) => fs.existsSync(partitionPath));
        // BUG-014: Increase outer retries (5→8, 800ms→1200ms) and pass internal rimraf
        // retries. Also verify the folder is truly gone after rimraf returns: on Windows,
        // Chromium's LevelDB may silently recreate the partition directory after rimraf
        // unlinks its files (it detects missing files and restores the DB structure).
        // rimraf does not throw in this case — the existsSync check converts the silent
        // recreation into a throw so the retry loop re-attempts deletion.
        const maxAttempts = 8;
        let deleteResult: { success: boolean; error?: string } = { success: true };
        if (partitionPaths.length === 0) {
          deleteResult = { success: true };
        } else {
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              for (const partitionPath of partitionPaths) {
                await rimraf(partitionPath, { maxRetries: 8, retryDelay: 2000 });
              }
              const recreatedPath = partitionPaths.find((partitionPath) => fs.existsSync(partitionPath));
              if (recreatedPath) {
                throw new Error("Partition folder was recreated by Chromium/LevelDB after rimraf");
              }
              deleteResult = { success: true };
              break;
            } catch (err: any) {
              if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1200));
              } else {
                deleteResult = { success: false, error: `Could not delete session data: ${err?.message ?? String(err)}` };
              }
            }
          }
        }

        let deferred = false;
        if (deleteResult.success) {
          neuzosConfig.sessions = (neuzosConfig.sessions ?? []).filter((session: any) => session.id !== sessionId);
          neuzosConfig.pendingPartitionDeletes = Array.isArray(neuzosConfig.pendingPartitionDeletes)
            ? neuzosConfig.pendingPartitionDeletes.filter((id: string) => id !== sessionId)
            : [];
          pruneSessionReferences(neuzosConfig);
          saveConfig(neuzosConfig);
        } else {
          const deleteErrorMessage = deleteResult.error ?? "";
          const shouldDeferPartitionDeletion = /EBUSY|resource busy|locked/i.test(deleteErrorMessage);
          if (shouldDeferPartitionDeletion) {
            neuzosConfig.sessions = (neuzosConfig.sessions ?? []).filter((session: any) => session.id !== sessionId);
            const pendingDeletes = new Set<string>(Array.isArray(neuzosConfig.pendingPartitionDeletes) ? neuzosConfig.pendingPartitionDeletes : []);
            pendingDeletes.add(sessionId);
            neuzosConfig.pendingPartitionDeletes = Array.from(pendingDeletes);
            pruneSessionReferences(neuzosConfig);
            saveConfig(neuzosConfig);
            console.warn("Deferred partition deletion due to live OS file lock; queued for startup cleanup", sessionId, deleteErrorMessage);
            deleteResult = { success: true };
            deferred = true;
          }
        }
        // Return pendingPartitionDeletes so the renderer can merge it into its config
        // copy before saving — otherwise the renderer's config.save() would overwrite
        // the pendingPartitionDeletes array the main process just persisted.
        return { ...deleteResult, deferred, pendingPartitionDeletes: neuzosConfig.pendingPartitionDeletes ?? [] };
      } finally {
        deletingSessionIds.delete(sessionId);
      }
    });

    ipcMain.handle("session.get_running_ids", async (): Promise<string[]> => {
      return Array.from(runningSessionIds);
    });

    ipcMain.handle("session.clone", async (_event, sourceId: string): Promise<{ success: true; stoppedBeforeClone: boolean; newId: string } | { success: false; error: string }> => {
      if (typeof sourceId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(sourceId)) {
        return { success: false, error: 'Invalid session ID.' };
      }

      let stoppedBeforeClone = false;
      if (runningSessionIds.has(sourceId)) {
        mainWindow?.webContents.send('event.stop_session', sourceId);
        await new Promise(resolve => setTimeout(resolve, 5000));
        runningSessionIds.delete(sourceId);
        stoppedBeforeClone = true;
      }

      const newId = Date.now().toString();
      const { partitionsBase, paths: sourceCandidates } = getSessionPartitionPaths(sourceId);
      const sourcePartitionPath = sourceCandidates.find((candidate) => fs.existsSync(candidate));
      const destinationPartitionPath = path.resolve(partitionsBase, newId);

      if (!destinationPartitionPath.startsWith(partitionsBase + path.sep)) {
        return { success: false, error: 'Path validation failed.' };
      }

      // Source partition folder may not exist if the session has never been launched.
      // In that case we still create the destination dir and return success with no files copied.
      try {
        fs.mkdirSync(destinationPartitionPath, {recursive: true});
        if (!sourcePartitionPath) {
          return { success: true, stoppedBeforeClone, newId };
        }
        for (const entry of ['IndexedDB', 'Local Storage', 'Cookies']) {
          const sourceEntryPath = path.resolve(sourcePartitionPath, entry);
          if (!fs.existsSync(sourceEntryPath)) {
            continue;
          }
          const destinationEntryPath = path.resolve(destinationPartitionPath, entry);
          await fs.promises.cp(sourceEntryPath, destinationEntryPath, {recursive: true});
        }
      } catch (error: any) {
        return { success: false, error: `Could not clone session data: ${error?.message ?? String(error)}` };
      }

      return { success: true, stoppedBeforeClone, newId };
    });

    ipcMain.on("session.clear_cache", async function (_event, sessionId: string) {
      // Skip if this session is mid-delete — calling fromPartition() here would recreate
      // the partition folder that rimraf just removed (or is about to remove).
      if (deletingSessionIds.has(sessionId)) return;
      // BUG-012: Do NOT send event.stop_session back to the renderer.
      // Doing so was unnecessary for cache clearing and created an IPC feedback loop:
      // stop_session → stopClient → clearCache IPC → stop_session → …
      const sess = session.fromPartition("persist:" + sessionId);
      await sess.clearCache();
    });

    ipcMain.handle("browser.clear_cache", async function () {
      await session.fromPartition("persist:browser").clearCache();
      return true;
    });

    ipcMain.handle("viewer.clear_cache", async function () {
      await session.fromPartition("persist:viewer").clearCache();
      return true;
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

    ipcMain.handle("config.save_silent", async (_, config: any) => {
      const parsed = JSON.parse(config);
      saveConfig(parsed);
      neuzosConfig = parsed;
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
          return {success: false, error: 'Canceled.'};
        }

        await fs.promises.writeFile(saveResult.filePath, JSON.stringify(cleanConfigExportPayload(payload), null, 2), 'utf8');
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
          return {valid: false, error: 'Canceled.'};
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
            ...(Array.isArray(parsed.sessions) ? {sessions: parsed.sessions} : {}),
            ...(Array.isArray(parsed.layouts) ? {layouts: parsed.layouts} : {}),
            ...(Array.isArray(parsed.defaultLayouts) ? {defaultLayouts: parsed.defaultLayouts} : {}),
            ...(Array.isArray(parsed.sessionActions) ? {sessionActions: parsed.sessionActions} : {}),
            ...(Array.isArray(parsed.sessionGroups) ? {sessionGroups: parsed.sessionGroups} : {}),
            ...(parsed.window !== undefined ? {window: parsed.window} : {}),
            ...(parsed.fullscreen !== undefined ? {fullscreen: parsed.fullscreen} : {}),
            ...(parsed.autoSaveSettings !== undefined ? {autoSaveSettings: parsed.autoSaveSettings} : {}),
            ...(parsed.autoDeleteAllCachesOnStartup !== undefined ? {autoDeleteAllCachesOnStartup: parsed.autoDeleteAllCachesOnStartup} : {}),
            ...(parsed.defaultLaunchMode !== undefined ? {defaultLaunchMode: parsed.defaultLaunchMode} : {}),
            ...(parsed.userAgent !== undefined ? {userAgent: parsed.userAgent} : {}),
            ...(parsed.chromium !== undefined ? {chromium: parsed.chromium} : {}),
            ...(parsed.titleBarButtons !== undefined ? {titleBarButtons: parsed.titleBarButtons} : {}),
          };
        }

        const warnings: string[] = [];
        if (importedSchemaVersion > 2) {
          warnings.push(`Imported schema version ${importedSchemaVersion} is newer than this app.`);
        }

        const knownSessionIds = new Set([
          ...(neuzosConfig.sessions ?? []).map((session: any) => session.id),
          ...((payload as ConfigExportPayloadV2).sessions ?? []).map((session: any) => session?.id).filter(Boolean),
        ]);
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

    ipcMain.handle("local_storage.export", async (event, payload) => {
      try {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return {success: false, error: 'Invalid Local Storage export payload.'};
        }

        const exportPayload = payload as Record<string, any>;
        if (
          exportPayload.type !== 'neuzos-local-storage-backup'
          || exportPayload.version !== 1
          || typeof exportPayload.exportedAt !== 'string'
          || !Array.isArray(exportPayload.items)
        ) {
          return {success: false, error: 'Invalid Local Storage export payload.'};
        }

        const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
        const saveOptions = {
          defaultPath: `neuzos-local-storage-export-${new Date().toISOString().slice(0, 10)}.json`,
          filters: [{name: 'JSON', extensions: ['json']}],
        };
        const saveResult = await (parentWindow
          ? dialog.showSaveDialog(parentWindow, saveOptions)
          : dialog.showSaveDialog(saveOptions));

        if (saveResult.canceled || !saveResult.filePath) {
          return {success: false, error: 'Canceled.'};
        }

        await fs.promises.writeFile(saveResult.filePath, JSON.stringify(exportPayload, null, 2), 'utf8');
        return {success: true, filePath: saveResult.filePath};
      } catch (error: any) {
        return {success: false, error: error?.message ?? String(error)};
      }
    });

    ipcMain.handle("local_storage.import", async (event) => {
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
          return {valid: false, error: 'Canceled.'};
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
          return {valid: false, error: 'Invalid Local Storage Backup: expected a JSON object.'};
        }

        if (parsed.type !== 'neuzos-local-storage-backup' || parsed.version !== 1 || typeof parsed.exportedAt !== 'string' || !Array.isArray(parsed.items)) {
          return {valid: false, error: 'Invalid Local Storage Backup format.'};
        }

        const warnings: string[] = [];
        const seenKeys = new Set<string>();
        const items: Array<{ key: string; value: string }> = [];

        for (const item of parsed.items) {
          if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.key !== 'string' || item.key.trim() === '' || typeof item.value !== 'string') {
            warnings.push('Skipped invalid Local Storage item.');
            continue;
          }

          if (seenKeys.has(item.key)) {
            warnings.push(`Skipped duplicate Local Storage key: ${item.key}`);
            continue;
          }

          seenKeys.add(item.key);
          items.push({key: item.key, value: item.value});
        }

        return {
          valid: true,
          payload: {
            type: 'neuzos-local-storage-backup',
            version: 1,
            exportedAt: parsed.exportedAt,
            items,
          },
          items: [],
          warnings,
        };
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
          const existingKeyBindSignatures = new Set(existingKeyBinds.map((bind: any) => getKeybindSignature(bind)).filter(Boolean));
          const existingGlobalKeys = new Set(existingKeyBinds.map((bind: any) => getKeybindKey(bind)).filter(Boolean));
          const existingUniqueGlobalEvents = new Set(existingKeyBinds
            .map((bind: any) => String(bind?.event ?? '').trim())
            .filter((event: string) => isUniqueGlobalKeybindEvent(event)));
          for (const bind of incomingKeyBinds) {
            const signature = getKeybindSignature(bind);
            const key = getKeybindKey(bind);
            const event = String(bind?.event ?? '').trim();
            if (!signature || existingKeyBindSignatures.has(signature) || existingGlobalKeys.has(key) || (isUniqueGlobalKeybindEvent(event) && existingUniqueGlobalEvents.has(event))) {
              continue;
            }

            existingKeyBinds.push(cloneData(bind));
            existingKeyBindSignatures.add(signature);
            if (key) {
              existingGlobalKeys.add(key);
            }
            if (isUniqueGlobalKeybindEvent(event)) {
              existingUniqueGlobalEvents.add(event);
            }
            addedBinds++;
            didModify = true;
          }
          neuzosConfig.keyBinds = existingKeyBinds;

          const existingProfiles = [...(neuzosConfig.keyBindProfiles ?? [])];
          const existingProfileMap = new Map(existingProfiles.map((p: any) => [p?.id, p]));
          for (const importProfile of incomingProfiles) {
            const existingProfile = existingProfileMap.get(importProfile?.id);
            if (!existingProfile) {
              const clonedProfile = cloneData(importProfile);
              const profileKeybinds: any[] = [];
              const profileBindSignatures = new Set<string>();
              const profileKeys = new Set<string>();
              for (const bind of (clonedProfile?.keybinds ?? [])) {
                const signature = getKeybindSignature(bind);
                const key = getKeybindKey(bind);
                if (!signature || profileBindSignatures.has(signature) || profileKeys.has(key)) {
                  continue;
                }

                profileKeybinds.push(bind);
                profileBindSignatures.add(signature);
                if (key) {
                  profileKeys.add(key);
                }
              }
              clonedProfile.keybinds = profileKeybinds;
              existingProfiles.push(clonedProfile);
              existingProfileMap.set(clonedProfile?.id, clonedProfile);
              addedProfiles++;
              didModify = true;
            } else {
              const existingProfileKeybinds: any[] = existingProfile.keybinds ?? [];
              const existingBindSignatures = new Set(existingProfileKeybinds.map((b: any) => getKeybindSignature(b)).filter(Boolean));
              const existingProfileKeys = new Set(existingProfileKeybinds.map((b: any) => getKeybindKey(b)).filter(Boolean));
              let innerAdded = 0;
              for (const bind of (importProfile?.keybinds ?? [])) {
                const signature = getKeybindSignature(bind);
                const key = getKeybindKey(bind);
                if (!signature || existingBindSignatures.has(signature) || existingProfileKeys.has(key)) {
                  continue;
                }

                existingProfileKeybinds.push(cloneData(bind));
                existingBindSignatures.add(signature);
                if (key) {
                  existingProfileKeys.add(key);
                }
                innerAdded++;
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

        const applyGeneralSettings = () => {
          const incomingPayload = payload as ConfigExportPayloadV2;
          if (incomingPayload.window !== undefined) {
            neuzosConfig.window = cloneData(incomingPayload.window);
            didModify = true;
          }
          if (incomingPayload.autoSaveSettings !== undefined) {
            neuzosConfig.autoSaveSettings = incomingPayload.autoSaveSettings;
            didModify = true;
          }
          if (incomingPayload.autoDeleteAllCachesOnStartup !== undefined) {
            neuzosConfig.autoDeleteAllCachesOnStartup = incomingPayload.autoDeleteAllCachesOnStartup;
            didModify = true;
          }
          if (incomingPayload.titleBarButtons !== undefined) {
            neuzosConfig.titleBarButtons = cloneData(incomingPayload.titleBarButtons);
            didModify = true;
          }
          if (incomingPayload.fullscreen !== undefined) {
            neuzosConfig.fullscreen = cloneData(incomingPayload.fullscreen);
            didModify = true;
          }
        };

        const applySessions = () => {
          const incomingPayload = payload as ConfigExportPayloadV2;
          if (Array.isArray(incomingPayload.sessions)) {
            if (mode === 'replace') {
              neuzosConfig.sessions = cloneData(incomingPayload.sessions);
            } else {
              const existingSessions = [...(neuzosConfig.sessions ?? [])];
              const existingSessionIds = new Set(existingSessions.map((session: any) => session?.id));
              for (const importSession of incomingPayload.sessions) {
                if (importSession?.id && !existingSessionIds.has(importSession.id)) {
                  existingSessions.push(cloneData(importSession));
                  existingSessionIds.add(importSession.id);
                }
              }
              neuzosConfig.sessions = existingSessions;
            }
            didModify = true;
          }

          const knownSessionIds = new Set((neuzosConfig.sessions ?? []).map((session: any) => session.id));

          if (Array.isArray(incomingPayload.sessionGroups)) {
            const normalizedIncomingGroups = normalizeSessionGroups(incomingPayload.sessionGroups, knownSessionIds as Set<string>);
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

        const applyLayouts = () => {
          const incomingPayload = payload as ConfigExportPayloadV2;
          const knownSessionIds = new Set((neuzosConfig.sessions ?? []).map((session: any) => session.id));
          const normalizeLayouts = (layouts: any[]) => {
            return cloneData(layouts ?? []).map((layout: any) => {
              const rows = Array.isArray(layout?.rows)
                ? layout.rows
                    .map((row: any) => ({
                      ...row,
                      sessionIds: Array.isArray(row?.sessionIds)
                        ? row.sessionIds.filter((id: string) => knownSessionIds.has(id))
                        : [],
                    }))
                    .filter((row: any) => row.sessionIds.length > 0)
                : [];
              const nextLayout = {...layout, rows};
              if (nextLayout.mutedSessionIds !== undefined) {
                delete nextLayout.mutedSessionIds;
              }
              return nextLayout;
            });
          };

          if (Array.isArray(incomingPayload.layouts)) {
            const incomingLayouts = normalizeLayouts(incomingPayload.layouts);
            if (mode === 'replace') {
              neuzosConfig.layouts = incomingLayouts;
            } else {
              const existingLayouts = [...(neuzosConfig.layouts ?? [])];
              const existingLayoutIds = new Set(existingLayouts.map((layout: any) => layout?.id));
              for (const importLayout of incomingLayouts) {
                if (importLayout?.id && !existingLayoutIds.has(importLayout.id)) {
                  existingLayouts.push(importLayout);
                  existingLayoutIds.add(importLayout.id);
                }
              }
              neuzosConfig.layouts = existingLayouts;
            }
            didModify = true;
          }

          if (Array.isArray(incomingPayload.defaultLayouts)) {
            const knownLayoutIds = new Set((neuzosConfig.layouts ?? []).map((layout: any) => layout.id));
            const incomingDefaultLayouts = incomingPayload.defaultLayouts.filter((layoutId) => knownLayoutIds.has(layoutId));
            if (mode === 'replace') {
              neuzosConfig.defaultLayouts = incomingDefaultLayouts;
            } else {
              const defaultLayouts = [...(neuzosConfig.defaultLayouts ?? [])];
              const existingDefaultLayoutIds = new Set(defaultLayouts);
              for (const layoutId of incomingDefaultLayouts) {
                if (!existingDefaultLayoutIds.has(layoutId)) {
                  defaultLayouts.push(layoutId);
                  existingDefaultLayoutIds.add(layoutId);
                }
              }
              neuzosConfig.defaultLayouts = defaultLayouts;
            }
            didModify = true;
          }
        };

        const applyLaunchSettings = () => {
          const incomingPayload = payload as ConfigExportPayloadV2;
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
          if (incomingPayload.chromium !== undefined) {
            neuzosConfig.chromium = {
              commandLineSwitches: Array.isArray(incomingPayload.chromium?.commandLineSwitches)
                ? cloneData(incomingPayload.chromium.commandLineSwitches)
                : [],
            };
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
            case 'general-settings':
              applyGeneralSettings();
              break;
            case 'sessions':
              applySessions();
              break;
            case 'layouts':
              applyLayouts();
              break;
            case 'launch-settings':
              applyLaunchSettings();
              break;
            case 'ui-layout':
              break;
          }
        }

        if (didModify) {
          pruneSessionReferences(neuzosConfig);
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

        const sessionIndex = (neuzosConfig.sessions ?? []).findIndex((sessionConfig: any) => sessionConfig.id === sessionId);
        if (sessionIndex < 0) {
          return {success: false, error: 'Session not found.'};
        }
        if (zoomLevel === 1.0) {
          delete neuzosConfig.sessions[sessionIndex].zoom;
        } else {
          neuzosConfig.sessions[sessionIndex].zoom = zoomLevel;
        }
        saveConfig(neuzosConfig);
        mainWindow?.webContents?.send("event.config_changed", JSON.stringify(neuzosConfig));
        return {success: true};
      } catch (error: any) {
        return {success: false, error: error?.message ?? String(error)};
      }
    });

    ipcMain.handle("config.preview_session_zoom", async (_, sessionId: string, zoomLevel: number) => {
      try {
        if (typeof sessionId !== 'string' || sessionId.trim() === '') {
          return {success: false, error: 'Invalid session ID.'};
        }
        if (typeof zoomLevel !== 'number' || !Number.isFinite(zoomLevel) || zoomLevel < 0.5 || zoomLevel > 1.5) {
          return {success: false, error: 'Invalid zoom level.'};
        }

        mainWindow?.webContents?.send("event.session_zoom_preview", sessionId, zoomLevel);
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

    ipcMain.handle('app.open_config_folder', async () => {
      try {
        await shell.openPath(configDirectoryPath);
        return true;
      } catch (e) {
        console.error('Failed to open config folder:', e);
        return false;
      }
    })

    ipcMain.handle('session.open_partition_folder', async (_, sessionId: string) => {
      try {
        const { paths } = getSessionPartitionPaths(sessionId);
        const targetPath = paths.find((partitionPath) => fs.existsSync(partitionPath)) ?? paths[0];
        if (!targetPath) {
          return false;
        }
        await fs.promises.mkdir(targetPath, { recursive: true });
        await shell.openPath(targetPath);
        return true;
      } catch (e) {
        console.error('Failed to open session partition folder:', e);
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
      maximized: true,
      zoom: 1.0
    };

    const defaultSessionWindowConfig = {
      width: defaultWindowWidth,
      height: defaultWindowHeight,
      maximized: true,
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
      };
    }

    // Merge neuzosConfig with defaults (user config takes precedence)
    neuzosConfig = {...defaultNeuzosConfig, ...neuzosConfig};

    const startupCacheClearSessions = (neuzosConfig.sessions ?? []).filter((sessionConfig: any) => {
      return typeof sessionConfig?.id === 'string' &&
        (neuzosConfig.autoDeleteAllCachesOnStartup || sessionConfig.autoDeleteCache);
    });

    if (startupCacheClearSessions.length > 0) {
      void Promise.all(startupCacheClearSessions.map((sessionConfig: any) => {
        return session.fromPartition(`persist:${sessionConfig.id}`).clearCache().catch((err: any) => {
          console.warn('Startup cache clear failed for session', sessionConfig.id, err);
        });
      }));
    }

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
    delete neuzosConfig.window.viewers;
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
