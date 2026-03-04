import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { join } from 'path'
import { pathToFileURL } from 'url'

// Custom APIs for renderer
const api = {}

const preloadPaths = {
  // Absolute file:// URL for the webview preload script (same output directory)
  webview: pathToFileURL(join(__dirname, 'webview.js')).href,
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('_preloadPaths', preloadPaths)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window._preloadPaths = preloadPaths
}
