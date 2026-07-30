import { mount } from 'svelte'

import './app.css'
import './initializeThemeMode'

import App from './Session.svelte'
import {initializeUiZoom} from './lib/uiZoom'

initializeUiZoom('session')

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app

