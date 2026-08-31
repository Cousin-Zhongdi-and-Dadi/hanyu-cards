import type {
    LearningScenario,
    ScenarioEvaluation,
    ScenarioEvaluationSource,
} from '@/types/learning'

export function matchedScenarioKeywords(scenario: LearningScenario, response: string) {
    const normalized = response.replace(/[\s，。！？、,.!?]/g, '')

    return scenario.task.expectedKeywords.filter((keyword) => normalized.includes(keyword))
}

export function evaluateScenarioLocally(
    scenario: LearningScenario,
    response: string,
    source: ScenarioEvaluationSource = 'local',
): ScenarioEvaluation {
    const matched = matchedScenarioKeywords(scenario, response)
    const missing = scenario.task.expectedKeywords.filter((keyword) => !matched.includes(keyword))
    const coverage = matched.length / scenario.task.expectedKeywords.length
    const passed = missing.length === 0

    return {
        passed,
        score: passed ? 100 : Math.round(30 + coverage * 55),
        feedback: passed
            ? 'Mission complete. Your response covers every required part.'
            : matched.length
                ? `Good start. You covered ${matched.length} of ${scenario.task.expectedKeywords.length} target parts.`
                : 'Build your answer around the mission requirements, then check it again.',
        strengths: matched.map((keyword) => `Included “${keyword}”.`),
        improvements: missing.map((keyword) => `Express the idea represented by “${keyword}”.`),
        source,
        dimensions: {
            completeness: Math.round(coverage * 100),
            naturalness: passed ? 78 : Math.round(45 + coverage * 25),
            accuracy: passed ? 86 : Math.round(50 + coverage * 25),
        },
        followUp: passed
            ? 'Can you say the same message one more time using different words?'
            : `Can you add the missing idea “${missing[0] ?? scenario.task.expectedKeywords[0]}”?`,
    }
}
