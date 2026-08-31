<script setup lang="ts">
import {
    computed,
    nextTick,
    ref,
    watch,
} from 'vue'
import {
    ChatbubbleEllipsesOutline,
    CloseOutline,
    RefreshOutline,
    SendOutline,
    SparklesOutline,
    StopOutline,
} from '@vicons/ionicons5'
import { useAssistantStore } from '@/stores/assistant'
import { useReviewClock } from '@/composables/useReviewClock'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import { isDue } from '@/utils/learning'

const assistant = useAssistantStore()
const content = useContentStore()
const progress = useProgressStore()
const settings = useSettingsStore()
const reviewClock = useReviewClock()
const draft = ref('')
const messagesElement = ref<HTMLElement>()

const quickActions = [
    { label: 'Explain', prompt: 'Explain the current word with one clear example at my HSK level.' },
    { label: 'Memory trick', prompt: 'Create a short visual mnemonic for the current word.' },
    { label: 'Quiz me', prompt: 'Quiz me on my recent mistakes. Ask one question and wait for my answer.' },
    { label: 'Role-play', prompt: 'Role-play the current real-life scenario with me. Start with one short line in Chinese and wait for my reply.' },
    { label: '10-min plan', prompt: 'Make a focused 10-minute study plan from my level, due words, and recent mistakes.' },
]

const recentMistakes = computed(() => {
    const ids = Object.values(progress.records)
        .filter((record) => record.lastGrade === 'again')
        .sort((a, b) => (b.lastReviewedAt ?? '').localeCompare(a.lastReviewedAt ?? ''))
        .slice(0, 5)
        .map((record) => record.wordId)

    return ids.map((id) => content.wordsById[id]).filter(Boolean)
})

const dueCount = computed(() => {
    return content.words.filter((word) => isDue(progress.records[word.id], reviewClock.value)).length
})
const connectionLabel = computed(() => {
    if (assistant.connection === 'agicto')
        return 'Agicto live'
    if (assistant.connection === 'mock')
        return 'Demo mode'
    if (assistant.connection === 'local')
        return 'Offline note'

    return 'Context ready'
})

watch(() => assistant.messages.map((message) => message.content).join(''), async () => {
    await nextTick()
    if (messagesElement.value)
        messagesElement.value.scrollTop = messagesElement.value.scrollHeight
})

async function send() {
    const message = draft.value
    draft.value = ''
    await assistant.send({
        message,
        context: {
            activeWord: content.activeWord,
            activeScenario: content.activeScenario,
            learnerLevel: content.selectedLevel,
            dueCount: dueCount.value,
            masteredCount: progress.masteredCount,
            recentMistakes: recentMistakes.value,
        },
    })
}

function quickAsk(message: string) {
    draft.value = message
    void send()
}
</script>

<template>
    <div
        v-if="settings.assistantEnabled"
        class="assistant">
        <button
            @click="assistant.toggle"
            class="assistant__bubble"
            type="button"
            :aria-expanded="assistant.isOpen"
            aria-label="Open AI tutor">
            <SparklesOutline></SparklesOutline>
            <span>AI</span>
        </button>

        <Transition name="assistant-pop">
            <section
                v-if="assistant.isOpen"
                class="assistant__panel"
                aria-label="AI tutor">
                <header class="assistant__header">
                    <div class="assistant__identity">
                        <i><SparklesOutline></SparklesOutline></i>
                        <span>
                            <strong>HanYu Tutor</strong>
                            <small :class="`status--${assistant.connection}`">{{ connectionLabel }}</small>
                        </span>
                    </div>
                    <div class="assistant__header-actions">
                        <button
                            @click="assistant.clear"
                            type="button"
                            aria-label="Clear conversation">
                            <RefreshOutline></RefreshOutline>
                        </button>
                        <button
                            @click="assistant.toggle"
                            type="button"
                            aria-label="Close AI tutor">
                            <CloseOutline></CloseOutline>
                        </button>
                    </div>
                </header>

                <div class="assistant__context">
                    <span v-if="content.activeWord">Word · {{ content.activeWord.simplified }} {{ content.activeWord.pinyin }}</span>
                    <span v-if="content.activeScenario">Mission · {{ content.activeScenario.chineseTitle }}</span>
                    <span>{{ dueCount }} due</span>
                </div>

                <div class="assistant__quick">
                    <button
                        v-for="action in quickActions"
                        :key="action.label"
                        @click="quickAsk(action.prompt)"
                        type="button"
                        :disabled="assistant.isLoading">{{ action.label }}</button>
                </div>

                <div
                    ref="messagesElement"
                    class="assistant__messages"
                    aria-live="polite">
                    <template
                        v-for="message in assistant.messages"
                        :key="message.id">
                        <div
                            v-if="message.content"
                            :class="['assistant__message', `assistant__message--${message.role}`]">
                            <small>{{ message.role === 'assistant' ? 'Tutor' : 'You' }}</small>
                            <span>{{ message.content }}</span>
                        </div>
                    </template>
                    <div
                        v-if="assistant.isLoading && !assistant.messages.at(-1)?.content"
                        class="assistant__message assistant__message--assistant assistant__thinking">
                        <small>Tutor</small>
                        <span><i></i><i></i><i></i></span>
                    </div>
                </div>

                <form
                    @submit.prevent="send"
                    class="assistant__form">
                    <ChatbubbleEllipsesOutline></ChatbubbleEllipsesOutline>
                    <input
                        v-model="draft"
                        type="text"
                        autocomplete="off"
                        placeholder="Ask about this word or mission" />
                    <button
                        v-if="assistant.isLoading"
                        @click="assistant.stop"
                        type="button"
                        aria-label="Stop response">
                        <StopOutline></StopOutline>
                    </button>
                    <button
                        v-else
                        type="submit"
                        aria-label="Send message"
                        :disabled="!draft.trim()">
                        <SendOutline></SendOutline>
                    </button>
                </form>
                <p class="assistant__notice">AI can make mistakes. Check important language details.</p>
            </section>
        </Transition>
    </div>
</template>
