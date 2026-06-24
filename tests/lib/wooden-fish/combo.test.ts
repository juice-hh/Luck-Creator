import { describe, it, expect } from 'vitest'
import { meritForTap, comboLevel } from '@/lib/wooden-fish/combo'

describe('木鱼连击', () => {
  it('基础每敲 +1', () => {
    expect(meritForTap({ comboCount: 0 })).toBe(1)
  })
  it('连击更高产出更多但封顶 5', () => {
    expect(meritForTap({ comboCount: 20 })).toBeGreaterThan(1)
    expect(meritForTap({ comboCount: 9999 })).toBe(5)
  })
  it('comboLevel 边界 0/8/20/50 → 0/1/2/3', () => {
    expect(comboLevel(0)).toBe(0)
    expect(comboLevel(8)).toBe(1)
    expect(comboLevel(20)).toBe(2)
    expect(comboLevel(50)).toBe(3)
  })
})
