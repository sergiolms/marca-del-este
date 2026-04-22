import { describe, it, expect } from "vitest";
import { levelFromXp, computeXpInfo } from "../../src/rules/xp";

const fighter = [0, 2000, 4000, 8000, 16000, 32500, 65000, 120000, 240000, 360000];

describe("levelFromXp", () => {
  it("returns 1 at 0 XP", () => {
    expect(levelFromXp(fighter, 0)).toBe(1);
  });
  it("crosses thresholds at their exact values", () => {
    expect(levelFromXp(fighter, 1999)).toBe(1);
    expect(levelFromXp(fighter, 2000)).toBe(2);
    expect(levelFromXp(fighter, 3999)).toBe(2);
    expect(levelFromXp(fighter, 4000)).toBe(3);
  });
  it("caps at table length", () => {
    expect(levelFromXp(fighter, 999_999_999)).toBe(fighter.length);
  });
  it("empty table gives level 1", () => {
    expect(levelFromXp([], 10_000)).toBe(1);
  });
});

describe("computeXpInfo", () => {
  it("progress is 0% just after crossing threshold", () => {
    const info = computeXpInfo(fighter, 2000);
    expect(info.level).toBe(2);
    expect(info.nextThreshold).toBe(4000);
    expect(info.toNext).toBe(2000);
    expect(info.progressPct).toBe(0);
  });
  it("progress is 100% at max level", () => {
    const info = computeXpInfo(fighter, 999_999);
    expect(info.nextThreshold).toBeNull();
    expect(info.progressPct).toBe(100);
    expect(info.toNext).toBe(0);
  });
  it("midway is half", () => {
    const info = computeXpInfo(fighter, 3000);
    expect(info.level).toBe(2);
    expect(info.progressPct).toBe(50);
  });
});
