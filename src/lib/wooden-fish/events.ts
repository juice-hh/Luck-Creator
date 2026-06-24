export enum WoodenFishEvent {
  NONE = 'none',
  CRIT = 'crit', // 功德暴击
  SPIRIT = 'spirit', // 木鱼成精（需一定连击）
  MIRACLE = 'miracle', // 显灵（极小概率，掉稀有卡）
  BACKFIRE = 'backfire', // 翻车彩蛋
}

// 概率阈值（可调）。events 只决定"出不出、出哪种"，数值结算在 combo/luck。
export function rollEvent({
  rng = Math.random,
  comboCount,
}: {
  rng?: () => number
  comboCount: number
}): WoodenFishEvent {
  const r = rng()
  if (r >= 0.995) return WoodenFishEvent.MIRACLE // 0.5%
  if (r >= 0.97) return WoodenFishEvent.BACKFIRE // ~2.5%
  if (r >= 0.85 && comboCount >= 20) return WoodenFishEvent.SPIRIT
  if (r >= 0.3) return WoodenFishEvent.CRIT
  return WoodenFishEvent.NONE
}
