// Types for the mundane shop catalog of "Aventuras en la Marca del Este".
// Data is transcribed verbatim from the rulebook ("Caja Roja", Capítulo 3: Equipo, pp. 37-43).

export type ShopCategory =
  | "Armas"
  | "Armaduras"
  | "Escudos"
  | "Equipo"
  | "Municiones"
  | "Transporte"
  | "Monturas";

export interface ShopItem {
  /** Stable slug identifier, e.g. "espada-larga". */
  id: string;
  /** Spanish display name, e.g. "Espada larga". */
  name: string;
  category: ShopCategory;
  /** Verbatim cost string from the source table, e.g. "10 mo", "1.500 mo", "5 mp". */
  cost: string;
  /** Weight in kilograms, or null when the source does not list a weight. */
  weight: number | null;
  /** Dice expression for weapons, e.g. "1d8". */
  damage?: string;
  /** True for weapons that require two hands. */
  twoHanded?: boolean;
  /** True for ranged weapons (bows, crossbows, throwing weapons, etc.). */
  ranged?: boolean;
  /** Optional ranged description when listed by the rulebook. */
  range?: string;
  /** Armor Class for armors/shields, verbatim, e.g. "5 [14]" or "-1 [11]". */
  armorClass?: string;
  /** Free-text notes for clarifications, footnotes, or descriptions. */
  notes?: string;
}

export type CurrencyKey = "mc" | "mp" | "me" | "mo" | "mpt";

export interface CurrencyUnit {
  key: CurrencyKey;
  /** Spanish full name, e.g. "Moneda de oro". */
  name: string;
  /** Value expressed in copper pieces (mc = 1). */
  copperValue: number;
}

export interface CurrencyTable {
  units: CurrencyUnit[];
}

// ---------------------------------------------------------------------------
// Magic items catalog ("Caja Roja", Capítulo 8: Objetos mágicos y tesoro,
// pp. 132-139). Prices are taken from the "VALOR MAGIA" reference sheet and
// cross-checked against the rulebook; rulebook effect text is reproduced
// verbatim (condensed where necessary so the shop UI can render it).
// ---------------------------------------------------------------------------

export type MagicItemKind =
  | "ring"
  | "staff"
  | "rod"
  | "wand"
  | "scroll"
  | "potion"
  | "wondrous";

export interface MagicItem {
  /** Stable slug identifier, e.g. "anillo-invisibilidad". */
  id: string;
  /** Spanish display name, e.g. "Anillo de invisibilidad". */
  name: string;
  kind: MagicItemKind;
  /** Verbatim cost string, e.g. "1.000 mo". Use "TODO" when the price is missing. */
  cost: string;
  /** Starting / default charges for wands, staves, rods that use them. */
  charges?: number;
  /** Maximum charges once the item has been identified / recharged. */
  maxCharges?: number;
  /** True for single-use items (scrolls, potions). */
  consumable?: boolean;
  /** Number of activations per day for items with an X/day limit. */
  usesPerDay?: number;
  /** Mechanical description from the rulebook, condensed but faithful. */
  effect: string;
  /** Free-text notes: source location, prerequisites, flavour. */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Weapon / armor enchantments ("Caja Roja", Capítulo 8, pp. 134). Numeric
// bonuses stack with named properties as +1 each, capping at +5 total.
// ---------------------------------------------------------------------------

export type EnchantmentTarget = "weapon" | "armor" | "shield";

export interface Enchantment {
  /** Stable slug identifier, e.g. "afilada", "arma-3". */
  id: string;
  /** Display name, e.g. "Afilada", "+1", "Defensiva". */
  name: string;
  /** Which kinds of gear this modifier may be applied to. */
  appliesTo: EnchantmentTarget[];
  /** Numeric bonus, when the enchantment is a straight +N. */
  bonus?: number;
  /** Additive cost delta over the base item, e.g. "2.000 mo". */
  costDelta: string;
  /** Mechanical effect description from the rulebook. */
  effect: string;
  /** Whether this modifier stacks with other enchantments. Defaults to true. */
  stackable?: boolean;
  /** Free-text notes. */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Character classes, races and spells.
// Source: "Caja Roja" — Capítulo 2 (Clases de aventurero, pp. 13-36)
// and Capítulo 5 (Magia, pp. 54-119).
// ---------------------------------------------------------------------------

export type SpellTradition = "arcane" | "divine" | "druidic";

/**
 * A character class (básica or avanzada).
 * `xp[i]` is the XP threshold required to reach level `i+1` (so `xp[0]` is 0).
 * `hitProgression[i]` is the hit-dice / PG notation for level `i+1` as printed
 * in the rulebook's progression table (e.g. "1", "2", "+1 PG").
 * `spellSlots` maps a character level (as string) to an array of slot counts
 * indexed by spell level (index 0 = spell level 1).
 */
export interface CharacterClass {
  key: string;
  name: string;
  /** Prerequisite ability scores (verbatim from the rulebook). */
  requirements: string;
  /** Prime requisite(s) (Característica principal). */
  prime: string;
  /** Hit die, e.g. "1d6". */
  hitDie: string;
  /** "Ninguno" if unlimited, otherwise a level cap as number or string. */
  maxLevel: string | number;
  xp: number[];
  hitProgression: string[];
  spellSlots?: { [level: string]: number[] };
  abilities: string[];
  /** True for the "avanzada" classes listed in the second half of Cap. 2. */
  advanced?: boolean;
}

/**
 * A playable race. Classic OSR in this rulebook uses class-as-race for
 * non-humans; this table covers the four canonical races mentioned in the
 * movement table (Cap. 4, p. 46).
 */
export interface Race {
  key: string;
  name: string;
  /** Rango de movimiento fuera de combate, from the movement table. */
  movement: string;
  abilities: string[];
  description?: string;
}

/**
 * A single spell entry (Capítulo 5). `effect` is the verbatim mechanical
 * description from the rulebook. `id` is a stable slug prefixed with the
 * tradition abbreviation ("mago-", "clerigo-", "druida-") so shared names
 * (e.g. Luz) remain unique across traditions.
 */
export interface Spell {
  id: string;
  name: string;
  tradition: SpellTradition;
  level: number;
  range: string;
  duration: string;
  effect: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Saving throws per class ("Caja Roja", Capítulo 2, adjacent to each class).
// The Spanish rulebook columns map to the keys below:
//   "Venenos y muerte"          -> death
//   "Varitas mágicas y cetros"  -> wands
//   "Petrificación o parálisis" -> paralysis
//   "Armas de aliento"          -> breath
//   "Conjuros y armas mágicas"  -> spells
// Every level listed in the class' XP progression should have a SaveSet.
// ---------------------------------------------------------------------------

export type SaveKey = "death" | "wands" | "paralysis" | "breath" | "spells";

export interface SaveSet {
  death: number;
  wands: number;
  paralysis: number;
  breath: number;
  spells: number;
}

/**
 * `classKey` matches the `key` field of the entries in `classes.json`
 * (e.g. "clerigo", "elfo-oscuro"). The inner key is the character level as
 * a string (e.g. "1" … "20") so JSON serialization is straightforward.
 */
export type SaveTables = Record<string, Record<string, SaveSet>>;
