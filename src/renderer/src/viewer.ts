import { mount } from 'svelte'

import './app.css'
import './initializeThemeMode'

import App from './Viewer.svelte'

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app
