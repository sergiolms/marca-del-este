import { describe, it, expect } from "vitest";
import { clampHp, totalCarriedWeight, applyLongRest, applyShortRest, hpRatio, isLowHp } from "../../src/rules/combat";
import { newCharacter } from "../../src/state/character";

describe("clampHp", () => {
  it("clamps to [0, hpMax+hpTemp]", () => {
    expect(clampHp(5, 10, 0)).toBe(5);
    expect(clampHp(100, 10, 0)).toBe(10);
    expect(clampHp(-5, 10, 0)).toBe(0);
    expect(clampHp(14, 10, 4)).toBe(14);
    expect(clampHp(20, 10, 4)).toBe(14);
  });
});

describe("totalCarriedWeight", () => {
  it("sums quantity * weight of NON-equipped items", () => {
    expect(
      totalCarriedWeight([
        { id: "a", locked: true, equipped: false, name: "a", quantity: 3, weight: 2, value: "", notes: "" },
        { id: "b", locked: true, equipped: false, name: "b", quantity: 5, weight: 0.5, value: "", notes: "" },
      ])
    ).toBe(8.5);
  });
  it("excludes equipped items (worn gear)", () => {
    expect(
      totalCarriedWeight([
        { id: "a", locked: true, equipped: true,  name: "Armadura", quantity: 1, weight: 20, value: "", notes: "" },
        { id: "b", locked: true, equipped: false, name: "Cuerda",   quantity: 1, weight: 1,  value: "", notes: "" },
      ])
    ).toBe(1);
  });
  it("treats garbage values as 0", () => {
    expect(
      totalCarriedWeight([
        { id: "a", locked: true, equipped: false, name: "a", quantity: NaN as unknown as number, weight: 2, value: "", notes: "" },
      ])
    ).toBe(0);
  });
  it("handles decimal weights cleanly", () => {
    expect(
      totalCarriedWeight([
        { id: "a", locked: true, equipped: false, name: "a", quantity: 2, weight: 0.5, value: "", notes: "" },
        { id: "b", locked: true, equipped: false, name: "b", quantity: 3, weight: 0.25, value: "", notes: "" },
      ])
    ).toBe(1.75);
  });
});

describe("applyLongRest", () => {
  it("restores HP, clears temp, unmarks used spells", () => {
    const c = newCharacter();
    c.combat.hpMax = 28;
    c.combat.hpCurrent = 8;
    c.combat.hpTemp = 4;
    c.spells = [
      { id: "s1", locked: true, prepared: true, used: true, name: "Luz", level: 1, duration: "", notes: "" },
      { id: "s2", locked: true, prepared: true, used: false, name: "Dormir", level: 1, duration: "", notes: "" },
    ];
    const next = applyLongRest(c);
    expect(next.combat.hpCurrent).toBe(28);
    expect(next.combat.hpTemp).toBe(0);
    expect(next.spells.every(s => !s.used)).toBe(true);
    // purity: original unchanged
    expect(c.combat.hpCurrent).toBe(8);
  });
});

describe("applyShortRest", () => {
  it("adds 1d6 + CON mod (min 1) without resetting temp or spells", () => {
    const c = newCharacter();
    c.stats.constitution = 16; // +2 mod
    c.combat.hpMax = 20;
    c.combat.hpCurrent = 5;
    c.combat.hpTemp = 3;
    c.spells = [{ id: "s", locked: true, prepared: true, used: true, name: "Luz", level: 1, duration: "", notes: "" }];
    const { next, recovered, rolled } = applyShortRest(c, () => 0); // rolls 1
    expect(rolled).toBe(1);
    expect(recovered).toBe(3); // 1 + 2
    expect(next.combat.hpCurrent).toBe(8);
    expect(next.combat.hpTemp).toBe(3); // preserved
    expect(next.spells[0].used).toBe(true); // NOT reset
  });

  it("clamps at hpMax", () => {
    const c = newCharacter();
    c.combat.hpMax = 10;
    c.combat.hpCurrent = 9;
    const { next } = applyShortRest(c, () => 0.99); // rolls ~6
    expect(next.combat.hpCurrent).toBe(10);
  });

  it("recovery is at least 1 even with very negative CON mod", () => {
    const c = newCharacter();
    c.stats.constitution = 3; // -3 mod
    c.combat.hpMax = 20; c.combat.hpCurrent = 5;
    const { recovered } = applyShortRest(c, () => 0); // 1 + (-3) = -2 → min 1
    expect(recovered).toBe(1);
  });
});

describe("hpRatio / isLowHp", () => {
  it("computes ratio", () => {
    expect(hpRatio(5, 20)).toBe(0.25);
    expect(hpRatio(0, 10)).toBe(0);
  });
  it("detects low HP state", () => {
    expect(isLowHp(4, 20)).toBe(true);   // 20%
    expect(isLowHp(5, 20)).toBe(false);  // 25%
    expect(isLowHp(0, 20)).toBe(false);  // dead, not "low"
  });
});
