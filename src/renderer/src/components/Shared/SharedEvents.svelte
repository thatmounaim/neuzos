<script lang="ts">
  import {resetMode, setMode} from 'mode-watcher'
  import { getElectronContext } from '$lib/contexts/electronContext';

  const electronApi = getElectronContext()

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
