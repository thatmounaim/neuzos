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
    partition = `persist:${session.id}`
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
    };

    mainWindowState.sessionsLayoutsRef[session.id].layouts[layoutId] = exposedRef
  })

  export const startClient = () => {
    started = true
    onUpdate(session.id)
  }

  export const stopClient = () => {
    started = false
    onUpdate(session.id)
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

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="w-full h-full"
  onmouseenter={() => {
    focus()
  }}
>
  {#if partition !== ''}
    {#if started}
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
        <img src="/flyffu-logo.png" alt="Flyff Universe Logo" class="w-1/2 max-w-32 pointer-events-none select-none"/>
        <Button variant="outline" onclick={() => neuzosBridge.sessions.start(session.id,layoutId)}>Start Session
          - {session.label}</Button>
      </div>
    {/if}
  {/if}
</div>
