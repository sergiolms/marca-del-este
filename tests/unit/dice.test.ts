import { describe, it, expect } from "vitest";
import { makeRng, roll, parseDamageExpr, parseBonus } from "../../src/state/dice";

describe("makeRng", () => {
  it("is deterministic with a seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 5; i++) {
      expect(a()).toBeCloseTo(b(), 10);
    }
  });
});

describe("roll", () => {
  it("rolls 1d20 with modifier", () => {
    const rng = makeRng(1);
    const r = roll({ count: 1, sides: 20, modifier: 3 }, rng);
    expect(r.rolls.length).toBe(1);
    expect(r.total).toBe(r.rolls[0] + 3);
    expect(r.nat).toBe(r.rolls[0]);
  });
  it("advantage picks the higher of two d20s", () => {
    const rng = makeRng(7);
    const r = roll({ count: 1, sides: 20, advantage: "advantage" }, rng);
    expect(r.rawRolls.length).toBe(2);
    expect(r.rolls[0]).toBe(Math.max(...r.rawRolls));
  });
  it("disadvantage picks the lower", () => {
    const rng = makeRng(7);
    const r = roll({ count: 1, sides: 20, advantage: "disadvantage" }, rng);
    expect(r.rolls[0]).toBe(Math.min(...r.rawRolls));
  });
  it("nat-20 flags crit", () => {
    // Force nat 20 by seeding; we don't know exact values so mock rng:
    const r = roll({ count: 1, sides: 20 }, () => 0.999);
    expect(r.nat).toBe(20);
    expect(r.crit).toBe(true);
    expect(r.fumble).toBe(false);
  });
  it("nat-1 flags fumble", () => {
    const r = roll({ count: 1, sides: 20 }, () => 0);
    expect(r.nat).toBe(1);
    expect(r.fumble).toBe(true);
    expect(r.crit).toBe(false);
  });
  it("doubleDice doubles dice count (for crit damage)", () => {
    const rng = makeRng(5);
    const r = roll({ count: 2, sides: 6, doubleDice: true }, rng);
    expect(r.rolls.length).toBe(4);
  });
  it("rolls damage with modifier", () => {
    const rng = makeRng(3);
    const r = roll({ count: 1, sides: 8, modifier: 3 }, rng);
    expect(r.total).toBe(r.rolls[0] + 3);
  });
});

describe("parseDamageExpr", () => {
  it("parses common forms", () => {
    expect(parseDamageExpr("1d8")).toEqual({ count: 1, sides: 8, modifier: 0 });
    expect(parseDamageExpr("2d6+3")).toEqual({ count: 2, sides: 6, modifier: 3 });
    expect(parseDamageExpr("1d4-1")).toEqual({ count: 1, sides: 4, modifier: -1 });
    expect(parseDamageExpr("d20")).toEqual({ count: 1, sides: 20, modifier: 0 });
  });
  it("returns null for garbage", () => {
    expect(parseDamageExpr("banana")).toBeNull();
    expect(parseDamageExpr("")).toBeNull();
  });
});

describe("parseBonus", () => {
  it("handles string and number", () => {
    expect(parseBonus("+3")).toBe(3);
    expect(parseBonus("-2")).toBe(-2);
    expect(parseBonus("0")).toBe(0);
    expect(parseBonus(5)).toBe(5);
    expect(parseBonus("abc")).toBe(0);
    expect(parseBonus(null)).toBe(0);
  });
});
