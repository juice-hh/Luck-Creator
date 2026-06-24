import { describe, it, expect } from 'vitest'
import { meritToLuck, isFulfilled, LUCK_GOAL } from '@/lib/wooden-fish/luck'

describe('功德转好运 + 达成', () => {
  it('功德按比例转好运', () => {
    expect(meritToLuck(100)).toBeGreaterThan(0)
  })
  it('到点即达成（水到渠成，无 deadline）', () => {
    expect(isFulfilled(LUCK_GOAL)).toBe(true)
    expect(isFulfilled(LUCK_GOAL - 1)).toBe(false)
  })
})
