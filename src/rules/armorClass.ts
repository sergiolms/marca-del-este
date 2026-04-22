import type { Character, Combat, InventoryItem } from "./types";
import { enchantmentBonus } from "./attackMath";
import { AUTO_EFFECT_KINDS } from "./autofill";
import shopCatalog from "../data/catalog/shopItems.json";
import type { ShopItem } from "../data/catalog/types";

const SHOP_BY_NAME = new Map((shopCatalog as ShopItem[]).map(i => [normalizeName(i.name), i]));

export type AcMode = "descending" | "ascending";

export interface ArmorClassPair {
  descending: number;
  ascending: number;
}

export interface ArmorClassBreakdown {
  mode: AcMode;
  base: ArmorClassPair;
  armorBase: ArmorClassPair;
  calculated: ArmorClassPair;
  armorSource?: string;
  bonuses: Array<{ source: string; bonus: number }>;
  totalBonus: number;
}

export function acValue(pair: ArmorClassPair, mode: AcMode): number {
  return mode === "ascending" ? pair.ascending : pair.descending;
}

export function acBonusLabel(bonus: number, mode: AcMode): string {
  const signed = mode === "ascending" ? bonus : -bonus;
  return signed >= 0 ? `+${signed}` : String(signed);
}

export function pairFromDescending(descending: number): ArmorClassPair {
  return { descending, ascending: 19 - descending };
}

export function pairFromAscending(ascending: number): ArmorClassPair {
  return { descending: 19 - ascending, ascending };
}

export function baseArmorClass(combat: Combat): ArmorClassPair {
  const mode = combat.acMode ?? "descending";
  if (mode === "ascending") return pairFromAscending(numberOr(combat.acAscending, 10));
  return pairFromDescending(numberOr(combat.ac, 9));
}

export function setBaseArmorClass(combat: Combat, value: number, mode: AcMode): Combat {
  const pair = mode === "ascending" ? pairFromAscending(value) : pairFromDescending(value);
  return {
    ...combat,
    acMode: mode,
    ac: pair.descending,
    acAscending: pair.ascending,
  };
}

export function calculateArmorClass(c: Character): ArmorClassBreakdown {
  const mode = c.combat.acMode ?? "descending";
  const base = baseArmorClass(c.combat);
  let armorBase = base;
  let armorSource: string | undefined;
  const bonuses: Array<{ source: string; bonus: number }> = [];

  for (const item of c.inventory.items) {
    if (!item.equipped) continue;
    const parsed = parseArmorClass(itemArmorClass(item));
    if (parsed?.kind === "base" && isBetterArmor(parsed.pair, armorBase)) {
      armorBase = parsed.pair;
      armorSource = item.name;
    }
  }

  for (const item of c.inventory.items) {
    if (!item.equipped) continue;
    const parsed = parseArmorClass(itemArmorClass(item));
    const enchBonus = enchantmentBonus(item.enchantments);

    if (parsed?.kind === "bonus" && parsed.bonus > 0) {
      bonuses.push({ source: item.name || "Objeto equipado", bonus: parsed.bonus });
    }
    if (enchBonus > 0 && (isArmorItem(item) || isShieldItem(item))) {
      bonuses.push({ source: `${item.name || "Objeto equipado"} mágico`, bonus: enchBonus });
    }
    if (item.enchantments?.includes("defensiva")) {
      bonuses.push({ source: `${item.name || "Arma"} defensiva`, bonus: 2 });
    }

    if (!parsed && !enchBonus) {
      const textBonus = acBonusFromText(`${item.name} ${item.notes}`);
      if (textBonus > 0) bonuses.push({ source: item.name || "Objeto equipado", bonus: textBonus });
    }
  }

  for (const effect of c.effects) {
    if (!effect.active || AUTO_EFFECT_KINDS.includes(effect.kind)) continue;
    const bonus = acBonusFromText(`${effect.name} ${effect.notes}`);
    if (bonus > 0) bonuses.push({ source: effect.name || "Efecto activo", bonus });
  }

  const totalBonus = bonuses.reduce((sum, b) => sum + b.bonus, 0);
  return {
    mode,
    base,
    armorBase,
    calculated: {
      descending: armorBase.descending - totalBonus,
      ascending: armorBase.ascending + totalBonus,
    },
    armorSource,
    bonuses,
    totalBonus,
  };
}

type ParsedArmorClass =
  | { kind: "base"; pair: ArmorClassPair }
  | { kind: "bonus"; bonus: number };

export function parseArmorClass(value: string | undefined): ParsedArmorClass | null {
  if (!value) return null;
  const normalized = value.replace("−", "-");
  const match = normalized.match(/(-?\d+)\s*(?:\[\s*(-?\d+)\s*\])?/);
  if (!match) return null;
  const first = Number(match[1]);
  const bracket = match[2] !== undefined ? Number(match[2]) : undefined;
  if (!Number.isFinite(first)) return null;
  if (first <= 0) return { kind: "bonus", bonus: Math.abs(first) };
  return {
    kind: "base",
    pair: {
      descending: first,
      ascending: Number.isFinite(bracket) ? bracket! : 19 - first,
    },
  };
}

function isBetterArmor(next: ArmorClassPair, current: ArmorClassPair): boolean {
  return next.descending < current.descending || next.ascending > current.ascending;
}

function isArmorItem(item: InventoryItem): boolean {
  return !!itemArmorClass(item) && !isShieldItem(item) || /armadura|cota|cuero|malla|placa|barda/i.test(item.name);
}

function isShieldItem(item: InventoryItem): boolean {
  return /escudo/i.test(item.name) || /^-\d/.test((itemArmorClass(item) ?? "").trim().replace("−", "-"));
}

function itemArmorClass(item: InventoryItem): string | undefined {
  return item.armorClass ?? SHOP_BY_NAME.get(normalizeName(item.name))?.armorClass;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase("es");
}

function acBonusFromText(text: string): number {
  const normalized = text.replace("−", "-");
  const patterns = [
    /([+-]\d+)\s*(?:a\s+la\s+)?CA\b/gi,
    /\bCA\s*([+-]\d+)/gi,
    /bonificador(?:\s+de)?\s+armadura\s+de\s+([+-]\d+)/gi,
    /bonificador(?:\s+de)?\s+([+-]\d+)\s+a\s+la\s+categoría\s+de\s+armadura/gi,
  ];
  let bonus = 0;
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of normalized.matchAll(pattern)) {
      const n = Number(match[1]);
      if (Number.isFinite(n)) bonus += Math.abs(n);
    }
  }
  return bonus;
}

function numberOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
