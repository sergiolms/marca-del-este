import { describe, it, expect } from "vitest";
import { syncClassEffects, syncRaceEffects, syncAutoEffects, AUTO_EFFECT_KINDS, requiredLevelForAbility, parseAbilityUses } from "../../src/rules/autofill";
import { newCharacter } from "../../src/state/character";

describe("autofill class/race effects", () => {
  it("adds class abilities as locked effects", () => {
    const c = newCharacter({ classKey: "guerrero", className: "Guerrero" });
    const after = syncClassEffects(c);
    const classEffects = after.effects.filter(e => e.kind === "Habilidad de clase");
    expect(classEffects.length).toBeGreaterThan(0);
    expect(classEffects.every(e => e.locked && e.active && e.duration === "Permanente")).toBe(true);
  });

  it("clears previously auto-added class effects when changing classes", () => {
    const c = newCharacter({ classKey: "guerrero", className: "Guerrero" });
    const afterFighter = syncClassEffects(c);
    const fighterCount = afterFighter.effects.filter(e => e.kind === "Habilidad de clase").length;
    const afterMage = syncClassEffects({ ...afterFighter, character: { ...afterFighter.character, classKey: "mago", className: "Mago" } });
    const mageEffects = afterMage.effects.filter(e => e.kind === "Habilidad de clase");
    // Mage abilities replace fighter abilities (no duplication)
    expect(mageEffects.length).toBeGreaterThan(0);
    expect(afterMage.effects.filter(e => e.kind === "Habilidad de clase").length).not.toBe(fighterCount + mageEffects.length);
  });

  it("preserves manual effects when syncing", () => {
    const c = newCharacter({ classKey: "guerrero", className: "Guerrero" });
    c.effects = [{ id: "custom", locked: false, active: true, name: "Bendición", kind: "Aura", duration: "4 turnos", notes: "" }];
    const after = syncClassEffects(c);
    expect(after.effects.some(e => e.id === "custom")).toBe(true);
  });

  it("preserves active state on previously synced automatic effects", () => {
    const c = newCharacter({ classKey: "paladin", className: "Paladín" });
    const synced = syncClassEffects(c);
    const aura = synced.effects.find(e => e.name.includes("Aura permanente"));
    expect(aura).toBeTruthy();

    const disabled = {
      ...synced,
      effects: synced.effects.map(e => e.id === aura!.id ? { ...e, active: false } : e),
    };
    const after = syncClassEffects(disabled);
    expect(after.effects.find(e => e.name === aura!.name)?.active).toBe(false);
    expect(after.effects.find(e => e.name === aura!.name)?.id).toBe(aura!.id);
  });

  it("only adds class abilities once their required level is reached", () => {
    const low = newCharacter({ classKey: "guerrero", className: "Guerrero", level: 1 });
    const lowEffects = syncClassEffects(low).effects.filter(e => e.kind === "Habilidad de clase");
    expect(lowEffects.some(e => e.name.includes("Ataque adicional"))).toBe(false);

    const levelFive = newCharacter({ classKey: "guerrero", className: "Guerrero", level: 5 });
    const levelFiveEffects = syncClassEffects(levelFive).effects.filter(e => e.kind === "Habilidad de clase");
    expect(levelFiveEffects.some(e => e.name.includes("Ataque adicional"))).toBe(true);
  });

  it("removes gated class abilities again if the character level drops", () => {
    const high = newCharacter({ classKey: "druida", className: "Druida", level: 8 });
    const syncedHigh = syncClassEffects(high);
    expect(syncedHigh.effects.some(e => e.name.includes("forma animal"))).toBe(true);

    const syncedLow = syncClassEffects({ ...syncedHigh, character: { ...syncedHigh.character, level: 6 } });
    expect(syncedLow.effects.some(e => e.name.includes("forma animal"))).toBe(false);
  });

  it("extracts the earliest explicit unlock level from ability text", () => {
    expect(requiredLevelForAbility("A nivel 10: leer y usar conjuros en pergamino")).toBe(10);
    expect(requiredLevelForAbility("Hechizar persona 1/día a nivel 1, 2/día a nivel 5")).toBe(1);
    expect(requiredLevelForAbility("Ataque extra cada cinco niveles a partir del 15")).toBe(15);
    expect(requiredLevelForAbility("Imposición de manos: cura 2 PG por nivel")).toBe(1);
  });

  it("syncAutoEffects adds class effects and clears legacy race effects", () => {
    const c = newCharacter({ classKey: "mago", className: "Mago", raceKey: "elfo", race: "Elfo" });
    c.effects = [{ id: "legacy-race", locked: true, active: true, name: "Infravisión 20 m", kind: "Rasgo racial", duration: "Permanente", notes: "" }];
    const after = syncAutoEffects(c);
    expect(after.effects.some(e => e.kind === "Habilidad de clase")).toBe(true);
    expect(after.effects.some(e => e.kind === "Rasgo racial")).toBe(false);
  });

  it("exports AUTO_EFFECT_KINDS", () => {
    expect(AUTO_EFFECT_KINDS).toContain("Habilidad de clase");
    expect(AUTO_EFFECT_KINDS).toContain("Rasgo racial");
  });
});

