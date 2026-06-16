<script setup lang="ts">
import { computed, ref } from 'vue'
import {
    ChatbubbleEllipsesOutline,
    CloseOutline,
    SendOutline,
    SparklesOutline,
} from '@vicons/ionicons5'
import { useAssistantStore } from '@/stores/assistant'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import { isDue } from '@/utils/learning'

const assistant = useAssistantStore()
const content = useContentStore()
const progress = useProgressStore()
const settings = useSettingsStore()
const draft = ref('')

const recentMistakes = computed(() => {
    const ids = Object.values(progress.records)
        .filter((record) => record.lastGrade === 'again')
        .sort((a, b) => (b.lastReviewedAt ?? '').localeCompare(a.lastReviewedAt ?? ''))
        .slice(0, 5)
        .map((record) => record.wordId)

    return ids.map((id) => content.wordsById[id]).filter(Boolean)
})

const dueCount = computed(() => {
    return content.words.filter((word) => isDue(progress.records[word.id])).length
})

async function send() {
    const message = draft.value
    draft.value = ''
    await assistant.send({
        message,
        context: {
            activeWord: content.activeWord,
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
        </button>

        <section
            v-if="assistant.isOpen"
            class="assistant__panel"
            aria-label="AI tutor">
            <header class="assistant__header">
                <div>
                    <strong>AI Tutor</strong>
                    <span>Mandarin coach</span>
                </div>
                <button
                    @click="assistant.toggle"
                    type="button"
                    aria-label="Close AI tutor">
                    <CloseOutline></CloseOutline>
                </button>
            </header>

            <div class="assistant__quick">
                <button
                    @click="quickAsk('Explain the current word with one example.')"
                    type="button">Explain</button>
                <button
                    @click="quickAsk('Create a mnemonic for the current word.')"
                    type="button">Mnemonic</button>
                <button
                    @click="quickAsk('Quiz me on my recent mistakes.')"
                    type="button">Quiz me</button>
            </div>

            <div class="assistant__messages">
                <div
                    v-for="message in assistant.messages"
                    :key="message.id"
                    :class="['assistant__message', `assistant__message--${message.role}`]">
                    {{ message.content }}
                </div>
                <div
                    v-if="assistant.isLoading"
                    class="assistant__message assistant__message--assistant">
                    Thinking...
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
                    placeholder="Ask about pronunciation, meaning, or grammar" />
                <button
                    type="submit"
                    aria-label="Send message"
                    :disabled="assistant.isLoading || !draft.trim()">
                    <SendOutline></SendOutline>
                </button>
            </form>
        </section>
    </div>
</template>
