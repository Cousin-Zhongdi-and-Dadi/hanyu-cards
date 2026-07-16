import { describe, expect, it } from 'vitest'
import { learningScenarios } from '@/data/scenarios'

describe('scenario learning content', () => {
    it('provides a progressive set of complete real-life missions', () => {
        expect(learningScenarios).toHaveLength(6)
        expect(new Set(learningScenarios.map((scenario) => scenario.id)).size).toBe(6)
        expect(new Set(learningScenarios.map((scenario) => scenario.level))).toEqual(new Set([1, 2, 3]))

        learningScenarios.forEach((scenario) => {
            expect(scenario.objectives.length).toBeGreaterThanOrEqual(3)
            expect(scenario.vocabulary.length).toBeGreaterThanOrEqual(5)
            expect(scenario.dialogue.length).toBeGreaterThanOrEqual(5)
            expect(scenario.task.expectedKeywords.length).toBeGreaterThanOrEqual(3)
            expect(scenario.task.modelAnswer.zh).not.toBe('')
            expect(scenario.cultureNote.length).toBeGreaterThan(60)
        })
    })
})
