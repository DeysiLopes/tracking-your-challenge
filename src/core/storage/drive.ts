/**
 * drive.ts — Sync opcional com Google Drive (mesmo esquema da biblioteca).
 *
 * - Auth: Google Identity Services (token client, escopo drive.file).
 *   O access token fica só em memória — nunca vai pro IndexedDB, pro
 *   arquivo de sync nem pra logs.
 * - Arquivo: "Tracking Your Challenge/tracker-<permissionId>.json" no
 *   Drive do usuário: { version, savedAt, content, states, keyUpdatedAt }.
 *   Merge campo a campo por timestamp (LWW por chave) — o mesmo modelo
 *   do updated_at do antigo server.py.
 * - Config: `VITE_GOOGLE_CLIENT_ID` no build (secret do CI / .env local).
 *   Sem ele, o botão "☁️ Drive" explica e o app segue 100% offline.
 */
import { TrackerDB } from './db';
import type { TrackerContent, TrackerSnapshot, TrackerState } from '../models/tracker';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Tracking Your Challenge';
const META_CONNECTED = 'driveConnected';
const META_FILE_ID = 'driveFileId';
const META_USER = 'driveUser';
const META_STAMPS = 'keyUpdatedAt';
const PUSH_DEBOUNCE_MS = 2500;

interface DriveUser { name: string }
interface DriveStatus { connected: boolean; user?: string }
type StatusCb = (s: DriveStatus) => void;

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(cfg: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }): {
            callback: (resp: { access_token?: string; error?: string }) => void;
            error_callback?: (e: { type?: string }) => void;
            requestAccessToken(opts: { prompt: string }): void;
          };
          revoke(token: string, cb: () => void): void;
        };
      };
    };
  }
}

interface RemoteSnapshot {
  version: number;
  savedAt: string | null;
  content: TrackerContent | null;
  states: Record<string, TrackerState>;
  keyUpdatedAt: Record<string, string>;
}

let token: string | null = null;
let tokenClient: ReturnType<NonNullable<Window['google']>['accounts']['oauth2']['initTokenClient']> | null = null;
let user: DriveUser | null = null;
let fileId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let statusCb: StatusCb | null = null;

const nowIso = () => new Date().toISOString();

function emit() { if (statusCb) statusCb(status()); }
export function onStatus(cb: StatusCb) { statusCb = cb; }
export function status(): DriveStatus {
  return { connected: !!(token && user), user: user?.name };
}
export const isConnected = () => !!token;

function clientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!id) throw new Error('VITE_GOOGLE_CLIENT_ID não configurado neste build');
  return id;
}

function gisReady() {
  return !!(window.google && window.google.accounts && window.google.accounts.oauth2);
}

function requestToken(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!gisReady()) { reject(new Error('Google Identity Services não carregou')); return; }
    if (!tokenClient) {
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId(),
        scope: SCOPE,
        callback: () => {},
      });
    }
    tokenClient.callback = (resp) => {
      if (resp && resp.access_token) resolve(resp.access_token);
      else reject(new Error((resp && resp.error) || 'sem token'));
    };
    tokenClient.error_callback = (e) => reject(new Error((e && e.type) || 'auth cancelada'));
    tokenClient.requestAccessToken({ prompt });
  });
}

async function api<T = unknown>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch('https://www.googleapis.com' + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
  });
  if (res.status === 401 && retry) {
    // Token expirado (~1h): renova silenciosamente uma vez
    token = await requestToken('');
    return api<T>(path, opts, false);
  }
  if (!res.ok) throw new Error('Drive ' + res.status);
  if (res.status === 204) return null as T;
  const ct = res.headers.get('Content-Type') || '';
  return (ct.includes('json') ? res.json() : res.text()) as Promise<T>;
}

interface DriveFile { id: string; modifiedTime?: string }

async function fetchUser(): Promise<DriveUser & { permissionId?: string }> {
  const about = await api<{ user?: { displayName?: string; emailAddress?: string; permissionId?: string } }>(
    '/drive/v3/about?fields=user'
  );
  const u = about.user || {};
  return { name: u.displayName || u.emailAddress || 'Google', permissionId: u.permissionId };
}

