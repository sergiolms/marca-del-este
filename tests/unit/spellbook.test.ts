import { describe, expect, it } from "vitest";
import { canPrepareSpell, isDuplicateSpell, preparedSpellsByLevel, setSpellPrepared } from "../../src/rules/spellbook";
import type { Spell } from "../../src/rules/types";
import { newCharacter } from "../../src/state/character";

const spell = (id: string, name: string, level: number, prepared = false, used = false): Spell => ({
  id,
  locked: true,
  prepared,
  used,
  name,
  level,
  duration: "",
  notes: "",
});

describe("spellbook", () => {
  it("detects known spells by name and level", () => {
    const spells = [spell("s1", "Proyectil mágico", 1)];
    expect(isDuplicateSpell(spells, "Proyectil magico", 1)).toBe(true);
    expect(isDuplicateSpell(spells, "Proyectil mágico", 2)).toBe(false);
  });

  it("counts prepared spells as occupied slots by level", () => {
    expect(preparedSpellsByLevel([
      spell("s1", "Luz", 1, true),
      spell("s2", "Dormir", 1, false),
      spell("s3", "Levitar", 2, true),
    ])).toEqual({ 1: 1, 2: 1 });
  });

  it("preparing a spell consumes the matching class slot", () => {
    const c = newCharacter({ classKey: "mago", className: "Mago", level: 1 });
    c.spells = [
      spell("s1", "Luz", 1),
      spell("s2", "Dormir", 1),
    ];

    const withPrepared = setSpellPrepared(c, "s1", true);
    expect(withPrepared.spells.find(s => s.id === "s1")?.prepared).toBe(true);
    expect(canPrepareSpell(withPrepared, withPrepared.spells[1])).toBe(false);

    const unchanged = setSpellPrepared(withPrepared, "s2", true);
    expect(unchanged.spells.find(s => s.id === "s2")?.prepared).toBe(false);
  });

  it("unpreparing a spell clears its used state", () => {
    const c = newCharacter({ classKey: "mago", className: "Mago", level: 1 });
    c.spells = [spell("s1", "Luz", 1, true, true)];

    const next = setSpellPrepared(c, "s1", false);
    expect(next.spells[0].prepared).toBe(false);
    expect(next.spells[0].used).toBe(false);
  });
});
