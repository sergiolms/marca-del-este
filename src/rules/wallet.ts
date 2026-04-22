// Wallet helpers. Internal canonical value is copper pieces (mc).
// Conversions (verified against the rulebook's "Tabla de equivalencia monetaria"):
//   1 mc (copper)   = 1
//   1 mp (silver)   = 10
//   1 me (electrum) = 50
//   1 mo (gold)     = 100
//   1 mpt (platinum)= 1000
// The wallet stores ALREADY-DENOMINATED amounts; we normalize via copperToWallet
// after any change so users see a "minimal" stack.

import type { Wallet } from "./types";

export const COPPER_VALUES = {
  mc: 1,
  mp: 10,
  me: 50,
  mo: 100,
  mpt: 1000,
} as const;

export type CurrencyKey = keyof typeof COPPER_VALUES;

export function walletToCopper(w: Wallet): number {
  return (
    w.copper * COPPER_VALUES.mc +
    w.silver * COPPER_VALUES.mp +
    w.electrum * COPPER_VALUES.me +
    w.gold * COPPER_VALUES.mo +
    w.platinum * COPPER_VALUES.mpt
  );
}

/** Greedy denomination from copper: largest first. */
export function copperToWallet(copper: number): Wallet {
  let c = Math.max(0, Math.floor(copper));
  const platinum = Math.floor(c / COPPER_VALUES.mpt); c -= platinum * COPPER_VALUES.mpt;
  const gold     = Math.floor(c / COPPER_VALUES.mo);  c -= gold     * COPPER_VALUES.mo;
  const electrum = Math.floor(c / COPPER_VALUES.me);  c -= electrum * COPPER_VALUES.me;
  const silver   = Math.floor(c / COPPER_VALUES.mp);  c -= silver   * COPPER_VALUES.mp;
  const copperR  = c;
  return { copper: copperR, silver, electrum, gold, platinum };
}

/** Total value of wallet in gold pieces (fractional). */
export function walletToGold(w: Wallet): number {
  return walletToCopper(w) / COPPER_VALUES.mo;
}

const PRICE_RE = /^\s*([\d.,]+)\s*(mc|mp|me|mo|mpt)\s*$/i;

/**
 * Parse a price string like "10 mo", "1.500 mo", "0,5 mo" to copper.
 * Supports '.' and ',' as thousand / decimal separators — the rulebook
 * uses Spanish convention with '.' as thousands and ',' as decimal, but
 * some tables use '.' as decimal. Assume: if a single '.' or ',' appears
 * with ≤3 trailing digits AND the leading chunk ≤3 digits, it's a decimal.
 * Otherwise treat separators as thousands and drop them.
 */
export function parsePriceToCopper(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(PRICE_RE);
  if (!m) return null;
  let n = m[1];
  const unit = m[2].toLowerCase() as CurrencyKey;

  // Normalize separators: if the *last* separator has <=3 trailing digits, treat as decimal.
  const lastDot = n.lastIndexOf(".");
  const lastCom = n.lastIndexOf(",");
  const lastSep = Math.max(lastDot, lastCom);
  if (lastSep >= 0) {
    const decimalDigits = n.length - lastSep - 1;
    const leading = n.slice(0, lastSep).replace(/[.,]/g, "");
    if (decimalDigits <= 2 && leading.length <= 3 && decimalDigits > 0) {
      // Decimal form (e.g. "0,5" or "1.5")
      n = leading + "." + n.slice(lastSep + 1);
    } else {
      // Thousands separators only.
      n = n.replace(/[.,]/g, "");
    }
  }

  const value = Number(n);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * COPPER_VALUES[unit]);
}

/** Subtract `amountCopper` from wallet; returns new wallet, or null if insufficient. */
export function payFromWallet(w: Wallet, amountCopper: number): Wallet | null {
  const total = walletToCopper(w);
  if (total < amountCopper) return null;
  return copperToWallet(total - amountCopper);
}

/** Add `amountCopper` to wallet and re-normalize. */
export function receiveToWallet(w: Wallet, amountCopper: number): Wallet {
  return copperToWallet(walletToCopper(w) + amountCopper);
}
