import { defineStore } from 'pinia'
import type { AssistantContext } from '@/types/learning'

interface AssistantMessage {
    id: string
    role: 'assistant' | 'user'
    content: string
}

interface SendAssistantPayload {
    message: string
    context: AssistantContext
}

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
        'Say it slowly, then use it in a short sentence. If you miss it, mark "Again" so it returns today.',
        'AI service is not connected right now, so this is an offline tutor note.',
    ].join('\n\n')
}

export const useAssistantStore = defineStore('assistant', {
    state: () => ({
        isOpen: false,
        isLoading: false,
        messages: [
            createMessage('assistant', 'Hi, I am your Mandarin tutor. Ask about the current word, practice a real-life mission, or make a plan from your weak words.'),
        ] as AssistantMessage[],
    }),
    actions: {
        open() {
            this.isOpen = true
        },
        toggle() {
            this.isOpen = !this.isOpen
        },
        async send(payload: SendAssistantPayload) {
            const trimmed = payload.message.trim()
            if (!trimmed || this.isLoading)
                return

            this.messages.push(createMessage('user', trimmed))
            this.isLoading = true

            try {
                const response = await fetch(endpoint(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: trimmed,
                        context: payload.context,
                        history: this.messages.slice(-8),
                    }),
                })

                if (!response.ok)
                    throw new Error(`Assistant returned ${response.status}`)

                const data = await response.json() as { reply?: string }
                this.messages.push(createMessage('assistant', data.reply?.trim() || fallbackResponse(payload)))
            }
            catch {
                this.messages.push(createMessage('assistant', fallbackResponse(payload)))
            }
            finally {
                this.isLoading = false
            }
        },
    },
})
