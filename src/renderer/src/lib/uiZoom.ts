import type {NeuzConfig} from './types'

type UiZoomTarget = 'main' | 'settings' | 'session'

const defaultRootFontSize = 16
const defaultZoom = 1

function applyUiZoom(zoom: unknown): void {
  const parsedZoom = typeof zoom === 'number' ? zoom : Number(zoom)
  const normalizedZoom = Number.isFinite(parsedZoom) && parsedZoom > 0 ? parsedZoom : defaultZoom

  document.documentElement.style.fontSize = `${defaultRootFontSize * normalizedZoom}px`
}

export function initializeUiZoom(target: UiZoomTarget): void {
  const electronApi = window.electron.ipcRenderer

  electronApi.on('event.ui_zoom_changed', (_event, zoom: number) => {
    applyUiZoom(zoom)
  })

  void electronApi.invoke('config.load', false).then((config: NeuzConfig) => {
    applyUiZoom(config.window?.[target]?.zoom)
  }).catch((error) => {
    console.error('Failed to initialize UI zoom:', error)
    applyUiZoom(defaultZoom)
  })
}
