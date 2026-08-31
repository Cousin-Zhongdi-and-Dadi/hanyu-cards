// @vitest-environment happy-dom

import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import ScenariosPage from '@/pages/ScenariosPage.vue'
import { useProgressStore } from '@/stores/progress'

describe('page/ScenariosPage', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('checks an applied response and completes the active mission', async () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const wrapper = mount(ScenariosPage, {
            global: {
                plugins: [pinia],
            },
        })
        const progress = useProgressStore()

        expect(wrapper.text()).toContain('Real-life missions')
        expect(wrapper.text()).toContain('初次见面')
        expect(wrapper.findAll('.scenario-tab')).toHaveLength(6)

        await wrapper.get('textarea').setValue('我叫安娜，我是英国人，我学习汉语。')
        await wrapper.get('.scenario-task .primary-action').trigger('click')
        await flushPromises()

        expect(wrapper.get('.task-feedback').text()).toContain('Mission complete')
        expect(progress.completedScenarioIds).toContain('first-meeting')
        expect(wrapper.text()).toContain('1/6')
        expect(wrapper.text()).toContain('17% explored')
    })

    it('keeps an incomplete mission out of completed progress', async () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const wrapper = mount(ScenariosPage, {
            global: {
                plugins: [pinia],
            },
        })
        const progress = useProgressStore()
        progress.completedScenarioIds = []

        await wrapper.get('textarea').setValue('我叫安娜。')
        await wrapper.get('.scenario-task .primary-action').trigger('click')
        await flushPromises()

        expect(wrapper.get('.task-feedback').text()).toContain('Good start')
        expect(progress.completedScenarioIds).not.toContain('first-meeting')
    })

    it('uses an Agicto semantic result for a valid answer with different wording', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            passed: true,
            score: 90,
            feedback: 'Mission complete. Your meaning is clear and complete.',
            strengths: ['Name, origin, and motivation are all present.'],
            improvements: [],
            source: 'agicto',
        }), { headers: { 'Content-Type': 'application/json' } })))
        const pinia = createPinia()
        setActivePinia(pinia)
        const wrapper = mount(ScenariosPage, {
            global: {
                plugins: [pinia],
            },
        })
        const progress = useProgressStore()

        await wrapper.get('textarea').setValue('名字是安娜，来自英国，学中文是因为我喜欢电影。')
        await wrapper.get('.scenario-task .primary-action').trigger('click')
        await flushPromises()

        expect(wrapper.get('.task-feedback').text()).toContain('Agicto semantic review')
        expect(wrapper.get('.task-feedback').text()).toContain('90/100')
        expect(progress.completedScenarioIds).toContain('first-meeting')
    })
})
