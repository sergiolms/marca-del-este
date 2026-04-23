import { describe, it, expect, beforeEach } from "vitest";
import { emptyState, loadState, saveState, STORAGE_KEY } from "../../src/state/persistence";
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
