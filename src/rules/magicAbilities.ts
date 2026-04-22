import type { Effect } from "./types";
import { AUTO_EFFECT_KINDS } from "./autofill";

export type MagicAbilityKind = "aura" | "power";

export interface MagicAbility {
  effect: Effect;
  kind: MagicAbilityKind;
}

const MAGIC_FEATURE_RE = /aura|conjur|hechiz|lanzamiento|lanza|detectar el mal|expulsar muertos|imposici[oó]n de manos|sana una enfermedad|forma animal|encantamiento/i;

export function magicAbilityKind(effect: Effect): MagicAbilityKind {
  return /\baura\b/i.test(effect.name) || /\baura\b/i.test(effect.kind) ? "aura" : "power";
}

export function isAutomaticMagicAbility(effect: Effect): boolean {
  if (!AUTO_EFFECT_KINDS.includes(effect.kind)) return false;
  return MAGIC_FEATURE_RE.test(`${effect.name} ${effect.notes}`);
}

export function automaticMagicAbilities(effects: readonly Effect[]): MagicAbility[] {
  return effects
    .filter(isAutomaticMagicAbility)
    .map(effect => ({ effect, kind: magicAbilityKind(effect) }));
}
