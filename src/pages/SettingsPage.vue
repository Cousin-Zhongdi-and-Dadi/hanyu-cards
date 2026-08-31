<script setup lang="ts">
import {
    computed,
    ref,
    watch,
} from 'vue'
import {
    CheckmarkCircleOutline,
    CloudOfflineOutline,
    CloudUploadOutline,
    DownloadOutline,
    LanguageOutline,
    PhonePortraitOutline,
    ShieldCheckmarkOutline,
    SparklesOutline,
    TodayOutline,
    VolumeHighOutline,
} from '@vicons/ionicons5'
import type { HskLevel } from '@/types/learning'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import { levelOptions } from '@/utils/learning'
import {
    hasSecureNativeAssistantEndpoint,
    isNativeApp,
    shareNativeTextFile,
} from '@/utils/native'

const progress = useProgressStore()
const settings = useSettingsStore()
const goal = ref(progress.dailyGoal)
const importInput = ref<HTMLInputElement>()
const transferMessage = ref('')
const transferError = ref(false)
const nativeRuntime = isNativeApp()
const nativeAssistantReady = hasSecureNativeAssistantEndpoint()
const dailyStudyLevel = computed<HskLevel | 'all'>({
    get: () => settings.dailyStudyLevel,
    set: (value) => settings.setDailyStudyLevel(value),
})
const savedLabel = computed(() => {
    if (!progress.lastSavedAt)
        return 'No learning activity saved yet'

    return `Last saved ${new Date(progress.lastSavedAt).toLocaleString()}`
})

watch(() => progress.dailyGoal, (value) => {
    goal.value = value
})

async function saveGoal() {
    await progress.setDailyGoal(goal.value)
    goal.value = progress.dailyGoal
}

async function exportBackup() {
    try {
        await progress.hydrate()
        const backup = {
            app: 'hanyu-cards',
            version: 1,
            exportedAt: new Date().toISOString(),
            progress: progress.exportProgress(),
            settings: settings.exportSettings(),
        }
        const contents = JSON.stringify(backup, null, 2)
        const filename = `hanyu-cards-backup-${new Date().toISOString().slice(0, 10)}.json`
        if (await shareNativeTextFile(filename, contents)) {
            transferError.value = false
            transferMessage.value = 'Backup prepared. Choose where to save or share it.'

            return
        }

        const blob = new Blob([contents], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
        transferError.value = false
        transferMessage.value = 'Backup downloaded. Keep it somewhere private.'
    }
    catch (error) {
        transferError.value = true
        transferMessage.value = error instanceof Error ? error.message : 'The backup could not be exported.'
    }
}

async function importBackup(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file)
        return

    try {
        if (file.size > 5 * 1024 * 1024)
            throw new Error('Backup is larger than the 5 MB safety limit.')
        const backup = JSON.parse(await file.text()) as Record<string, unknown>
        if (backup.app !== 'hanyu-cards' || backup.version !== 1)
            throw new Error('Choose a HanYu Cards version 1 backup file.')
        if (!backup.progress || typeof backup.progress !== 'object' || !backup.settings || typeof backup.settings !== 'object')
            throw new Error('This backup is incomplete and was not imported.')

        await progress.importProgress(backup.progress)
        settings.importSettings(backup.settings)
        goal.value = progress.dailyGoal
        transferError.value = false
        transferMessage.value = `Restored ${progress.reviewedCount} word records and ${progress.completedScenarioIds.length} completed missions.`
    }
    catch (error) {
        transferError.value = true
        transferMessage.value = error instanceof Error ? error.message : 'The backup could not be imported.'
    }
    finally {
        input.value = ''
    }
}

async function reset() {
    if (!window.confirm('This will erase reviews, mistakes, daily plans, scores, and mission progress stored on this device. Continue?'))
        return
    if (window.prompt('Type RESET to permanently erase local learning progress.') !== 'RESET') {
        transferError.value = true
        transferMessage.value = 'Reset cancelled — the confirmation text did not match.'

        return
    }

    await progress.resetProgress()
    goal.value = progress.dailyGoal
    transferError.value = false
    transferMessage.value = 'Local learning progress was reset. Your display preferences were kept.'
}
</script>

