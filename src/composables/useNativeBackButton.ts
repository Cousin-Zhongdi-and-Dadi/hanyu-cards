import {
    onBeforeUnmount,
    onMounted,
} from 'vue'
import { useRouter } from 'vue-router'
import type { PluginListenerHandle } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { useAssistantStore } from '@/stores/assistant'

export function useNativeBackButton() {
    const assistant = useAssistantStore()
    const router = useRouter()
    let listener: PluginListenerHandle | undefined

    onMounted(async () => {
        if (!Capacitor.isNativePlatform())
            return

        listener = await CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
            if (assistant.isOpen) {
                assistant.toggle()

                return
            }
            if (canGoBack) {
                window.history.back()

                return
            }
            if (router.currentRoute.value.path !== '/study') {
                await router.replace('/study')

                return
            }

            await CapacitorApp.minimizeApp()
        })
    })

    onBeforeUnmount(() => {
        void listener?.remove()
    })
}
