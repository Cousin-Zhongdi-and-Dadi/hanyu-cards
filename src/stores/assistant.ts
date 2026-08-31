import { defineStore } from 'pinia'
import type {
    AssistantContext,
    LearningScenario,
    ScenarioEvaluation,
    ScenarioEvaluationSource,
} from '@/types/learning'
import { evaluateScenarioLocally } from '@/utils/scenarioEvaluation'
import { hasSecureNativeAssistantEndpoint } from '@/utils/native'

export interface AssistantMessage {
    id: string
    role: 'assistant' | 'user'
    content: string
}

interface SendAssistantPayload {
    message: string
    context: AssistantContext
}

type AssistantConnection = 'agicto' | 'local' | 'mock' | 'ready'

let pendingController: AbortController | undefined

function createMessage(role: AssistantMessage['role'], content: string): AssistantMessage {
    return {
        id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        content,
    }
}

function endpoint() {
    const base = import.meta.env.VITE_ASSISTANT_API_URL?.replace(/\/$/, '') ?? ''

    return `${base}/api/assistant/chat`
}

function evaluationEndpoint() {
    const base = import.meta.env.VITE_ASSISTANT_API_URL?.replace(/\/$/, '') ?? ''

    return `${base}/api/assistant/evaluate-scenario`
}

function cleanEvaluationList(value: unknown, fallback: string[]) {
    if (!Array.isArray(value))
        return fallback

    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 240))
        .filter(Boolean)
        .slice(0, 4)
}

function normalizeEvaluation(value: unknown, fallback: ScenarioEvaluation): ScenarioEvaluation {
    if (!value || typeof value !== 'object')
        return fallback

    const candidate = value as Record<string, unknown>
    const numericScore = Number(candidate.score)
    const score = Number.isFinite(numericScore)
        ? Math.max(0, Math.min(100, Math.round(numericScore)))
        : fallback.score
    const allowedSources: ScenarioEvaluationSource[] = ['agicto', 'local', 'mock']
    const source = allowedSources.includes(candidate.source as ScenarioEvaluationSource)
        ? candidate.source as ScenarioEvaluationSource
        : fallback.source
    const rawDimensions = candidate.dimensions && typeof candidate.dimensions === 'object'
        ? candidate.dimensions as Record<string, unknown>
        : {}
    const dimension = (key: keyof ScenarioEvaluation['dimensions']) => {
        const value = Number(rawDimensions[key])

        return Number.isFinite(value)
            ? Math.max(0, Math.min(100, Math.round(value)))
            : fallback.dimensions[key]
    }

    return {
        passed: candidate.passed === true && score >= 70,
        score,
        feedback: typeof candidate.feedback === 'string'
            ? candidate.feedback.trim().slice(0, 600)
            : fallback.feedback,
        strengths: cleanEvaluationList(candidate.strengths, fallback.strengths),
        improvements: cleanEvaluationList(candidate.improvements, fallback.improvements),
        source,
        dimensions: {
            completeness: dimension('completeness'),
            naturalness: dimension('naturalness'),
            accuracy: dimension('accuracy'),
        },
        followUp: typeof candidate.followUp === 'string'
            ? candidate.followUp.trim().slice(0, 500)
            : fallback.followUp,
    }
}

function fallbackResponse(payload: SendAssistantPayload) {
    const word = payload.context.activeWord
    const scenario = payload.context.activeScenario
    if (scenario && payload.message.toLocaleLowerCase().includes('role-play')) {
        const firstLine = scenario.dialogue[0]

        return [
            `Let us practice “${scenario.title}”. I will play the other speaker.`,
            `${firstLine.speaker}: ${firstLine.zh}`,
            firstLine.pinyin,
            'Reply in Chinese. I will keep the exchange focused on the mission.',
        ].join('\n\n')
    }
    if (!word)
        return 'Choose a word or mission first, then I can explain an expression, plan a review, or start a role-play.'

    return [
        `${word.simplified} (${word.pinyin}) means "${word.english}".`,
        'Say it slowly, then use it in a short sentence. If you miss it, mark “Again” so it returns today.',
        'The online tutor is unavailable right now, so this is an offline learning note.',
    ].join('\n\n')
}

