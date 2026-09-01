import { defineStore } from 'pinia'
import localforage from 'localforage'
import type {
    DailyStudyPlan,
    HskLevel,
    HskWord,
    PracticeMode,
    PracticeModeStats,
    ReviewGrade,
    ScenarioEvaluation,
    ScenarioEvaluationDimensions,
    ScenarioProgress,
    StudySession,
    WordProgress,
} from '@/types/learning'
import {
    dailyPlanKey,
    gradeToIntervalDays,
    nextStatus,
    todayKey,
} from '@/utils/learning'

export interface ProgressBackupState {
    records: Record<string, WordProgress>
    sessions: StudySession[]
    dailyGoal: number
    completedScenarioIds: string[]
    dailyPlans: Record<string, DailyStudyPlan>
    practiceStats: Record<PracticeMode, PracticeModeStats>
    scenarioProgress: Record<string, ScenarioProgress>
    lastSavedAt?: string
}

interface ReviewOptions {
    dailyPlanKey?: string
    practiceMode?: PracticeMode
    resolveMistake?: boolean
    trackExtraWord?: boolean
}

const STORE_KEY = 'hanyu-progress-v1'
const practiceModes: PracticeMode[] = ['meaning', 'hanzi', 'pinyin', 'listening', 'context']
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

function emptyPracticeStats(): Record<PracticeMode, PracticeModeStats> {
    return {
        meaning: { attempts: 0, correct: 0 },
        hanzi: { attempts: 0, correct: 0 },
        pinyin: { attempts: 0, correct: 0 },
        listening: { attempts: 0, correct: 0 },
        context: { attempts: 0, correct: 0 },
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeNumber(value: unknown, fallback = 0, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
    const numeric = Number(value)

    return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, numeric)) : fallback
}

function safeDate(value: unknown) {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : undefined
}

function sanitizeRecords(value: unknown) {
    if (!isRecord(value))
        return {}

    const records: Record<string, WordProgress> = {}
    const validStatuses: WordProgress['status'][] = ['new', 'learning', 'reviewing', 'mastered']
    const validGrades: ReviewGrade[] = ['again', 'hard', 'good', 'easy']

    Object.entries(value).slice(0, 5_000).forEach(([id, item]) => {
        if (!isRecord(item))
            return

        const wordId = typeof item.wordId === 'string' ? item.wordId : id
        if (!wordId)
            return

        const status = validStatuses.includes(item.status as WordProgress['status'])
            ? item.status as WordProgress['status']
            : 'learning'
        const lastGrade = validGrades.includes(item.lastGrade as ReviewGrade)
            ? item.lastGrade as ReviewGrade
            : undefined

        records[id] = {
            wordId,
            reviews: Math.round(safeNumber(item.reviews)),
            correct: Math.round(safeNumber(item.correct)),
            streak: Math.round(safeNumber(item.streak)),
            ease: safeNumber(item.ease, 2.5, 1.3, 3.2),
            status,
            lastGrade,
            lastReviewedAt: safeDate(item.lastReviewedAt),
            nextReviewAt: safeDate(item.nextReviewAt),
            mistakeCount: Math.round(safeNumber(item.mistakeCount)),
            lastMistakeAt: safeDate(item.lastMistakeAt),
            needsMistakeReview: item.needsMistakeReview === true
                || (item.needsMistakeReview === undefined && lastGrade === 'again'),
        }
    })

    return records
}

function sanitizeSessions(value: unknown) {
    if (!Array.isArray(value))
        return []

    return value
        .filter(isRecord)
        .map((item): StudySession | undefined => {
            if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date))
                return undefined

            return {
                date: item.date,
                reviewed: Math.round(safeNumber(item.reviewed)),
                correct: Math.round(safeNumber(item.correct)),
                xp: Math.round(safeNumber(item.xp)),
                studySeconds: Math.round(safeNumber(item.studySeconds, 0, 0, 86_400)),
                extraWordIds: Array.isArray(item.extraWordIds)
                    ? [...new Set(item.extraWordIds.filter((id): id is string => typeof id === 'string'))].slice(0, 120)
                    : [],
            }
        })
        .filter((item): item is StudySession => Boolean(item))
        .slice(-120)
}

function sanitizePracticeStats(value: unknown) {
    const result = emptyPracticeStats()
    if (!isRecord(value))
        return result

    practiceModes.forEach((mode) => {
        const item = value[mode]
        if (!isRecord(item))
            return
        result[mode] = {
            attempts: Math.round(safeNumber(item.attempts)),
            correct: Math.round(safeNumber(item.correct)),
        }
    })

    return result
}

