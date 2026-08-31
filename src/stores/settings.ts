import { defineStore } from 'pinia'
import type { HskLevel } from '@/types/learning'

const SETTINGS_KEY = 'hanyu-settings-v1'

export interface SettingsState {
    ttsEnabled: boolean
    assistantEnabled: boolean
    showTraditional: boolean
    dailyStudyLevel: HskLevel | 'all'
}

const defaults: SettingsState = {
    ttsEnabled: true,
    assistantEnabled: true,
    showTraditional: false,
    dailyStudyLevel: 'all',
}

function loadSettings(): SettingsState {
    try {
        return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}'))
    }
    catch {
        return defaults
    }
}

function normalizeSettings(value: unknown): SettingsState {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('This backup does not contain valid learning preferences.')

    const candidate = value as Partial<SettingsState>

    return {
        ttsEnabled: typeof candidate.ttsEnabled === 'boolean' ? candidate.ttsEnabled : defaults.ttsEnabled,
        assistantEnabled: typeof candidate.assistantEnabled === 'boolean' ? candidate.assistantEnabled : defaults.assistantEnabled,
        showTraditional: typeof candidate.showTraditional === 'boolean' ? candidate.showTraditional : defaults.showTraditional,
        dailyStudyLevel: candidate.dailyStudyLevel === 1
            || candidate.dailyStudyLevel === 2
            || candidate.dailyStudyLevel === 3
            || candidate.dailyStudyLevel === 'all'
            ? candidate.dailyStudyLevel
            : defaults.dailyStudyLevel,
    }
}

export const useSettingsStore = defineStore('settings', {
    state: () => loadSettings(),
    actions: {
        persist() {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                ttsEnabled: this.ttsEnabled,
                assistantEnabled: this.assistantEnabled,
                showTraditional: this.showTraditional,
                dailyStudyLevel: this.dailyStudyLevel,
            }))
        },
        exportSettings(): SettingsState {
            return {
                ttsEnabled: this.ttsEnabled,
                assistantEnabled: this.assistantEnabled,
                showTraditional: this.showTraditional,
                dailyStudyLevel: this.dailyStudyLevel,
            }
        },
        importSettings(value: unknown) {
            const normalized = normalizeSettings(value)
            this.ttsEnabled = normalized.ttsEnabled
            this.assistantEnabled = normalized.assistantEnabled
            this.showTraditional = normalized.showTraditional
            this.dailyStudyLevel = normalized.dailyStudyLevel
            this.persist()
        },
        setTtsEnabled(value: boolean) {
            this.ttsEnabled = value
            this.persist()
        },
        setAssistantEnabled(value: boolean) {
            this.assistantEnabled = value
            this.persist()
        },
        setShowTraditional(value: boolean) {
            this.showTraditional = value
            this.persist()
        },
        setDailyStudyLevel(value: HskLevel | 'all') {
            this.dailyStudyLevel = value
            this.persist()
        },
    },
})
