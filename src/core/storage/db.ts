/**
 * db.ts — Persistência local-first do Tracker (IndexedDB).
 *
 * Mesmo shape do antigo GET /api/data: { content, states: { key: state } }.
 * Store `meta` guarda timestamps por chave (merge com Drive — drive.ts)
 * e dados de conexão (fileId, usuário, flag de conectado).
 *
 * Boot (useTracker): IndexedDB → server.py (se rodando) → localStorage.
 */
import type { TrackerContent, TrackerSnapshot, TrackerState } from '../models/tracker';

const DB_NAME = 'tracker-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB falhou'));
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('tx abortada'));
  });
}

async function getAllRaw(): Promise<Record<string, unknown>> {
  const db = await open();
  const t = db.transaction('kv', 'readonly');
  const s = t.objectStore('kv');
  const keys = await reqToPromise(s.getAllKeys());
  const vals = await reqToPromise(s.getAll());
  const out: Record<string, unknown> = {};
  keys.forEach((k, i) => { out[String(k)] = vals[i]; });
  return out;
}

/** Mesmo formato que GET /api/data retornava. */
export async function getAll(): Promise<TrackerSnapshot> {
  const raw = await getAllRaw();
  const data: TrackerSnapshot = { content: null, states: {} };
  for (const k of Object.keys(raw)) {
    if (k === 'content') data.content = raw[k] as TrackerContent;
    else data.states[k] = raw[k] as TrackerState;
  }
  return data;
}

export interface PatchPayload {
  content?: TrackerContent | null;
  state?: { key: string; value: TrackerState };
}

/** Mesmo formato que PUT /api/data aceitava. */
export async function patch(payload: PatchPayload): Promise<void> {
  const db = await open();
  const t = db.transaction('kv', 'readwrite');
  const s = t.objectStore('kv');
  if (payload && 'content' in payload) s.put(payload.content, 'content');
  if (payload.state && payload.state.key) s.put(payload.state.value, payload.state.key);
  await txDone(t);
}

export async function putKV(key: string, value: unknown): Promise<void> {
  const db = await open();
  const t = db.transaction('kv', 'readwrite');
  t.objectStore('kv').put(value, key);
  await txDone(t);
}

export async function metaGet<T>(key: string): Promise<T | undefined> {
  const db = await open();
  const t = db.transaction('meta', 'readonly');
  return reqToPromise<T | undefined>(t.objectStore('meta').get(key) as IDBRequest<T | undefined>);
}

export async function metaSet(key: string, value: unknown): Promise<void> {
  const db = await open();
  const t = db.transaction('meta', 'readwrite');
  t.objectStore('meta').put(value, key);
  await txDone(t);
}

/** Semeia o IDB com um snapshot (só chaves ausentes — não sobrescreve). */
export async function seed(snapshot: TrackerSnapshot | null): Promise<boolean> {
  if (!snapshot) return false;
  const db = await open();
  const existing = await getAllRaw();
  const writes: [string, unknown][] = [];
  if (snapshot.content != null && !('content' in existing)) {
    writes.push(['content', snapshot.content]);
  }
  for (const k of Object.keys(snapshot.states || {})) {
    if (!(k in existing)) writes.push([k, snapshot.states[k]]);
  }
  if (!writes.length) return false;
  const t = db.transaction('kv', 'readwrite');
  const s = t.objectStore('kv');
  writes.forEach(([k, v]) => s.put(v, k));
  await txDone(t);
  return true;
}

export const TrackerDB = { getAll, patch, putKV, metaGet, metaSet, seed, getAllRaw };
