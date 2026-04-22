import { describe, it, expect } from "vitest";
import {
  walletToCopper,
  copperToWallet,
  parsePriceToCopper,
  payFromWallet,
  receiveToWallet,
  walletToGold,
} from "../../src/rules/wallet";

describe("wallet conversions", () => {
  it("walletToCopper sums correctly", () => {
    expect(walletToCopper({ copper: 5, silver: 2, electrum: 1, gold: 3, platinum: 1 })).toBe(
      5 + 20 + 50 + 300 + 1000
    );
  });

  it("copperToWallet denominates greedily, largest first", () => {
    const w = copperToWallet(1555);
    expect(w).toEqual({ platinum: 1, gold: 5, electrum: 1, silver: 0, copper: 5 });
    expect(walletToCopper(w)).toBe(1555);
  });

  it("round-trips for a range of values", () => {
    for (const c of [0, 1, 9, 10, 49, 50, 99, 100, 999, 1000, 1234, 9999]) {
      expect(walletToCopper(copperToWallet(c))).toBe(c);
    }
  });

  it("walletToGold gives fractional gold", () => {
    expect(walletToGold({ copper: 50, silver: 0, electrum: 0, gold: 0, platinum: 0 })).toBe(0.5);
  });
});

describe("parsePriceToCopper", () => {
  it("parses plain gold", () => {
    expect(parsePriceToCopper("10 mo")).toBe(1000);
    expect(parsePriceToCopper("1 mo")).toBe(100);
  });
  it("parses thousands separator", () => {
    expect(parsePriceToCopper("1.500 mo")).toBe(150_000);
    expect(parsePriceToCopper("10.000 mo")).toBe(1_000_000);
  });
  it("parses decimal comma", () => {
    expect(parsePriceToCopper("0,5 mo")).toBe(50);
    expect(parsePriceToCopper("1,5 mo")).toBe(150);
  });
  it("parses decimal dot (small leading)", () => {
    expect(parsePriceToCopper("0.5 mo")).toBe(50);
  });
  it("parses silver / copper / electrum / platinum", () => {
    expect(parsePriceToCopper("5 mp")).toBe(50);
    expect(parsePriceToCopper("3 mc")).toBe(3);
    expect(parsePriceToCopper("2 me")).toBe(100);
    expect(parsePriceToCopper("1 mpt")).toBe(1000);
  });
  it("returns null for malformed input", () => {
    expect(parsePriceToCopper("")).toBeNull();
    expect(parsePriceToCopper("10 oro")).toBeNull();
    expect(parsePriceToCopper("abc")).toBeNull();
    expect(parsePriceToCopper(null)).toBeNull();
  });
});

describe("payFromWallet / receiveToWallet", () => {
  const wallet = { copper: 0, silver: 0, electrum: 0, gold: 10, platinum: 0 };

  it("pays exact price", () => {
    const result = payFromWallet(wallet, 1000); // 10 mo
    expect(result).toEqual({ copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 });
  });

  it("makes change", () => {
    const result = payFromWallet(wallet, 50); // 5 mp
    // 950 cp = 9 gold + 1 electrum + 0 silver + 0 copper (greedy denomination)
    expect(result).toEqual({ copper: 0, silver: 0, electrum: 1, gold: 9, platinum: 0 });
    expect(walletToCopper(result!)).toBe(950);
  });

  it("refuses when insufficient", () => {
    expect(payFromWallet(wallet, 2000)).toBeNull();
  });

  it("receive and normalize", () => {
    const result = receiveToWallet(wallet, 1500);
    expect(walletToCopper(result)).toBe(2500);
    expect(result.platinum).toBe(2);
  });
});
