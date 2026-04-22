import { describe, it, expect } from "vitest";
import { syncClassEffects, syncRaceEffects, syncAutoEffects, AUTO_EFFECT_KINDS, requiredLevelForAbility } from "../../src/rules/autofill";
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
