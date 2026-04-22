// Helpers to auto-populate character state from catalog data: class / race
// abilities become locked effects so the player does not have to type them.

import type { Character, Effect } from "./types";
import { classByKey } from "./classLookup";
import { uid } from "../state/character";

const SOURCE_CLASS = "Habilidad de clase";
const SOURCE_RACE = "Rasgo racial";

const LEVEL_PATTERNS: RegExp[] = [
  /\ba\s+nivel\s+(\d+)\b/gi,
  /\bdesde\s+nivel\s+(\d+)\b/gi,
  /\bal\s+alcanzar\s+nivel\s+(\d+)\b/gi,
  /\ba\s+partir\s+del\s+(\d+)\b/gi,
];

export function requiredLevelForAbility(text: string): number {
  const levels: number[] = [];
  for (const pattern of LEVEL_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const level = Number(match[1]);
      if (Number.isFinite(level) && level > 0) levels.push(level);
    }
  }
  return levels.length > 0 ? Math.min(...levels) : 1;
}

export function abilityIsUnlocked(text: string, characterLevel: number): boolean {
  return Math.max(1, characterLevel) >= requiredLevelForAbility(text);
}

/** Returns a new Character with the class's abilities added as locked effects,
 *  removing any previously auto-added class abilities. Preserves manual effects. */
export function syncClassEffects(c: Character): Character {
  const cls = classByKey(c.character.classKey);
  const kept = c.effects.filter(e => e.kind !== SOURCE_CLASS);
  if (!cls) return { ...c, effects: kept };
  const level = Math.max(1, c.character.level || 1);
  const previous = new Map(c.effects.filter(e => e.kind === SOURCE_CLASS).map(e => [e.name, e]));
  const auto: Effect[] = cls.abilities.filter(name => abilityIsUnlocked(name, level)).map(name => ({
    id: previous.get(name)?.id ?? uid(),
    locked: true,
    active: previous.get(name)?.active ?? true,
    name,
    kind: SOURCE_CLASS,
    duration: "Permanente",
    notes: `${cls.name} · auto-añadido`,
  }));
  return { ...c, effects: [...auto, ...kept] };
}

/** Same as above, for race abilities. */
export function syncRaceEffects(c: Character): Character {
  // Marca del Este uses class-as-race for non-human ancestries. Racial traits
  // are already part of the selected class entry, so this now only clears old
  // auto-added race effects from earlier app versions.
  const kept = c.effects.filter(e => e.kind !== SOURCE_RACE);
  return { ...c, effects: kept };
}

/** Run both class + race sync in one call. */
export function syncAutoEffects(c: Character): Character {
  return syncRaceEffects(syncClassEffects(c));
}

export const AUTO_EFFECT_KINDS: ReadonlyArray<string> = [SOURCE_CLASS, SOURCE_RACE];
