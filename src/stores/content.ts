import { defineStore } from 'pinia'
import type { HskLevel, HskWord } from '@/types/learning'
import hskWordsData from '@/data/hskWords.json'
import { wordMatchesSearch } from '@/utils/learning'

const hskWords = hskWordsData as HskWord[]

export const useContentStore = defineStore('content', {
    state: () => ({
        selectedLevel: 'all' as HskLevel | 'all',
        searchTerm: '',
        activeWordId: hskWords[0]?.id ?? '',
    }),
    getters: {
        words: () => hskWords,
        wordsById: () => {
            return hskWords.reduce<Record<string, HskWord>>((acc, word) => {
                acc[word.id] = word
                
                return acc
            }, {})
        },
        filteredWords(state): HskWord[] {
            return hskWords.filter((word) => {
                const levelMatches = state.selectedLevel === 'all' || word.level === state.selectedLevel
                
                return levelMatches && wordMatchesSearch(word, state.searchTerm)
            })
        },
        levelCounts: () => {
            return hskWords.reduce<Record<HskLevel, number>>((acc, word) => {
                acc[word.level] += 1
                
                return acc
            }, { 1: 0, 2: 0, 3: 0 })
        },
        activeWord(state): HskWord | undefined {
            return hskWords.find((word) => word.id === state.activeWordId) ?? hskWords[0]
        },
    },
    actions: {
        setActiveWord(wordId: string) {
            this.activeWordId = wordId
        },
    },
})