const esc = (s: string) => s.replace(/'/g, "\\'");

async function ensureFile(permissionId?: string): Promise<string> {
  const folderQ = `name='${esc(FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const folders = await api<{ files?: DriveFile[] }>(
    '/drive/v3/files?q=' + encodeURIComponent(folderQ) + '&fields=files(id)'
  );
  let folderId = folders.files?.[0]?.id;
  if (!folderId) {
    const created = await api<DriveFile>('/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    });
    folderId = created.id;
  }

  const fileName = `tracker-${permissionId || 'user'}.json`;
  const fileQ = `name='${esc(fileName)}' and '${folderId}' in parents and trashed=false`;
  const files = await api<{ files?: DriveFile[] }>(
    '/drive/v3/files?q=' + encodeURIComponent(fileQ) + '&fields=files(id,modifiedTime)'
  );
  if (files.files && files.files[0]) return files.files[0].id;

  const boundary = 'tracker-sync-' + Date.now();
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: fileName, parents: [folderId] }) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify(emptySnapshot()) +
    `\r\n--${boundary}--`;
  const created = await api<DriveFile>('/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return created.id;
}

const emptySnapshot = (): RemoteSnapshot => ({
  version: 1, savedAt: null, content: null, states: {}, keyUpdatedAt: {},
});

async function download(): Promise<RemoteSnapshot> {
  const data = await api<RemoteSnapshot | string>(`/drive/v3/files/${fileId}?alt=media`);
  if (typeof data === 'object' && data !== null) return data;
  try { return JSON.parse(data); } catch { return emptySnapshot(); }
}

async function upload(snapshot: RemoteSnapshot): Promise<void> {
  snapshot.savedAt = nowIso();
  await api(`/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
}

// ─── Merge por chave (LWW com timestamp) ───
const getStamps = async () => (await TrackerDB.metaGet<Record<string, string>>(META_STAMPS)) || {};
const setStamps = (s: Record<string, string>) => TrackerDB.metaSet(META_STAMPS, s);

/** Chamado a cada save local: carimba a chave e agenda push. */
export async function onLocalChange(key: string): Promise<void> {
  const stamps = await getStamps();
  stamps[key] = nowIso();
  await setStamps(stamps);
  schedulePush();
}

/**
 * Baixa o remoto, funde por timestamp com o local e devolve o snapshot
 * fundido para o app aplicar em memória. null se não houver remoto.
 */
export async function pullMerge(): Promise<TrackerSnapshot | null> {
  if (!fileId) return null;
  let remote: RemoteSnapshot;
  try { remote = await download(); } catch { return null; }
  if (!remote || typeof remote !== 'object') return null;

  const local = await TrackerDB.getAll();
  const localStamps = await getStamps();
  const remoteStamps = remote.keyUpdatedAt || {};
  const merged: TrackerSnapshot = { content: local.content, states: { ...local.states } };
  const mergedStamps = { ...localStamps };

  const adopt = (key: string, value: TrackerContent | TrackerState | null, stamp?: string) => {
    const l = localStamps[key] || '';
    const r = stamp || remote.savedAt || '';
    if (r && r > l) {
      if (key === 'content') merged.content = value as TrackerContent;
      else merged.states[key] = value as TrackerState;
      mergedStamps[key] = r;
    }
  };

  if (remote.content !== undefined) adopt('content', remote.content, remoteStamps.content);
  for (const k of Object.keys(remote.states || {})) {
    adopt(k, remote.states[k], remoteStamps[k]);
  }

  await TrackerDB.putKV('content', merged.content);
  for (const k of Object.keys(merged.states)) {
    await TrackerDB.putKV(k, merged.states[k]);
  }
  await setStamps(mergedStamps);
  return merged;
}

async function push(): Promise<void> {
  if (!token || !fileId) return;
  const local = await TrackerDB.getAll();
  const stamps = await getStamps();
  await upload({
    version: 1,
    savedAt: null,
    content: local.content,
    states: local.states,
    keyUpdatedAt: stamps,
  });
}

export function schedulePush(): void {
  if (!token || !fileId) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    if (pushing) { schedulePush(); return; }
    pushing = true;
    try { await push(); } catch (e) { console.warn('Drive push falhou', e); }
    finally { pushing = false; }
  }, PUSH_DEBOUNCE_MS);
}

// ─── Ciclo de vida ───

/** Boot: se estava conectado, renova token em silêncio e faz pull-merge. */
export async function boot(): Promise<TrackerSnapshot | null> {
  const was = await TrackerDB.metaGet<boolean>(META_CONNECTED);
  if (!was) return null;
  fileId = (await TrackerDB.metaGet<string>(META_FILE_ID)) || null;
  user = (await TrackerDB.metaGet<DriveUser>(META_USER)) || null;
  try {
    token = await requestToken('');
  } catch {
    emit();
    return null;
  }
  emit();
  const merged = await pullMerge();
  schedulePush();
  return merged;
}

/** Clique no botão: primeiro login (popup) + pull-merge + push. */
export async function connect(): Promise<{ merged: TrackerSnapshot | null; user: string }> {
  token = await requestToken('consent');
  const u = await fetchUser();
  user = { name: u.name };
  fileId = await ensureFile(u.permissionId);
  await TrackerDB.metaSet(META_CONNECTED, true);
  await TrackerDB.metaSet(META_FILE_ID, fileId);
  await TrackerDB.metaSet(META_USER, user);
  emit();
  const merged = await pullMerge();
  await push();
  return { merged, user: user.name };
}

export async function disconnect(): Promise<void> {
  try {
    if (token) window.google?.accounts.oauth2.revoke(token, () => {});
  } catch { /* ignore */ }
  token = null; user = null; fileId = null;
  await TrackerDB.metaSet(META_CONNECTED, false);
  emit();
}

export const TrackerDrive = {
  boot, connect, disconnect, onLocalChange, pullMerge, onStatus, status, isConnected, schedulePush,
};
