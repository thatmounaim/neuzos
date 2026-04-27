<script lang="ts">
  import {getContext, onMount, tick} from 'svelte'
  import {AlertTriangle, Loader2} from '@lucide/svelte'
  import type {MainWindowState, NeuzSession, SessionHealthStatus} from "$lib/types";
  import type {WebviewTag} from 'electron'
  import Button from '../../lib/components/ui/button/button.svelte'
  import {neuzosBridge} from "$lib/core";
  import {RadioTower} from '@lucide/svelte'

  const webviewPreloadPath: string = (window as any)._preloadPaths?.webview ?? '';

  let {session, onUpdate, autofocusEnabled = $bindable(), layoutId, src, userAgent}: {
    session: NeuzSession
    layoutId: string
    onUpdate: (sessionId: string) => void
    autofocusEnabled: boolean
    src: string
    userAgent?: string
  } = $props()

  let partition: string = $state('')
  let started: boolean = $state(false)
  let webview: WebviewTag | HTMLElement = $state()
  let muted: boolean = $state(false)
  const mainWindowState = getContext<MainWindowState>('mainWindowState')
  const isReceiver = $derived(mainWindowState.config.syncReceiverSessionId === session.id)

  function toggleReceiver() {
    neuzosBridge.sessions.setSyncReceiver(isReceiver ? null : session.id)
  }

  const ensureSessionState = () => {
    const sessionState = mainWindowState.sessionsLayoutsRef[session.id] ??= {
      layouts: {},
      healthStatus: 'healthy',
      healthDetail: ''
    }

    sessionState.healthStatus ??= 'healthy'
    sessionState.healthDetail ??= ''

    return sessionState
  }

  const setSessionHealth = (status: SessionHealthStatus, detail: string = '') => {
    const sessionState = ensureSessionState()
    sessionState.healthStatus = status
    sessionState.healthDetail = detail
  }

  const clearSessionHealth = () => {
    setSessionHealth('healthy', '')
  }

  // Apply zoom reactively. Read config directly in the effect so Svelte 5 tracks the
  // deep property access. Using $derived was unreliable here because the webview bind:this
  // transitions through undefined (div→undefined→webview) on session start, causing the
  // effect to take an early-return path that drops $derived from the dependency graph.
  $effect(() => {
    const wv = webview?.tagName === 'WEBVIEW' ? (webview as WebviewTag) : null
    if (!wv) return
    initZoom(wv, 3)
  })

  const initZoom = (wv: WebviewTag, retryLeft: number) => {
    try {
      wv.setZoomFactor(mainWindowState.config.sessionZoomLevels?.[session.id] ?? 1.0)
    } catch (e) {
      console.log('Failed to set zoom, retrying...', e)
      if (retryLeft > 0) {
        setTimeout(() => initZoom(wv, retryLeft - 1), 1000)
      } else {
        console.error('Failed to set zoom after multiple retries')
      }
    }
  }

  let healthStatus = $derived(mainWindowState.sessionsLayoutsRef[session.id]?.healthStatus ?? 'healthy')
  let healthDetail = $derived(mainWindowState.sessionsLayoutsRef[session.id]?.healthDetail ?? '')

  onMount(() => {
    if (session.partitionOverwrite) {
      partition = `persist:${session.partitionOverwrite}`
    } else {
      partition = `persist:${session.id}`
    }
    ensureSessionState()

    const exposedRef = {
      startClient,
      stopClient,
      isStarted,
      focus,
      setAudioMuted,
      isMuted,
      getWebview,
      sendKey,
      setZoom: (zoom: number) => {
        getWebview()?.setZoomFactor(zoom)
      },
    };

    mainWindowState.sessionsLayoutsRef[session.id].layouts[layoutId] = exposedRef
  })
  let koreanLinkFixed = $state(false);
  const koreanLinkFix = () => {
    getWebview()?.executeJavaScript(`
document.querySelectorAll('[target="_blank"]').forEach((el) => {el.setAttribute('target', '_self');});
const oldWindowOpen = window.open;
window.open = function(...args) {
  if(args[0].startsWith('https://universe.flyff.com/sniegu/auth/wcnkr/callback')){
    location.href = args[0]
    window.open = oldWindowOpen
  } else {
    oldWindowOpen(...args)
  }
}
`)
    koreanLinkFixed = true;
  }
  export const startClient = () => {
    started = true
    onUpdate(session.id)
    const wv = getWebview()
    if (wv) {
      const wid = wv.getWebContentsId()
      window.electron.ipcRenderer.send('webview.register_mouse', { sessionId: session.id, webContentsId: wid })
    }
  }

  export const stopClient = (onStopped?: () => void) => {
    // BUG-012: Guard against re-entry. If already stopped, fire callback and bail out
    // without re-triggering clearCache IPC (which caused an infinite IPC loop).
    if (!started) {
      onStopped?.()
      return
    }
    clearSessionHealth()
    started = false
    if (session.autoDeleteCache) {
      void neuzosBridge.sessions.clearCache(session.id)
    }
    onUpdate(session.id)
    koreanLinkFixed = false
    window.electron.ipcRenderer.send('webview.unregister_mouse', { sessionId: session.id })
    // BUG-013: Await Svelte's DOM flush so the <webview> element is removed from the DOM
    // before the ACK reaches main. Without this, the 2-second grace period starts while
    // Chromium still holds file-system handles on the partition directory.
    if (onStopped) {
      void tick().then(onStopped)
    }
  }

  export const isStarted = () => {
    return started
  }

  export const focus = () => {
    if (!autofocusEnabled) return
    if (!webview.shadowRoot) {
      webview.focus()
      return
    }
    const cNodes = webview.shadowRoot.getRootNode().childNodes
    const client = cNodes[cNodes.length - 1] as HTMLElement
    if (client) {
      setTimeout(() => client.focus(), 1)
    }
  }

  export const setAudioMuted = (mu: boolean) => {
    try {
      if (webview) {
        ;(webview as WebviewTag)?.setAudioMuted(mu)
        muted = (webview as WebviewTag)?.isAudioMuted() ?? false
      }
    } catch (e) {
      console.log('Cant mute, maybe client not started')
    }
    onUpdate(session.id)
  }

  export const isMuted = () => {
    return muted
  }

  export const getWebview = () => {
    return webview?.tagName === 'WEBVIEW' ? (webview as WebviewTag) : null
  }

  export const sendKey = (key: string) => {
    const webviewElement = getWebview()
    if (!webviewElement || !started) {
      console.warn('Cannot send key: webview not available or client not started')
      return
    }

    // Normalize special modifier names to standard ones
    // Order matters: check longer patterns first to avoid partial matches
    // cmdorctrl/commandorcontrol always maps to Ctrl (control)
    // cmd/command remain as-is for separate handling
    let normalizedKey = key
      .replace(/commandorcontrol/gi, 'Ctrl')
      .replace(/cmdorctrl/gi, 'Ctrl')
      .replace(/\bsuper\b/gi, 'Meta')
      .replace(/\boption\b/gi, 'Alt')


    const parts = normalizedKey.split('+').map(k => k.trim())
    let mainKey = parts[parts.length - 1]
    const modifierParts = parts.slice(0, -1).map(m => m.toLowerCase())

    const hasCtrl = modifierParts.some(m => m === 'ctrl' || m === 'control')
    const hasAlt = modifierParts.some(m => m === 'alt' || m === 'altgr')
    const hasShift = modifierParts.some(m => m === 'shift')
    const hasMeta = modifierParts.some(m => m === 'meta')
    const hasCmd = modifierParts.some(m => m === 'cmd' || m === 'command')

    // Convert key to keyCode for sendInputEvent
    const getKeyCode = (key: string): string => {
      const keyLower = key.toLowerCase()

      // Function keys
      if (keyLower.match(/^f([1-9]|1[0-2])$/)) {
        return key.toUpperCase()
      }

      // Letter keys - just use the lowercase letter
      if (keyLower.length === 1 && keyLower.match(/[a-z]/)) {
        return keyLower
      }

      // Digit keys - use the digit as-is
      if (keyLower.length === 1 && keyLower.match(/[0-9]/)) {
        return key
      }

      // Default: return as-is
      return key
    }

    const keyCode = getKeyCode(mainKey)
    type ModifierType = 'control' | 'alt' | 'shift' | 'meta' | 'cmd'
    const modifiers: ModifierType[] = []

    if (hasCtrl) modifiers.push('control')
    if (hasAlt) modifiers.push('alt')
    if (hasShift) modifiers.push('shift')
    if (hasMeta) modifiers.push('meta')
    if (hasCmd) modifiers.push('cmd')


    try {
      // Press modifiers first
      if (hasCtrl) {
        webviewElement.sendInputEvent({ type: 'keyDown', keyCode: 'Control', modifiers: ['control'] as ModifierType[] })
      }
      if (hasAlt) {
        const altMods = modifiers.filter(m => m !== 'alt') as ModifierType[]
        altMods.push('alt')
        webviewElement.sendInputEvent({ type: 'keyDown', keyCode: 'Alt', modifiers: altMods })
      }
      if (hasShift) {
        const shiftMods = modifiers.filter(m => m !== 'shift') as ModifierType[]
        shiftMods.push('shift')
        webviewElement.sendInputEvent({ type: 'keyDown', keyCode: 'Shift', modifiers: shiftMods })
      }
      if (hasMeta) {
        webviewElement.sendInputEvent({ type: 'keyDown', keyCode: 'Meta', modifiers: modifiers as ModifierType[] })
      }
      if (hasCmd) {
        webviewElement.sendInputEvent({ type: 'keyDown', keyCode: 'Command', modifiers: modifiers as ModifierType[] })
      }

      // Press main key with all modifiers
      webviewElement.sendInputEvent({
        type: 'keyDown',
        keyCode: keyCode,
        modifiers: modifiers as ModifierType[]
      })

      // Small delay before keyup
      setTimeout(() => {
        // Release main key
        webviewElement.sendInputEvent({
          type: 'keyUp',
          keyCode: keyCode,
          modifiers: modifiers as ModifierType[]
        })

        // Release modifiers in reverse order
        if (hasCmd) {
          webviewElement.sendInputEvent({ type: 'keyUp', keyCode: 'Command', modifiers: modifiers.filter(m => m !== 'cmd') as ModifierType[] })
        }
        if (hasMeta) {
          webviewElement.sendInputEvent({ type: 'keyUp', keyCode: 'Meta', modifiers: modifiers.filter(m => m !== 'meta' && m !== 'cmd') as ModifierType[] })
        }
        if (hasShift) {
          webviewElement.sendInputEvent({ type: 'keyUp', keyCode: 'Shift', modifiers: modifiers.filter(m => m !== 'shift' && m !== 'meta' && m !== 'cmd') as ModifierType[] })
        }
        if (hasAlt) {
          webviewElement.sendInputEvent({ type: 'keyUp', keyCode: 'Alt', modifiers: modifiers.filter(m => m !== 'alt' && m !== 'shift' && m !== 'meta' && m !== 'cmd') as ModifierType[] })
        }
        if (hasCtrl) {
          webviewElement.sendInputEvent({ type: 'keyUp', keyCode: 'Control', modifiers: [] })
        }
      }, 50)
    } catch (e) {
      console.error('❌ Error sending key:', e)
    }
  }

  // Attach/detach webview event listeners via $effect so they bind as soon as the <webview> element
  // exists, eliminating the tick()-based race where did-fail-load could fire before listeners attached.
  $effect(() => {
    if (!started) {
      return undefined
    }
    const webviewEl = getWebview()
    if (!webviewEl) {
      return undefined
    }

    const onIpcMessage = (event: Event) => {
      const e = event as any
      if (e.channel !== 'keydown') return
      const key: string = e.args?.[0]
      if (!key) return
      document.dispatchEvent(new CustomEvent('neuz:keydown', {
        detail: { sessionId: session.id, key }
      }))
    }

    const onRenderProcessGone = (event: Event) => {
      const e = event as any
      const reasonMap: Record<string, string> = {
        killed:            'The process was killed (e.g. by the OS or task manager)',
        crashed:           'The renderer process crashed unexpectedly',
        oom:               'The renderer ran out of memory',
        'launch-failed':   'The renderer process failed to start',
        'integrity-failure':'Code integrity checks failed',
      }
      const rawReason: string = e?.reason ?? 'crashed'
      const detail = reasonMap[rawReason] ?? `Process exited: ${rawReason}`
      setSessionHealth('crashed', detail)
    }

    const onDidFailLoad = (event: Event) => {
      const e = event as any
      // errorCode -3 is ERR_ABORTED (intentional navigation cancel) — skip
      if (e?.errorCode === -3) return
      const description = e?.errorDescription
        ? `${e.errorCode}: ${e.errorDescription}`
        : String(e?.errorCode ?? 'load failed')
      setSessionHealth('load-failed', description)
    }

    // did-navigate fires ONLY on successful top-level navigations — safe to clear health here.
    // did-finish-load also fires after failed loads (Electron renders the error page),
    // so we use it only for re-applying zoom, not for clearing health.
    const onDidNavigate = () => clearSessionHealth()
    const onDidFinishLoad = () => {
      getWebview()?.setZoomFactor(mainWindowState.config.sessionZoomLevels?.[session.id] ?? 1.0)
    }

    const onUnresponsive = () => setSessionHealth('unresponsive', '')
    const onResponsive = () => clearSessionHealth()

    webviewEl.addEventListener('ipc-message', onIpcMessage)
    webviewEl.addEventListener('render-process-gone', onRenderProcessGone)
    webviewEl.addEventListener('did-fail-load', onDidFailLoad)
    webviewEl.addEventListener('unresponsive', onUnresponsive)
    webviewEl.addEventListener('responsive', onResponsive)
    webviewEl.addEventListener('did-navigate', onDidNavigate)
    webviewEl.addEventListener('did-finish-load', onDidFinishLoad)

    return () => {
      webviewEl.removeEventListener('ipc-message', onIpcMessage)
      webviewEl.removeEventListener('render-process-gone', onRenderProcessGone)
      webviewEl.removeEventListener('did-fail-load', onDidFailLoad)
      webviewEl.removeEventListener('unresponsive', onUnresponsive)
      webviewEl.removeEventListener('responsive', onResponsive)
      webviewEl.removeEventListener('did-navigate', onDidNavigate)
      webviewEl.removeEventListener('did-finish-load', onDidFinishLoad)
    }
  })

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="w-full h-full relative group"
  data-session-id={session.id}
  onmouseenter={() => {
    focus()
  }}
