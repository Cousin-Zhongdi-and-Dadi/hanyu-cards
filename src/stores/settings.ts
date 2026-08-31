import { defineStore } from 'pinia'

const SETTINGS_KEY = 'hanyu-settings-v1'

export interface SettingsState {
    ttsEnabled: boolean
    assistantEnabled: boolean
    showTraditional: boolean
}

const defaults: SettingsState = {
    ttsEnabled: true,
    assistantEnabled: true,
    showTraditional: false,
}

function loadSettings(): SettingsState {
    try {
        return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
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
            }))
        },
        exportSettings(): SettingsState {
            return {
                ttsEnabled: this.ttsEnabled,
                assistantEnabled: this.assistantEnabled,
                showTraditional: this.showTraditional,
            }
        },
        importSettings(value: unknown) {
            const normalized = normalizeSettings(value)
            this.ttsEnabled = normalized.ttsEnabled
            this.assistantEnabled = normalized.assistantEnabled
            this.showTraditional = normalized.showTraditional
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
    },
})
