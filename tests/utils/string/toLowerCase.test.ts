import { expect, it } from 'vitest'
import { toLowerCase } from '@/utils/string/toLowerCase'

it('util/string/toLowerCase', () => {
    expect(toLowerCase('')).toBe('')
    expect(toLowerCase('QWe')).toBe('qwe')
    expect(toLowerCase(['QWe', 'QWe'])).toEqual(['qwe', 'qwe'])
})
