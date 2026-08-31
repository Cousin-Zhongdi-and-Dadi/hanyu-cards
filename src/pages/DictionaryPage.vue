<script setup lang="ts">
import { computed } from 'vue'
import {
    BookOutline,
    SearchOutline,
    VolumeHighOutline,
} from '@vicons/ionicons5'
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
const activeWord = computed(() => content.activeWord)
const activeProgress = computed(() => activeWord.value ? progress.records[activeWord.value.id] : undefined)
</script>

<template>
    <section class="screen dictionary-screen">
        <section class="dictionary-hero">
            <div>
                <p class="eyebrow">2,209 useful words · HSK 1–3</p>
                <h2>Your pocket Mandarin<br />word garden.</h2>
                <p>Search by character, pinyin, or English and reconnect every word with your learning progress.</p>
            </div>
            <span
                class="dictionary-hero__character"
                aria-hidden="true">字</span>
        </section>

        <div class="dictionary-tools">
            <label class="search-box">
                <SearchOutline></SearchOutline>
                <span class="sr-only">Search dictionary</span>
                <input
                    v-model="content.searchTerm"
                    type="search"
                    placeholder="Search hanzi, pinyin, or English" />
                <small>{{ content.filteredWords.length }} matches</small>
            </label>
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

        <div class="dictionary-layout">
            <div class="word-list">
                <article
                    v-for="word in visibleWords"
                    :key="word.id"
                    @click="content.setActiveWord(word.id)"
                    @keydown.enter="content.setActiveWord(word.id)"
                    class="word-row"
                    :class="{ active: activeWord?.id === word.id }"
                    tabindex="0">
                    <div class="word-row__word">
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
                <p
                    v-if="content.filteredWords.length > visibleWords.length"
                    class="word-list__limit">Showing the first {{ visibleWords.length }} matches. Refine your search to find a specific word.</p>
            </div>

            <aside
                v-if="activeWord"
                class="dictionary-detail">
                <header>
                    <span>HSK {{ activeWord.level }}</span>
                    <button
                        @click="speakMandarin(activeWord.simplified)"
                        type="button"
                        aria-label="Play selected word pronunciation">
                        <VolumeHighOutline></VolumeHighOutline>
                    </button>
                </header>
                <div class="dictionary-detail__character">
                    <span class="character-grid"></span>
                    <strong>{{ settings.showTraditional ? activeWord.traditional : activeWord.simplified }}</strong>
                </div>
                <h3>{{ activeWord.pinyin }}</h3>
                <p>{{ activeWord.english }}</p>
                <dl>
                    <div>
                        <dt>Status</dt>
                        <dd>{{ activeProgress?.status ?? 'New' }}</dd>
                    </div>
                    <div>
                        <dt>Radical</dt>
                        <dd>{{ activeWord.radical || '—' }}</dd>
                    </div>
                    <div>
                        <dt>Next review</dt>
                        <dd>{{ formatDateTime(activeProgress?.nextReviewAt) }}</dd>
                    </div>
                </dl>
                <div
                    v-if="activeWord.examples.length"
                    class="dictionary-detail__examples">
                    <small>In a sentence</small>
                    <article
                        v-for="example in activeWord.examples.slice(0, 2)"
                        :key="example.zh">
                        <strong>{{ example.zh }}</strong>
                        <span v-if="example.pinyin">{{ example.pinyin }}</span>
                        <p>{{ example.en }}</p>
                    </article>
                </div>
                <div class="word-card__tags">
                    <span
                        v-for="tag in activeWord.tags.slice(0, 5)"
                        :key="tag">{{ tag }}</span>
                </div>
                <RouterLink
                    to="/study"
                    class="primary-action">
                    <BookOutline></BookOutline>
                    Study this word
                </RouterLink>
            </aside>
        </div>
    </section>
</template>
