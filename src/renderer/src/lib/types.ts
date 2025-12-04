import NeuzClient from "../components/MainWindow/NeuzClient.svelte";

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

export type NeuzConfig = {
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
}
