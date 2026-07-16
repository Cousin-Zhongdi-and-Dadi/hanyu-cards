import { defineStore } from 'pinia'
import localforage from 'localforage'
import type {
    HskWord,
    ReviewGrade,
    StudySession,
    WordProgress,
} from '@/types/learning'
import {
    gradeToIntervalDays,
    nextStatus,
    todayKey,
} from '@/utils/learning'

interface PersistedProgressState {
    records: Record<string, WordProgress>
    sessions: StudySession[]
    dailyGoal: number
    completedScenarioIds?: string[]
}

const STORE_KEY = 'hanyu-progress-v1'
const xpByGrade: Record<ReviewGrade, number> = {
    again: 1,
    hard: 3,
    good: 5,
    easy: 8,
}

localforage.config({
    name: 'HanYu Cards',
    storeName: 'learning_progress',
})

export const useProgressStore = defineStore('progress', {
    state: () => ({
        records: {} as Record<string, WordProgress>,
        sessions: [] as StudySession[],
        dailyGoal: 24,
        completedScenarioIds: [] as string[],
        hydrated: false,
    }),
    getters: {
        todaySession(state): StudySession {
            return state.sessions.find((session) => session.date === todayKey()) ?? {
                date: todayKey(),
                reviewed: 0,
                correct: 0,
                xp: 0,
            }
        },
        masteredCount(state) {
            return Object.values(state.records).filter((record) => record.status === 'mastered').length
        },
        reviewedCount(state) {
            return Object.values(state.records).filter((record) => record.reviews > 0).length
        },
        accuracy(state) {
            const reviewed = Object.values(state.records).reduce((sum, record) => sum + record.reviews, 0)
            const correct = Object.values(state.records).reduce((sum, record) => sum + record.correct, 0)

            return reviewed ? Math.round((correct / reviewed) * 100) : 0
        },
    },
    actions: {
        async hydrate() {
            if (this.hydrated)
                return

            const saved = await localforage.getItem<PersistedProgressState>(STORE_KEY)
            if (saved) {
                this.records = saved.records ?? {}
                this.sessions = saved.sessions ?? []
                this.dailyGoal = saved.dailyGoal ?? 24
                this.completedScenarioIds = saved.completedScenarioIds ?? []
            }

            this.hydrated = true
        },
        async persist() {
            const payload = JSON.parse(JSON.stringify({
                records: this.records,
                sessions: this.sessions.slice(-120),
                dailyGoal: this.dailyGoal,
                completedScenarioIds: this.completedScenarioIds,
            })) as PersistedProgressState

            await localforage.setItem(STORE_KEY, payload)
        },
        async reviewWord(word: HskWord, grade: ReviewGrade) {
            const previous = this.records[word.id] ?? {
                wordId: word.id,
                reviews: 0,
                correct: 0,
                streak: 0,
                ease: 2.5,
                status: 'new',
            } satisfies WordProgress

            const isCorrect = grade !== 'again'
            const streak = isCorrect ? previous.streak + 1 : 0
            const reviews = previous.reviews + 1
            const easeDelta = grade === 'easy' ? 0.18 : grade === 'good' ? 0.05 : grade === 'hard' ? -0.08 : -0.22
            const ease = Math.max(1.3, Math.min(3.2, previous.ease + easeDelta))
            const intervalDays = gradeToIntervalDays(grade, streak) * ease / 2.5
            const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString()

            this.records[word.id] = {
                ...previous,
                reviews,
                correct: previous.correct + (isCorrect ? 1 : 0),
                streak,
                ease,
                lastGrade: grade,
                lastReviewedAt: new Date().toISOString(),
                nextReviewAt,
                status: nextStatus(grade, reviews, streak),
            }

            const date = todayKey()
            let session = this.sessions.find((item) => item.date === date)
            if (!session) {
                session = { date, reviewed: 0, correct: 0, xp: 0 }
                this.sessions.push(session)
            }

            session.reviewed += 1
            session.correct += isCorrect ? 1 : 0
            session.xp += xpByGrade[grade]

            await this.persist()
        },
        async setDailyGoal(value: number) {
            this.dailyGoal = Math.max(5, Math.min(120, Math.round(value)))
            await this.persist()
        },
        async completeScenario(scenarioId: string) {
            if (!this.completedScenarioIds.includes(scenarioId)) {
                this.completedScenarioIds.push(scenarioId)
                await this.persist()
            }
        },
        async resetProgress() {
            this.records = {}
            this.sessions = []
            this.completedScenarioIds = []
            await this.persist()
        },
    },
})
