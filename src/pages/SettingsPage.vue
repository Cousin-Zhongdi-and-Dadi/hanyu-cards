<script setup lang="ts">
import { ref } from 'vue'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'

const progress = useProgressStore()
const settings = useSettingsStore()
const goal = ref(progress.dailyGoal)

async function saveGoal() {
    await progress.setDailyGoal(goal.value)
    goal.value = progress.dailyGoal
}

async function reset() {
    if (window.confirm('Reset all local learning progress on this device?'))
        await progress.resetProgress()
}
</script>

<template>
    <section class="screen settings-screen">
        <div class="screen__intro">
            <div>
                <p class="eyebrow">Device settings</p>
                <h2>Learning preferences</h2>
            </div>
        </div>

        <div class="settings-list">
            <label>
                <span>
                    <strong>Pronunciation audio</strong>
                    <small>Use device speech synthesis for Mandarin.</small>
                </span>
                <input
                    @change="settings.setTtsEnabled(($event.target as HTMLInputElement).checked)"
                    :checked="settings.ttsEnabled"
                    type="checkbox" />
            </label>

            <label>
                <span>
                    <strong>AI tutor floating button</strong>
                    <small>Send selected word context to your configured assistant proxy.</small>
                </span>
                <input
                    @change="settings.setAssistantEnabled(($event.target as HTMLInputElement).checked)"
                    :checked="settings.assistantEnabled"
                    type="checkbox" />
            </label>

            <label>
                <span>
                    <strong>Traditional characters</strong>
                    <small>Show traditional forms when available.</small>
                </span>
                <input
                    @change="settings.setShowTraditional(($event.target as HTMLInputElement).checked)"
                    :checked="settings.showTraditional"
                    type="checkbox" />
            </label>
        </div>

        <form
            @submit.prevent="saveGoal"
            class="goal-form">
            <label for="daily-goal">Daily review target</label>
            <input
                id="daily-goal"
                v-model.number="goal"
                type="number"
                min="5"
                max="120"
                step="1" />
            <button
                class="primary-action"
                type="submit">Save Goal</button>
        </form>

        <article class="privacy-note">
            <h3>Privacy</h3>
            <p>Words and progress stay on this device. The AI tutor only receives your message, current word, due count, mastered count, and recent mistakes when you send a chat message.</p>
        </article>

        <button
            @click="reset"
            class="danger-action"
            type="button">
            Reset Local Progress
        </button>
    </section>
</template>
