import { describe, expect, it } from "vitest";
import { automaticMagicAbilities } from "../../src/rules/magicAbilities";
import { syncClassEffects } from "../../src/rules/autofill";
import { newCharacter } from "../../src/state/character";

describe("automaticMagicAbilities", () => {
  it("classifies paladin aura separately from class powers", () => {
    const c = syncClassEffects(newCharacter({ classKey: "paladin", className: "Paladín", level: 1 }));
    const abilities = automaticMagicAbilities(c.effects);

    expect(abilities.some(a => a.kind === "aura" && a.effect.name.includes("Aura permanente"))).toBe(true);
    expect(abilities.some(a => a.kind === "power" && a.effect.name.includes("Detectar el mal"))).toBe(true);
    expect(abilities.some(a => a.effect.name.includes("Dona el 20%"))).toBe(false);
  });

  it("reveals paladin spellcasting feature only when the required level is reached", () => {
    const low = syncClassEffects(newCharacter({ classKey: "paladin", className: "Paladín", level: 8 }));
    const high = syncClassEffects(newCharacter({ classKey: "paladin", className: "Paladín", level: 9 }));

    expect(automaticMagicAbilities(low.effects).some(a => a.effect.name.includes("Lanza conjuros"))).toBe(false);
    expect(automaticMagicAbilities(high.effects).some(a => a.effect.name.includes("Lanza conjuros"))).toBe(true);
  });
});
