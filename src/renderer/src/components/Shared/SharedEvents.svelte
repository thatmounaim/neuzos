<script lang="ts">
  import {resetMode, setMode} from 'mode-watcher'
  import { getElectronContext } from '$lib/contexts/electronContext';
  import {migratePublicWidgetStorage, migrateSettingsLocalStorage} from '$lib/localStorageStores';

  const electronApi = getElectronContext()
  migrateSettingsLocalStorage()
  migratePublicWidgetStorage()

  const hasStoredThemeMode =
    localStorage.getItem('mode-watcher-mode') !== null ||
    localStorage.getItem('mode-watcher-theme') !== null

  if (!hasStoredThemeMode) {
    setMode('dark')
  }

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
