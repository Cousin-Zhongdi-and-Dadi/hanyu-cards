// @vitest-environment happy-dom

import { createPinia, setActivePinia } from 'pinia'
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import { useAssistantStore } from '@/stores/assistant'
import { learningScenarios } from '@/data/scenarios'
import type { AssistantContext } from '@/types/learning'

const context: AssistantContext = {
    learnerLevel: 1,
    dueCount: 4,
    masteredCount: 2,
    recentMistakes: [],
}

function streamResponse(...events: string[]) {
    const encoder = new TextEncoder()
    const body = new ReadableStream({
        start(controller) {
            events.forEach((event) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: event })}\n\n`)))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
        },
    })

    return new Response(body, {
        headers: {
            'Content-Type': 'text/event-stream',
            'X-Assistant-Source': 'agicto',
        },
    })
}

describe('store/assistant', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('joins a streamed Agicto response and sends only learning context', async () => {
        const fetchMock = vi.fn().mockResolvedValue(streamResponse('你', '好'))
        vi.stubGlobal('fetch', fetchMock)
        const assistant = useAssistantStore()

        await assistant.send({ message: ' Explain this ', context })

        expect(assistant.connection).toBe('agicto')
        expect(assistant.messages.at(-1)?.content).toBe('你好')
        expect(assistant.isLoading).toBe(false)
        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        const body = JSON.parse(String(request.body)) as Record<string, unknown>
        expect(body).toMatchObject({ message: 'Explain this', context })
        expect(body).not.toHaveProperty('apiKey')
    })

    it('keeps the tutor useful when its API cannot be reached', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
        const assistant = useAssistantStore()

        await assistant.send({ message: 'Help me review', context })

        expect(assistant.connection).toBe('local')
        expect(assistant.messages.at(-1)?.content).toContain('Choose a word or mission first')
        expect(assistant.isLoading).toBe(false)
    })

    it('reports a server-side local fallback accurately', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ reply: 'Local study note' }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Assistant-Source': 'local',
            },
        })))
        const assistant = useAssistantStore()

        await assistant.send({ message: 'Help me review', context })

        expect(assistant.connection).toBe('local')
        expect(assistant.messages.at(-1)?.content).toBe('Local study note')
    })

    it('accepts a semantic scenario evaluation without exposing extra lesson data', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            passed: true,
            score: 91,
            feedback: 'Mission complete. The three required ideas are clear.',
            strengths: ['Natural self-introduction.'],
            improvements: ['Add punctuation for readability.'],
            source: 'agicto',
        }), { headers: { 'Content-Type': 'application/json' } }))
        vi.stubGlobal('fetch', fetchMock)
        const assistant = useAssistantStore()

        const result = await assistant.evaluateScenario(
            learningScenarios[0],
            '名字是安娜，来自英国，学中文是因为我喜欢电影。',
        )

        expect(result).toMatchObject({ passed: true, score: 91, source: 'agicto' })
        const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        const body = JSON.parse(String(request.body)) as { scenario: Record<string, unknown> }
        expect(body.scenario).toHaveProperty('expectedKeywords')
        expect(body.scenario).not.toHaveProperty('dialogue')
        expect(body.scenario).not.toHaveProperty('vocabulary')
    })

    it('uses the local expression check when semantic evaluation is offline', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
        const assistant = useAssistantStore()

        const result = await assistant.evaluateScenario(
            learningScenarios[0],
            '我叫安娜，我是英国人，我学习汉语。',
        )

        expect(result).toMatchObject({ passed: true, score: 100, source: 'local' })
    })
})
