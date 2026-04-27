import type {IpcRenderer} from "@electron-toolkit/preload";
import type {ConfigApplyImportArgsV2, ConfigExportPayloadV2, ConfigImportResult, ConfigImportPayload, ExportCategory, NeuzKeybind, UIActionDescriptor} from "$lib/types";
import type {ViewerWindowConfig, ViewerWindowType} from "./types";

let electronApi: IpcRenderer | undefined = undefined;

type SessionCloneResult =
  | { success: true; stoppedBeforeClone: boolean; newId: string }
  | { success: false; error: string };

export function initElectronApi(ipcRenderer: IpcRenderer) {
  electronApi = ipcRenderer;
}

export const neuzosBridge = {
  mainWindow: {
    close: () => {
      electronApi?.send("main_window.close");
    },
    minimize: () => {
      electronApi?.send("main_window.minimize");
    },
    maximize: () => {
      electronApi?.send("main_window.maximize");
    },
    reloadConfig: () => {
      electronApi?.send("main_window.reload_config");
    },
    fullscreenToggle: () => {
      electronApi?.send("main_window.fullscreen_toggle");
    },
    toggleShortcuts: (enabled: boolean) => {
      electronApi?.send("main_window.toggle_shortcuts", enabled);
    }
  },
  settingsWindow: {
    open: () => {
      electronApi?.send("settings_window.open");
    },
    close: () => {
      electronApi?.send("settings_window.close");
    },
    minimize: () => {
      electronApi?.send("settings_window.minimize");
    },
    maximize: () => {
      electronApi?.send("settings_window.maximize");
    },
  },
  preferences: {
    setThemeMode: (themeMode: 'dark' | 'light' | 'system') => {
      electronApi?.send("preferences.set_theme_mode", themeMode);
    }
  },
  layouts: {
    add: (layoutId: string) => {
      electronApi?.send("tabs.add", layoutId);
    },
    close: (layoutId: string) => {
      electronApi?.send("tabs.close", layoutId);
    },
    switch: (layoutId: string) => {
      electronApi?.send("tabs.switch", layoutId);
    },
    closeAll: () => {
      electronApi?.send("tabs.close_all");
    }
  },
  keybinds: {
    dispatch: (bind: NeuzKeybind) => {
      // Spread into a plain object to avoid Svelte $state Proxy serialization error
      electronApi?.send("keybinds.dispatch", { key: bind.key, event: bind.event, args: bind.args });
    }
  },
  sessions: {
    stop: (sessionId: string) => {
      electronApi?.send("session.stop", sessionId);
    },
    start: (sessionId: string, layoutId: string) => {
      electronApi?.send("session.start", sessionId, layoutId);
    },
    restart: (sessionId: string, layoutId: string) => {
      electronApi?.send("session.restart", sessionId, layoutId);
    },
    clearCache: (sessionId: string) => {
      electronApi?.send("session.clear_cache", sessionId);
    },
    clearStorage: (sessionId: string) => {
      electronApi?.send("session.clear_storage", sessionId);
    },
    getRunningIds: (): Promise<string[]> => {
      return electronApi?.invoke("session.get_running_ids") ?? Promise.resolve([]);
    },
    clone: (sourceId: string): Promise<SessionCloneResult> => {
      return electronApi?.invoke("session.clone", sourceId) ?? Promise.resolve({ success: false, error: "Electron API unavailable" });
    },
    deleteSession: (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      return electronApi?.invoke("session.delete", sessionId) ?? Promise.resolve({ success: false, error: "Electron API unavailable" });
    },
    setZoom: (sessionId: string, zoomLevel: number) => {
      return electronApi?.invoke("config.set_session_zoom", sessionId, zoomLevel) ?? Promise.resolve({success: false, error: "Electron API unavailable"});
    },
    setSyncReceiver: (sessionId: string | null) => {
      electronApi?.invoke("config.set_sync_receiver", sessionId);
    }
  },
  backup: {
    export: (payload: ConfigExportPayloadV2): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      return electronApi?.invoke("config.export", payload) ?? Promise.resolve({success: false, error: "Electron API unavailable"});
    },
    import: (): Promise<ConfigImportResult> => {
      return electronApi?.invoke("config.import") ?? Promise.resolve({valid: false, error: "Electron API unavailable"});
    },
    applyImport: (payload: ConfigImportPayload, mode: ConfigApplyImportArgsV2["mode"], categories: ExportCategory[]): Promise<{ success: boolean; error?: string; added?: { actions: number; binds: number; profiles: number } }> => {
      return electronApi?.invoke("config.apply_import", {payload, mode, categories} satisfies ConfigApplyImportArgsV2) ?? Promise.resolve({success: false, error: "Electron API unavailable"});
    }
  },
  sessionWindow: {
    popout: (sessionId: string) => {
      electronApi?.send("session.popout", sessionId);
    },
    toggleShortcuts: (enabled: boolean) => {
      electronApi?.send("session_window.toggle_shortcuts", enabled);
    }
  },
  uiActions: {
    getRegistry: (): Promise<UIActionDescriptor[]> => {
      return electronApi?.invoke("config.get_available_ui_actions") ?? Promise.resolve([]);
    }
  },
  viewerWindow: {
    open: (type: ViewerWindowType) => {
      electronApi?.send('viewer_window.open', type);
    },
    close: () => {
      electronApi?.send('viewer_window.close');
    },
    minimize: () => {
      electronApi?.send('viewer_window.minimize');
    },
    setAlwaysOnTop: (alwaysOnTop: boolean) => {
      electronApi?.send('viewer_window.set_always_on_top', alwaysOnTop);
    },
    getConfig: (): Promise<{ type: ViewerWindowType; config: ViewerWindowConfig } | { error: string }> => {
      return electronApi?.invoke('viewer_window.get_config') ?? Promise.resolve({ error: 'Electron API unavailable' });
    }
  },
  sidebarPanel: {
    getSide: (): Promise<'left' | 'right'> => {
      return electronApi?.invoke('sidebar_panel.get_side') ?? Promise.resolve('left');
    },
    setSide: (side: 'left' | 'right') => {
      electronApi?.send('sidebar_panel.set_side', side);
    }
  },
  config: {
    save: (config: object): Promise<void> => {
      return electronApi?.invoke('config.save', JSON.stringify(config)) ?? Promise.resolve();
    }
  }
}

export const flyffRegistry = {
  check: (): Promise<boolean> => {
    return electronApi?.invoke('registry.check') ?? Promise.resolve(false);
  },
  load: (): Promise<any | null> => {
    return electronApi?.invoke('registry.load') ?? Promise.resolve(null);
  },
  build: (): Promise<{ success: boolean; registry?: any; error?: string }> => {
    return electronApi?.invoke('registry.build') ?? Promise.resolve({ success: false });
  },
  rebuild: (): Promise<{ success: boolean; registry?: any; error?: string }> => {
    return electronApi?.invoke('registry.rebuild') ?? Promise.resolve({ success: false });
  },
  onProgress: (callback: (progress: any) => void): (() => void) => {
    const listener = (_: any, progress: any) => callback(progress);
    electronApi?.on('registry:progress', listener);
    return () => electronApi?.removeListener?.('registry:progress', listener);
  },
};

export type NeuzosBridge = typeof neuzosBridge;
