// Resolve stat modifiers for attack rolls. Keeps Combat / Shop math consistent.

import type { Attack, Stats } from "./types";
import { abilityModifier } from "./modifier";
import enchantsCatalog from "../data/catalog/enchantments.json";
import type { Enchantment } from "../data/catalog/types";

const ENCHANTS = enchantsCatalog as Enchantment[];
const ENCHANTS_BY_ID = new Map(ENCHANTS.map(e => [e.id, e]));

/** Numeric bonus contributed by all resolved enchantments on an attack. */
export function enchantmentBonus(enchantIds: string[] | undefined): number {
  if (!enchantIds?.length) return 0;
  let sum = 0;
  for (const id of enchantIds) {
    const e = ENCHANTS_BY_ID.get(id);
    if (e?.bonus) sum += e.bonus;
  }
  return Math.min(5, sum);
}

/** Readable label list from enchantment ids. */
export function enchantmentLabels(enchantIds: string[] | undefined): string[] {
  if (!enchantIds?.length) return [];
  return enchantIds.map(id => ENCHANTS_BY_ID.get(id)?.name ?? id);
}

/** Infers a sensible default stat for an attack based on its `range`.
 *  Melee → STR (strength), Ranged → DEX (dexterity). */
export function inferAttackStats(range: string): Pick<Attack, "attackStat" | "damageStat"> {
  const r = (range || "").toLowerCase();
  const ranged = /distancia|lanza|arco|ballesta|honda|flecha|jabalin/.test(r);
  return ranged
    ? { attackStat: "dexterity", damageStat: "none" }
    : { attackStat: "strength",  damageStat: "strength" };
}

/** Returns the effective stat mod applied to an attack roll. */
export function attackStatMod(att: Attack, stats: Stats): number {
  const which = att.attackStat ?? inferAttackStats(att.range).attackStat;
  if (which === "strength")  return abilityModifier(stats.strength);
  if (which === "dexterity") return abilityModifier(stats.dexterity);
  return 0;
}

/** Returns the effective stat mod applied to a damage roll. */
export function damageStatMod(att: Attack, stats: Stats): number {
  const which = att.damageStat ?? inferAttackStats(att.range).damageStat;
  if (which === "strength")  return abilityModifier(stats.strength);
  if (which === "dexterity") return abilityModifier(stats.dexterity);
  return 0;
}

export function statLabel(which: Attack["attackStat"]): string {
  if (which === "strength") return "FUE";
  if (which === "dexterity") return "DES";
  return "—";
}
