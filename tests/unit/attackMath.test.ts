import { describe, it, expect } from "vitest";
import { inferAttackStats, attackStatMod, damageStatMod, statLabel } from "../../src/rules/attackMath";
import type { Attack, Stats } from "../../src/rules/types";

const stats: Stats = { strength: 16, dexterity: 13, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 };
// STR 16 → +2 mod, DEX 13 → +1 mod

function mkAtk(overrides: Partial<Attack> = {}): Attack {
  return { id: "a", locked: true, name: "x", bonus: "+0", damage: "1d6", range: "cuerpo", notes: "", ...overrides };
}

describe("inferAttackStats", () => {
  it("melee defaults to STR for both atk and dmg", () => {
    expect(inferAttackStats("cuerpo")).toEqual({ attackStat: "strength", damageStat: "strength" });
  });
  it("ranged defaults to DEX for atk, no dmg mod", () => {
    expect(inferAttackStats("distancia")).toEqual({ attackStat: "dexterity", damageStat: "none" });
    expect(inferAttackStats("arco corto")).toEqual({ attackStat: "dexterity", damageStat: "none" });
    expect(inferAttackStats("jabalina")).toEqual({ attackStat: "dexterity", damageStat: "none" });
  });
});

describe("attackStatMod / damageStatMod", () => {
  it("melee uses STR", () => {
    const a = mkAtk({ range: "cuerpo", attackStat: "strength", damageStat: "strength" });
    expect(attackStatMod(a, stats)).toBe(2);
    expect(damageStatMod(a, stats)).toBe(2);
  });
  it("ranged uses DEX for atk, none for damage", () => {
    const a = mkAtk({ range: "distancia", attackStat: "dexterity", damageStat: "none" });
    expect(attackStatMod(a, stats)).toBe(1);
    expect(damageStatMod(a, stats)).toBe(0);
  });
  it("falls back to inferred defaults when stat fields are absent", () => {
    const a = mkAtk({ range: "distancia" }); // no attackStat/damageStat
    expect(attackStatMod(a, stats)).toBe(1); // inferred DEX
    expect(damageStatMod(a, stats)).toBe(0); // inferred none
  });
  it("stat 'none' produces 0", () => {
    const a = mkAtk({ attackStat: "none", damageStat: "none" });
    expect(attackStatMod(a, stats)).toBe(0);
    expect(damageStatMod(a, stats)).toBe(0);
  });
});

describe("statLabel", () => {
  it("formats", () => {
    expect(statLabel("strength")).toBe("FUE");
    expect(statLabel("dexterity")).toBe("DES");
    expect(statLabel("none")).toBe("—");
  });
});
