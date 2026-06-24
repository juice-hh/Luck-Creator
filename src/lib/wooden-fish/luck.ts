export const LUCK_GOAL = 99 // 凑满 99 点达成（暂定，可调）

// 功德转好运：~500 功德达成；配合手感校验调整（目标一次坐下来约 1-2 分钟达成）
export function meritToLuck(merit: number): number {
  return Math.round(merit * 0.2)
}

// 达成是水到渠成：到点即达成，永不失败、无 deadline
export function isFulfilled(luck: number): boolean {
  return luck >= LUCK_GOAL
}
