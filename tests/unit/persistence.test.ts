import { describe, it, expect, beforeEach } from "vitest";
import { emptyState, loadState, saveState, STORAGE_KEY, LEGACY_V2_KEY } from "../../src/state/persistence";
import { newCharacter } from "../../src/state/character";

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loadState returns empty when nothing stored", async () => {
    await expect(loadState()).resolves.toEqual(emptyState());
  });

  it("saveState / loadState round-trips", async () => {
    const c = newCharacter({ name: "Baltasar" });
    const state = { version: 3 as const, activeCharacterId: c.id, characters: [c] };
    await saveState(state);
    const loaded = await loadState();
    expect(loaded.activeCharacterId).toBe(c.id);
    expect(loaded.characters[0].character.name).toBe("Baltasar");
  });

  it("migrates from legacy v2 single-character", async () => {
    const legacyV2 = {
      character: { name: "Old Hero", classKey: "fighter", className: "Guerrero" },
      combat: { hpMax: 10, hpCurrent: 7, hpTemp: 0, attacks: [] },
      money: { copper: 0, silver: 0, electrum: 0, gold: 5, platinum: 0 },
    };
    localStorage.setItem(LEGACY_V2_KEY, JSON.stringify(legacyV2));
    const state = await loadState();
    expect(state.characters.length).toBe(1);
    expect(state.characters[0].character.name).toBe("Old Hero");
    expect(state.characters[0].money.gold).toBe(5);
    expect(state.activeCharacterId).toBe(state.characters[0].id);
  });

  it("drops broken JSON in storage", async () => {
    localStorage.setItem(STORAGE_KEY, "{not valid");
    await expect(loadState()).resolves.toEqual(emptyState());
  });

  it("corrects dangling activeCharacterId", async () => {
    const c = newCharacter({ name: "X" });
    const bad = { version: 3 as const, activeCharacterId: "does-not-exist", characters: [c] };
    await saveState(bad);
    const loaded = await loadState();
    expect(loaded.activeCharacterId).toBe(c.id);
  });
});
