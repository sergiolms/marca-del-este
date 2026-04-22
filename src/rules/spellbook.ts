import type { Character, Spell } from "./types";
import { spellSlotsFor } from "./classLookup";

export function spellKey(name: string, level: number): string {
  return `${normalize(name)}::${level}`;
}

export function isDuplicateSpell(spells: readonly Spell[], name: string, level: number, ignoreId?: string): boolean {
  const key = spellKey(name, level);
  return spells.some(s => s.id !== ignoreId && spellKey(s.name, s.level) === key);
}

export function preparedSpellsByLevel(spells: readonly Spell[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const spell of spells) {
    if (!spell.prepared) continue;
    counts[spell.level] = (counts[spell.level] ?? 0) + 1;
  }
  return counts;
}

export function spellSlotsAtLevel(c: Character, spellLevel: number): number {
  const slots = spellSlotsFor(c.character.classKey, c.character.level);
  if (!slots) return 0;
  return slots[spellLevel - 1] ?? 0;
}

export function canPrepareSpell(c: Character, spell: Spell): boolean {
  if (spell.prepared) return true;
  const total = spellSlotsAtLevel(c, spell.level);
  if (total <= 0) return false;
  return (preparedSpellsByLevel(c.spells)[spell.level] ?? 0) < total;
}

export function setSpellPrepared(c: Character, spellId: string, prepared: boolean): Character {
  const spell = c.spells.find(s => s.id === spellId);
  if (!spell) return c;
  if (!prepared) {
    return {
      ...c,
      spells: c.spells.map(s => s.id === spellId ? { ...s, prepared: false, used: false } : s),
    };
  }
  if (spell.prepared || canPrepareSpell(c, spell)) {
    return {
      ...c,
      spells: c.spells.map(s => s.id === spellId ? { ...s, prepared: true, used: false } : s),
    };
  }
  return c;
}

export function toggleSpellPrepared(c: Character, spellId: string): Character {
  const spell = c.spells.find(s => s.id === spellId);
  if (!spell) return c;
  return setSpellPrepared(c, spellId, !spell.prepared);
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
