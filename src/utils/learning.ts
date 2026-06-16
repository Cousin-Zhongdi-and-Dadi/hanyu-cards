import type {
    HskLevel,
    HskWord,
    ReviewGrade,
    WordProgress,
} from '@/types/learning'

export const levelOptions: Array<{ label: string, value: HskLevel | 'all' }> = [
    { label: 'All HSK 1-3', value: 'all' },
    { label: 'HSK 1', value: 1 },
    { label: 'HSK 2', value: 2 },
    { label: 'HSK 3', value: 3 },
]

export const reviewLabels: Record<ReviewGrade, string> = {
    again: 'Again',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
}

export const reviewIntervalText: Record<ReviewGrade, string> = {
    again: '10 min',
    hard: '1 day',
    good: '3+ days',
    easy: '1+ week',
}

export function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10)
}

export function normalizeSearch(value: string) {
    return value.trim().toLocaleLowerCase()
}

export function isDue(progress?: WordProgress, now = new Date()) {
    if (!progress?.nextReviewAt)
        return true

    return new Date(progress.nextReviewAt).getTime() <= now.getTime()
}

export function gradeToIntervalDays(grade: ReviewGrade, streak: number) {
    if (grade === 'again')
        return 10 / (24 * 60)
    if (grade === 'hard')
        return 1
    if (grade === 'good')
        return Math.min(30, 3 + streak * 2)

    return Math.min(60, 7 + streak * 5)
}

export function nextStatus(grade: ReviewGrade, reviews: number, streak: number): WordProgress['status'] {
    if (grade === 'again')
        return 'learning'
    if (streak >= 6 && reviews >= 8)
        return 'mastered'
    if (reviews >= 2)
        return 'reviewing'

    return 'learning'
}

export function formatDateTime(value?: string) {
    if (!value)
        return 'Ready now'

    const date = new Date(value)
    const diff = date.getTime() - Date.now()
    if (diff <= 0)
        return 'Ready now'
    if (diff < 60 * 60 * 1000)
        return `${Math.ceil(diff / 60000)} min`
    if (diff < 24 * 60 * 60 * 1000)
        return `${Math.ceil(diff / 3600000)} hr`

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function speakMandarin(text: string) {
    if (!('speechSynthesis' in window))
        return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.86
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
}

export function wordMatchesSearch(word: HskWord, term: string) {
    const query = normalizeSearch(term)
    if (!query)
        return true

    return [
        word.simplified,
        word.traditional,
        word.pinyin,
        word.numericPinyin,
        word.english,
        word.tags.join(' '),
    ].some((value) => normalizeSearch(value).includes(query))
}

export function chooseQuizOptions(current: HskWord, pool: HskWord[]) {
    const shuffled = pool
        .filter((word) => word.id !== current.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)

    return [...shuffled, current].sort(() => Math.random() - 0.5)
}
