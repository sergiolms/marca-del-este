// Global reactive store via @preact/signals.
// Single atom for AppState; derived signals via `computed`.

import { signal, computed, effect } from "@preact/signals";
import type { AppState, Character } from "../rules/types";
import { emptyState, loadState, saveState } from "./persistence";
import { uid } from "./character";

export const appState = signal<AppState>(emptyState());

export const activeCharacter = computed<Character | null>(() => {
  const s = appState.value;
  if (!s.activeCharacterId) return null;
  return s.characters.find(c => c.id === s.activeCharacterId) ?? null;
});

export async function loadFromStorage(): Promise<void> {
  appState.value = await loadState();
}

let saveQueue = Promise.resolve();

export function persist(): void {
  const snapshot = appState.value;
  saveQueue = saveQueue
    .then(() => saveState(snapshot))
    .catch(() => undefined);
}

let persistScheduled = false;
export function startAutoPersist(): () => void {
  return effect(() => {
    // subscribe to appState
    const _ = appState.value;
    void _;
    if (persistScheduled) return;
    persistScheduled = true;
    queueMicrotask(() => {
      persistScheduled = false;
      persist();
    });
  });
}

// --- Mutations -------------------------------------------------------------

export function updateActive(mutator: (c: Character) => Character): void {
  const s = appState.value;
  const idx = s.characters.findIndex(c => c.id === s.activeCharacterId);
  if (idx < 0) return;
  const next = { ...mutator(s.characters[idx]), updatedAt: new Date().toISOString() };
  const list = s.characters.slice();
  list[idx] = next;
  appState.value = { ...s, characters: list };
}

export function addCharacter(c: Character): void {
  const list = appState.value.characters.slice();
  list.push(c);
  appState.value = { ...appState.value, characters: list, activeCharacterId: c.id };
}

export function removeCharacter(id: string): void {
  const list = appState.value.characters.filter(c => c.id !== id);
  const active = list[0]?.id ?? null;
  appState.value = { version: 3, characters: list, activeCharacterId: active };
}

export function switchCharacter(id: string): void {
  if (!appState.value.characters.some(c => c.id === id)) return;
  appState.value = { ...appState.value, activeCharacterId: id };
}

export function exportActiveJson(): string | null {
  const c = activeCharacter.value;
  if (!c) return null;
  return JSON.stringify(c, null, 2);
}

export function importCharacterJson(raw: string): Character {
  const parsed = JSON.parse(raw) as Character;
  const withId = { ...parsed, id: parsed.id || uid(), updatedAt: new Date().toISOString() };
  addCharacter(withId);
  return withId;
}
