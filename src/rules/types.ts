// Domain types for the character-sheet engine. Keep pure data, no UI.

export type Alignment =
  | "Legal Bueno"
  | "Neutral Bueno"
  | "Caótico Bueno"
  | "Legal Neutral"
  | "Neutral"
  | "Caótico Neutral"
  | "Legal Malvado"
  | "Neutral Malvado"
  | "Caótico Malvado";

export type StatKey = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

export interface Stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface Saves {
  death: number;
  wands: number;
  paralysis: number;
  breath: number;
  spells: number;
}

export interface Attack {
  id: string;
  locked: boolean;
  name: string;
  /** Class attack bonus string (e.g. "+2"). Stat modifiers are applied on top
   *  of this at roll-time via `attackStat` / `damageStat`. */
  bonus: string;
  damage: string;
  range: string;
  notes: string;
  enchantments?: string[];
  /** Stat that adds to the attack roll. Defaults by range on creation. */
  attackStat?: "strength" | "dexterity" | "none";
  /** Stat that adds to the damage roll. Melee defaults to strength. */
  damageStat?: "strength" | "dexterity" | "none";
  /** If set, this attack comes from an equipped inventory item. Removing the
   *  item (or unequipping it) also removes this attack. */
  sourceItemId?: string;
}

export interface InventoryItem {
  id: string;
  locked: boolean;
  equipped: boolean;
  /** Where the item is carried: hand, stored, or inside another inventory item. */
  location?: "hand" | "stored" | `container:${string}`;
  /** Capacity in kg when this item acts as a container. */
  containerCapacity?: number;
  name: string;
  quantity: number;
  weight: number;
  value: string;
  notes: string;
  enchantments?: string[];
  /** Weapon damage dice — when set, equipping derives an attack automatically. */
  damage?: string;
  /** Whether the weapon is ranged (drives stat defaults on the derived attack). */
  ranged?: boolean;
  /** Armor Class text from the shop catalog, e.g. "5 [14]" or "-1 [11]". */
  armorClass?: string;
}

export interface Spell {
  id: string;
  locked: boolean;
  prepared: boolean;
  used: boolean;
  name: string;
  level: number;
  duration: string;
  notes: string;
}

export interface Effect {
  id: string;
  locked: boolean;
  active: boolean;
  name: string;
  kind: string;
  duration: string;
  notes: string;
  /** Times this power can be activated before its reset window. */
  usesPerDay?: number;
  /** Activations spent so far within the current reset window. */
  usesToday?: number;
  /** Rest that refills usesToday. "long" is the classic "X al día"; "short"
   *  also refills on short rests. */
  restReset?: "short" | "long";
}

export interface MagicItemInstance {
  id: string;
  catalogId?: string;
  name: string;
  kind: "ring" | "staff" | "rod" | "wand" | "scroll" | "potion" | "wondrous";
  charges?: number;
  maxCharges?: number;
  consumable?: boolean;
  usesToday?: number;
  usesPerDay?: number;
  notes: string;
}

export interface Wallet {
  copper: number;
  silver: number;
  electrum: number;
  gold: number;
  platinum: number;
}

export interface TimelineEntry {
  id: string;
  time: string;
  text: string;
  kind?: "normal" | "crit" | "fumble" | "heal" | "damage";
}

export interface Combat {
  hpCurrent: number;
  hpMax: number;
  hpTemp: number;
  ac: number;           // base descending
  acAscending: number;  // base ascending in brackets
  acMode?: "descending" | "ascending";
  /** Manual sheet value for touch AC / CA de toque. Kept as text to allow negative or house-rule notation. */
  touchAc?: string;
  /** Manual sheet value for flat-footed AC / CA desprevenido. Kept as text to allow negative or house-rule notation. */
  flatFootedAc?: string;
  initiative: string;
  surprise: string;
  attackBonus: string;
  hitDice: string;
  logDraft: string;
  attacks: Attack[];
  timeline: TimelineEntry[];
}

export interface Xp {
  current: number;
  next: number | null;
  autoLevel: boolean;
}

export interface Journal {
  notes: string;
  goals: string;
  sessions: Array<{ id: string; title: string; date: string; xp: number; text: string }>;
}

export interface CharacterIdentity {
  name: string;
  player: string;
  classKey: string;
  className: string;
  raceKey: string;
  race: string;
  alignment: Alignment | "";
  level: number;
  movement: string;
  languages: string;
}

export interface Character {
  id: string;
  createdAt: string;
  updatedAt: string;
  character: CharacterIdentity;
  stats: Stats;
  statsLocked?: boolean;
  saves: Saves;
  combat: Combat;
  money: Wallet;
  inventory: {
    maxWeight: number;
    items: InventoryItem[];
  };
  spells: Spell[];
  effects: Effect[];
  magicItems: MagicItemInstance[];
  xp: Xp;
  journal: Journal;
}

export interface AppState {
  version: 3;
  activeCharacterId: string | null;
  characters: Character[];
}