describe("parseAbilityUses", () => {
  it("parses 'una vez al día' as 1/day", () => {
    expect(parseAbilityUses("Imposición de manos: cura 2 PG por nivel una vez al día", 1)).toEqual({ usesPerDay: 1, restReset: "long" });
  });

  it("parses word-number 'N veces al día'", () => {
    expect(parseAbilityUses("A nivel 7: adopta forma animal 3 veces al día", 7)?.usesPerDay).toBe(3);
  });

  it("parses slash shorthand 1/día", () => {
    expect(parseAbilityUses("Furia desatada 1/día", 1)?.usesPerDay).toBe(1);
  });

  it("picks highest graduated bracket the level qualifies for", () => {
    const text = "Hechizar persona 1/día a nivel 1, 2/día a nivel 5, 3/día a nivel 10, 4/día a nivel 15";
    expect(parseAbilityUses(text, 1)?.usesPerDay).toBe(1);
    expect(parseAbilityUses(text, 5)?.usesPerDay).toBe(2);
    expect(parseAbilityUses(text, 12)?.usesPerDay).toBe(3);
    expect(parseAbilityUses(text, 20)?.usesPerDay).toBe(4);
  });

  it("scales 'una vez al día por cada N niveles' with level", () => {
    const text = "Sana una enfermedad una vez al día por cada 5 niveles";
    expect(parseAbilityUses(text, 1)?.usesPerDay).toBe(1);
    expect(parseAbilityUses(text, 5)?.usesPerDay).toBe(1);
    expect(parseAbilityUses(text, 6)?.usesPerDay).toBe(2);
    expect(parseAbilityUses(text, 15)?.usesPerDay).toBe(3);
  });

  it("returns null for passive features", () => {
    expect(parseAbilityUses("+2 a todas las tiradas de salvación", 1)).toBeNull();
    expect(parseAbilityUses("Aura permanente de Protección contra el mal en 3 m", 1)).toBeNull();
  });
});

describe("syncClassEffects — usage tracking", () => {
  it("adds usesPerDay/usesToday to the paladin's Imposición de manos", () => {
    const c = syncClassEffects(newCharacter({ classKey: "paladin", className: "Paladín", level: 1 }));
    const laying = c.effects.find(e => e.name.includes("Imposición de manos"));
    expect(laying?.usesPerDay).toBe(1);
    expect(laying?.usesToday).toBe(0);
    expect(laying?.restReset).toBe("long");
  });

  it("preserves usesToday across re-syncs (so level-ups don't refill daily powers)", () => {
    const c = syncClassEffects(newCharacter({ classKey: "paladin", className: "Paladín", level: 1 }));
    const laying = c.effects.find(e => e.name.includes("Imposición de manos"))!;
    const afterUse = {
      ...c,
      effects: c.effects.map(e => e.id === laying.id ? { ...e, usesToday: 1 } : e),
    };
    const resynced = syncClassEffects({ ...afterUse, character: { ...afterUse.character, level: 2 } });
    const again = resynced.effects.find(e => e.name.includes("Imposición de manos"));
    expect(again?.usesToday).toBe(1);
  });
});

describe("syncRaceEffects", () => {
  it("does not add separate race abilities in class-as-race mode", () => {
    const c = newCharacter({ raceKey: "elfo", race: "Elfo" });
    const after = syncRaceEffects(c);
    const raceEffects = after.effects.filter(e => e.kind === "Rasgo racial");
    expect(raceEffects.length).toBe(0);
  });

  it("removes legacy race effects", () => {
    const c = newCharacter({ raceKey: "elfo", race: "Elfo" });
    c.effects = [{ id: "legacy-race", locked: true, active: true, name: "Infravisión 20 m", kind: "Rasgo racial", duration: "Permanente", notes: "" }];
    const cleared = syncRaceEffects(c);
    expect(cleared.effects.some(e => e.kind === "Rasgo racial")).toBe(false);
  });
});
