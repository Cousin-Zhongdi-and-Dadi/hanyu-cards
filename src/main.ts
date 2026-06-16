import { createApp } from 'vue'
import { setupPWA } from '@/plugins/pwa'
import { setupStore } from '@/store'
import { setupRouter } from '@/router'

import App from '@/App.vue'
import '@/assets/app.scss'

export async function bootstrap(test= false) {
    const app = createApp(App)

    await setupRouter(app, test)

    setupStore(app)

    app.mount(test ? document.createElement('div') : '#app')

    await setupPWA()

    return app
}
