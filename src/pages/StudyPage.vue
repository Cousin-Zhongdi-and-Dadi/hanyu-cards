<script setup lang="ts">
import {
    computed,
    ref,
    watch,
} from 'vue'
import {
    ArrowForwardOutline,
    CheckmarkCircleOutline,
    FlagOutline,
    RefreshOutline,
    SparklesOutline,
} from '@vicons/ionicons5'
import type { ReviewGrade } from '@/types/learning'
import WordCard from '@/components/WordCard.vue'
import { useReviewClock } from '@/composables/useReviewClock'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import {
    buildDailyWordIds,
    dailyPlanKey,
    isDue,
    levelOptions,
    todayKey,
} from '@/utils/learning'

const content = useContentStore()
const progress = useProgressStore()
const settings = useSettingsStore()
const reviewClock = useReviewClock()
const reveal = ref(false)
const preparing = ref(true)
const planDate = todayKey()

const currentPlanKey = computed(() => dailyPlanKey(planDate, content.selectedLevel))
const currentPlan = computed(() => progress.dailyPlans[currentPlanKey.value])
const planWords = computed(() => {
    return currentPlan.value?.wordIds
        .map((id) => content.wordsById[id])
        .filter(Boolean) ?? []
})
const remainingWords = computed(() => {
    const completed = new Set(currentPlan.value?.completedWordIds ?? [])

    return planWords.value.filter((word) => !completed.has(word.id))
})
const activeWord = computed(() => remainingWords.value[0])
const completedCount = computed(() => currentPlan.value?.completedWordIds.length ?? 0)
const planGoal = computed(() => currentPlan.value?.goal ?? progress.dailyGoal)
const planPercent = computed(() => {
    return planGoal.value ? Math.round((completedCount.value / planGoal.value) * 100) : 100
})
const dueCount = computed(() => {
    return content.filteredWords.filter((word) => isDue(progress.records[word.id], reviewClock.value)).length
})
const newCount = computed(() => content.filteredWords.filter((word) => !progress.records[word.id]).length)
const reviewedToday = computed(() => progress.todaySession.reviewed)
const gradeSummary = computed(() => {
    const results = Object.values(currentPlan.value?.results ?? {})

    return {
        remembered: results.filter((grade) => grade !== 'again').length,
        needsWork: results.filter((grade) => grade === 'again').length,
        xp: results.reduce((sum, grade) => sum + ({ again: 1, hard: 3, good: 5, easy: 8 }[grade]), 0),
    }
})

async function preparePlan() {
    preparing.value = true
    await progress.hydrate()
    const ids = buildDailyWordIds(
        content.filteredWords,
        progress.records,
        progress.dailyGoal,
        reviewClock.value,
    )
    await progress.ensureDailyPlan(currentPlanKey.value, planDate, content.selectedLevel, ids)
    reveal.value = false
    preparing.value = false
}

async function review(grade: ReviewGrade) {
    if (!activeWord.value)
        return

    await progress.reviewWord(activeWord.value, grade, { dailyPlanKey: currentPlanKey.value })
    reveal.value = false
}

watch(currentPlanKey, preparePlan, { immediate: true })
watch(activeWord, (word) => {
    if (word)
        content.setActiveWord(word.id)
})
</script>

<template>
    <section class="screen study-screen">
        <section class="study-hero">
            <div class="study-hero__copy">
                <p class="eyebrow">Today · A plan you can finish</p>
                <h2>Build a little Mandarin<br />into every day.</h2>
                <p>Your queue is fixed for today, so every card brings you closer to a clear finish.</p>
                <div class="study-hero__actions">
                    <RouterLink
                        to="/mistakes"
                        class="secondary-action">
                        <RefreshOutline></RefreshOutline>
                        Mistake notebook · {{ progress.activeMistakeCount }}
                    </RouterLink>
                </div>
            </div>

            <div
                class="study-plan-ring"
                :style="{ '--plan-progress': `${planPercent * 3.6}deg` }">
                <div>
                    <strong>{{ completedCount }}/{{ planGoal }}</strong>
                    <span>{{ remainingWords.length ? 'today’s plan' : 'complete' }}</span>
                </div>
            </div>
        </section>

        <section
            class="deck-status"
            aria-label="Today learning status">
            <div>
                <strong>{{ dueCount }}</strong>
                <span>reviews due</span>
            </div>
            <div>
                <strong>{{ newCount }}</strong>
                <span>new words</span>
            </div>
            <div>
                <strong>{{ reviewedToday }}</strong>
                <span>reviewed today</span>
            </div>
            <label>
                <span>Study set</span>
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
            </label>
        </section>

        <section
            v-if="!preparing && currentPlan"
            class="daily-plan-strip">
            <div>
                <span>Daily route</span>
                <strong>{{ remainingWords.length ? `Card ${completedCount + 1} of ${planGoal}` : `${planGoal} of ${planGoal} complete` }}</strong>
            </div>
            <div class="progress-track"><i :style="{ width: `${planPercent}%` }"></i></div>
            <small>{{ completedCount ? 'Progress saved automatically — you can return anytime.' : 'Due reviews and recent mistakes come first.' }}</small>
        </section>

        <div
            v-if="preparing"
            class="study-empty">
            <SparklesOutline></SparklesOutline>
            <h3>Preparing today’s route…</h3>
        </div>

        <WordCard
            v-else-if="activeWord"
            :key="activeWord.id"
            @reveal="reveal = true"
            @review="review"
            :word="activeWord"
            :progress="progress.records[activeWord.id]"
            :reveal="reveal"
            :tts-enabled="settings.ttsEnabled"
            :show-traditional="settings.showTraditional">
        </WordCard>

        <section
            v-else
            class="study-complete-card">
            <span class="study-complete-card__icon"><CheckmarkCircleOutline></CheckmarkCircleOutline></span>
            <p class="eyebrow">Daily route complete</p>
            <h3>{{ planGoal ? '今天的学习计划完成了！' : 'No cards available in this set.' }}</h3>
            <p v-if="planGoal">You remembered {{ gradeSummary.remembered }} cards and earned {{ gradeSummary.xp }} XP. {{ gradeSummary.needsWork }} card{{ gradeSummary.needsWork === 1 ? '' : 's' }} moved into your mistake notebook.</p>
            <p v-else>Try another HSK level or return tomorrow for the next review.</p>
            <div
                v-if="planGoal"
                class="study-complete-card__stats">
                <span><strong>{{ gradeSummary.remembered }}</strong> recalled</span>
                <span><strong>{{ gradeSummary.needsWork }}</strong> to revisit</span>
                <span><strong>{{ gradeSummary.xp }}</strong> XP</span>
            </div>
            <div class="study-complete-card__actions">
                <RouterLink
                    to="/mistakes"
                    class="secondary-action">
                    <FlagOutline></FlagOutline>
                    Review mistakes
                </RouterLink>
                <RouterLink
                    to="/practice"
                    class="primary-action">
                    Keep practicing
                    <ArrowForwardOutline></ArrowForwardOutline>
                </RouterLink>
            </div>
        </section>
    </section>
</template>
