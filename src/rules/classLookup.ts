// Helpers to resolve class/race catalog entries and extract derived info.

import classesCatalog from "../data/catalog/classes.json";
import racesCatalog from "../data/catalog/races.json";
import savesCatalog from "../data/catalog/saves.json";
import type { SaveSet, SaveTables } from "../data/catalog/types";

interface ClassEntry {
  key: string;
  name: string;
  requirements: string;
  prime: string;
  hitDie: string;
  maxLevel: string | number;
  xp: number[];
  hitProgression: string[];
  spellSlots?: Record<string, number[]>;
  abilities: string[];
  advanced?: boolean;
}

export type SpellTradition = "arcane" | "divine" | "druidic";

interface RaceEntry {
  key: string;
  name: string;
  movement: string;
  abilities: string[];
  description?: string;
}

const CLASSES = classesCatalog as ClassEntry[];
const RACES = racesCatalog as RaceEntry[];
const SAVES = savesCatalog as SaveTables;

const HUMAN_CLASSES = new Set(["clerigo", "explorador", "guerrero", "ladron", "mago", "paladin", "asesino", "barbaro", "bardo", "druida"]);

const CLASS_LINEAGE: Record<string, { key: string; movementKey?: string }> = {
  elfo: { key: "elfo" },
  enano: { key: "enano" },
  halfling: { key: "halfling" },
  "elfo-oscuro": { key: "elfo-oscuro", movementKey: "elfo" },
  gnomo: { key: "gnomo", movementKey: "enano" },
  semielfo: { key: "semielfo", movementKey: "humano" },
  semiorco: { key: "semiorco", movementKey: "humano" },
};

export function allClasses(): ClassEntry[] {
  return CLASSES;
}
export function allRaces(): RaceEntry[] {
  return RACES;
}

export function classByKey(key: string): ClassEntry | null {
  return CLASSES.find(c => c.key === key) ?? null;
}
export function raceByKey(key: string): RaceEntry | null {
  return RACES.find(r => r.key === key) ?? null;
}

export function lineageForClass(classKey: string): { raceKey: string; race: string; movement?: string } {
  const cls = classByKey(classKey);
  const lineage = CLASS_LINEAGE[classKey] ?? (HUMAN_CLASSES.has(classKey) ? { key: "humano" } : null);
  if (!lineage) return { raceKey: "", race: "" };
  const movementRace = raceByKey(lineage.movementKey ?? lineage.key);
  const directRace = raceByKey(lineage.key);
  return {
    raceKey: lineage.key,
    race: directRace?.name ?? cls?.name ?? "",
    movement: movementRace?.movement,
  };
}

/** XP threshold array for a class, or a sensible default. */
export function xpTableFor(classKey: string): number[] {
  return classByKey(classKey)?.xp ?? [0, 2000, 4000, 8000, 16000, 32500, 65000, 120000, 240000, 360000];
}

/** Spell slots at a given level, or null if the class has no progression. */
export function spellSlotsFor(classKey: string, level: number): number[] | null {
  const c = classByKey(classKey);
  if (!c?.spellSlots) return null;
  return c.spellSlots[String(Math.max(1, level))] ?? null;
}

export function spellTraditionFor(classKey: string): SpellTradition | null {
  const c = classByKey(classKey);
  if (!c?.spellSlots) return null;
  if (classKey === "clerigo" || classKey === "paladin") return "divine";
  if (classKey === "druida") return "druidic";
  return "arcane";
}

export function allowedSpellLevelsFor(classKey: string, level: number): number[] | null {
  const c = classByKey(classKey);
  if (!c?.spellSlots) return null;
  const slots = c.spellSlots[String(Math.max(1, level))] ?? [];
  return slots
    .map((total, idx) => ({ total, level: idx + 1 }))
    .filter(row => row.total > 0)
    .map(row => row.level);
}

export function firstSpellSlotLevel(classKey: string): number | null {
  const c = classByKey(classKey);
  if (!c?.spellSlots) return null;
  const levels = Object.keys(c.spellSlots).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  return levels.find(level => (c.spellSlots?.[String(level)] ?? []).some(total => total > 0)) ?? null;
}

export function hasSpellProgression(classKey: string): boolean {
  return firstSpellSlotLevel(classKey) !== null;
}

/** Hit progression line at the given level, e.g. "3" or "+2 PG". */
export function hitProgressionFor(classKey: string, level: number): string {
  const c = classByKey(classKey);
  if (!c) return "—";
  const idx = Math.max(0, Math.min(c.hitProgression.length - 1, level - 1));
  return c.hitProgression[idx] ?? "—";
}

/** Saving throws for a class at a specific level. Falls back to the nearest
 *  lower published row when an exact match isn't in the catalog (handy for
 *  the Semielfo table which only lists bands). Returns null if unknown. */
export function savesFor(classKey: string, level: number): SaveSet | null {
  const table = SAVES[classKey];
  if (!table) return null;
  if (table[String(level)]) return table[String(level)];
  // Fallback: find the highest level <= requested
  const available = Object.keys(table).map(Number).filter(n => Number.isFinite(n) && n <= level).sort((a, b) => b - a);
  return available.length > 0 ? table[String(available[0])] : null;
}
