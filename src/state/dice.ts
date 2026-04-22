// Dice engine. Seeded for tests, `Math.random` by default.
// Designed around state events so animation layer can observe without coupling.

export interface DiceSpec {
  count: number;    // number of dice
  sides: number;    // e.g. 20 for d20
  modifier?: number;
  advantage?: "none" | "advantage" | "disadvantage";
  doubleDice?: boolean;  // for crits on damage
}

export interface DiceResult {
  spec: DiceSpec;
  rolls: number[];   // individual die results (after advantage/disadv selection)
  rawRolls: number[]; // what we rolled before pick
  total: number;     // sum + modifier
  nat?: number;      // natural value on d20 primary die (if single d20)
  crit?: boolean;    // nat 20 on d20
  fumble?: boolean;  // nat 1 on d20
}

export type Rng = () => number;

export function makeRng(seed?: number): Rng {
  if (seed === undefined) return Math.random;
  // Mulberry32
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rollOne(rng: Rng, sides: number): number {
  return 1 + Math.floor(rng() * sides);
}

export function roll(spec: DiceSpec, rng: Rng = Math.random): DiceResult {
  const mod = spec.modifier ?? 0;
  const count = Math.max(0, Math.floor(spec.count)) * (spec.doubleDice ? 2 : 1);
  const adv = spec.advantage ?? "none";
  const rawRolls: number[] = [];
  const rolls: number[] = [];

  if (spec.sides === 20 && count === 1 && adv !== "none") {
    const a = rollOne(rng, 20);
    const b = rollOne(rng, 20);
    rawRolls.push(a, b);
    const picked = adv === "advantage" ? Math.max(a, b) : Math.min(a, b);
    rolls.push(picked);
  } else {
    for (let i = 0; i < count; i++) {
      const r = rollOne(rng, spec.sides);
      rawRolls.push(r);
      rolls.push(r);
    }
  }

  const sum = rolls.reduce((s, r) => s + r, 0);
  const total = sum + mod;
  const isD20 = spec.sides === 20 && rolls.length === 1;
  const nat = isD20 ? rolls[0] : undefined;
  return {
    spec,
    rolls,
    rawRolls,
    total,
    nat,
    crit: isD20 && nat === 20,
    fumble: isD20 && nat === 1,
  };
}

/**
 * Parse a damage expression like "1d8", "2d6+3", "1d4-1". Returns null if
 * unparseable.
 */
export function parseDamageExpr(expr: string): DiceSpec | null {
  const m = expr.trim().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) return null;
  const count = m[1] === "" ? 1 : Number(m[1]);
  const sides = Number(m[2]);
  const modifier = m[3] ? Number(m[3].replace(/\s+/g, "")) : 0;
  if (!Number.isFinite(count) || !Number.isFinite(sides)) return null;
  return { count, sides, modifier };
}

/** Parse an attack bonus like "+3", "-1", "2" into a number. */
export function parseBonus(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return Math.trunc(raw);
  if (!raw) return 0;
  const m = String(raw).trim().match(/^([+-]?\d+)$/);
  return m ? Number(m[1]) : 0;
}

// --- Haptics ---------------------------------------------------------------

export type HapticStrength = "light" | "medium" | "heavy" | "crit";

const HAPTIC_PATTERNS: Record<HapticStrength, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  crit: [30, 40, 30, 40, 60],
};

export function haptic(strength: HapticStrength): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as unknown as { vibrate?: (p: unknown) => boolean };
  if (typeof nav.vibrate === "function") {
    try {
      nav.vibrate(HAPTIC_PATTERNS[strength]);
    } catch {
      /* ignore */
    }
  }
}

// --- Reduced motion --------------------------------------------------------

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
