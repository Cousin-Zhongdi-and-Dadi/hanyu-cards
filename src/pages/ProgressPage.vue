<script setup lang="ts">
import { computed } from 'vue'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { isDue, todayKey } from '@/utils/learning'

const content = useContentStore()
const progress = useProgressStore()

const dueCount = computed(() => content.words.filter((word) => isDue(progress.records[word.id])).length)
const completedScenarios = computed(() => content.scenarios.filter((scenario) => progress.completedScenarioIds.includes(scenario.id)).length)
const totalXp = computed(() => progress.sessions.reduce((sum, session) => sum + session.xp, 0))
const currentStreak = computed(() => {
    let streak = 0
    const cursor = new Date()

    while (progress.sessions.some((session) => session.date === todayKey(cursor) && session.reviewed > 0)) {
        streak += 1
        cursor.setDate(cursor.getDate() - 1)
    }

    return streak
})
const weeklyActivity = computed(() => {
    const days = []
    for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date()
        date.setDate(date.getDate() - offset)
        const session = progress.sessions.find((item) => item.date === todayKey(date))
        days.push({
            date: todayKey(date),
            label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2),
            reviewed: session?.reviewed ?? 0,
            percent: Math.min(100, Math.round(((session?.reviewed ?? 0) / progress.dailyGoal) * 100)),
        })
    }

    return days
})
const nextStep = computed(() => {
    if (dueCount.value > 0)
        return { to: '/study', label: `Review ${Math.min(dueCount.value, progress.dailyGoal)} due words`, detail: 'Start with scheduled recall while the memory is ready.' }
    if (completedScenarios.value < content.scenarios.length)
        return { to: '/scenarios', label: 'Continue a real-life mission', detail: 'Apply familiar words in a useful conversation.' }

    return { to: '/practice', label: 'Test your recall', detail: 'Use a short mixed quiz to keep mastered words active.' }
})
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

        <section class="next-step-band">
            <div>
                <p class="eyebrow">Recommended next</p>
                <h3>{{ nextStep.label }}</h3>
                <span>{{ nextStep.detail }}</span>
            </div>
            <RouterLink
                :to="nextStep.to"
                class="primary-action">Start</RouterLink>
        </section>

        <section class="analytics-section weekly-section">
            <header>
                <div>
                    <p class="eyebrow">Last seven days</p>
                    <h3>Learning rhythm</h3>
                </div>
                <div class="analytics-totals">
                    <span><strong>{{ currentStreak }}</strong> day streak</span>
                    <span><strong>{{ totalXp }}</strong> total XP</span>
                </div>
            </header>
            <div class="weekly-chart">
                <div
                    v-for="day in weeklyActivity"
                    :key="day.date">
                    <span>{{ day.reviewed }}</span>
                    <i><b :style="{ height: `${Math.max(4, day.percent)}%` }"></b></i>
                    <small>{{ day.label }}</small>
                </div>
            </div>
        </section>

        <section class="analytics-section scenario-analytics">
            <header>
                <div>
                    <p class="eyebrow">Applied Chinese</p>
                    <h3>Scenario missions</h3>
                </div>
                <strong>{{ completedScenarios }}/{{ content.scenarios.length }}</strong>
            </header>
            <div class="progress-track">
                <i :style="{ width: `${(completedScenarios / content.scenarios.length) * 100}%` }"></i>
            </div>
            <p>Complete a written task in each mission to connect vocabulary with real communication.</p>
        </section>

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
