import { FortuneCard, Rarity } from '@/types/game'
import { CARD_POOL } from './card-pool'

function pick(cards: FortuneCard[], rng: () => number): FortuneCard {
  const i = Math.min(Math.floor(rng() * cards.length), cards.length - 1)
  return cards[i]
}

// miracle=true（敲木鱼显灵）时只从稀有/传说里抽；否则普通池正常抽，必返一张
export function drawCard({
  rng = Math.random,
  miracle,
}: {
  rng?: () => number
  miracle: boolean
}): FortuneCard {
  if (miracle) {
    return pick(
      CARD_POOL.filter((c) => c.rarity !== Rarity.COMMON),
      rng,
    )
  }
  return pick(CARD_POOL, rng)
}
