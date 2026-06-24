export enum Rarity {
  COMMON = 'common',
  RARE = 'rare',
  LEGENDARY = 'legendary',
}

export interface FortuneCard {
  id: string
  title: string // "WiFi 永远满格卡"
  category: string // 生活窘境/玄学暴富/自嘲/稀有传说
  rarity: Rarity
}

export interface BattleReport {
  taps: number
  luck: number
  percentile: number // 超过全国 X% 的电子修行人（玄学展示数，非真实统计）
  closer: string // 一句沙雕收尾
  wish?: string // 用户许的愿
}
