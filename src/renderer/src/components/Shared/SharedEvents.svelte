<script lang="ts">
  import {resetMode, setMode} from 'mode-watcher'
  import { getElectronContext } from '$lib/contexts/electronContext';
  import {migratePublicWidgetStorage, migrateSettingsLocalStorage} from '$lib/localStorageStores';

  const electronApi = getElectronContext()
  migrateSettingsLocalStorage()
  migratePublicWidgetStorage()

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
