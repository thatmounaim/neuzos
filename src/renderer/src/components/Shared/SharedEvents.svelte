<script lang="ts">
  import {resetMode, setMode} from 'mode-watcher'
  import {getContext} from "svelte";
  import {type NeuzosBridge} from "$lib/core";
  import type {IpcRenderer} from "@electron-toolkit/preload";

  const electronApi = getContext<IpcRenderer>('electronApi')
  const neuzosBridge = getContext<NeuzosBridge>('neuzosBridge')

  electronApi.on('event.theme_mode_changed', (_, themeMode: string) => {
    switch (themeMode) {
      case 'dark':
        setMode('dark')
        break
      case 'light':
        setMode('light')
        break
      default:
        resetMode()
    }
  })

</script>
