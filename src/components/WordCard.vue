<script setup lang="ts">
import { VolumeHighOutline } from '@vicons/ionicons5'
import type {
    HskWord,
    ReviewGrade,
    WordProgress,
} from '@/types/learning'
import {
    formatDateTime,
    reviewIntervalText,
    reviewLabels,
    speakMandarin,
} from '@/utils/learning'

const props = defineProps<{
    word: HskWord
    progress?: WordProgress
    reveal: boolean
    ttsEnabled: boolean
    showTraditional: boolean
}>()

const emit = defineEmits<{
    review: [grade: ReviewGrade]
    reveal: []
}>()

function playAudio() {
    if (props.ttsEnabled)
        speakMandarin(props.word.simplified)
}
</script>

<template>
    <article
        class="word-card"
        aria-live="polite">
        <div class="word-card__meta">
            <span>HSK {{ word.level }}</span>
            <span>{{ progress?.status ?? 'new' }}</span>
            <span>{{ formatDateTime(progress?.nextReviewAt) }}</span>
        </div>

        <button
            @click="playAudio"
            class="word-card__audio"
            type="button"
            aria-label="Play pronunciation">
            <VolumeHighOutline></VolumeHighOutline>
        </button>

        <div class="word-card__hanzi">{{ showTraditional ? word.traditional : word.simplified }}</div>
        <div class="word-card__pinyin">{{ word.pinyin }}</div>

        <button
            v-if="!reveal"
            @click="emit('reveal')"
            class="primary-action"
            type="button">
            Reveal Meaning
        </button>

        <section
            v-else
            class="word-card__answer">
            <p>{{ word.english }}</p>
            <div class="word-card__tags">
                <span
                    v-for="tag in word.tags.slice(0, 4)"
                    :key="tag">{{ tag }}</span>
            </div>
            <p
                v-if="word.radical"
                class="word-card__hint">Radical: {{ word.radical }}</p>
        </section>

        <div
            class="review-grid"
            :class="{ 'review-grid--hidden': !reveal }">
            <button
                v-for="grade in (['again', 'hard', 'good', 'easy'] as ReviewGrade[])"
                :key="grade"
                @click="emit('review', grade)"
                type="button"
                :class="['review-button', `review-button--${grade}`]"
                :disabled="!reveal">
                <span>{{ reviewLabels[grade] }}</span>
                <small>{{ reviewIntervalText[grade] }}</small>
            </button>
        </div>
    </article>
</template>
