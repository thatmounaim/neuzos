<script lang="ts">
  import {getContext, onMount} from 'svelte'
  import type {MainWindowState, NeuzSession} from "$lib/types";
  import type {WebviewTag} from 'electron'
  import Button from '$lib/components/ui/button/button.svelte'
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

    // Parse the key string (e.g., "Ctrl+F1", "Alt+A", "F5")
    const parts = key.split('+').map(k => k.trim())
    let mainKey = parts[parts.length - 1]
    const hasCtrl = parts.slice(0, -1).some(m => m.toLowerCase() === 'ctrl' || m.toLowerCase() === 'control')
    const hasAlt = parts.slice(0, -1).some(m => m.toLowerCase() === 'alt')
    const hasShift = parts.slice(0, -1).some(m => m.toLowerCase() === 'shift')
    const hasMeta = parts.slice(0, -1).some(m => m.toLowerCase() === 'meta' || m.toLowerCase() === 'cmd')

    console.log('Sending key:', key, '→ parsed:', mainKey, 'Ctrl:', hasCtrl, 'Alt:', hasAlt, 'Shift:', hasShift)

    // Use executeJavaScript to inject key events directly into the page
    // This is more reliable than sendInputEvent for web games
    const jsCode = `
      (function() {
        const key = ${JSON.stringify(mainKey)};
        const keyLower = key.toLowerCase();

        // Determine the key and code values
        let keyValue = key;
        let codeValue = key;

        // Function keys (F1-F12)
        if (keyLower.match(/^f([1-9]|1[0-2])$/)) {
          keyValue = key.toUpperCase();
          codeValue = key.toUpperCase();
        }
        // Letter keys
        else if (keyLower.length === 1 && keyLower.match(/[a-z]/)) {
          keyValue = keyLower;
          codeValue = 'Key' + key.toUpperCase();
        }
        // Digit keys
        else if (keyLower.length === 1 && keyLower.match(/[0-9]/)) {
          keyValue = key;
          codeValue = 'Digit' + key;
        }

        const eventOptions = {
          key: keyValue,
          code: codeValue,
          ctrlKey: ${hasCtrl},
          altKey: ${hasAlt},
          shiftKey: ${hasShift},
          metaKey: ${hasMeta},
          bubbles: true,
          cancelable: true
        };

        // Dispatch keydown event
        const keydownEvent = new KeyboardEvent('keydown', eventOptions);
        document.dispatchEvent(keydownEvent);

        // Also try dispatching to the active element
        if (document.activeElement) {
          document.activeElement.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
        }

        // Dispatch keyup after a short delay
        setTimeout(() => {
          const keyupEvent = new KeyboardEvent('keyup', eventOptions);
          document.dispatchEvent(keyupEvent);
          if (document.activeElement) {
            document.activeElement.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
          }
        }, 50);

        console.log('Key events dispatched:', keyValue, codeValue, eventOptions);
      })();
    `

    try {
      webviewElement.executeJavaScript(jsCode)
      console.log('Key sent successfully:', key)
    } catch (e) {
      console.error('Error sending key:', e)
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
