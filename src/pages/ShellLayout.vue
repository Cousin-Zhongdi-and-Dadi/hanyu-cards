<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
    BarChartOutline,
    BookOutline,
    CompassOutline,
    FlameOutline,
    LibraryOutline,
    OptionsOutline,
    SchoolOutline,
} from '@vicons/ionicons5'
import AIAssistant from '@/components/AIAssistant.vue'
import { useNativeBackButton } from '@/composables/useNativeBackButton'
import { useStudyTimer } from '@/composables/useStudyTimer'
import { useProgressStore } from '@/stores/progress'
import { todayKey } from '@/utils/learning'

const progress = useProgressStore()
useNativeBackButton()
useStudyTimer()

const navItems = [
    { to: '/study', label: 'Today', icon: SchoolOutline },
    { to: '/scenarios', label: 'Missions', icon: CompassOutline },
    { to: '/practice', label: 'Practice', icon: BookOutline },
    { to: '/dictionary', label: 'Words', icon: LibraryOutline },
    { to: '/progress', label: 'Progress', icon: BarChartOutline },
]

const todayPercent = computed(() => {
    return Math.min(100, Math.round((progress.todaySession.reviewed / progress.dailyGoal) * 100))
})
const currentStreak = computed(() => {
    let streak = 0
    const cursor = new Date()

    while (progress.sessions.some((session) => session.date === todayKey(cursor) && session.reviewed > 0)) {
        streak += 1
        cursor.setDate(cursor.getDate() - 1)
    }

    return streak
})
const todayLabel = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    weekday: 'long',
}).format(new Date())

onMounted(async () => {
    await progress.hydrate()
})
</script>

<template>
    <div class="app-shell">
        <div
            class="app-atmosphere"
            aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
        </div>

        <header class="topbar">
            <RouterLink
                to="/study"
                class="brand"
                aria-label="HanYu Cards home">
                <span
                    class="brand__mark"
                    aria-hidden="true">汉</span>
                <span class="brand__copy">
                    <strong>HanYu</strong>
                    <small>Mandarin, made memorable</small>
                </span>
            </RouterLink>

            <p class="topbar__date">{{ todayLabel }}</p>

            <div class="topbar__actions">
                <div
                    class="topbar__streak"
                    aria-label="Current learning streak">
                    <FlameOutline></FlameOutline>
                    <span>
                        <strong>{{ currentStreak }}</strong>
                        <small>day streak</small>
                    </span>
                </div>
                <div
                    class="topbar__meter"
                    aria-label="Daily progress">
                    <span>
                        <strong>{{ progress.todaySession.reviewed }}/{{ progress.dailyGoal }}</strong>
                        <small>today</small>
                    </span>
                    <div><i :style="{ width: `${todayPercent}%` }"></i></div>
                </div>
                <RouterLink
                    to="/settings"
                    class="topbar__settings"
                    aria-label="Learning settings"
                    title="Learning settings">
                    <OptionsOutline></OptionsOutline>
                </RouterLink>
            </div>
        </header>

        <main class="app-main">
            <router-view></router-view>
        </main>

        <nav
            class="bottom-nav"
            aria-label="Primary">
            <RouterLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="bottom-nav__item">
                <span class="bottom-nav__icon">
                    <component :is="item.icon"></component>
                </span>
                <span>{{ item.label }}</span>
            </RouterLink>
        </nav>

        <AIAssistant></AIAssistant>
    </div>
</template>