function sanitizeDimensions(value: unknown): ScenarioEvaluationDimensions {
    const dimensions = isRecord(value) ? value : {}

    return {
        completeness: Math.round(safeNumber(dimensions.completeness, 0, 0, 100)),
        naturalness: Math.round(safeNumber(dimensions.naturalness, 0, 0, 100)),
        accuracy: Math.round(safeNumber(dimensions.accuracy, 0, 0, 100)),
    }
}

function sanitizeScenarioProgress(value: unknown) {
    if (!isRecord(value))
        return {}

    const result: Record<string, ScenarioProgress> = {}
    Object.entries(value).slice(0, 100).forEach(([id, item]) => {
        if (!isRecord(item))
            return

        const lastAttemptAt = safeDate(item.lastAttemptAt)
        if (!lastAttemptAt)
            return

        const source = item.source === 'agicto' || item.source === 'mock' ? item.source : 'local'
        result[id] = {
            scenarioId: typeof item.scenarioId === 'string' ? item.scenarioId : id,
            attempts: Math.round(safeNumber(item.attempts)),
            bestScore: Math.round(safeNumber(item.bestScore, 0, 0, 100)),
            lastScore: Math.round(safeNumber(item.lastScore, 0, 0, 100)),
            lastAttemptAt,
            bestDimensions: sanitizeDimensions(item.bestDimensions),
            followUp: typeof item.followUp === 'string' ? item.followUp.slice(0, 500) : '',
            source,
        }
    })

    return result
}

function sanitizeDailyPlans(value: unknown) {
    if (!isRecord(value))
        return {}

    const result: Record<string, DailyStudyPlan> = {}
    Object.entries(value).slice(-30).forEach(([key, item]) => {
        if (!isRecord(item) || typeof item.date !== 'string')
            return

        const level = item.level === 1 || item.level === 2 || item.level === 3 ? item.level : 'all'
        const wordIds = Array.isArray(item.wordIds)
            ? item.wordIds.filter((id): id is string => typeof id === 'string').slice(0, 120)
            : []
        const completedWordIds = Array.isArray(item.completedWordIds)
            ? item.completedWordIds.filter((id): id is string => typeof id === 'string' && wordIds.includes(id))
            : []
        const rawResults = isRecord(item.results) ? item.results : {}
        const results = Object.entries(rawResults).reduce<Record<string, ReviewGrade>>((acc, [id, grade]) => {
            if (grade === 'again' || grade === 'hard' || grade === 'good' || grade === 'easy')
                acc[id] = grade

            return acc
        }, {})

        result[key] = {
            key,
            date: item.date,
            level: level as HskLevel | 'all',
            goal: Math.round(safeNumber(item.goal, wordIds.length, 0, 120)),
            wordIds,
            completedWordIds: [...new Set(completedWordIds)],
            results,
            createdAt: safeDate(item.createdAt) ?? new Date().toISOString(),
            completedAt: safeDate(item.completedAt),
        }
    })

    return result
}

function canonicalizeDailyPlans(plans: Record<string, DailyStudyPlan>) {
    const result = { ...plans }
    const dates = [...new Set(Object.values(plans).map((plan) => plan.date))]

    dates.forEach((date) => {
        const key = dailyPlanKey(date)
        if (result[key])
            return

        const candidate = Object.values(plans)
            .filter((plan) => plan.date === date)
            .sort((left, right) => {
                return right.completedWordIds.length - left.completedWordIds.length
                    || left.createdAt.localeCompare(right.createdAt)
            })[0]
        if (candidate)
            result[key] = { ...candidate, key }
    })

    return result
}

function normalizeProgress(value: unknown, requireCore = false): ProgressBackupState {
    if (!isRecord(value) || (requireCore && (!isRecord(value.records) || !Array.isArray(value.sessions))))
        throw new Error('This file does not contain a valid HanYu Cards progress backup.')

    return {
        records: sanitizeRecords(value.records),
        sessions: sanitizeSessions(value.sessions),
        dailyGoal: Math.round(safeNumber(value.dailyGoal, 24, 5, 120)),
        completedScenarioIds: Array.isArray(value.completedScenarioIds)
            ? [...new Set(value.completedScenarioIds.filter((id): id is string => typeof id === 'string'))].slice(0, 100)
            : [],
        dailyPlans: canonicalizeDailyPlans(sanitizeDailyPlans(value.dailyPlans)),
        practiceStats: sanitizePracticeStats(value.practiceStats),
        scenarioProgress: sanitizeScenarioProgress(value.scenarioProgress),
        lastSavedAt: safeDate(value.lastSavedAt),
    }
}