>
  <button
    type="button"
      class={`absolute top-2 right-2 z-50 rounded p-1.5 transition-opacity ${isReceiver ? 'opacity-100 bg-primary text-primary-foreground shadow-md' : 'opacity-0 bg-background/60 text-muted-foreground group-hover:opacity-60 hover:!opacity-100'}`}
    onclick={toggleReceiver}
    aria-pressed={isReceiver}
    title={isReceiver ? 'Active Receiver — click to clear' : 'Set as Active Receiver'}
  >
    <RadioTower size={16} />
  </button>
  {#if partition !== ''}
    {#if started}
      {#if src.startsWith('https://flyff.wemadeconnect.com') && !koreanLinkFixed}
        <Button class="z-50 absolute bottom-2 right-2" size="xs" onclick={koreanLinkFix}>
          KR Fix - Once Logged & Page is Fully Loaded Press This Button
        </Button>
      {/if}
      <webview
        bind:this={webview}
        class="w-full h-full"
        src={src}
        onload={() => onUpdate(session.id)}
        {partition}
        useragent={userAgent}
        preload={webviewPreloadPath}
      ></webview>
      {#if healthStatus === 'unresponsive'}
        <div class="absolute inset-0 z-40 pointer-events-none">
          <div class="absolute inset-2 rounded-lg ring-2 ring-amber-400/80 animate-pulse"></div>
          <div class="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-xs font-medium text-amber-100 shadow-lg backdrop-blur-sm">
            <Loader2 class="h-4 w-4 animate-spin" />
            Webview unresponsive
          </div>
        </div>
      {/if}
      {#if healthStatus === 'crashed' || healthStatus === 'load-failed'}
        <div class="absolute inset-0 z-50 flex items-center justify-center bg-background/95 px-4 py-6 backdrop-blur-sm">
          <div class="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-2xl">
            <AlertTriangle class="mx-auto h-12 w-12 text-amber-500" />
            <h3 class="mt-4 text-lg font-semibold">
              {healthStatus === 'crashed' ? 'Session crashed' : 'Load failed'}
            </h3>
            <p class="mt-2 text-sm text-muted-foreground break-words">{healthDetail}</p>
            <Button class="mt-6 w-full" onclick={() => getWebview()?.reload()}>
              {healthStatus === 'crashed' ? 'Reload Session' : 'Retry'}
            </Button>
          </div>
        </div>
      {/if}
    {:else}
      <div
        bind:this={webview}
        class="w-full h-full flex items-center flex-col gap-2 justify-center select-none"
      >
        <img src="flyffu-logo.png" alt="Flyff Universe Logo" class="w-1/2 max-w-32 pointer-events-none select-none"/>
        <Button variant="outline" onclick={() => neuzosBridge.sessions.start(session.id,layoutId)}>Start Session
          - {session.label}</Button>


      </div>
    {/if}
  {/if}
</div>
