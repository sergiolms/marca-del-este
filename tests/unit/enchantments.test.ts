import { describe, it, expect } from "vitest";
import { effectivePlus, isOverEnchanted, totalCostCopper, applyDamageBonus } from "../../src/rules/enchantments";

describe("effectivePlus", () => {
  it("numeric + counts full value", () => {
    expect(effectivePlus([{ id: "a", name: "+3", bonus: 3, costDelta: "0 mo" }])).toBe(3);
  });
  it("named properties count as 1 each", () => {
    expect(
      effectivePlus([
        { id: "a", name: "Luz", costDelta: "0 mo" },
        { id: "b", name: "Afilada", costDelta: "0 mo" },
      ])
    ).toBe(2);
  });
  it("caps at 5", () => {
    expect(
      effectivePlus([
        { id: "a", name: "+5", bonus: 5, costDelta: "0 mo" },
        { id: "b", name: "Luz", costDelta: "0 mo" },
      ])
    ).toBe(5);
  });
});

describe("isOverEnchanted", () => {
  it("returns true when total exceeds 5", () => {
    expect(
      isOverEnchanted([
        { id: "a", name: "+5", bonus: 5, costDelta: "0 mo" },
        { id: "b", name: "Luz", costDelta: "0 mo" },
      ])
    ).toBe(true);
  });
});

describe("totalCostCopper", () => {
  it("sums base + deltas", () => {
    const total = totalCostCopper("10 mo", [
      { id: "x", name: "+1", bonus: 1, costDelta: "1.000 mo" },
      { id: "y", name: "Luz", costDelta: "500 mo" },
    ]);
    expect(total).toBe(1000 + 100_000 + 50_000);
  });
  it("returns null on unparseable price", () => {
    expect(totalCostCopper("???", [])).toBeNull();
  });
});

describe("applyDamageBonus", () => {
  it("adds positive bonus to simple die", () => {
    expect(applyDamageBonus("1d8", 2)).toBe("1d8+2");
  });
  it("merges with existing bonus", () => {
    expect(applyDamageBonus("1d8+1", 2)).toBe("1d8+3");
    expect(applyDamageBonus("1d8+1", -2)).toBe("1d8-1");
    expect(applyDamageBonus("1d8+2", -2)).toBe("1d8");
  });
  it("leaves unknown shape untouched", () => {
    expect(applyDamageBonus("special", 2)).toBe("special");
  });
});