export const useProgressStore = defineStore('progress', {
    state: () => ({
        records: {} as Record<string, WordProgress>,
        sessions: [] as StudySession[],
        dailyGoal: 24,
        completedScenarioIds: [] as string[],
        dailyPlans: {} as Record<string, DailyStudyPlan>,
        practiceStats: emptyPracticeStats(),
        scenarioProgress: {} as Record<string, ScenarioProgress>,
        lastSavedAt: undefined as string | undefined,
        hydrated: false,
    }),
    getters: {
        todaySession(state): StudySession {
            return state.sessions.find((session) => session.date === todayKey()) ?? {
                date: todayKey(),
                reviewed: 0,
                correct: 0,
                xp: 0,
                studySeconds: 0,
                extraWordIds: [],
            }
        },
        todayPlan(state): DailyStudyPlan | undefined {
            return state.dailyPlans[dailyPlanKey(todayKey())]
        },
        todayPlanCompletedCount(state) {
            return state.dailyPlans[dailyPlanKey(todayKey())]?.completedWordIds.length ?? 0
        },
        todayPlanGoal(state) {
            return state.dailyPlans[dailyPlanKey(todayKey())]?.goal ?? state.dailyGoal
        },
        todayExtraWordCount(state) {
            return state.sessions.find((session) => session.date === todayKey())?.extraWordIds?.length ?? 0
        },
        masteredCount(state) {
            return Object.values(state.records).filter((record) => record.status === 'mastered').length
        },
        reviewedCount(state) {
            return Object.values(state.records).filter((record) => record.reviews > 0).length
        },
        activeMistakeCount(state) {
            return Object.values(state.records).filter((record) => record.needsMistakeReview).length
        },
        accuracy(state) {
            const reviewed = Object.values(state.records).reduce((sum, record) => sum + record.reviews, 0)
            const correct = Object.values(state.records).reduce((sum, record) => sum + record.correct, 0)

            return reviewed ? Math.round((correct / reviewed) * 100) : 0
        },
        totalStudySeconds(state) {
            return state.sessions.reduce((sum, session) => sum + (session.studySeconds ?? 0), 0)
        },
    },
    actions: {
        async hydrate() {
            if (this.hydrated)
                return

            const saved = await localforage.getItem<ProgressBackupState>(STORE_KEY)
            if (saved) {
                const normalized = normalizeProgress(saved)
                this.records = normalized.records
                this.sessions = normalized.sessions
                this.dailyGoal = normalized.dailyGoal
                this.completedScenarioIds = normalized.completedScenarioIds
                this.dailyPlans = normalized.dailyPlans
                this.practiceStats = normalized.practiceStats
                this.scenarioProgress = normalized.scenarioProgress
                this.lastSavedAt = normalized.lastSavedAt
            }

            this.hydrated = true
        },
        async persist() {
            this.lastSavedAt = new Date().toISOString()
            const recentPlans = Object.entries(this.dailyPlans)
                .sort(([, left], [, right]) => left.date.localeCompare(right.date))
                .slice(-30)
            this.dailyPlans = Object.fromEntries(recentPlans)
            const payload = this.exportProgress()

            await localforage.setItem(STORE_KEY, payload)
        },
        exportProgress(): ProgressBackupState {
            return JSON.parse(JSON.stringify({
                records: this.records,
                sessions: this.sessions.slice(-120),
                dailyGoal: this.dailyGoal,
                completedScenarioIds: this.completedScenarioIds,
                dailyPlans: this.dailyPlans,
                practiceStats: this.practiceStats,
                scenarioProgress: this.scenarioProgress,
                lastSavedAt: this.lastSavedAt,
            })) as ProgressBackupState
        },
        async importProgress(value: unknown) {
            const normalized = normalizeProgress(value, true)
            this.records = normalized.records
            this.sessions = normalized.sessions
            this.dailyGoal = normalized.dailyGoal
            this.completedScenarioIds = normalized.completedScenarioIds
            this.dailyPlans = normalized.dailyPlans
            this.practiceStats = normalized.practiceStats
            this.scenarioProgress = normalized.scenarioProgress
            this.hydrated = true
            await this.persist()
        },
        async ensureDailyPlan(key: string, date: string, level: HskLevel | 'all', wordIds: string[]) {
            if (this.dailyPlans[key])
                return this.dailyPlans[key]

            const uniqueIds = [...new Set(wordIds)].slice(0, this.dailyGoal)
            const plan: DailyStudyPlan = {
                key,
                date,
                level,
                goal: uniqueIds.length,
                wordIds: uniqueIds,
                completedWordIds: [],
                results: {},
                createdAt: new Date().toISOString(),
            }
            this.dailyPlans[key] = plan
            await this.persist()

            return plan
        },
        async reviewWord(word: HskWord, grade: ReviewGrade, options: ReviewOptions = {}) {
            const previous = this.records[word.id] ?? {
                wordId: word.id,
                reviews: 0,
                correct: 0,
                streak: 0,
                ease: 2.5,
                status: 'new',
                mistakeCount: 0,
                needsMistakeReview: false,
            } satisfies WordProgress

            const isCorrect = grade !== 'again'
            const streak = isCorrect ? previous.streak + 1 : 0
            const reviews = previous.reviews + 1
            const easeDelta = grade === 'easy' ? 0.18 : grade === 'good' ? 0.05 : grade === 'hard' ? -0.08 : -0.22
            const ease = Math.max(1.3, Math.min(3.2, previous.ease + easeDelta))
            const intervalDays = gradeToIntervalDays(grade, streak) * ease / 2.5
            const now = new Date().toISOString()
            const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString()
            const needsMistakeReview = grade === 'again'
                ? true
                : options.resolveMistake && (grade === 'good' || grade === 'easy')
                    ? false
                    : previous.needsMistakeReview ?? false

            this.records[word.id] = {
                ...previous,
                reviews,
                correct: previous.correct + (isCorrect ? 1 : 0),
                streak,
                ease,
                lastGrade: grade,
                lastReviewedAt: now,
                nextReviewAt,
                status: nextStatus(grade, reviews, streak),
                mistakeCount: (previous.mistakeCount ?? 0) + (grade === 'again' ? 1 : 0),
                lastMistakeAt: grade === 'again' ? now : previous.lastMistakeAt,
                needsMistakeReview,
            }

            const date = todayKey()
            let session = this.sessions.find((item) => item.date === date)
            if (!session) {
                session = { date, reviewed: 0, correct: 0, xp: 0, studySeconds: 0, extraWordIds: [] }
                this.sessions.push(session)
            }
            session.reviewed += 1
            session.correct += isCorrect ? 1 : 0
            session.xp += xpByGrade[grade]
            if (options.trackExtraWord && !session.extraWordIds?.includes(word.id))
                session.extraWordIds = [...(session.extraWordIds ?? []), word.id]

            const plan = options.dailyPlanKey ? this.dailyPlans[options.dailyPlanKey] : undefined
            if (plan?.wordIds.includes(word.id) && !plan.completedWordIds.includes(word.id)) {
                plan.completedWordIds.push(word.id)
                plan.results[word.id] = grade
                if (plan.completedWordIds.length >= plan.wordIds.length)
                    plan.completedAt = now
            }

            if (options.practiceMode) {
                const stats = this.practiceStats[options.practiceMode]
                stats.attempts += 1
                stats.correct += isCorrect ? 1 : 0
            }

            await this.persist()
        },
        async resolveMistake(wordId: string) {
            const record = this.records[wordId]
            if (!record)
                return

            record.needsMistakeReview = false
            await this.persist()
        },
        async addStudySeconds(seconds: number) {
            const increment = Math.round(safeNumber(seconds, 0, 0, 300))
            if (!increment)
                return

            const date = todayKey()
            let session = this.sessions.find((item) => item.date === date)
            if (!session) {
                session = { date, reviewed: 0, correct: 0, xp: 0, studySeconds: 0, extraWordIds: [] }
                this.sessions.push(session)
            }
            session.studySeconds = (session.studySeconds ?? 0) + increment
            await this.persist()
        },
        async setDailyGoal(value: number) {
            const numericGoal = Number(value)
            const nextGoal = Number.isFinite(numericGoal)
                ? Math.max(5, Math.min(120, Math.round(numericGoal)))
                : this.dailyGoal
            const planKey = dailyPlanKey(todayKey())
            const plan = this.dailyPlans[planKey]
            if (plan && plan.goal !== nextGoal && plan.completedWordIds.length === 0)
                delete this.dailyPlans[planKey]
            this.dailyGoal = nextGoal
            await this.persist()
        },
        async recordScenarioAttempt(scenarioId: string, evaluation: ScenarioEvaluation) {
            const now = new Date().toISOString()
            const previous = this.scenarioProgress[scenarioId]
            const isBest = !previous || evaluation.score >= previous.bestScore
            this.scenarioProgress[scenarioId] = {
                scenarioId,
                attempts: (previous?.attempts ?? 0) + 1,
                bestScore: isBest ? evaluation.score : previous.bestScore,
                lastScore: evaluation.score,
                lastAttemptAt: now,
                bestDimensions: isBest ? evaluation.dimensions : previous.bestDimensions,
                followUp: evaluation.followUp,
                source: evaluation.source,
            }
            if (evaluation.passed && !this.completedScenarioIds.includes(scenarioId))
                this.completedScenarioIds.push(scenarioId)

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
            this.dailyPlans = {}
            this.practiceStats = emptyPracticeStats()
            this.scenarioProgress = {}
            await this.persist()
        },
    },
})
