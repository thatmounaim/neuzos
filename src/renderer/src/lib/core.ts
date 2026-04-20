import type {IpcRenderer} from "@electron-toolkit/preload";
import type {ConfigApplyImportArgs, ConfigExportPayload, ConfigImportResult} from "$lib/types";

let electronApi: IpcRenderer | undefined = undefined;

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
    setZoom: (sessionId: string, zoomLevel: number) => {
      return electronApi?.invoke("config.set_session_zoom", sessionId, zoomLevel) ?? Promise.resolve({success: false, error: "Electron API unavailable"});
    }
  },
  backup: {
    export: (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      return electronApi?.invoke("config.export") ?? Promise.resolve({success: false, error: "Electron API unavailable"});
    },
    import: (): Promise<ConfigImportResult> => {
      return electronApi?.invoke("config.import") ?? Promise.resolve({valid: false, error: "Electron API unavailable"});
    },
    applyImport: (payload: ConfigExportPayload, mode: ConfigApplyImportArgs["mode"]): Promise<{ success: boolean; error?: string; added?: { actions: number; binds: number; profiles: number } }> => {
      return electronApi?.invoke("config.apply_import", {payload, mode} satisfies ConfigApplyImportArgs) ?? Promise.resolve({success: false, error: "Electron API unavailable"});
    }
  },
  sessionWindow: {
    popout: (sessionId: string) => {
      electronApi?.send("session.popout", sessionId);
    },
    toggleShortcuts: (enabled: boolean) => {
      electronApi?.send("session_window.toggle_shortcuts", enabled);
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
