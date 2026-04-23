// Persistence layer. v3 shape = multi-character app state.
// Primary storage is IndexedDB. If IndexedDB is unavailable, localStorage
// remains the fallback for the current version only.

import type { AppState } from "../rules/types";

const DB_NAME = "marca-del-este";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const STATE_RECORD_ID = "app-state";

export const STORAGE_KEY = "marca-del-este.v3";

export function emptyState(): AppState {
  return { version: 3, activeCharacterId: null, characters: [] };
}

export async function loadState(): Promise<AppState> {
  const db = await openAppDb();
  if (!db) return loadLocalState();

  try {
    const stored = await idbGet<AppState>(db, STATE_RECORD_ID);
    if (stored?.version === 3) return sanitize(stored);
    return emptyState();
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
      return emptyState();
    }
  }

  return emptyState();
}

function saveLocalState(state: AppState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
