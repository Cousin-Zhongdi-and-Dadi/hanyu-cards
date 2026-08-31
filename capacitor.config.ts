import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
    appId: 'com.hanyucards.app',
    appName: 'HanYu Cards',
    webDir: 'dist',
    bundledWebRuntime: false,
    server: {
        androidScheme: 'https',
    },
    plugins: {
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#087d76',
            overlaysWebView: true,
        },
        SplashScreen: {
            launchShowDuration: 900,
            launchAutoHide: true,
            launchFadeOutDuration: 220,
            backgroundColor: '#f4f1e9ff',
            androidScaleType: 'CENTER_CROP',
            showSpinner: false,
            splashFullScreen: true,
            splashImmersive: false,
        },
        Keyboard: {
            resize: 'body',
            style: 'LIGHT',
            resizeOnFullScreen: true,
        },
    },
}

export default config
