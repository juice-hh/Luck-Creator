import { describe, it, expect } from 'vitest'
import { rollEvent, WoodenFishEvent } from '@/lib/wooden-fish/events'

describe('木鱼随机意外', () => {
  it('rng=0.999 → 显灵', () => {
    expect(rollEvent({ rng: () => 0.999, comboCount: 60 })).toBe(WoodenFishEvent.MIRACLE)
  })
  it('rng=0.5 → 暴击', () => {
    expect(rollEvent({ rng: () => 0.5, comboCount: 0 })).toBe(WoodenFishEvent.CRIT)
  })
  it('低连击不出成精', () => {
    expect(rollEvent({ rng: () => 0.9, comboCount: 0 })).not.toBe(WoodenFishEvent.SPIRIT)
  })
  it('高连击 + rng 命中成精区间 → 成精', () => {
    expect(rollEvent({ rng: () => 0.9, comboCount: 30 })).toBe(WoodenFishEvent.SPIRIT)
  })
  it('rng=0.0 → 普通敲击', () => {
    expect(rollEvent({ rng: () => 0.0, comboCount: 0 })).toBe(WoodenFishEvent.NONE)
  })
})
