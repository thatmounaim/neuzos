const themeModeStorageKey = 'mode-watcher-mode'

if (localStorage.getItem(themeModeStorageKey) === null) {
  localStorage.setItem(themeModeStorageKey, 'dark')
}
