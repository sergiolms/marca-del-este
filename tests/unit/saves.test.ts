import { describe, it, expect } from "vitest";
import { allowedSpellLevelsFor, firstSpellSlotLevel, hasSpellProgression, lineageForClass, savesFor, spellTraditionFor } from "../../src/rules/classLookup";
import { applyClassSaves } from "../../src/rules/saveSync";
import { newCharacter } from "../../src/state/character";

describe("savesFor", () => {
  it("returns exact level set when available", () => {
    const s = savesFor("clerigo", 1);
    expect(s).not.toBeNull();
    expect(typeof s?.death).toBe("number");
    expect(typeof s?.wands).toBe("number");
    expect(typeof s?.paralysis).toBe("number");
    expect(typeof s?.breath).toBe("number");
    expect(typeof s?.spells).toBe("number");
  });
  it("falls back to nearest lower level when exact missing", () => {
    // Semielfo only has bands (1-3, 4-6, 7-9, 10); levels 11+ missing from catalog.
    const s = savesFor("semielfo", 12);
    // Should return whichever band covers level ≤ 12 (most likely 10).
    expect(s).not.toBeNull();
  });
  it("returns null for unknown class", () => {
    expect(savesFor("nonexistent", 5)).toBeNull();
  });
});

describe("applyClassSaves", () => {
  it("writes saves from the catalog for the current class/level", () => {
    const c = newCharacter({ classKey: "guerrero", className: "Guerrero" });
    c.character.level = 4;
    const after = applyClassSaves(c);
    const published = savesFor("guerrero", 4);
    expect(after.saves).toEqual(published);
  });
  it("is a no-op when no catalog entry", () => {
    const c = newCharacter();
    const after = applyClassSaves(c);
    expect(after.saves).toEqual(c.saves);
  });
});

describe("spell progression helpers", () => {
  it("knows that paladins cast later even before they have current slots", () => {
    expect(hasSpellProgression("paladin")).toBe(true);
    expect(firstSpellSlotLevel("paladin")).toBe(9);
    expect(spellTraditionFor("paladin")).toBe("divine");
    expect(allowedSpellLevelsFor("paladin", 8)).toEqual([]);
    expect(allowedSpellLevelsFor("paladin", 9)).toEqual([1]);
    expect(hasSpellProgression("guerrero")).toBe(false);
  });

  it("uses the elfo oscuro own table to limit spell levels", () => {
    expect(spellTraditionFor("elfo-oscuro")).toBe("arcane");
    expect(firstSpellSlotLevel("elfo-oscuro")).toBe(2);
    expect(allowedSpellLevelsFor("elfo-oscuro", 1)).toEqual([]);
    expect(allowedSpellLevelsFor("elfo-oscuro", 2)).toEqual([1]);
    expect(allowedSpellLevelsFor("elfo-oscuro", 5)).toEqual([1, 2, 3]);
  });

  it("uses the elfo class spell table instead of treating it as a separate race", () => {
    expect(spellTraditionFor("elfo")).toBe("arcane");
    expect(firstSpellSlotLevel("elfo")).toBe(1);
    expect(allowedSpellLevelsFor("elfo", 1)).toEqual([1]);
    expect(allowedSpellLevelsFor("elfo", 5)).toEqual([1, 2, 3]);
    expect(allowedSpellLevelsFor("elfo", 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it("limits every spellcasting class from its own spellSlots table", () => {
    expect(allowedSpellLevelsFor("clerigo", 15)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(allowedSpellLevelsFor("mago", 17)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(allowedSpellLevelsFor("druida", 12)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(allowedSpellLevelsFor("paladin", 15)).toEqual([1, 2, 3, 4]);
    expect(allowedSpellLevelsFor("guerrero", 10)).toBeNull();
  });
});

describe("class-as-race lineage", () => {
  it("derives human lineage for human classes", () => {
    expect(lineageForClass("guerrero")).toMatchObject({ raceKey: "humano", race: "Humano" });
    expect(lineageForClass("paladin")).toMatchObject({ raceKey: "humano", race: "Humano" });
  });

  it("derives non-human lineage from the class selector", () => {
    expect(lineageForClass("elfo")).toMatchObject({ raceKey: "elfo", race: "Elfo" });
    expect(lineageForClass("elfo-oscuro")).toMatchObject({ raceKey: "elfo-oscuro", race: "Elfo oscuro" });
    expect(lineageForClass("gnomo")).toMatchObject({ raceKey: "gnomo", race: "Gnomo" });
  });
});
