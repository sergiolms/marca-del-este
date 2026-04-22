// Combat helpers: HP clamping, long-rest effects, weight totals.

import type { Character, InventoryItem, Spell } from "./types";
import { abilityModifier } from "./modifier";

/** Clamp current HP into [0, hpMax + hpTemp]. Pure. */
export function clampHp(hpCurrent: number, hpMax: number, hpTemp: number): number {
  const cap = Math.max(0, hpMax) + Math.max(0, hpTemp);
  if (!Number.isFinite(hpCurrent)) return cap;
  return Math.max(0, Math.min(cap, Math.floor(hpCurrent)));
}

/** Weight of all items the character is CARRYING (not wearing/equipping).
 *  Equipped items are worn on the body and don't count toward carry capacity. */
export function totalCarriedWeight(items: readonly InventoryItem[]): number {
  let sum = 0;
  for (const it of items) {
    if (it.equipped) continue;
    const q = Math.max(0, Number(it.quantity) || 0);
    const w = Math.max(0, Number(it.weight) || 0);
    sum += q * w;
  }
  return Math.round(sum * 100) / 100;
}

/** Total weight of items currently equipped (worn). Displayed separately. */
export function equippedWeight(items: readonly InventoryItem[]): number {
  let sum = 0;
  for (const it of items) {
    if (!it.equipped) continue;
    const q = Math.max(0, Number(it.quantity) || 0);
    const w = Math.max(0, Number(it.weight) || 0);
    sum += q * w;
  }
  return Math.round(sum * 100) / 100;
}

/**
 * Long rest: restores hpCurrent to hpMax, clears temp HP, marks all spells unused.
 * Returns a new character (never mutates).
 */
export function applyLongRest(c: Character): Character {
  const spells: Spell[] = c.spells.map(s => ({ ...s, used: false }));
  const combat = {
    ...c.combat,
    hpCurrent: c.combat.hpMax,
    hpTemp: 0,
  };
  return { ...c, combat, spells, updatedAt: new Date().toISOString() };
}

/**
 * Short rest: recovers 1d6 + CON modifier HP (min 1), does NOT reset temp HP or spells.
 * Marca del Este doesn't define a canonical short rest — we model it as a "catching
 * your breath" mechanic that restores some HP without interrupting the day's magic.
 */
export function applyShortRest(c: Character, rng: () => number = Math.random): { next: Character; rolled: number; recovered: number } {
  const roll = 1 + Math.floor(rng() * 6);
  const conMod = abilityModifier(c.stats.constitution);
  const recovered = Math.max(1, roll + conMod);
  const next: Character = {
    ...c,
    combat: {
      ...c.combat,
      hpCurrent: clampHp(c.combat.hpCurrent + recovered, c.combat.hpMax, c.combat.hpTemp),
    },
    updatedAt: new Date().toISOString(),
  };
  return { next, rolled: roll, recovered };
}

/** Ratio 0..1 of current HP to max, clamped. */
export function hpRatio(hpCurrent: number, hpMax: number): number {
  if (hpMax <= 0) return 0;
  return Math.max(0, Math.min(1, hpCurrent / hpMax));
}

export const LOW_HP_THRESHOLD = 0.25;

export function isLowHp(hpCurrent: number, hpMax: number): boolean {
  return hpRatio(hpCurrent, hpMax) < LOW_HP_THRESHOLD && hpCurrent > 0;
}
