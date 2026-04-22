// XP / level helpers.

export interface XpInfo {
  level: number;           // current level (1-based)
  nextThreshold: number | null;
  toNext: number;          // XP remaining to next level; 0 if max
  progressPct: number;     // 0..100
}

/**
 * Compute current level from an XP threshold array.
 * `xpTable[i]` = XP required to *reach* level i+1.
 * So [0, 2000, 4000, ...] means level 1 at 0 XP, level 2 at 2000, etc.
 */
export function levelFromXp(xpTable: readonly number[], currentXp: number): number {
  if (!xpTable || xpTable.length === 0) return 1;
  let level = 1;
  for (let i = 0; i < xpTable.length; i++) {
    if (currentXp >= xpTable[i]) level = i + 1;
    else break;
  }
  return level;
}

export function computeXpInfo(xpTable: readonly number[], currentXp: number): XpInfo {
  const level = levelFromXp(xpTable, currentXp);
  const nextThreshold = level < xpTable.length ? xpTable[level] : null;
  const floor = xpTable[level - 1] ?? 0;
  const toNext = nextThreshold === null ? 0 : Math.max(0, nextThreshold - currentXp);
  const span = nextThreshold === null ? 1 : nextThreshold - floor;
  const progressPct = nextThreshold === null ? 100 : Math.max(0, Math.min(100, ((currentXp - floor) / span) * 100));
  return { level, nextThreshold, toNext, progressPct };
}
