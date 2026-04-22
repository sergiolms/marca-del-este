// Persistence layer. v3 shape = multi-character app state.
// Migrates from v2 single-character (key `marca-del-este.character.v2`) and
// legacy v1 (`marca-del-este.character.v1`).

import type { AppState, Character } from "../rules/types";
import { newCharacter } from "./character";

export const STORAGE_KEY = "marca-del-este.v3";
export const LEGACY_V2_KEY = "marca-del-este.character.v2";
export const LEGACY_V1_KEY = "marca-del-este.character.v1";

export function emptyState(): AppState {
  return { version: 3, activeCharacterId: null, characters: [] };
}

export function loadState(): AppState {
  if (typeof localStorage === "undefined") return emptyState();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 3) return sanitize(parsed);
    } catch {
      /* fall through to migration */
    }
  }

  // Try to migrate v2 single-character
  const legacyV2 = localStorage.getItem(LEGACY_V2_KEY);
  if (legacyV2) {
    try {
      const v2 = JSON.parse(legacyV2) as Partial<Character>;
      const char = mergeIntoNewCharacter(v2);
      return { version: 3, activeCharacterId: char.id, characters: [char] };
    } catch {
      /* ignore */
    }
  }

  const legacyV1 = localStorage.getItem(LEGACY_V1_KEY);
  if (legacyV1) {
    try {
      const v1 = JSON.parse(legacyV1) as Partial<Character>;
      const char = mergeIntoNewCharacter(v1);
      return { version: 3, activeCharacterId: char.id, characters: [char] };
    } catch {
      /* ignore */
    }
  }

  return emptyState();
}

export function saveState(state: AppState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sanitize(s: AppState): AppState {
  const chars = (s.characters ?? []).map(c => ({ ...c }));
  const active = s.activeCharacterId && chars.some(c => c.id === s.activeCharacterId)
    ? s.activeCharacterId
    : chars[0]?.id ?? null;
  return { version: 3, activeCharacterId: active, characters: chars };
}

function mergeIntoNewCharacter(partial: Partial<Character>): Character {
  const base = newCharacter();
  return {
    ...base,
    ...partial,
    id: base.id,
    character: { ...base.character, ...(partial.character ?? {}) },
    stats: { ...base.stats, ...(partial.stats ?? {}) },
    saves: { ...base.saves, ...(partial.saves ?? {}) },
    combat: { ...base.combat, ...(partial.combat ?? {}), attacks: partial.combat?.attacks ?? [], timeline: partial.combat?.timeline ?? [] },
    money: { ...base.money, ...(partial.money ?? {}) },
    inventory: { ...base.inventory, ...(partial.inventory ?? {}), items: partial.inventory?.items ?? [] },
    spells: partial.spells ?? [],
    effects: partial.effects ?? [],
    magicItems: partial.magicItems ?? [],
    xp: { ...base.xp, ...(partial.xp ?? {}) },
    journal: { ...base.journal, ...(partial.journal ?? {}), sessions: partial.journal?.sessions ?? [] },
  };
}
