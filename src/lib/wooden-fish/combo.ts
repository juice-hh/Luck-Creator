export function meritForTap({ comboCount }: { comboCount: number }): number {
  return Math.min(1 + Math.floor(comboCount / 10), 5)
}

// 连击分级用于 UI juice（0 无 → 3 金光）
export function comboLevel(comboCount: number): 0 | 1 | 2 | 3 {
  if (comboCount >= 50) return 3
  if (comboCount >= 20) return 2
  if (comboCount >= 8) return 1
  return 0
}
