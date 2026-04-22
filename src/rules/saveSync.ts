// Keep a character's saving throws in sync with the published class/level table.
// Intentionally non-destructive: syncs only when the user opts in (via the
// "Aplicar tabla" button). Also available as a derive lookup for the Sheet UI.

import type { Character } from "./types";
import { savesFor } from "./classLookup";

export function applyClassSaves(c: Character): Character {
  const rec = savesFor(c.character.classKey, c.character.level);
  if (!rec) return c;
  return { ...c, saves: { ...rec }, updatedAt: new Date().toISOString() };
}
