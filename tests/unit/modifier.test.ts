import { describe, it, expect } from "vitest";
import { abilityModifier, formatModifier } from "../../src/rules/modifier";

describe("abilityModifier", () => {
  it("covers the OSR table exactly", () => {
    expect(abilityModifier(3)).toBe(-3);
    expect(abilityModifier(4)).toBe(-2);
    expect(abilityModifier(5)).toBe(-2);
    expect(abilityModifier(6)).toBe(-1);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(9)).toBe(0);
    expect(abilityModifier(12)).toBe(0);
    expect(abilityModifier(13)).toBe(1);
    expect(abilityModifier(15)).toBe(1);
    expect(abilityModifier(16)).toBe(2);
    expect(abilityModifier(17)).toBe(2);
    expect(abilityModifier(18)).toBe(3);
    expect(abilityModifier(20)).toBe(3);
  });
  it("handles edge cases", () => {
    expect(abilityModifier(1)).toBe(-3);
    expect(abilityModifier(0)).toBe(-3);
    expect(abilityModifier(Number.NaN)).toBe(0);
  });
});

describe("formatModifier", () => {
  it("renders signs", () => {
    expect(formatModifier(0)).toBe("+0");
    expect(formatModifier(2)).toBe("+2");
    expect(formatModifier(-1)).toBe("-1");
  });
});
