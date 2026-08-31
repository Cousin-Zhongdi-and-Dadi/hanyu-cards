import type {
    HskLevel,
    HskWord,
    ReviewGrade,
    WordProgress,
} from '@/types/learning'
import { speakNativeMandarin } from '@/utils/native'

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
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

export function normalizeSearch(value: string) {
    return value.trim().toLocaleLowerCase()
}

export function isDue(progress?: WordProgress, now = new Date()) {
    if (!progress)
        return false
    if (!progress.nextReviewAt)
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

export function formatStudyTime(seconds: number) {
    const total = Math.max(0, Math.round(seconds))
    if (total < 60)
        return `${total}s`

    const minutes = Math.floor(total / 60)
    if (minutes < 60)
        return `${minutes}m`

    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60

    return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

export async function speakMandarin(text: string) {
    if (await speakNativeMandarin(text))
        return
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

export function dailyPlanKey(date: string) {
    return `${date}:all`
}

export function buildDailyWordIds(
    words: HskWord[],
    records: Record<string, WordProgress>,
    goal: number,
    now = new Date(),
) {
    const date = todayKey(now)
    const available = words.filter((word) => records[word.id]?.lastReviewedAt?.slice(0, 10) !== date)
    const due = available
        .filter((word) => isDue(records[word.id], now))
        .sort((left, right) => {
            return (records[left.id]?.nextReviewAt ?? '').localeCompare(records[right.id]?.nextReviewAt ?? '')
        })
    const dueIds = new Set(due.map((word) => word.id))
    const mistakes = available
        .filter((word) => records[word.id]?.needsMistakeReview && !dueIds.has(word.id))
        .sort((left, right) => {
            const leftRecord = records[left.id]
            const rightRecord = records[right.id]
            const dateOrder = (rightRecord?.lastMistakeAt ?? '').localeCompare(leftRecord?.lastMistakeAt ?? '')

            return dateOrder || (rightRecord?.mistakeCount ?? 0) - (leftRecord?.mistakeCount ?? 0)
        })
    const priorityIds = new Set([...due, ...mistakes].map((word) => word.id))
    const fresh = available
        .filter((word) => !records[word.id] && !priorityIds.has(word.id))
        .sort((left, right) => (left.frequency ?? Number.MAX_SAFE_INTEGER) - (right.frequency ?? Number.MAX_SAFE_INTEGER))

    return [...due, ...mistakes, ...fresh]
        .slice(0, Math.max(0, Math.round(goal)))
        .map((word) => word.id)
}
