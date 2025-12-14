<script lang="ts">
  import {getContext, onMount} from 'svelte'
  import type {MainWindowState, NeuzSession} from "$lib/types";
  import type {WebviewTag} from 'electron'
  import Button from '../../lib/components/ui/button/button.svelte'
  import {neuzosBridge} from "$lib/core";

  let {session, onUpdate, autofocusEnabled = $bindable(), layoutId, src}: {
    session: NeuzSession
    layoutId: string
    onUpdate: (sessionId: string) => void
    autofocusEnabled: boolean
    src: string
  } = $props()

  let partition: string = $state('')
  let started: boolean = $state(false)
  let webview: WebviewTag | HTMLElement = $state()
  let muted: boolean = $state(false)


  const mainWindowState = getContext<MainWindowState>('mainWindowState')


  onMount(() => {
    if (session.partitionOverwrite) {
      partition = `persist:${session.partitionOverwrite}`
    } else {
      partition = `persist:${session.id}`
    }
    if (!Object.keys(mainWindowState.sessionsLayoutsRef).includes(session.id)) {
      mainWindowState.sessionsLayoutsRef[session.id] = {
        layouts: {}
      }
    }

    const exposedRef = {
      startClient,
      stopClient,
      isStarted,
      focus,
      setAudioMuted,
      isMuted,
      getWebview,
      sendKey,
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
  }

  export const stopClient = () => {
    started = false
    onUpdate(session.id)
    koreanLinkFixed = false;
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

    console.log('🔑 Original key:', key, '→ Normalized:', normalizedKey)

    // Parse the key string (e.g., "Ctrl+F1", "Alt+A", "F5")
    const parts = normalizedKey.split('+').map(k => k.trim())
    let mainKey = parts[parts.length - 1]
    const modifierParts = parts.slice(0, -1).map(m => m.toLowerCase())

    console.log('📋 Parts:', parts, '→ Modifiers:', modifierParts, '→ MainKey:', mainKey)

    const hasCtrl = modifierParts.some(m => m === 'ctrl' || m === 'control')
    const hasAlt = modifierParts.some(m => m === 'alt' || m === 'altgr')
    const hasShift = modifierParts.some(m => m === 'shift')
    const hasMeta = modifierParts.some(m => m === 'meta')
    const hasCmd = modifierParts.some(m => m === 'cmd' || m === 'command')

    console.log('🎯 Parsed:', 'mainKey:', mainKey, 'Ctrl:', hasCtrl, 'Alt:', hasAlt, 'Shift:', hasShift, 'Meta:', hasMeta, 'Cmd:', hasCmd)

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

    console.log('⌨️ Sending with sendInputEvent:', keyCode, 'modifiers:', modifiers)

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

      console.log('✅ Key sent successfully:', key)
    } catch (e) {
      console.error('❌ Error sending key:', e)
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="w-full h-full relative"
  onmouseenter={() => {
    focus()
  }}
>
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
      ></webview>
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
