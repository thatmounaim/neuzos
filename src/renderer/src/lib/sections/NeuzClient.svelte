<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import type { NeuzSession } from '../../characterutils'
  import type { WebviewTag } from 'electron'
  import Button from '$lib/components/ui/button/button.svelte'

  const dispatch = createEventDispatcher()
  export let session: NeuzSession
  export let forceClose: boolean = false
  let partition: string = ''
  let started: boolean = false
  let webview: WebviewTag | HTMLElement
  let muted: boolean
  onMount(() => {
    partition = `persist:${session.id}`
    console.log(partition)
  })

  export const starClient = () => {
    started = true
    dispatch('updated')
  }

  export const stopClient = () => {
    started = false
    dispatch('updated')
  }

  export const isStarted = () => {
    return started
  }

  export const focous = () => {
    if (!webview.shadowRoot) {
      webview.focus()
      return
    }
    const cNodes = webview.shadowRoot.getRootNode().childNodes
    const client = cNodes[cNodes.length - 1] as HTMLElement
    if (client) {
      setTimeout(() => client.focus(), 100)
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
  }

  export const isMuted = () => {
    return muted
  }

  $: isReallyStarted = forceClose ? (started = false) : started
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="w-full h-full"
  on:mouseenter={() => {
    focous()
  }}
>
  {#if partition != ''}
    {#if isReallyStarted}
      <webview
        bind:this={webview}
        class="w-full h-full"
        src="https://universe.flyff.com/play"
        {partition}
      ></webview>
    {:else}
      <div
        bind:this={webview}
        class="w-full h-full flex items-center flex-col gap-2 justify-center"
      >
        <img src="logofull.png" alt="Flyff Universe Logo" class="w-1/2 max-w-32" />
        <Button variant="outline" on:click={starClient}>Start Session - {session.name}</Button>
      </div>
    {/if}
  {/if}
</div>
