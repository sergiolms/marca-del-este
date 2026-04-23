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

const SPANISH_NUMBER_WORDS: Record<string, number> = {
  una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

/** Extract how many times per day a class ability can be activated at a given
 *  character level. Returns null for passive features that have no daily limit. */
export function parseAbilityUses(text: string, characterLevel: number): { usesPerDay: number; restReset: "long" } | null {
  const level = Math.max(1, characterLevel || 1);

  // "1/día a nivel 1, 2/día a nivel 5, 3/día a nivel 10" — pick the highest bracket the level qualifies for.
  const graduated = [...text.matchAll(/(\d+)\s*\/\s*d[ií]a\s+a\s+nivel\s+(\d+)/gi)];
  if (graduated.length > 0) {
    let best = 0;
    for (const match of graduated) {
      const uses = Number(match[1]);
      const required = Number(match[2]);
      if (level >= required && uses > best) best = uses;
    }
    return best > 0 ? { usesPerDay: best, restReset: "long" } : null;
  }

  // "una vez al día por cada 5 niveles" — one charge per K levels, minimum one.
  const perK = text.match(/una\s+ve(?:z|ces)\s+al\s+d[ií]a\s+por\s+cada\s+(\d+)\s+niveles/i);
  if (perK) {
    const k = Math.max(1, Number(perK[1]));
    return { usesPerDay: Math.max(1, Math.ceil(level / k)), restReset: "long" };
  }

  // "1/día", "2/día"…
  const slashForm = text.match(/(\d+)\s*\/\s*d[ií]a/i);
  if (slashForm) return { usesPerDay: Math.max(1, Number(slashForm[1])), restReset: "long" };

  // "3 veces al día" (numeric)
  const numericVeces = text.match(/(\d+)\s+ve(?:z|ces)\s+al\s+d[ií]a/i);
  if (numericVeces) return { usesPerDay: Math.max(1, Number(numericVeces[1])), restReset: "long" };

  // "una vez al día", "dos veces al día"…
  const wordVeces = text.match(/(una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+ve(?:z|ces)\s+al\s+d[ií]a/i);
  if (wordVeces) {
    const count = SPANISH_NUMBER_WORDS[wordVeces[1].toLowerCase()];
    if (count) return { usesPerDay: count, restReset: "long" };
  }

  return null;
}

/** Returns a new Character with the class's abilities added as locked effects,
 *  removing any previously auto-added class abilities. Preserves manual effects,
 *  and carries over usesToday so a character mid-adventure doesn't get its
 *  daily powers silently refilled on every class/level sync. */
export function syncClassEffects(c: Character): Character {
  const cls = classByKey(c.character.classKey);
  const kept = c.effects.filter(e => e.kind !== SOURCE_CLASS);
  if (!cls) return { ...c, effects: kept };
  const level = Math.max(1, c.character.level || 1);
  const previous = new Map(c.effects.filter(e => e.kind === SOURCE_CLASS).map(e => [e.name, e]));
  const auto: Effect[] = cls.abilities.filter(name => abilityIsUnlocked(name, level)).map(name => {
    const prior = previous.get(name);
    const uses = parseAbilityUses(name, level);
    const base: Effect = {
      id: prior?.id ?? uid(),
      locked: true,
      active: prior?.active ?? true,
      name,
      kind: SOURCE_CLASS,
      duration: "Permanente",
      notes: `${cls.name} · auto-añadido`,
    };
    if (uses) {
      base.usesPerDay = uses.usesPerDay;
      base.restReset = uses.restReset;
      const carried = Math.max(0, prior?.usesToday ?? 0);
      base.usesToday = Math.min(carried, uses.usesPerDay);
    }
    return base;
  });
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
