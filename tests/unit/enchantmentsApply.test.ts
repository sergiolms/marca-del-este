import { describe, it, expect } from "vitest";
import { enchantmentBonus, enchantmentLabels } from "../../src/rules/attackMath";

describe("enchantmentBonus", () => {
  it("returns 0 for no enchantments", () => {
    expect(enchantmentBonus(undefined)).toBe(0);
    expect(enchantmentBonus([])).toBe(0);
  });
  it("sums +N bonuses", () => {
    expect(enchantmentBonus(["arma-1"])).toBe(1);
    expect(enchantmentBonus(["arma-1", "arma-2"])).toBe(3);
  });
  it("caps at +5", () => {
    expect(enchantmentBonus(["arma-5", "arma-3"])).toBe(5);
  });
  it("named properties without bonus contribute 0", () => {
    // "luz" has no bonus in the catalog
    expect(enchantmentBonus(["luz"])).toBe(0);
  });
  it("ignores unknown ids", () => {
    expect(enchantmentBonus(["does-not-exist", "arma-2"])).toBe(2);
  });
});

describe("enchantmentLabels", () => {
  it("returns catalog names for ids", () => {
    const labels = enchantmentLabels(["arma-1", "luz"]);
    expect(labels).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(labels.length).toBe(2);
  });
  it("falls back to the id when catalog has no entry", () => {
    expect(enchantmentLabels(["unknown-x"])).toEqual(["unknown-x"]);
  });
});
