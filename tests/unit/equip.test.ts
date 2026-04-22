import { describe, it, expect } from "vitest";
import { canEquipItem, isDerivedAttack, isWeapon, syncEquippedAttacks, toggleEquipped, unequipFromAttack } from "../../src/rules/equip";
import { newCharacter } from "../../src/state/character";
import type { Character, InventoryItem } from "../../src/rules/types";

const weapon = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: overrides.id ?? "item-sword",
  locked: true,
  equipped: overrides.equipped ?? false,
  name: "Espada larga",
  quantity: 1,
  weight: 3,
  value: "10 mo",
  notes: "",
  damage: "1d8",
  ranged: false,
  ...overrides,
});

function withItems(items: InventoryItem[]): Character {
  const c = newCharacter();
  return { ...c, inventory: { ...c.inventory, items } };
}

describe("isWeapon / isDerivedAttack", () => {
  it("identifies weapons by damage presence", () => {
    expect(isWeapon(weapon())).toBe(true);
    expect(isWeapon(weapon({ damage: "" }))).toBe(false);
    expect(isWeapon(weapon({ damage: undefined }))).toBe(false);
  });
  it("identifies derived attacks by sourceItemId", () => {
    expect(isDerivedAttack({ id: "a", locked: true, name: "x", bonus: "+0", damage: "1d6", range: "cuerpo", notes: "", sourceItemId: "s" })).toBe(true);
    expect(isDerivedAttack({ id: "a", locked: true, name: "x", bonus: "+0", damage: "1d6", range: "cuerpo", notes: "" })).toBe(false);
  });
});

describe("syncEquippedAttacks", () => {
  it("adds a derived attack for a newly equipped weapon", () => {
    const c = withItems([weapon({ id: "w1", equipped: true })]);
    const after = syncEquippedAttacks(c);
    expect(after.combat.attacks).toHaveLength(1);
    expect(after.combat.attacks[0].sourceItemId).toBe("w1");
    expect(after.combat.attacks[0].damage).toBe("1d8");
  });

  it("does NOT add an attack if the item isn't a weapon", () => {
    const c = withItems([weapon({ id: "i1", equipped: true, damage: "" })]);
    const after = syncEquippedAttacks(c);
    expect(after.combat.attacks).toHaveLength(0);
  });

  it("removes derived attacks when the item is unequipped", () => {
    let c = withItems([weapon({ id: "w1", equipped: true })]);
    c = syncEquippedAttacks(c);
    expect(c.combat.attacks).toHaveLength(1);
    c = toggleEquipped(c, "w1");
    expect(c.combat.attacks).toHaveLength(0);
  });

  it("preserves manual attacks when syncing", () => {
    const manual = { id: "manual-1", locked: true, name: "Puño", bonus: "+0", damage: "1d2", range: "cuerpo", notes: "" };
    const c: Character = { ...withItems([weapon({ id: "w1", equipped: true })]),
      combat: { ...newCharacter().combat, attacks: [manual] },
    };
    const after = syncEquippedAttacks(c);
    expect(after.combat.attacks.find(a => a.id === "manual-1")).toBeTruthy();
    expect(after.combat.attacks.some(a => a.sourceItemId === "w1")).toBe(true);
  });

  it("doesn't duplicate derived attacks on re-sync", () => {
    let c = withItems([weapon({ id: "w1", equipped: true })]);
    c = syncEquippedAttacks(c);
    c = syncEquippedAttacks(c);
    c = syncEquippedAttacks(c);
    expect(c.combat.attacks.filter(a => a.sourceItemId === "w1")).toHaveLength(1);
  });

  it("re-equipping restores the attack", () => {
    let c = withItems([weapon({ id: "w1", equipped: true })]);
    c = syncEquippedAttacks(c);
    c = toggleEquipped(c, "w1");
    expect(c.combat.attacks).toHaveLength(0);
    c = toggleEquipped(c, "w1");
    expect(c.combat.attacks).toHaveLength(1);
    expect(c.combat.attacks[0].sourceItemId).toBe("w1");
  });

  it("deleting the item also drops the derived attack via sync", () => {
    let c = withItems([weapon({ id: "w1", equipped: true })]);
    c = syncEquippedAttacks(c);
    c = { ...c, inventory: { ...c.inventory, items: c.inventory.items.filter(i => i.id !== "w1") } };
    c = syncEquippedAttacks(c);
    expect(c.combat.attacks).toHaveLength(0);
  });

  it("ranged weapon infers DEX on attack stat", () => {
    const c = withItems([weapon({ id: "bow", equipped: true, name: "Arco", damage: "1d6", ranged: true })]);
    const after = syncEquippedAttacks(c);
    expect(after.combat.attacks[0].attackStat).toBe("dexterity");
    expect(after.combat.attacks[0].damageStat).toBe("none");
    expect(after.combat.attacks[0].range).toBe("distancia");
  });

  it("limits equipped melee weapons to two", () => {
    let c = syncEquippedAttacks(withItems([
      weapon({ id: "w1", equipped: true }),
      weapon({ id: "w2", equipped: true }),
      weapon({ id: "w3", equipped: false }),
    ]));
    expect(canEquipItem(c, "w3")).toBe(false);
    c = toggleEquipped(c, "w3");
    expect(c.inventory.items.find(i => i.id === "w3")?.equipped).toBe(false);
    expect(c.combat.attacks.filter(a => a.range === "cuerpo")).toHaveLength(2);
  });

  it("limits equipped ranged weapons independently from melee weapons", () => {
    const c = withItems([
      weapon({ id: "m1", equipped: true, ranged: false }),
      weapon({ id: "m2", equipped: true, ranged: false }),
      weapon({ id: "r1", equipped: true, ranged: true }),
      weapon({ id: "r2", equipped: true, ranged: true }),
      weapon({ id: "r3", equipped: true, ranged: true }),
    ]);
    const after = syncEquippedAttacks(c);
    expect(after.inventory.items.filter(i => i.equipped && i.ranged)).toHaveLength(2);
    expect(after.inventory.items.filter(i => i.equipped && !i.ranged && isWeapon(i))).toHaveLength(2);
    expect(after.combat.attacks.filter(a => a.range === "distancia")).toHaveLength(2);
  });
});

describe("unequipFromAttack", () => {
  it("unequips the source item for a derived attack", () => {
    let c = withItems([weapon({ id: "w1", equipped: true })]);
    c = syncEquippedAttacks(c);
    const atk = c.combat.attacks[0];
    c = unequipFromAttack(c, atk.id);
    expect(c.inventory.items[0].equipped).toBe(false);
    expect(c.combat.attacks).toHaveLength(0);
  });
  it("is a no-op for manual attacks", () => {
    const manual = { id: "manual-1", locked: true, name: "Puño", bonus: "+0", damage: "1d2", range: "cuerpo", notes: "" };
    const c: Character = { ...newCharacter(), combat: { ...newCharacter().combat, attacks: [manual] } };
    const after = unequipFromAttack(c, "manual-1");
    expect(after.combat.attacks).toHaveLength(1);
  });
});
