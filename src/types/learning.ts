export type HskLevel = 1 | 2 | 3

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy'

export interface WordExample {
    zh: string
    pinyin?: string
    en: string
}

export interface HskWord {
    id: string
    level: HskLevel
    simplified: string
    traditional: string
    pinyin: string
    numericPinyin: string
    english: string
    partOfSpeech: string[]
    radical: string
    frequency?: number
    examples: WordExample[]
    tags: string[]
}

export interface WordProgress {
    wordId: string
    reviews: number
    correct: number
    streak: number
    ease: number
    lastGrade?: ReviewGrade
    lastReviewedAt?: string
    nextReviewAt?: string
    status: 'new' | 'learning' | 'reviewing' | 'mastered'
}

export interface StudySession {
    date: string
    reviewed: number
    correct: number
    xp: number
}

export interface ScenarioVocabulary {
    simplified: string
    pinyin: string
    english: string
    usage: string
}

export interface ScenarioDialogueLine {
    speaker: string
    zh: string
    pinyin: string
    en: string
}

export interface ScenarioTask {
    prompt: string
    hint: string
    expectedKeywords: string[]
    modelAnswer: WordExample
}

export interface LearningScenario {
    id: string
    level: HskLevel
    title: string
    chineseTitle: string
    setting: string
    mission: string
    durationMinutes: number
    objectives: string[]
    vocabulary: ScenarioVocabulary[]
    dialogue: ScenarioDialogueLine[]
    cultureTitle: string
    cultureNote: string
    task: ScenarioTask
}

export interface AssistantContext {
    activeWord?: HskWord
    activeScenario?: LearningScenario
    learnerLevel: HskLevel | 'all'
    dueCount: number
    masteredCount: number
    recentMistakes: HskWord[]
}
