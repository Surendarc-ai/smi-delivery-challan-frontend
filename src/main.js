import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from './App.vue'
import router from './router'
import './style.css'

async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#1e293b' })
  } catch {
    // Status bar plugin unavailable in browser preview
  }
}

const app = createApp(App)
app.use(router)
initNativeShell().finally(() => app.mount('#app'))
