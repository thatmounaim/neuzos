import NeuzClient from "../components/Shared/NeuzClient.svelte";

export type IconFilter = {
  [key: string]: string;
} | null | undefined;

export type NeuzIcon = {
  slug: string;
  filter?: IconFilter;
}

export type NeuzSession = {
  id: string;
  label: string
  icon: NeuzIcon;
  srcOverwrite?: string;
  partitionOverwrite?: string;
}

export type NeuzSessionState = {
  running: boolean;
}

export type NeuzLayout = {
  id: string;
  label: string;
  icon: NeuzIcon;
  rows: {
    sessionIds: string[]
  }[]
  locked?: boolean
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
      layouts: {
        [key: string]: Partial<NeuzClient>
      }
    }
  }
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

export type NeuzConfig = {
  window?: {
    main: {
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
    }
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
  keyBinds: {
    key: string,
    event: string,
    args?: string[]
  }[]
  sessionActions: SessionActions[];
  titleBarButtons: {
    darkModeToggle: boolean;
    fullscreenToggle: boolean;
    keybindToggle: boolean;
  };
}
