import { describe, expect, it } from "vitest";
import { acBonusLabel, acValue, calculateArmorClass, parseArmorClass, setBaseArmorClass } from "../../src/rules/armorClass";
import { newCharacter } from "../../src/state/character";

describe("armor class", () => {
  it("keeps one base AC value and derives the opposite notation", () => {
    const c = newCharacter();
    const asc = setBaseArmorClass(c.combat, 12, "ascending");
    expect(asc.acAscending).toBe(12);
    expect(asc.ac).toBe(7);

    const desc = setBaseArmorClass(c.combat, 5, "descending");
    expect(desc.ac).toBe(5);
    expect(desc.acAscending).toBe(14);
  });

  it("parses armor bases and shield bonuses from catalog notation", () => {
    expect(parseArmorClass("5 [14]")).toEqual({ kind: "base", pair: { descending: 5, ascending: 14 } });
    expect(parseArmorClass("-1 [11]")).toEqual({ kind: "bonus", bonus: 1 });
  });

  it("uses the best equipped armor and equipped shield in the calculated AC", () => {
    const c = newCharacter();
    c.inventory.items = [
      { id: "leather", locked: true, equipped: true, name: "Armadura de cuero", quantity: 1, weight: 8, value: "", notes: "", armorClass: "7 [12]" },
      { id: "shield", locked: true, equipped: true, name: "Escudo", quantity: 1, weight: 5, value: "", notes: "", armorClass: "-1 [11]" },
    ];

    const ac = calculateArmorClass(c);
    expect(ac.armorSource).toBe("Armadura de cuero");
    expect(ac.calculated).toEqual({ descending: 6, ascending: 13 });
  });

  it("falls back to catalog armor class for existing inventory items without the stored field", () => {
    const c = newCharacter();
    c.inventory.items = [
      { id: "chain", locked: true, equipped: true, name: "Cota de mallas", quantity: 1, weight: 15, value: "", notes: "" },
      { id: "shield", locked: true, equipped: true, name: "Escudo", quantity: 1, weight: 5, value: "", notes: "" },
    ];

    const ac = calculateArmorClass(c);
    expect(ac.armorSource).toBe("Cota de mallas");
    expect(ac.calculated).toEqual({ descending: 4, ascending: 15 });
  });

  it("adds magic armor and shield enchantment bonuses", () => {
    const c = newCharacter();
    c.inventory.items = [
      { id: "plate", locked: true, equipped: true, name: "Armadura de placas", quantity: 1, weight: 25, value: "", notes: "", armorClass: "3 [16]", enchantments: ["armadura-2"] },
      { id: "shield", locked: true, equipped: true, name: "Escudo", quantity: 1, weight: 5, value: "", notes: "", armorClass: "-1 [11]", enchantments: ["escudo-1"] },
    ];

    const ac = calculateArmorClass(c);
    expect(ac.totalBonus).toBe(4);
    expect(ac.calculated).toEqual({ descending: -1, ascending: 20 });
  });

  it("ignores conditional automatic class/race CA text but accepts manual active effects", () => {
    const c = newCharacter();
    c.effects = [
      { id: "racial", locked: true, active: true, name: "+2 a la CA contra criaturas mayores que un humano", kind: "Rasgo racial", duration: "Permanente", notes: "" },
      { id: "manual", locked: false, active: true, name: "Escudo mágico", kind: "Aura", duration: "1 turno", notes: "+1 CA" },
    ];

    const ac = calculateArmorClass(c);
    expect(ac.totalBonus).toBe(1);
    expect(ac.calculated).toEqual({ descending: 8, ascending: 11 });
  });

  it("formats the active AC mode without leaking the opposite notation", () => {
    const c = newCharacter();
    c.combat = setBaseArmorClass(c.combat, 12, "ascending");
    c.inventory.items = [
      { id: "shield", locked: true, equipped: true, name: "Escudo", quantity: 1, weight: 5, value: "", notes: "", armorClass: "-1 [11]" },
    ];

    const ac = calculateArmorClass(c);
    expect(acValue(ac.calculated, "ascending")).toBe(13);
    expect(acValue(ac.calculated, "descending")).toBe(6);
    expect(acBonusLabel(1, "ascending")).toBe("+1");
    expect(acBonusLabel(1, "descending")).toBe("-1");
  });
});
