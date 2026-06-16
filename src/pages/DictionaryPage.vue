<script setup lang="ts">
import { computed } from 'vue'
import { VolumeHighOutline } from '@vicons/ionicons5'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import {
    formatDateTime,
    levelOptions,
    speakMandarin,
} from '@/utils/learning'

const content = useContentStore()
const progress = useProgressStore()
const settings = useSettingsStore()

const visibleWords = computed(() => content.filteredWords.slice(0, 120))
</script>

<template>
    <section class="screen dictionary-screen">
        <div class="screen__intro">
            <div>
                <p class="eyebrow">{{ content.filteredWords.length }} words</p>
                <h2>Chinese dictionary</h2>
            </div>
            <select
                v-model="content.selectedLevel"
                aria-label="Choose HSK level">
                <option
                    v-for="option in levelOptions"
                    :key="option.value"
                    :value="option.value">
                    {{ option.label }}
                </option>
            </select>
        </div>

        <label class="search-box">
            <span>Search</span>
            <input
                v-model="content.searchTerm"
                type="search"
                placeholder="hanzi, pinyin, or English" />
        </label>

        <div class="word-list">
            <article
                v-for="word in visibleWords"
                :key="word.id"
                @click="content.setActiveWord(word.id)"
                class="word-row">
                <div>
                    <strong>{{ settings.showTraditional ? word.traditional : word.simplified }}</strong>
                    <span>{{ word.pinyin }}</span>
                </div>
                <p>{{ word.english }}</p>
                <footer>
                    <span>HSK {{ word.level }}</span>
                    <span>{{ progress.records[word.id]?.status ?? 'new' }}</span>
                    <span>{{ formatDateTime(progress.records[word.id]?.nextReviewAt) }}</span>
                    <button
                        @click.stop="speakMandarin(word.simplified)"
                        type="button"
                        aria-label="Play pronunciation">
                        <VolumeHighOutline></VolumeHighOutline>
                    </button>
                </footer>
            </article>
        </div>
    </section>
</template>
