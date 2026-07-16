// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WordCard from '@/components/WordCard.vue'
import type { HskWord } from '@/types/learning'

const word: HskWord = {
    id: 'hsk1-test',
    level: 1,
    simplified: '爱',
    traditional: '愛',
    pinyin: 'ài',
    numericPinyin: 'ai4',
    english: 'to love; to like',
    partOfSpeech: ['v'],
    radical: '爫',
    frequency: 130,
    examples: [],
    tags: ['HSK 1', 'pos:v'],
}

describe('component/WordCard', () => {
    it('shows Hanzi and pinyin before the answer is revealed', () => {
        const wrapper = mount(WordCard, {
            props: {
                word,
                reveal: false,
                ttsEnabled: false,
                showTraditional: false,
            },
        })

        expect(wrapper.text()).toContain('爱')
        expect(wrapper.text()).toContain('ài')
        expect(wrapper.text()).not.toContain('to love')
    })

    it('shows the answer and emits review grades after reveal', async () => {
        const wrapper = mount(WordCard, {
            props: {
                word,
                reveal: true,
                ttsEnabled: false,
                showTraditional: true,
            },
        })

        expect(wrapper.text()).toContain('愛')
        expect(wrapper.text()).toContain('to love')

        await wrapper.find('.review-button--good').trigger('click')
        expect(wrapper.emitted('review')).toEqual([['good']])
    })

    it('emits reveal when the reveal button is pressed', async () => {
        const wrapper = mount(WordCard, {
            props: {
                word,
                reveal: false,
                ttsEnabled: false,
                showTraditional: false,
            },
        })

        await wrapper.get('.primary-action').trigger('click')
        expect(wrapper.emitted('reveal')).toHaveLength(1)
    })
})
