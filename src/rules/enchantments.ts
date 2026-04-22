// Enchantment math. Total enchantment "slots" on a weapon/armor cap at +5,
// where each numeric +N counts as N slots and each named property counts as 1.
// Prices are additive: baseCost + sum(enchantmentCostDelta).

import { parsePriceToCopper, copperToWallet, COPPER_VALUES } from "./wallet";

export interface EnchantmentRef {
  id: string;
  name: string;
  bonus?: number;
  costDelta: string;
}

export function effectivePlus(enchantments: readonly EnchantmentRef[]): number {
  let plus = 0;
  for (const e of enchantments) {
    plus += e.bonus ?? 1;
  }
  return Math.min(5, plus);
}

export function isOverEnchanted(enchantments: readonly EnchantmentRef[]): boolean {
  let plus = 0;
  for (const e of enchantments) plus += e.bonus ?? 1;
  return plus > 5;
}

/** Total cost in copper of base + enchantments. Returns null if any parse fails. */
export function totalCostCopper(baseCost: string, enchantments: readonly EnchantmentRef[]): number | null {
  const base = parsePriceToCopper(baseCost);
  if (base === null) return null;
  let sum = base;
  for (const e of enchantments) {
    const d = parsePriceToCopper(e.costDelta);
    if (d === null) return null;
    sum += d;
  }
  return sum;
}

export function formatCostFromCopper(copper: number): string {
  // Prefer gold if clean, else copper.
  if (copper % COPPER_VALUES.mo === 0) return `${copper / COPPER_VALUES.mo} mo`;
  const w = copperToWallet(copper);
  // Render whichever unit the value sits in highest.
  if (w.platinum) return `${w.platinum} mpt`;
  if (w.gold)     return `${w.gold} mo`;
  if (w.electrum) return `${w.electrum} me`;
  if (w.silver)   return `${w.silver} mp`;
  return `${w.copper} mc`;
}

/** Apply a numeric "+N" damage bonus to a dice expression like "1d8" → "1d8+N". */
export function applyDamageBonus(damage: string, bonus: number): string {
  if (!bonus) return damage;
  const clean = damage.trim();
  if (/^\d*d\d+([+-]\d+)?$/i.test(clean)) {
    const existing = clean.match(/([+-]\d+)$/);
    if (existing) {
      const total = Number(existing[1]) + bonus;
      const core = clean.slice(0, clean.length - existing[0].length);
      return total === 0 ? core : `${core}${total > 0 ? `+${total}` : total}`;
    }
    return bonus > 0 ? `${clean}+${bonus}` : `${clean}${bonus}`;
  }
  return clean; // unknown shape — leave as-is
}
