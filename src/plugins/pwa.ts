export const setupPWA = async () => {
    if (!('serviceWorker' in navigator) || import.meta.env.MODE === 'test')
        return

    const { registerSW } = await import('virtual:pwa-register')

    registerSW({ immediate: true })
}
