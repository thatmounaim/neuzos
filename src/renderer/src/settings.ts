import { mount } from 'svelte'

import './app.css'
import './initializeThemeMode'

import App from './Settings.svelte'
import {initializeUiZoom} from './lib/uiZoom'

initializeUiZoom('settings')

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app
