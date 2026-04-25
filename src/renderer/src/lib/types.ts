import NeuzClient from "../components/Shared/NeuzClient.svelte";

export type IconFilter = {
  [key: string]: string;
} | null | undefined;

export type NeuzIcon = {
  slug: string;
  filter?: IconFilter;
}

export type SessionHealthStatus = 'healthy' | 'crashed' | 'load-failed' | 'unresponsive';

export type NeuzSession = {
  id: string;
  label: string
  icon: NeuzIcon;
  floatable?: boolean;
  srcOverwrite?: string;
  partitionOverwrite?: string;
}

export type NeuzSessionState = {
  running: boolean;
}

export type NeuzSessionGroup = {
  id: string;
  label: string;
  sessionIds: string[];
}

export type NeuzLayout = {
  id: string;
  label: string;
  icon: NeuzIcon;
  rows: {
    sessionIds: string[]
  }[]
  locked?: boolean
  columnFirst?: boolean
  autoFocus?: boolean
}

export type ViewerWindowType = 'navi_guide' | 'flyffipedia';

export type ViewerWindowConfig = {
  x: number | null;
  y: number | null;
  width: number;
  height: number;
  alwaysOnTop: boolean;
}

export type MainWindowState = {
  config: (NeuzConfig & {
    changed: boolean
  })
  sessions: NeuzSession[]
  layouts: NeuzLayout[]
  tabs: {
    layoutOrder: string[]
    layoutsIds: string[]
    visible: boolean
    activeLayoutId: string | null
    previousLayoutId: string | null
  }
  doCalculationUpdatesRng: number
  sessionsLayoutsRef: {
    [key: string]: {
      healthStatus?: SessionHealthStatus;
      healthDetail?: string;
      layouts: {
        [key: string]: Partial<NeuzClient>
      }
    }
  }
}

export type ConfigExportPayload = {
  schemaVersion: 1;
  exportedAt: string;
  sessionActions: SessionActions[];
  keyBinds: NeuzKeybind[];
  keyBindProfiles: NeuzKeyBindProfile[];
  activeKeyBindProfileId: string | null;
}

export type ExportCategory =
  | 'keybinds'
  | 'session-actions'
  | 'ui-layout'
  | 'general-settings'
  | 'quest-log'

export type ConfigExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  categories: ExportCategory[];
  _sanitized?: true;

  keyBinds?: NeuzKeybind[];
  keyBindProfiles?: NeuzKeyBindProfile[];
  activeKeyBindProfileId?: string | null;
  sessionActions?: SessionActions[];
  sessionGroups?: NeuzSessionGroup[];
  window?: NeuzConfig['window'];
  sessionZoomLevels?: Record<string, number>;
  fullscreen?: NeuzConfig['fullscreen'];
  autoSaveSettings?: boolean;
  defaultLaunchMode?: NeuzConfig['defaultLaunchMode'];
  userAgent?: string;
  titleBarButtons?: NeuzConfig['titleBarButtons'];
  questLogTemplates?: never[];
}

export type ConfigImportPayload = ConfigExportPayload | ConfigExportPayloadV2;

export type ConfigImportResult =
  | { valid: true; payload: ConfigImportPayload; warnings: string[] }
  | { valid: false; error: string }

export type ConfigApplyImportArgsV2 = {
  payload: ConfigImportPayload;
  mode: 'replace' | 'merge';
  categories: ExportCategory[];
}

export type ConfigApplyImportArgs = ConfigApplyImportArgsV2;

export type CategoryPreviewResult = {
  category: ExportCategory;
  foundInFile: boolean;
  type: 'list' | 'object';
  newCount?: number;
  conflictCount?: number;
  totalCount?: number;
  skippedSessionIds?: string[];
  willReplace?: boolean;
}

export type SanitizationResult = {
  payload: ConfigExportPayloadV2;
  sanitized: boolean;
}

export type SessionAction = {
  id: string;
  icon: NeuzIcon;
  label: string;
  ingameKey: string;
  castTime: number;
  cooldown: number;
  pinned?: boolean;
  cooldownCategory?: string;
}

export type SessionActions = {
  sessionId: string;
  actions: SessionAction[];
}

export type UIActionDescriptor = {
  id: string;
  label: string;
  category: string;
  defaultKey?: string;
};

export type UIActionHandler = () => void;

export type NeuzKeybind = {
  key: string;
  event: string;
  args?: string[];
}

export type NeuzKeyBindProfile = {
  id: string;
  name: string;
  keybinds: NeuzKeybind[];
}

export type NeuzConfig = {
  window?: {
    main: {
      width: number;
      height: number;
      zoom: number;
      maximized: boolean;
    },
    settings: {
      width: number;
      height: number;
      zoom: number;
      maximized: boolean;
    },
    session: {
      width: number;
      height: number;
      zoom: number;
      maximized: boolean;
    },
    viewers?: Record<ViewerWindowType, ViewerWindowConfig>;
    sidebarSide?: 'left' | 'right';
  },
  autoSaveSettings: boolean;
  userAgent?: string;
  defaultLaunchMode: 'normal' | 'session_launcher'
  chromium: {
    commandLineSwitches: string[]
  }
  sessions: NeuzSession[]
  layouts: NeuzLayout[]
  defaultLayouts: string[]
  keyBindProfiles: NeuzKeyBindProfile[]
  activeKeyBindProfileId?: string | null
  keyBinds: NeuzKeybind[]
  syncReceiverSessionId?: string | null
  sessionActions: SessionActions[];
  sessionGroups?: NeuzSessionGroup[];
  sessionZoomLevels?: { [sessionId: string]: number };
  titleBarButtons: {
    darkModeToggle: boolean;
    fullscreenToggle: boolean;
    keybindToggle: boolean;
  };
  fullscreen?: {
    hideTitleBarInMainWindow: boolean;
    hideTitleBarInSessionLayouts: boolean;
  };
}