async function readEventStream(response: Response, onDelta: (delta: string) => void) {
    const reader = response.body?.getReader()
    if (!reader)
        throw new Error('Streaming response is unavailable')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        events.forEach((event) => {
            const payload = event
                .split('\n')
                .find((line) => line.startsWith('data:'))
                ?.slice(5)
                .trim()
            if (!payload || payload === '[DONE]')
                return

            const parsed = JSON.parse(payload) as { delta?: string }
            if (parsed.delta)
                onDelta(parsed.delta)
        })

        if (done)
            break
    }
}

export const useAssistantStore = defineStore('assistant', {
    state: () => ({
        isOpen: false,
        isLoading: false,
        connection: 'ready' as AssistantConnection,
        messages: [
            createMessage('assistant', '你好! I am your HanYu tutor. Ask about the current word, practise a real-life mission, or build a short review plan.'),
        ] as AssistantMessage[],
    }),
    actions: {
        open() {
            this.isOpen = true
        },
        toggle() {
            this.isOpen = !this.isOpen
        },
        stop() {
            pendingController?.abort()
        },
        clear() {
            this.messages = [
                createMessage('assistant', 'Fresh page, fresh start. What would you like to practise?'),
            ]
            this.connection = 'ready'
        },
        async evaluateScenario(scenario: LearningScenario, learnerResponse: string) {
            const fallback = evaluateScenarioLocally(scenario, learnerResponse)
            if (!hasSecureNativeAssistantEndpoint())
                return fallback

            const controller = new AbortController()
            const timeout = window.setTimeout(() => controller.abort(), 20_000)

            try {
                const response = await fetch(evaluationEndpoint(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        response: learnerResponse.trim(),
                        scenario: {
                            id: scenario.id,
                            level: scenario.level,
                            title: scenario.title,
                            chineseTitle: scenario.chineseTitle,
                            mission: scenario.mission,
                            prompt: scenario.task.prompt,
                            expectedKeywords: scenario.task.expectedKeywords,
                            modelAnswer: scenario.task.modelAnswer,
                        },
                    }),
                    signal: controller.signal,
                })

                if (!response.ok)
                    throw new Error(`Scenario evaluator returned ${response.status}`)

                return normalizeEvaluation(await response.json(), fallback)
            }
            catch {
                return fallback
            }
            finally {
                window.clearTimeout(timeout)
            }
        },
        async send(payload: SendAssistantPayload) {
            const trimmed = payload.message.trim()
            if (!trimmed || this.isLoading)
                return

            const recentHistory = this.messages.slice(-6).map(({ role, content }) => ({ role, content }))
            this.messages.push(createMessage('user', trimmed))
            const answer = createMessage('assistant', '')
            this.messages.push(answer)
            this.isLoading = true
            if (!hasSecureNativeAssistantEndpoint()) {
                answer.content = fallbackResponse(payload)
                this.connection = 'local'
                this.isLoading = false

                return
            }

            pendingController = new AbortController()
            const timeout = window.setTimeout(() => pendingController?.abort(), 25_000)

            try {
                const response = await fetch(endpoint(), {
                    method: 'POST',
                    headers: {
                        'Accept': 'text/event-stream',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: trimmed,
                        context: payload.context,
                        history: recentHistory,
                    }),
                    signal: pendingController.signal,
                })

                if (!response.ok)
                    throw new Error(`Assistant returned ${response.status}`)

                const source = response.headers.get('X-Assistant-Source')
                this.connection = source === 'agicto' || source === 'mock' || source === 'local'
                    ? source
                    : 'ready'

                if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
                    await readEventStream(response, (delta) => {
                        answer.content += delta
                    })
                }
                else {
                    const data = await response.json() as { reply?: string }
                    answer.content = data.reply?.trim() ?? ''
                }

                if (!answer.content.trim())
                    answer.content = fallbackResponse(payload)
            }
            catch {
                answer.content = fallbackResponse(payload)
                this.connection = 'local'
            }
            finally {
                window.clearTimeout(timeout)
                pendingController = undefined
                this.isLoading = false
            }
        },
    },
})
