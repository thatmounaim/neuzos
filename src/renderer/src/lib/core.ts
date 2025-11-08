import type {IpcRenderer} from "@electron-toolkit/preload";
import type {NeuzLayout} from "$lib/types";

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
    clearCache: (sessionId: string) => {
      electronApi?.send("session.clear_cache", sessionId);
    },
    clearStorage: (sessionId: string) => {
      electronApi?.send("session.clear_storage", sessionId);
    }
  },
  sessionWindow: {
    popout: (sessionId: string) => {
      electronApi?.send("session.popout", sessionId);
    },
  }
}

export type NeuzosBridge = typeof neuzosBridge;