<template>
    <section class="screen settings-screen">
        <section class="settings-hero">
            <div>
                <p class="eyebrow">Make it yours</p>
                <h2>A learning space<br />that fits you.</h2>
                <p>Choose how HanYu sounds, looks, and supports your daily practice.</p>
            </div>
            <span
                class="settings-hero__seal"
                aria-hidden="true">专注</span>
        </section>

        <div class="settings-layout">
            <section class="settings-card">
                <header>
                    <p class="eyebrow">Learning experience</p>
                    <h3>Preferences</h3>
                </header>
                <div class="settings-list">
                    <label>
                        <i><VolumeHighOutline></VolumeHighOutline></i>
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
                        <i><SparklesOutline></SparklesOutline></i>
                        <span>
                            <strong>AI tutor</strong>
                            <small>Show the contextual Agicto-powered tutor.</small>
                        </span>
                        <input
                            @change="settings.setAssistantEnabled(($event.target as HTMLInputElement).checked)"
                            :checked="settings.assistantEnabled"
                            type="checkbox" />
                    </label>

                    <label>
                        <i><LanguageOutline></LanguageOutline></i>
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
            </section>

            <section class="settings-card settings-card--goal">
                <header>
                    <i><TodayOutline></TodayOutline></i>
                    <div>
                        <p class="eyebrow">Daily rhythm</p>
                        <h3>Review goal</h3>
                    </div>
                </header>
                <p>Pick a target you can keep even on a busy day. Consistency beats intensity.</p>
                <form
                    @submit.prevent="saveGoal"
                    class="goal-form">
                    <label for="daily-goal">Cards per day</label>
                    <input
                        id="daily-goal"
                        v-model.number="goal"
                        type="number"
                        min="5"
                        max="120"
                        step="1" />
                    <button
                        class="primary-action"
                        type="submit">Save goal</button>
                </form>
                <label class="daily-set-field">
                    <span>Daily study set</span>
                    <select
                        v-model="dailyStudyLevel"
                        aria-label="Choose the word level for future daily routes">
                        <option
                            v-for="option in levelOptions"
                            :key="option.value"
                            :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                    <small>This applies when the next daily route is created. A route already started today stays fixed.</small>
                </label>
                <p class="daily-goal-note"><strong>What counts?</strong> One rating completes one unique daily card. “Again” still counts for today and also moves the word to your mistake notebook; mastery is tracked separately over repeated reviews.</p>
            </section>
        </div>

        <section class="privacy-note">
            <ShieldCheckmarkOutline></ShieldCheckmarkOutline>
            <div>
                <p class="eyebrow">Private by design</p>
                <h3>Your progress stays with you</h3>
                <p>Learning records remain on this device. When you use the AI tutor, only your message and the minimum learning context needed for the reply are sent through the server to Agicto.</p>
            </div>
            <span><CloudOfflineOutline></CloudOfflineOutline> Offline study stays available</span>
        </section>

        <section
            v-if="nativeRuntime"
            class="native-runtime-note"
            :class="{ 'native-runtime-note--warning': !nativeAssistantReady }">
            <PhonePortraitOutline></PhonePortraitOutline>
            <div>
                <p class="eyebrow">Installed App</p>
                <h3>{{ nativeAssistantReady ? 'Secure AI connection ready' : 'AI is using offline fallback' }}</h3>
                <p>{{ nativeAssistantReady ? 'This build can reach its HTTPS assistant service.' : 'Set VITE_ASSISTANT_API_URL to the deployed HTTPS API, then rebuild and sync the App. Core learning remains available offline.' }}</p>
            </div>
        </section>

        <section class="settings-card data-card">
            <header>
                <i><CloudUploadOutline></CloudUploadOutline></i>
                <div>
                    <p class="eyebrow">Local data</p>
                    <h3>Backup and restore</h3>
                </div>
                <span class="save-status"><CheckmarkCircleOutline></CheckmarkCircleOutline>{{ savedLabel }}</span>
            </header>
            <p>Your backup includes review history, today plans, mistake notebook, practice scores, mission results, and preferences. It never includes your Agicto API key.</p>
            <div class="data-actions">
                <button
                    @click="exportBackup"
                    class="secondary-action"
                    type="button">
                    <DownloadOutline></DownloadOutline>
                    Export backup
                </button>
                <button
                    @click="importInput?.click()"
                    class="secondary-action"
                    type="button">
                    <CloudUploadOutline></CloudUploadOutline>
                    Import backup
                </button>
                <input
                    ref="importInput"
                    @change="importBackup"
                    class="visually-hidden"
                    type="file"
                    accept="application/json,.json" />
            </div>
            <p
                v-if="transferMessage"
                class="transfer-message"
                :class="{ error: transferError }"
                aria-live="polite">{{ transferMessage }}</p>
        </section>

        <button
            @click="reset"
            class="danger-action"
            type="button">
            Reset Local Progress
        </button>
    </section>
</template>
