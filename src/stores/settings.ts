import { defineStore } from 'pinia'

const SETTINGS_KEY = 'hanyu-settings-v1'

interface SettingsState {
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
