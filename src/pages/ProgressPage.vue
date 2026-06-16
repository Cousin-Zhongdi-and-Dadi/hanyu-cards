<script setup lang="ts">
import { computed } from 'vue'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { isDue } from '@/utils/learning'

const content = useContentStore()
const progress = useProgressStore()

const dueCount = computed(() => content.words.filter((word) => isDue(progress.records[word.id])).length)
const levelStats = computed(() => {
    return ([1, 2, 3] as const).map((level) => {
        const words = content.words.filter((word) => word.level === level)
        const reviewed = words.filter((word) => progress.records[word.id]?.reviews).length
        const mastered = words.filter((word) => progress.records[word.id]?.status === 'mastered').length

        return {
            level,
            total: words.length,
            reviewed,
            mastered,
            percent: Math.round((mastered / words.length) * 100),
        }
    })
})
</script>

<template>
    <section class="screen progress-screen">
        <div class="screen__intro">
            <div>
                <p class="eyebrow">Learning analytics</p>
                <h2>Your progress</h2>
            </div>
        </div>

        <div class="stats-grid">
            <article>
                <span>{{ progress.todaySession.reviewed }}</span>
                <p>reviewed today</p>
            </article>
            <article>
                <span>{{ progress.accuracy }}%</span>
                <p>accuracy</p>
            </article>
            <article>
                <span>{{ progress.masteredCount }}</span>
                <p>mastered</p>
            </article>
            <article>
                <span>{{ dueCount }}</span>
                <p>due now</p>
            </article>
        </div>

        <div class="level-progress">
            <article
                v-for="stat in levelStats"
                :key="stat.level">
                <header>
                    <strong>HSK {{ stat.level }}</strong>
                    <span>{{ stat.mastered }}/{{ stat.total }} mastered</span>
                </header>
                <div class="progress-track">
                    <i :style="{ width: `${stat.percent}%` }"></i>
                </div>
                <p>{{ stat.reviewed }} words have at least one review.</p>
            </article>
        </div>
    </section>
</template>
