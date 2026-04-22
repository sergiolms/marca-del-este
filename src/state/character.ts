// Character factory + multi-character CRUD helpers.

import type { Character } from "../rules/types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newCharacter(seed: Partial<Character["character"]> = {}): Character {
  const now = new Date().toISOString();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    character: {
      name: "",
      player: "",
      classKey: "",
      className: "",
      raceKey: "",
      race: "",
      alignment: "",
      level: 1,
      movement: "9 m",
      languages: "Común",
      ...seed,
    },
    stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    saves: { death: 14, wands: 15, paralysis: 16, breath: 17, spells: 17 },
    combat: {
      hpCurrent: 6,
      hpMax: 6,
      hpTemp: 0,
      ac: 9,
      acAscending: 10,
      initiative: "+0",
      surprise: "1-2 en 1d6",
      attackBonus: "+0",
      hitDice: "1d6 · 1",
      logDraft: "",
      attacks: [],
      timeline: [],
    },
    money: { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 },
    inventory: { maxWeight: 60, items: [] },
    spells: [],
    effects: [],
    magicItems: [],
    xp: { current: 0, next: null, autoLevel: true },
    journal: { notes: "", goals: "", sessions: [] },
  };
}
