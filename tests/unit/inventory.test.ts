import { describe, expect, it } from "vitest";
import { containerCapacity, containerLocation, inventoryLoadSummary } from "../../src/rules/inventory";
import type { InventoryItem } from "../../src/rules/types";

const item = (overrides: Partial<InventoryItem>): InventoryItem => ({
  id: "item",
  locked: true,
  equipped: false,
  name: "Objeto",
  quantity: 1,
  weight: 1,
  value: "",
  notes: "",
  ...overrides,
});

describe("inventory containers", () => {
  it("detects backpack and sack capacities from catalog text", () => {
    expect(containerCapacity(item({ name: "Mochila (vacía)", notes: "Capacidad: hasta 20 kg de material." }))).toBe(20);
    expect(containerCapacity(item({ name: "Saco grande", notes: "Capacidad: hasta 30 kg." }))).toBe(30);
    expect(containerCapacity(item({ name: "Saco pequeño", notes: "Capacidad: hasta 10 kg." }))).toBe(10);
  });

  it("treats saddlebags as an editable/default container", () => {
    expect(containerCapacity(item({ name: "Alforjas" }))).toBe(30);
    expect(containerCapacity(item({ name: "Alforjas", containerCapacity: 45 }))).toBe(45);
  });

  it("summarizes load by hand, stored and containers without blocking overflow", () => {
    const backpack = item({ id: "pack", name: "Mochila (vacía)", weight: 1, notes: "Capacidad: hasta 20 kg de material." });
    const rope = item({ id: "rope", name: "Cuerda", weight: 5, location: containerLocation("pack") });
    const anvil = item({ id: "anvil", name: "Yunque", weight: 25, location: containerLocation("pack") });
    const dagger = item({ id: "dagger", name: "Daga", weight: 0.5, location: "hand" });

    const summary = inventoryLoadSummary([backpack, rope, anvil, dagger]);

    expect(summary.hand).toBe(0.5);
    expect(summary.stored).toBe(1);
    expect(summary.containers[0].load).toBe(30);
    expect(summary.containers[0].capacity).toBe(20);
    expect(summary.containers[0].exceeded).toBe(true);
  });
});
