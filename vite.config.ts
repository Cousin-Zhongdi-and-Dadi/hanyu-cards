/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
// https://github.com/TypeStrong/ts-node/issues/1096
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    // The offline HSK dictionary is intentionally bundled and precached (about 600 kB minified).
    build: {
        chunkSizeWarningLimit: 650,
    },
    resolve: {
        alias: {
            '@@': path.resolve(__dirname, '.'),
            '@': path.resolve(__dirname, './src'),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: '@import "@/assets/main.scss";',
            },
        },
    },
    plugins: [
        vue(),
        VitePWA({
            disable: process.env.NODE_ENV === 'test' || mode === 'mobile',
            injectRegister: null,
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'privacy.html'],
            manifest: {
                name: 'HanYu Cards',
                short_name: 'HanYu',
                description: 'HSK 1-3 Mandarin flashcards with smart review and an optional AI tutor.',
                icons:[
                    { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
                ],
                theme_color: '#087d76',
                background_color: '#f4f1e9',
                display: 'standalone',
                orientation: 'portrait',
                categories: ['education'],
            },
        }),
    ],
    test: {
        // https://vitest.dev/guide/common-errors#failed-to-terminate-worker
        pool: 'forks',
        setupFiles: 'vitest-setup.ts',
        typecheck: {
            enabled: true,
            ignoreSourceErrors: false,
            tsconfig: 'tsconfig.json',
        },
        includeSource: ['src/**/*.{js,ts}', 'tests/**/*.test.{js,ts}'],
    },
    define: {
        'import.meta.vitest': 'undefined',
    },
    server: {
        host: true,
        port: 3000,
        watch: {
            usePolling: true,
        },
    },
    preview: {
        host: true,
        port: 8080,
    },
}))
