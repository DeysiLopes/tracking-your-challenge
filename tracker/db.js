/**
 * db.js — Persistência local-first do Tracker (IndexedDB)
 *
 * Substitui a API REST do server.py como fonte principal. Mantém o
 * mesmo shape { content, states: { <key>: <estado> } } para o app.js
 * continuar identico, e guarda timestamps por chave na store `meta`
 * (usados no merge com o Google Drive — ver drive.js).
 *
 * Ordem de fontes no boot (app.js):
 *   1. IndexedDB (se já semeado)
 *   2. server.py /api/data (se rodando — semeia o IDB na 1ª vez)
 *   3. localStorage (espelho legado — semeia o IDB na 1ª vez)
 */
const TrackerDB = (() => {
  const DB_NAME = 'tracker-db';
  const DB_VERSION = 1;

  let dbPromise = null;

  function open() {
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

  function tx(db, store, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => resolve(out && out.__result !== undefined ? out.__result : out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('tx abortada'));
    });
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Retorna todas as entradas da store kv: { 'content'|key: value } */
  async function getAllRaw() {
    const db = await open();
    const t = db.transaction('kv', 'readonly');
    const s = t.objectStore('kv');
    const keys = await reqToPromise(s.getAllKeys());
    const vals = await reqToPromise(s.getAll());
    const out = {};
    keys.forEach((k, i) => { out[k] = vals[i]; });
    return out;
  }

  /** Mesmo formato que GET /api/data retornava. */
  async function getAll() {
    const raw = await getAllRaw();
    const data = { content: null, states: {} };
    for (const k of Object.keys(raw)) {
      if (k === 'content') data.content = raw[k];
      else data.states[k] = raw[k];
    }
    return data;
  }

  /** Mesmo formato que PUT /api/data aceitava: { content? , state?: {key, value} } */
  async function patch(payload) {
    const db = await open();
    await tx(db, 'kv', 'readwrite', (s) => {
      if (payload && 'content' in payload) s.put(payload.content, 'content');
      const st = payload && payload.state;
      if (st && st.key) s.put(st.value, st.key);
    });
  }

  async function putKV(key, value) {
    const db = await open();
    await tx(db, 'kv', 'readwrite', (s) => { s.put(value, key); });
  }

  async function metaGet(key) {
    const db = await open();
    const t = db.transaction('meta', 'readonly');
    return reqToPromise(t.objectStore('meta').get(key));
  }

  async function metaSet(key, value) {
    const db = await open();
    await tx(db, 'meta', 'readwrite', (s) => { s.put(value, key); });
  }

  /** Semeia o IDB a partir de um snapshot {content, states} (só chaves ausentes). */
  async function seed(snapshot) {
    if (!snapshot) return false;
    const db = await open();
    const existing = await getAllRaw();
    const writes = [];
    if (snapshot.content != null && !('content' in existing)) {
      writes.push(['content', snapshot.content]);
    }
    const states = snapshot.states || {};
    for (const k of Object.keys(states)) {
      if (!(k in existing)) writes.push([k, states[k]]);
    }
    if (!writes.length) return false;
    await tx(db, 'kv', 'readwrite', (s) => { writes.forEach(([k, v]) => s.put(v, k)); });
    return true;
  }

  return { getAll, patch, putKV, metaGet, metaSet, seed, getAllRaw };
})();
