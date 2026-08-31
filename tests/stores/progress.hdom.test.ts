// @vitest-environment happy-dom

import localforage from 'localforage'
import {
    createPinia,
    setActivePinia,
} from 'pinia'
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest'
import type { ScenarioEvaluation } from '@/types/learning'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import {
    dailyPlanKey,
    todayKey,
} from '@/utils/learning'

function evaluation(score: number, passed = true): ScenarioEvaluation {
    return {
        passed,
        score,
        feedback: 'Useful feedback',
        strengths: ['Clear meaning'],
        improvements: [],
        source: 'agicto',
        dimensions: {
            completeness: score,
            naturalness: score - 2,
            accuracy: score - 4,
        },
        followUp: `Follow-up for ${score}`,
    }
}

describe('store/progress learning loop', () => {
    beforeEach(async () => {
        await localforage.clear()
        setActivePinia(createPinia())
    })

    it('keeps a daily plan stable and resumable once it is created', async () => {
        const content = useContentStore()
        const progress = useProgressStore()
        progress.dailyGoal = 2
        const key = dailyPlanKey(todayKey(), 'all')

        await progress.ensureDailyPlan(key, todayKey(), 'all', content.words.slice(0, 3).map((word) => word.id))
        await progress.ensureDailyPlan(key, todayKey(), 'all', content.words.slice(3, 6).map((word) => word.id))

        expect(progress.dailyPlans[key].wordIds).toEqual(content.words.slice(0, 2).map((word) => word.id))
        expect(progress.dailyPlans[key].completedWordIds).toEqual([])
    })

    it('moves an incorrect word into focused review and clears it after successful recovery', async () => {
        const content = useContentStore()
        const progress = useProgressStore()
        const target = content.words[0]
        const key = dailyPlanKey(todayKey(), 'all')
        await progress.ensureDailyPlan(key, todayKey(), 'all', [target.id])

        await progress.reviewWord(target, 'again', { dailyPlanKey: key })

        expect(progress.records[target.id]).toMatchObject({
            mistakeCount: 1,
            needsMistakeReview: true,
        })
        expect(progress.dailyPlans[key].completedWordIds).toEqual([target.id])

        await progress.reviewWord(target, 'good', { practiceMode: 'meaning', resolveMistake: true })

        expect(progress.records[target.id].needsMistakeReview).toBe(false)
        expect(progress.practiceStats.meaning).toEqual({ attempts: 1, correct: 1 })
        expect(progress.todaySession.reviewed).toBe(2)
    })

    it('records every mission attempt while preserving the best multidimensional score', async () => {
        const progress = useProgressStore()

        await progress.recordScenarioAttempt('first-meeting', evaluation(88))
        await progress.recordScenarioAttempt('first-meeting', evaluation(72))

        expect(progress.completedScenarioIds).toEqual(['first-meeting'])
        expect(progress.scenarioProgress['first-meeting']).toMatchObject({
            attempts: 2,
            bestScore: 88,
            lastScore: 72,
            followUp: 'Follow-up for 72',
        })
        expect(progress.scenarioProgress['first-meeting'].bestDimensions.completeness).toBe(88)
    })

    it('round-trips the expanded progress model through a backup', async () => {
        const content = useContentStore()
        const source = useProgressStore()
        await source.reviewWord(content.words[0], 'again', { practiceMode: 'listening' })
        await source.recordScenarioAttempt('first-meeting', evaluation(91))
        const backup = source.exportProgress()

        setActivePinia(createPinia())
        const restored = useProgressStore()
        await restored.importProgress(backup)

        expect(restored.records[content.words[0].id].needsMistakeReview).toBe(true)
        expect(restored.practiceStats.listening.attempts).toBe(1)
        expect(restored.scenarioProgress['first-meeting'].bestScore).toBe(91)
    })
})
