import { FortuneCard, Rarity } from '@/types/game'

export const CARD_POOL: FortuneCard[] = [
  { id: 'wifi', title: 'WiFi 永远满格卡', category: '生活窘境', rarity: Rarity.COMMON },
  { id: 'poop', title: '拉屎通畅卡', category: '生活窘境', rarity: Rarity.COMMON },
  { id: 'takeout', title: '外卖不洒卡', category: '生活窘境', rarity: Rarity.COMMON },
  { id: 'greenlight', title: '一路绿灯卡', category: '生活窘境', rarity: Rarity.COMMON },
  { id: 'reply', title: '消息秒回卡', category: '生活窘境', rarity: Rarity.RARE },
  { id: 'noemo', title: 'emo 暂停卡', category: '自嘲', rarity: Rarity.RARE },
  { id: 'nomonday', title: '周一消失卡', category: '自嘲', rarity: Rarity.RARE },
  { id: 'rich', title: '祖坟冒青烟卡', category: '玄学暴富', rarity: Rarity.RARE },
  { id: 'chosen', title: '天选之子卡', category: '稀有传说', rarity: Rarity.LEGENDARY },
  { id: 'buddha', title: '佛祖亲签卡', category: '稀有传说', rarity: Rarity.LEGENDARY },
]
