import { describe, it, expect } from 'vitest'
import { drawCard } from '@/lib/cards/draw'
import { Rarity } from '@/types/game'

describe('抽福气卡', () => {
  it('普通抽卡返回一张', () => {
    expect(drawCard({ rng: () => 0.1, miracle: false })).toBeTruthy()
  })
  it('显灵必出稀有/传说', () => {
    expect([Rarity.RARE, Rarity.LEGENDARY]).toContain(
      drawCard({ rng: () => 0.5, miracle: true }).rarity,
    )
  })
  it('rng 上沿 0.999999 不越界（零挫败：永远返一张）', () => {
    expect(drawCard({ rng: () => 0.999999, miracle: false })).toBeTruthy()
    expect(drawCard({ rng: () => 0.999999, miracle: true })).toBeTruthy()
  })
})
