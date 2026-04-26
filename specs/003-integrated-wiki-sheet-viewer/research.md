# Research: Integrated Wiki & Sheet Viewer

**Phase 0 — All Unknowns Resolved**
**Date**: 2026-04-20

---

## R-001: webview CSS Injection Mechanism

**Question**: How should CSS be injected into the `<webview>` to hide Google's chrome on each navigation?

**Decision**: Use `webviewElement.insertCSS(cssString)` (renderer-side DOM API) hooked to the `dom-ready` event, with re-injection on `did-navigate`.

**Rationale**:
- `dom-ready` fires before Google's layout scripts paint the chrome elements, minimising flash of unstyled content.
- `did-navigate` re-applies injection when the user switches sheet GIDs (each GID navigation fires a full navigation lifecycle).
- `webviewElement.insertCSS()` is the correct renderer-side API for `<webview>` elements; it does not require a round-trip to the Main process — fully self-contained in the viewer renderer.

**Alternatives considered**:
- `webContents.insertCSS()` from Main: Requires IPC from renderer to Main, then Main finding the webview's webContents. More complex, no benefit for this use case.
- `executeJavaScript` to inject a `<style>` tag: Works but creates `isTrusted: false` concerns for any future event injection; `insertCSS` is the canonical, cleaner API.

---

## R-002: Google Sheets pubhtml CSS Targets

**Question**: Which CSS selectors remove Google's navigation header and "Published by Google" footer?

**Decision**: Inject the following rule set on every `dom-ready` and `did-navigate`:

```css
/* Top navigation / header chrome */
[role="banner"],
header,
.docs-ml-header,
.docs-sheet-tab-strip,
#docs-chrome,
.publish-mode-header { display: none !important; }

/* "Published by Google" footer */
footer,
.publish-mode-footer,
[class*="footer"],
#footer { display: none !important; }

/* Remove outer page margins */
body, html { margin: 0 !important; padding: 0 !important; }
```

**Rationale**: Google pubhtml renders with a predictable set of ARIA roles and legacy CSS classes. The `[role="banner"]` / `footer` selectors provide semantic coverage; the explicit class names (`docs-ml-header`, `publish-mode-footer`) cover the current markup. Selectors are intentionally over-inclusive (multiple fallbacks) to survive minor Google markup revisions.

**Alternatives considered**:
- Injecting only class-based selectors: Fragile if Google renames classes. Combined approach is more resilient.
- Blocking URLs at the network level: Would break the sheet content itself. CSS-only approach is safe.

**Known caveat**: CSS selectors may need maintenance if Google redesigns pubhtml structure. Graceful degradation — table content remains visible even if chrome reappears.

---

## R-003: New Renderer Entry Point (electron-vite multi-page)

**Question**: How does a new `viewer.html` entry point integrate with the existing build?

**Decision**: Add a single `viewer` entry to `electron.vite.config.ts`'s `rollupOptions.input` map. No other config changes required.

```typescript
viewer: path.resolve(__dirname, 'src/renderer/viewer.html'),
```

**Rationale**: The existing 4-entry pattern (`index`, `settings`, `session`, `session_launcher`) is the correct template. Each entry gets its own JS bundle automatically. `svelte.config.mjs` and `vite.config.js` are generic — no changes needed there.

**Alternatives considered**: None — this is the established project pattern.

---

## R-004: Viewer Window Init Data (query param vs IPC)

**Question**: How does the viewer window know its type (`navi_guide` vs `flyffipedia`) at load time?

**Decision**: Pass `?type=navi_guide` or `?type=flyffipedia` as a URL query parameter when the Main process calls `loadURL()` / `loadFile()`. The viewer renderer reads it via `new URLSearchParams(window.location.search).get('type')` on mount.

**Rationale**: The type is a simple, static, non-sensitive string. A query param is the simplest approach and avoids an extra IPC round-trip at startup. Complex config (window state, always-on-top) is loaded via IPC after mount.

**Alternatives considered**:
- IPC `invoke('viewer.get_config')` at startup: Appropriate for complex data but overkill for a single string type discriminator. Still used for the persisted window state (position, size, alwaysOnTop).

---

## R-005: Always-on-Top Level

**Question**: Which `setAlwaysOnTop` level ensures the viewer window appears above all OS windows?

**Decision**: Use `win.setAlwaysOnTop(true, 'screen-saver')` as the default when the window is first created.

**Rationale**: The `'screen-saver'` level is the highest available in Electron, ensuring the viewer appears above all other application windows including other Electron BrowserWindows (game sessions). When the user toggles always-on-top off, call `win.setAlwaysOnTop(false)` (no level needed for disable).

**Alternatives considered**:
- `'floating'`: Too low; can be hidden behind other Electron windows.
- `'modal-panel'`: Platform-dependent; less predictable on Windows.

---

## R-006: Sidebar Side Persistence

**Question**: Should the sidebar panel's left/right preference go into the main `config.json` or localStorage?

**Decision**: Persist in `localStorage` under the key `questPanel` (same store as the existing `questPanelContext.svelte.ts` persisted state), as an additional field `sidebarSide: 'left' | 'right'`.

**Rationale**: The `questPanelContext` already exclusively uses localStorage for all its persisted state (characters, filters, collapsed questlines). Adding `sidebarSide` to this same store is consistent with the existing pattern and avoids adding a new Main-process IPC round-trip for a purely renderer-side layout preference.

**Alternatives considered**:
- `config.json` via IPC: Overkill for a visual layout toggle; introduces Main-process dependency for something that is entirely renderer-side.
