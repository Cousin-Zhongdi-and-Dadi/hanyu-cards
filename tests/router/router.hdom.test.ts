// @vitest-environment happy-dom

import { describe, expect } from 'vitest'
import { useRouter } from 'vue-router'
import { testApp } from '@@/tests/support/testApp'

describe('router', () => {
    testApp('should route directly to the offline dictionary without auth', async ({ app }) => {
        const router = app.runWithContext(() => useRouter())
        await router.push({ name: 'dictionary' })
        expect(router.currentRoute.value.name).toBe('dictionary')
    })

    testApp('should redirect unknown paths to study', async ({ app }) => {
        const router = app.runWithContext(() => useRouter())
        await router.push('/does-not-exist')
        expect(router.currentRoute.value.name).toBe('study')
    })

    testApp('should expose real-life scenario missions', async ({ app }) => {
        const router = app.runWithContext(() => useRouter())
        await router.push({ name: 'scenarios' })
        expect(router.currentRoute.value.name).toBe('scenarios')
    })
})
