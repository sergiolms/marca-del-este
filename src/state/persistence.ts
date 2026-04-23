// Persistence layer. v3 shape = multi-character app state.
// Primary storage is IndexedDB. On first load without IndexedDB data, we run a
// one-time migration from the legacy localStorage keys and store the result in
// IndexedDB. If IndexedDB is unavailable, localStorage remains the fallback.

import type { AppState, Character } from "../rules/types";
import { newCharacter } from "./character";

const DB_NAME = "marca-del-este";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const STATE_RECORD_ID = "app-state";

export const STORAGE_KEY = "marca-del-este.v3";
export const LEGACY_V2_KEY = "marca-del-este.character.v2";
export const LEGACY_V1_KEY = "marca-del-este.character.v1";

export function emptyState(): AppState {
  return { version: 3, activeCharacterId: null, characters: [] };
}

export async function loadState(): Promise<AppState> {
  const db = await openAppDb();
  if (!db) return loadLocalState();

  try {
    const stored = await idbGet<AppState>(db, STATE_RECORD_ID);
    if (stored?.version === 3) return sanitize(stored);

    const migrated = loadLocalState();
    if (hasStateData(migrated)) await idbPut(db, STATE_RECORD_ID, migrated);
    return migrated;
  } catch {
    return loadLocalState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  const db = await openAppDb();
  if (!db) {
    saveLocalState(state);
    return;
  }

  try {
    await idbPut(db, STATE_RECORD_ID, sanitize(state));
  } catch {
    saveLocalState(state);
  }
}

function loadLocalState(): AppState {
  if (typeof localStorage === "undefined") return emptyState();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 3) return sanitize(parsed);
    } catch {
      /* fall through to migration */
    }
  }

  // Try to migrate v2 single-character
  const legacyV2 = localStorage.getItem(LEGACY_V2_KEY);
  if (legacyV2) {
    try {
      const v2 = JSON.parse(legacyV2) as Partial<Character>;
      const char = mergeIntoNewCharacter(v2);
      return { version: 3, activeCharacterId: char.id, characters: [char] };
    } catch {
      /* ignore */
    }
  }

  const legacyV1 = localStorage.getItem(LEGACY_V1_KEY);
  if (legacyV1) {
    try {
      const v1 = JSON.parse(legacyV1) as Partial<Character>;
      const char = mergeIntoNewCharacter(v1);
      return { version: 3, activeCharacterId: char.id, characters: [char] };
    } catch {
      /* ignore */
    }
  }

  return emptyState();
}

function saveLocalState(state: AppState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hasStateData(state: AppState): boolean {
  return state.characters.length > 0;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openAppDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  dbPromise ??= new Promise(resolve => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

function idbPut<T>(db: IDBDatabase, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function sanitize(s: AppState): AppState {
  const chars = (s.characters ?? []).map(c => ({ ...c }));
  const active = s.activeCharacterId && chars.some(c => c.id === s.activeCharacterId)
    ? s.activeCharacterId
    : chars[0]?.id ?? null;
  return { version: 3, activeCharacterId: active, characters: chars };
}

function mergeIntoNewCharacter(partial: Partial<Character>): Character {
  const base = newCharacter();
  return {
    ...base,
    ...partial,
    id: base.id,
    character: { ...base.character, ...(partial.character ?? {}) },
    stats: { ...base.stats, ...(partial.stats ?? {}) },
    saves: { ...base.saves, ...(partial.saves ?? {}) },
    combat: { ...base.combat, ...(partial.combat ?? {}), attacks: partial.combat?.attacks ?? [], timeline: partial.combat?.timeline ?? [] },
    money: { ...base.money, ...(partial.money ?? {}) },
    inventory: { ...base.inventory, ...(partial.inventory ?? {}), items: partial.inventory?.items ?? [] },
    spells: partial.spells ?? [],
    effects: partial.effects ?? [],
    magicItems: partial.magicItems ?? [],
    xp: { ...base.xp, ...(partial.xp ?? {}) },
    journal: { ...base.journal, ...(partial.journal ?? {}), sessions: partial.journal?.sessions ?? [] },
  };
}
