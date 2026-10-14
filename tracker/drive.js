/**
 * drive.js — Sync opcional com Google Drive (mesmo esquema da biblioteca)
 *
 * - Auth: Google Identity Services (token client, escopo drive.file).
 *   O access token fica só em memória — nunca vai pro IndexedDB, pro
 *   arquivo de sync nem pra logs.
 * - Arquivo: "Tracking Your Challenge/tracker-<permissionId>.json" no
 *   Drive do usuário. Conteúdo: { version, savedAt, content, states,
 *   keyUpdatedAt } — merge campo a campo por timestamp (LWW por chave),
 *   o mesmo modelo do updated_at do antigo server.py.
 * - Config: tracker/config.js (gitignored) define
 *   window.TRACKER_CONFIG = { googleClientId: '...' }. Sem config, o
 *   botão de conectar explica como criar — o app funciona 100% offline.
 */
const TrackerDrive = (() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const FOLDER_NAME = 'Tracking Your Challenge';
  const META_CONNECTED = 'driveConnected';
  const META_FILE_ID = 'driveFileId';
  const META_USER = 'driveUser';
  const META_STAMPS = 'keyUpdatedAt';
  const PUSH_DEBOUNCE_MS = 2500;

  let token = null;
  let tokenClient = null;
  let user = null;            // { name, email } — só para exibição
  let fileId = null;
  let pushTimer = null;
  let pushing = false;
  let statusCb = null;

  const nowIso = () => new Date().toISOString();

  function onStatus(cb) { statusCb = cb; }
  function emit() { if (statusCb) statusCb(status()); }
  function status() {
    return { connected: !!(token && user), user: user && user.name };
  }
  function isConnected() { return !!token; }

  // ─── Config (config.js é gitignored — carregado sob demanda) ───
  async function loadConfig() {
    if (window.TRACKER_CONFIG && window.TRACKER_CONFIG.googleClientId) {
      return window.TRACKER_CONFIG.googleClientId;
    }
    try {
      await import('./config.js');
    } catch (e) { /* arquivo ausente */ }
    const id = window.TRACKER_CONFIG && window.TRACKER_CONFIG.googleClientId;
    if (!id) throw new Error('config.js ausente ou sem googleClientId');
    return id;
  }

  function gisReady() {
    return !!(window.google && window.google.accounts && window.google.accounts.oauth2);
  }

  function requestToken(clientId, prompt) {
    return new Promise((resolve, reject) => {
      if (!gisReady()) { reject(new Error('Google Identity Services não carregou')); return; }
      if (!tokenClient) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPE,
          callback: () => {},
        });
      }
      tokenClient.callback = (resp) => {
        if (resp && resp.access_token) resolve(resp.access_token);
        else reject(new Error((resp && resp.error) || 'sem token'));
      };
      tokenClient.error_callback = (e) => reject(new Error(e && e.type || 'auth cancelada'));
      tokenClient.requestAccessToken({ prompt });
    });
  }

  async function api(path, opts, retry) {
    const res = await fetch('https://www.googleapis.com' + path, {
      ...opts,
      headers: { Authorization: 'Bearer ' + token, ...(opts && opts.headers) },
    });
    if (res.status === 401 && retry !== false) {
      // Token expirado (~1h): tenta renovar silenciosamente uma vez
      const clientId = await loadConfig();
      token = await requestToken(clientId, '');
      return api(path, opts, false);
    }
    if (!res.ok) throw new Error('Drive ' + res.status);
    if (res.status === 204) return null;
    const ct = res.headers.get('Content-Type') || '';
    return ct.includes('json') ? res.json() : res.text();
  }

  async function fetchUser() {
    const about = await api('/drive/v3/about?fields=user');
    return about.user || {};
  }

  async function ensureFile(userPermissionId) {
    const esc = (s) => s.replace(/'/g, "\\'");
    const folderQ = `name='${esc(FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const folders = await api('/drive/v3/files?q=' + encodeURIComponent(folderQ) + '&fields=files(id)');
    let folderId = folders.files && folders.files[0] && folders.files[0].id;
    if (!folderId) {
      const created = await api('/drive/v3/files?fields=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
      });
      folderId = created.id;
    }

    const fileName = `tracker-${userPermissionId || 'user'}.json`;
    const fileQ = `name='${esc(fileName)}' and '${folderId}' in parents and trashed=false`;
    const files = await api('/drive/v3/files?q=' + encodeURIComponent(fileQ) + '&fields=files(id,modifiedTime)');
    if (files.files && files.files[0]) return files.files[0].id;

    // Cria o arquivo já com conteúdo (multipart)
    const boundary = 'tracker-sync-' + Date.now();
    const meta = { name: fileName, parents: [folderId] };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(meta) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      JSON.stringify(emptySnapshot()) +
      `\r\n--${boundary}--`;
    const created = await api('/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    return created.id;
  }

  function emptySnapshot() {
    return { version: 1, savedAt: null, content: null, states: {}, keyUpdatedAt: {} };
  }

  async function download() {
    const txt = await api(`/drive/v3/files/${fileId}?alt=media`);
    if (typeof txt === 'object' && txt !== null) return txt;
    try { return JSON.parse(txt); } catch (e) { return emptySnapshot(); }
  }

  async function upload(snapshot) {
    snapshot.savedAt = nowIso();
    await api(`/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
  }

  // ─── Merge por chave (LWW com timestamp) ───
  async function getStamps() {
    return (await TrackerDB.metaGet(META_STAMPS)) || {};
  }
  async function setStamps(stamps) {
    await TrackerDB.metaSet(META_STAMPS, stamps);
  }

  /** Chamado a cada save local: carimba a chave e agenda push. */
  async function onLocalChange(key) {
    const stamps = await getStamps();
    stamps[key] = nowIso();
    await setStamps(stamps);
    schedulePush();
  }

  /**
   * Baixa o remoto, funde por timestamp com o local e devolve o
   * snapshot fundido {content, states} para o app aplicar em memória.
   * Retorna null se nada remoto existir.
   */
  async function pullMerge() {
    if (!fileId) return null;
    let remote;
    try { remote = await download(); } catch (e) { return null; }
    if (!remote || typeof remote !== 'object') return null;

    const local = await TrackerDB.getAll();
    const localStamps = await getStamps();
    const remoteStamps = remote.keyUpdatedAt || {};
    const merged = { content: local.content, states: { ...local.states } };
    const mergedStamps = { ...localStamps };

    const adopt = (key, value, stamp) => {
      const l = localStamps[key] || '';
      const r = stamp || remote.savedAt || '';
      if (r && r > l) {
        if (key === 'content') merged.content = value;
        else merged.states[key] = value;
        mergedStamps[key] = r;
      }
    };

    if (remote.content !== undefined) adopt('content', remote.content, remoteStamps.content);
    for (const k of Object.keys(remote.states || {})) {
      adopt(k, remote.states[k], remoteStamps[k]);
    }

    // Persiste o resultado fundido localmente
    await TrackerDB.putKV('content', merged.content);
    for (const k of Object.keys(merged.states)) {
      await TrackerDB.putKV(k, merged.states[k]);
    }
    await setStamps(mergedStamps);
    return { content: merged.content, states: merged.states };
  }

  /** Sobe o estado local fundido (união já aplicada no IDB). */
  async function push() {
    if (!token || !fileId) return;
    const local = await TrackerDB.getAll();
    const stamps = await getStamps();
    await upload({
      version: 1,
      savedAt: null, // upload() carimba
      content: local.content,
      states: local.states,
      keyUpdatedAt: stamps,
    });
  }

  function schedulePush() {
    if (!token || !fileId) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      if (pushing) { schedulePush(); return; }
      pushing = true;
      try { await push(); } catch (e) { console.warn('Drive push falhou', e); }
      finally { pushing = false; }
    }, PUSH_DEBOUNCE_MS);
  }

  // ─── Ciclo de vida ───

  /** Boot: se estava conectado, renova token em silêncio e faz pull. */
  async function boot() {
    const was = await TrackerDB.metaGet(META_CONNECTED);
    if (!was) return null;
    fileId = await TrackerDB.metaGet(META_FILE_ID);
    user = await TrackerDB.metaGet(META_USER);
    try {
      const clientId = await loadConfig();
      token = await requestToken(clientId, '');
    } catch (e) {
      emit();
      return null; // precisa clicar em conectar de novo
    }
    emit();
    const merged = await pullMerge();
    schedulePush();
    return merged;
  }

  /** Clique no botão: primeiro login (popup) + pull-merge + push. */
  async function connect() {
    const clientId = await loadConfig();
    token = await requestToken(clientId, 'consent');
    const u = await fetchUser();
    user = { name: u.displayName || u.emailAddress || 'Google' };
    fileId = await ensureFile(u.permissionId);
    await TrackerDB.metaSet(META_CONNECTED, true);
    await TrackerDB.metaSet(META_FILE_ID, fileId);
    await TrackerDB.metaSet(META_USER, user);
    emit();
    const merged = await pullMerge();
    await push(); // sobe chaves locais mais novas
    return { merged, user: user.name };
  }

  async function disconnect() {
    try {
      if (token) window.google.accounts.oauth2.revoke(token, () => {});
    } catch (e) {}
    token = null; user = null; fileId = null;
    await TrackerDB.metaSet(META_CONNECTED, false);
    emit();
  }

  return { boot, connect, disconnect, onLocalChange, pullMerge, onStatus, status, isConnected };
})();
