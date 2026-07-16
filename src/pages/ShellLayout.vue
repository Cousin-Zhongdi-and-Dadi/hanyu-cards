<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
    BarChartOutline,
    BookOutline,
    CompassOutline,
    LibraryOutline,
    OptionsOutline,
    SchoolOutline,
} from '@vicons/ionicons5'
import AIAssistant from '@/components/AIAssistant.vue'
import { useProgressStore } from '@/stores/progress'

const progress = useProgressStore()

const navItems = [
    { to: '/study', label: 'Study', icon: SchoolOutline },
    { to: '/scenarios', label: 'Missions', icon: CompassOutline },
    { to: '/practice', label: 'Practice', icon: BookOutline },
    { to: '/dictionary', label: 'Words', icon: LibraryOutline },
    { to: '/progress', label: 'Progress', icon: BarChartOutline },
]

const todayPercent = computed(() => {
    return Math.min(100, Math.round((progress.todaySession.reviewed / progress.dailyGoal) * 100))
})

onMounted(async () => {
    await progress.hydrate()
})
</script>

<template>
    <div class="app-shell">
        <header class="topbar">
            <div>
                <p class="eyebrow">HSK 1-3 Mandarin</p>
                <h1>HanYu Cards</h1>
            </div>
            <div class="topbar__actions">
                <div
                    class="topbar__meter"
                    aria-label="Daily progress">
                    <strong>{{ progress.todaySession.reviewed }}/{{ progress.dailyGoal }}</strong>
                    <span>today</span>
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
                <component :is="item.icon"></component>
                <span>{{ item.label }}</span>
            </RouterLink>
        </nav>

        <AIAssistant></AIAssistant>
    </div>
</template>
