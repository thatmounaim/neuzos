# Data Model: Integrated Wiki & Sheet Viewer

**Phase 1 — Entities, Types & State**
**Date**: 2026-04-20

---

## New Types (`src/renderer/src/lib/types.ts`)

### `ViewerWindowType`

```typescript
export type ViewerWindowType = 'navi_guide' | 'flyffipedia';
```

Discriminates between the two viewer windows throughout the codebase.

---

### `ViewerWindowConfig`

Persisted state for one viewer window. Stored in `NeuzConfig.window.viewers` keyed by `ViewerWindowType`.

```typescript
export type ViewerWindowConfig = {
  x: number | null;         // Screen x position; null = use system default (centered)
  y: number | null;         // Screen y position; null = use system default (centered)
  width: number;            // Window width in pixels; default 1100
  height: number;           // Window height in pixels; default 700
  alwaysOnTop: boolean;     // Whether the window floats above all other windows; default true
};
```

---

### `NeuzConfig` extension — `window.viewers`

Add to the existing `NeuzConfig.window` shape in `types.ts`:

```typescript
viewers?: {
  navi_guide?: ViewerWindowConfig;
  flyffipedia?: ViewerWindowConfig;
};
```

Full `window` shape after this feature:

```typescript
window?: {
  main:     { width: number; height: number; zoom: number; maximized: boolean };
  settings: { width: number; height: number; zoom: number; maximized: boolean };
  session:  { width: number; height: number; zoom: number; maximized: boolean };
  viewers?: {
    navi_guide?:  ViewerWindowConfig;
    flyffipedia?: ViewerWindowConfig;
  };
};
```

---

### `SheetTab`

Represents one Navi's Bestiary sheet entry. Defined as a constant array (not persisted).

```typescript
export type SheetTab = {
  label: string;  // Human-readable name shown in the tab bar
  gid: string;    // Google Sheet GID (numeric string)
};
```

**Constant registry** (defined in the viewer renderer component):

```typescript
export const NAVI_BESTIARY_BASE_URL =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vQ8eNyPRo38JZA7ACZbCNJ1MYsW1nqhVnV8pHWv-GBEx7W8jf2-UGwWr6QCEwUBr5QmCj12_wKxtE9v/' +
  'pubhtml';

export const FLYFFIPEDIA_URL = 'https://flyffipedia.com';

export const NAVI_BESTIARY_SHEETS: SheetTab[] = [
  { label: 'Info',             gid: '1445446233' },
  { label: 'Flaris',           gid: '847581642'  },
  { label: 'Saint Morning',    gid: '1302951859' },
  { label: 'Garden of Rhisis', gid: '401038439'  },
  { label: 'Darkon 1',         gid: '1370974934' },
  { label: 'Darkon 2',         gid: '490029852'  },
  { label: 'Darkon 3',         gid: '1680017461' },
  { label: 'Deadwalderness',   gid: '723316797'  },
  { label: 'Azria',            gid: '588348548'  },
  { label: 'Coral Island',     gid: '1664847440' },
  { label: 'Kaillun',          gid: '657250296'  },
];
```

---

## Default Config Values

Add to `defaultNeuzosConfig` in `src/main/index.ts`:

```typescript
// inside defaultNeuzosConfig.window (after session: {...})
viewers: {
  navi_guide: {
    x: null,
    y: null,
    width: 1100,
    height: 700,
    alwaysOnTop: true,
  },
  flyffipedia: {
    x: null,
    y: null,
    width: 1100,
    height: 700,
    alwaysOnTop: true,
  },
},
```

---

## State Entities (Renderer — not persisted)

### Viewer Renderer Mount State

Held in `$state` runes within the viewer renderer's root `Viewer.svelte`:

```typescript
let viewerType: ViewerWindowType;          // Set once on mount from URL query param
let activeGid: string = '';               // Active sheet GID (navi_guide only); empty = use first
let isLoading: boolean = false;           // True while webview is navigating
let loadError: string | null = null;      // Error message if navigation failed
let alwaysOnTop: boolean = true;          // Reflects current always-on-top state (initialised from config)
```

---

## Sidebar Side Preference

Stored in **localStorage** within the existing `questPanel` key (extends the existing persisted state shape):

```typescript
// Extends the existing PersistedState in questPanelContext.svelte.ts
interface PersistedState {
  // ... existing fields ...
  sidebarSide: 'left' | 'right';  // NEW — default: 'left'
}
```

Default: `'left'`.

The `questPanelContext` exposes it as reactive state:
```typescript
// New getter/setter in questPanelContext API
get sidebarSide(): 'left' | 'right'
setSidebarSide(side: 'left' | 'right'): void
```

---

## Validation Rules

| Field | Rule |
|---|---|
| `ViewerWindowConfig.width` | Must be ≥ 400 (prevents unusable window) |
| `ViewerWindowConfig.height` | Must be ≥ 300 |
| `ViewerWindowConfig.x / y` | If non-null, must land within available screen bounds; otherwise reset to null (centred) |
| `SheetTab.gid` | Treated as opaque string; no validation beyond non-empty |
| `sidebarSide` | One of `'left'` | `'right'`; defaults to `'left'` on invalid value |

---

## State Transitions

### Viewer Window Lifecycle

```
[Closed / Not created]
        │
        │  IPC: viewer_window.open(type)
        ▼
[Creating — BrowserWindow instantiated, alwaysOnTop=true, loading viewer.html?type=...]
        │
        │  ready-to-show
        ▼
[Open — webview loading initial URL]
        │
        │  dom-ready → insertCSS
        ▼
[Content Visible — Google chrome hidden]
        │
        ├──  Tab click → navigate webview → isLoading=true → dom-ready → insertCSS → isLoading=false
        │
        ├──  Toggle always-on-top → IPC: viewer_window.set_always_on_top → BrowserWindow.setAlwaysOnTop()
        │
        ├──  Window move/resize → Main saves debounced position + size to config
        │
        │  IPC: viewer_window.close OR titlebar close button
        ▼
[Closed — BrowserWindow destroyed, reference removed from map]
```
