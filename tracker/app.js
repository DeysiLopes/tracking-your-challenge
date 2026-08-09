/**
 * app.js — Lógica principal do Tracker 90 Dias na Gringa
 */

// ════════════════════════════════════════════════════════
//  STATE + PERSISTÊNCIA
//  Fonte principal: API REST do servidor (SQLite via server.py),
//  com espelho em localStorage como fallback (file:// e offline).
// ════════════════════════════════════════════════════════
const STATE_KEY_BASE = '90dias-tracker-state';
const CONTENT_KEY = '90dias-tracker-content';

let state = {
  startDate: null,
  tasks: {},
  deliverables: {},
  notes: {},
  challenges: {},   // { challengeId: { done: bool, attempts: [{date, text}], tasks: {taskKey: bool} } }
  activePlanId: null,
  activityDates: [], // ['YYYY-MM-DD', ...] dias com atividade (plano ou desafios) → streak
  badges: [],        // [badgeId, ...] conquistas desbloqueadas
  challengeBadges: [], // [{ challengeId, num, title, xp, date, skin }] badge de gato por desafio concluído
};

// Cache do servidor: { content: <objeto importado|null>, states: { <key>: <estado> } }
let serverData = { content: null, states: {} };

async function apiFetch(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error('api ' + res.status);
  return res.json();
}

async function loadAllFromServer() {
  try {
    serverData = await apiFetch('/api/data');
    serverData.states = serverData.states || {};
  } catch (e) {
    console.warn('Servidor indisponível; usando localStorage', e);
  }
}

function persistToServer(payload) {
  fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(e => console.warn('Falha ao salvar no servidor', e));
}

function parseStateRaw(raw) {
  if (raw == null) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function getStateKey() {
  return STATE_KEY_BASE + (ACTIVE_PLAN && ACTIVE_PLAN.id ? '-' + ACTIVE_PLAN.id : '');
}

async function loadState() {
  try {
    const key = getStateKey();
    const srv = serverData.states && serverData.states[key];
    const raw = srv != null ? srv : localStorage.getItem(key);
    const parsed = parseStateRaw(raw);
    if (parsed) state = { ...state, ...parsed };
  } catch(e) { console.warn('Failed to load state', e); }
}
function saveState() {
  const key = getStateKey();
  serverData.states[key] = state;
  try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
  persistToServer({ state: { key, value: state } });
}

function resetProgress() {
  state.tasks = {};
  state.deliverables = {};
  state.notes = {};
  state.challenges = {};
  saveState();
}

// ────────────────────────────────────────────────────────────
//  CONTEÚDO IMPORTADO (persistido — o tracker começa vazio e
//  só mostra conteúdo depois do primeiro upload)
// ────────────────────────────────────────────────────────────
function hasPlanContent() { return !!(ACTIVE_PLAN && ACTIVE_PLAN.id); }
function hasChallengesContent() { return !!(CHALLENGES_DATA && CHALLENGES_DATA.levels && CHALLENGES_DATA.levels.length); }
function hasContent() { return hasPlanContent() || hasChallengesContent(); }

function saveContent() {
  const content = {
    plan: hasPlanContent() ? ACTIVE_PLAN : null,
    planSource: hasPlanContent() ? ACTIVE_PLAN.source : null,
    challenges: hasChallengesContent() ? CHALLENGES_DATA : null,
    challengesSource: hasChallengesContent() ? (CHALLENGES_DATA.source || null) : null
  };
  serverData.content = content;
  try { localStorage.setItem(CONTENT_KEY, JSON.stringify(content)); } catch (e) {}
  persistToServer({ content });
}
async function restoreContent() {
  try {
    let c = serverData.content;
    if (!c) {
      const raw = localStorage.getItem(CONTENT_KEY);
      if (raw) c = JSON.parse(raw);
    }
    if (!c) return;
    if (c.plan && c.plan.id && Array.isArray(c.plan.phases)) setActivePlan(c.plan);
    if (c.challenges && Array.isArray(c.challenges.levels)) setChallengesData(c.challenges);
  } catch (e) {
    console.warn('Falha ao restaurar conteúdo importado', e);
  }
}

// Todos os desafios atuais marcados como concluídos
function challengesFinalized() {
  const all = CHALLENGES_DATA.allChallenges || [];
  return all.length > 0 && all.every(c => getChallengeState(c.id).done);
}

function emptyNotice(title, desc) {
  return `<div class="empty-state"><div class="empty-icon">📂</div>
    <h3>${title}</h3><p>${desc}</p></div>`;
}

// ════════════════════════════════════════════════════════
//  DATE UTILS
// ════════════════════════════════════════════════════════
function getCurrentDay() {
  if (!state.startDate) return null;
  const start = new Date(state.startDate + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.max(1, Math.min(ACTIVE_PLAN.totalDays, Math.floor((now - start) / 86400000) + 1));
}
function getCurrentWeek() {
  const day = getCurrentDay();
  if (!day) return null;
  return Math.min(ACTIVE_PLAN.allWeeks.length, Math.ceil(day / 7));
}
function formatDate(s) {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

// ════════════════════════════════════════════════════════
//  PROGRESS — PLAN
// ════════════════════════════════════════════════════════
function getWeekProgress(week) {
  const all = [...week.tasks.map(t => t.id), week.deliverable.id];
  const done = all.filter(id => state.tasks[id] || state.deliverables[id]).length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
}
function getPhaseProgress(phase) {
  const wp = phase.weeks.map(getWeekProgress);
  const total = wp.reduce((s, w) => s + w.total, 0);
  const done  = wp.reduce((s, w) => s + w.done, 0);
  return Math.round((done / total) * 100);
}
function getTotalProgress() {
  const all = ACTIVE_PLAN.allWeeks.map(getWeekProgress);
  const total = all.reduce((s, w) => s + w.total, 0);
  const done  = all.reduce((s, w) => s + w.done, 0);
  return Math.round((done / total) * 100);
}

// ════════════════════════════════════════════════════════
//  PROGRESS — CHALLENGES / XP
// ════════════════════════════════════════════════════════
const XP_LEVELS = [
  { level: 1, title: "Iniciante",       minXP: 0    },
  { level: 2, title: "Aprendiz",        minXP: 200  },
  { level: 3, title: "Praticante",      minXP: 600  },
  { level: 4, title: "Competente",      minXP: 1200 },
  { level: 5, title: "Proficiente",     minXP: 2200 },
  { level: 6, title: "Senior",          minXP: 3500 },
  { level: 7, title: "Staff Engineer",  minXP: 5000 },
];

function getChallengeState(id) {
  const cs = state.challenges[id] || { done: false, attempts: [], tasks: {} };
  if (!cs.tasks) cs.tasks = {};
  return cs;
}
function getChallengeTasksProgress(challenge) {
  const cs = getChallengeState(challenge.id);
  const tasks = challenge.tasks || [];
  const total = tasks.length;
  const done = tasks.filter(t => cs.tasks[t.key]).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
function toggleChallengeTask(challengeId, taskKey) {
  const cs = getChallengeState(challengeId);
  cs.tasks = cs.tasks || {};
  const was = !!cs.tasks[taskKey];
  cs.tasks[taskKey] = !cs.tasks[taskKey];
  if (!state.challenges[challengeId]) state.challenges[challengeId] = cs;
  saveState();
  if (cs.tasks[taskKey] && !was) {
    const c = CHALLENGES_DATA.allChallenges.find(c => c.id === challengeId);
    const t = (c && c.tasks) ? c.tasks.find(t => t.key === taskKey) : null;
    if (t) showToast(`+25 XP · ${t.title} ⚡`);
  }
  checkBadges();
}
function getEarnedXP() {
  let xp = 0;
  CHALLENGES_DATA.allChallenges.forEach(c => {
    const cs = getChallengeState(c.id);
    // XP das tasks atômicas concluídas (+25 cada)
    (c.tasks || []).forEach(t => { if (cs.tasks && cs.tasks[t.key]) xp += 25; });
    // XP de conclusão do desafio
    if (cs.done) xp += c.xp;
  });
  return xp;
}

// ─────────────────────────────────────────────
//  XP DO PLANO PROGRAMÁTICO
//  O plano também dá XP (mesmo nível dos desafios):
//    leitura +10 · prática +20 · entregável +50
//    semana completa +100 (bônus) · fase completa +300 (bônus)
// ─────────────────────────────────────────────
const PLAN_XP = { leitura: 10, pratica: 20, deliverable: 50, weekBonus: 100, phaseBonus: 300 };

function getPlanXP() {
  let xp = 0;
  if (!hasPlanContent()) return 0;
  ACTIVE_PLAN.allWeeks.forEach(w => {
    w.tasks.forEach(t => {
      if (state.tasks[t.id]) xp += (t.type === 'pratica' ? PLAN_XP.pratica : PLAN_XP.leitura);
    });
    if (state.deliverables[w.deliverable.id]) xp += PLAN_XP.deliverable;
    if (getWeekProgress(w).pct === 100) xp += PLAN_XP.weekBonus;
  });
  ACTIVE_PLAN.phases.forEach(ph => {
    const allDone = ph.weeks.length > 0 && ph.weeks.every(w => getWeekProgress(w).pct === 100);
    if (allDone) xp += PLAN_XP.phaseBonus;
  });
  return xp;
}

function getTotalXP() {
  return getEarnedXP() + getPlanXP();
}
function getCompletedChallengesCount() {
  return CHALLENGES_DATA.allChallenges.filter(c => getChallengeState(c.id).done).length;
}
function getStreak() {
  // Count consecutive days with at least one challenge done or attempted
  const datesSet = new Set();
  Object.values(state.challenges).forEach(cs => {
    (cs.attempts || []).forEach(a => datesSet.add(a.date.split('T')[0]));
    if (cs.done) datesSet.add(new Date().toISOString().split('T')[0]);
  });
  let streak = 0;
  let d = new Date(); d.setHours(0,0,0,0);
  while (datesSet.has(d.toISOString().split('T')[0])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
function getCurrentXPLevel(xp) {
  let current = XP_LEVELS[0];
  for (const lvl of XP_LEVELS) {
    if (xp >= lvl.minXP) current = lvl;
  }
  return current;
}
function getNextXPLevel(xp) {
  return XP_LEVELS.find(l => l.minXP > xp) || null;
}

// ════════════════════════════════════════════════════════
//  BADGES / CONQUISTAS
//  Vale para plano programático E desafios mão na massa.
// ════════════════════════════════════════════════════════
const BADGES = [
  { id: 'primeira-tarefa',    icon: '🚀', name: 'Primeira Tarefa',      desc: 'Conclua a primeira tarefa do plano.',        check: () => Object.keys(state.tasks).some(id => state.tasks[id]) },
  { id: 'primeira-semana',    icon: '📅', name: 'Primeira Semana',      desc: 'Conclua 100% de uma semana.',                 check: () => ACTIVE_PLAN.allWeeks.some(w => getWeekProgress(w).pct === 100) },
  { id: 'primeira-fase',      icon: '🧱', name: 'Fase Concluída',       desc: 'Conclua uma fase inteira do plano.',          check: () => ACTIVE_PLAN.phases.some(ph => ph.weeks.length > 0 && ph.weeks.every(w => getWeekProgress(w).pct === 100)) },
  { id: 'plano-completo',     icon: '🏆', name: 'Plano Completo',       desc: 'Conclua 100% do plano programático.',         check: () => hasPlanContent() && getTotalProgress() === 100 },
  { id: 'primeiro-desafio',   icon: '⚔️', name: 'Primeiro Desafio',     desc: 'Conclua o primeiro desafio.',                 check: () => getCompletedChallengesCount() > 0 },
  { id: 'task-atomicas',      icon: '🧩', name: 'Tasks Atômicas',       desc: 'Conclua todas as tasks de um desafio.',       check: () => CHALLENGES_DATA.allChallenges.some(c => getChallengeTasksProgress(c).pct === 100) },
  { id: 'desafio-final',      icon: '👑', name: 'Desafio Final',        desc: 'Conclua TODOS os desafios.',                  check: () => CHALLENGES_DATA.allChallenges.length > 0 && getCompletedChallengesCount() === CHALLENGES_DATA.allChallenges.length },
  { id: 'streak-3',           icon: '🔥', name: 'Ritmo 3 Dias',         desc: 'Fique 3 dias seguidos ativo.',                check: () => getStreak() >= 3 },
  { id: 'streak-7',           icon: '⚡', name: 'Ritmo 7 Dias',         desc: 'Fique 7 dias seguidos ativo.',                check: () => getStreak() >= 7 },
  { id: 'streak-30',          icon: '🌋', name: 'Ritmo 30 Dias',        desc: 'Fique 30 dias seguidos ativo.',               check: () => getStreak() >= 30 },
  { id: 'xp-500',             icon: '💎', name: '500 XP',               desc: 'Acumule 500 XP no total.',                    check: () => getTotalXP() >= 500 },
  { id: 'xp-1500',            icon: '💠', name: '1500 XP',              desc: 'Acumule 1500 XP no total.',                   check: () => getTotalXP() >= 1500 },
];

function isBadgeUnlocked(id) { return (state.badges || []).includes(id); }

// Verifica quais badges acabaram de ser desbloqueadas; mostra toast e persiste.
function checkBadges() {
  const unlocked = state.badges || [];
  let changed = false;
  BADGES.forEach(b => {
    let ok = false;
    try { ok = b.check(); } catch (e) {}
    if (ok && !unlocked.includes(b.id)) {
      unlocked.push(b.id);
      changed = true;
      setTimeout(() => showToast(`${b.icon} Badge desbloqueado: ${b.name}!`), 150);
    }
  });
  if (changed) { state.badges = unlocked; saveState(); }
}

function renderBadges(containerId) {
  const c = $(containerId);
  if (!c) return;
  const unlocked = BADGES.filter(b => isBadgeUnlocked(b.id));
  c.innerHTML = '';
  if (unlocked.length) {
    const wrap = el('div', { className: 'badges-grid' });
    unlocked.forEach(b => {
      const card = el('div', { className: 'badge-card' }, `${b.icon} ${b.name}`);
      wrap.appendChild(card);
    });
    c.appendChild(wrap);
    c.appendChild(el('div', { className: 'badges-count' }, `🏅 ${unlocked.length} de ${BADGES.length} conquistas`));
  } else {
    c.appendChild(el('div', { className: 'badges-empty' }, '🏅 Conquiste badges concluindo tarefas, semanas, fases e desafios!'));
  }
}

// Badge de desafio: gatinho pixel art + nome do desafio concluído.
// Acumulam para sempre (cada desafio finalizado vira um troféu).
function awardChallengeBadge(challenge) {
  state.challengeBadges = state.challengeBadges || [];
  const idx = state.challengeBadges.findIndex(b => b.challengeId === challenge.id);
  if (idx !== -1) return;
  state.challengeBadges.push({
    challengeId: challenge.id,
    num: challenge.num,
    title: challenge.title,
    xp: challenge.xp,
    date: new Date().toISOString().split('T')[0],
    skin: getCurrentXPLevel(getTotalXP()).level,
  });
}

function renderChallengeBadges(containerId) {
  const c = $(containerId);
  if (!c) return;
  const badges = state.challengeBadges || [];
  c.innerHTML = '';
  if (!badges.length) {
    c.appendChild(el('div', { className: 'challenge-badges-empty' }, '🐾 Conclua desafios para colecionar badges de gatinho com o nome de cada um!'));
    return;
  }
  const wrap = el('div', { className: 'challenge-badges-grid' });
  badges.forEach(b => {
    const card = el('div', { className: 'challenge-badge-card' });
    card.appendChild(el('div', { className: 'challenge-badge-cat' }, catSVG(catForLevel(b.skin), 'cat-tier-' + b.skin)));
    const info = el('div', { className: 'challenge-badge-info' });
    info.appendChild(el('div', { className: 'challenge-badge-title' }, b.title));
    info.appendChild(el('div', { className: 'challenge-badge-meta' }, `#${String(b.num).padStart(2,'0')} · +${b.xp} XP · ${formatDate(b.date)}`));
    card.appendChild(info);
    wrap.appendChild(card);
  });
  c.appendChild(wrap);
}

// ════════════════════════════════════════════════════════
//  DOM HELPERS
// ════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'innerHTML') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  children.forEach(c => {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  });
  return e;
};
function setBar(id, pct) { const b = $(id); if (b) b.style.width = pct + '%'; }

// ════════════════════════════════════════════════════════
//  IMPORTAR PLANO VIA .md
// ════════════════════════════════════════════════════════
function applyImportedPlan(plan) {
  setActivePlan(plan);
  const key = getStateKey();
  try {
    const srv = serverData.states && serverData.states[key];
    const raw = srv != null ? srv : localStorage.getItem(key);
    state = { ...state, ...(parseStateRaw(raw) || null), activePlanId: plan.id };
  } catch(e) {
    state = { ...state, tasks: {}, deliverables: {}, notes: {}, challenges: {}, activePlanId: plan.id };
  }
  if (!state.activePlanId || state.activePlanId !== plan.id) {
    state.tasks = {}; state.deliverables = {}; state.notes = {}; state.challenges = {}; state.activePlanId = plan.id;
  }
  saveState();
}

function applyImportedChallenges(data) {
  setChallengesData(data);
  CHALLENGES_DATA.source = (data && data.source) || null;
}

// ════════════════════════════════════════════════════════
//  IMPORTAR CONTEÚDO VIA .md
//  O tracker começa vazio: todo conteúdo vem dos uploads.
//  - Plano programático: substitui o plano atual.
//  - Desafios mão na massa: substitui a lista atual, mas só
//    permite novo upload quando os desafios atuais estiverem
//    TODOS concluídos (gate).
// ════════════════════════════════════════════════════════
function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const parsed = parsePlanMD(text, file.name);
    if (!parsed.type) {
      setImportStatus('⚠️ Formato não reconhecido. Use um .md de plano (com "## FASE ...") ou de desafios (com "## Desafio N ...").', 'error');
      return;
    }
    if (parsed.type === 'programatico') {
      applyImportedPlan(parsed.plan);
      saveContent();
      const nWeeks = parsed.plan.phases.reduce((s, p) => s + (p.weeks || []).length, 0);
      setImportStatus(`✅ Plano importado de ${file.name}: ${parsed.plan.totalDays} dias, ${nWeeks} semana(s).`, 'ok');
    } else {
      // GATE: só permite novo upload de desafios se o atual estiver finalizado
      if (hasChallengesContent() && !challengesFinalized()) {
        const done = getCompletedChallengesCount();
        const total = CHALLENGES_DATA.allChallenges.length;
        const confirmReplace = confirm(
          `Os desafios atuais ainda não foram finalizados (${done}/${total} concluídos).\n\n` +
          `Novo upload de desafios só é permitido quando o atual estiver 100% concluído.\n\n` +
          `Quer substituir mesmo assim? O progresso de XP destes desafios será perdido.`
        );
        if (!confirmReplace) {
          setImportStatus(`⛔ Upload bloqueado: finalize os ${total} desafios atuais antes de importar uma nova lista.`, 'error');
          return;
        }
      }
      applyImportedChallenges(parsed.challenges);
      saveContent();
      setImportStatus(`✅ Desafios importados de ${file.name}: ${parsed.challenges.allChallenges.length} desafio(s) substituindo a lista anterior.`, 'ok');
    }
    $('modal-config').style.display = 'none';
    if ($('input-import-file')) $('input-import-file').value = '';
    refreshAll();
  };
  reader.readAsText(file, 'utf-8');
}

function setImportStatus(msg, kind) {
  const el = $('import-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'import-status ' + (kind === 'ok' ? 'ok' : kind === 'error' ? 'error' : '');
  setTimeout(() => { el.textContent = ''; el.className = 'import-status'; }, 8000);
}

function syncAppBranding() {
  const plan = ACTIVE_PLAN;
  if (!plan) return;
  if (hasPlanContent()) {
    $('plan-name').textContent = plan.name.split(' ').slice(0, 2).join(' ') || plan.name;
    $('plan-sub').textContent = plan.source ? 'Importado' : 'Plano';
    $('total-days').textContent = plan.totalDays;
    document.title = `${plan.name} — Tracker`;
  } else {
    $('plan-name').textContent = 'Tracker';
    $('plan-sub').textContent = 'Importe um .md';
    $('total-days').textContent = '—';
    document.title = 'Tracker — Importe seu .md';
  }
  const subtitle = $('plan-subtitle');
  if (subtitle) {
    if (!hasPlanContent()) {
      subtitle.textContent = 'Nenhum plano carregado ainda. Importe um .md programático em 📂 Importar.';
    } else {
      const phases = plan.phases.length, weeks = plan.allWeeks.length;
      subtitle.textContent = `${weeks} semana${weeks !== 1 ? 's' : ''} · ${phases} fase${phases !== 1 ? 's' : ''} · 1 entregável por semana.`;
    }
  }
  const csub = $('challenges-subtitle');
  if (csub && CHALLENGES_DATA) {
    const n = CHALLENGES_DATA.allChallenges.length;
    const lv = CHALLENGES_DATA.levels.length;
    csub.textContent = n
      ? `${n} desafio${n !== 1 ? 's' : ''} em ${lv} nível${lv !== 1 ? 'is' : ''}. Resolva antes de pesquisar. 💪`
      : 'Nenhum desafio carregado. Importe um .md mão na massa em 📂 Importar.';
  }
}

// ════════════════════════════════════════════════════════
//  RENDER: DASHBOARD
// ════════════════════════════════════════════════════════
function renderDashboard() {
  syncAppBranding();
  const day = getCurrentDay();
  $('current-day').textContent = day || '—';
  $('header-date').textContent = new Date().toLocaleDateString('pt-BR',
    { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const totalPct = getTotalProgress();
  $('stat-total-pct').textContent = totalPct + '%'; setBar('bar-total', totalPct);
  ACTIVE_PLAN.phases.forEach((phase, i) => {
    const pct = getPhaseProgress(phase); const n = i + 1;
    $(`stat-p${n}-pct`).textContent = pct + '%'; setBar(`bar-p${n}`, pct);
  });

  if (state.startDate)
    $('header-subtitle').textContent =
      `Dia ${day} de ${ACTIVE_PLAN.totalDays} · Iniciado em ${formatDate(state.startDate)} · Semana ${getCurrentWeek()} de ${ACTIVE_PLAN.allWeeks.length}`;

  renderCurrentWeekCard();
  renderWeeksGrid();
  renderBadges('badges-grid-dashboard');
  renderChallengeBadges('challenge-badges-dashboard');
}

function renderCurrentWeekCard() {
  const container = $('current-week-card');
  if (!hasPlanContent()) {
    container.innerHTML = emptyNotice('Nenhum plano programático carregado',
      'Importe um .md com <code>## FASE N — Dias...</code> (ex.: CONSOLIDADO-90-DIAS.md) em <strong>📂 Importar</strong>.');
    return;
  }
  const weekNum = getCurrentWeek();
  if (!state.startDate || !weekNum) {
    container.innerHTML = `<div class="cw-loading">Configure a data de início para ver a semana atual. Clique em <strong>⚙ Config</strong>. 🚀</div>`;
    return;
  }
  const week = ACTIVE_PLAN.allWeeks.find(w => w.id === weekNum);
  if (!week) { container.innerHTML = `<div class="cw-loading">🎉 Parabéns! Plano concluído!</div>`; return; }
  const phase = ACTIVE_PLAN.phases.find(p => p.id === week.phase);
  const prog = getWeekProgress(week);
  container.innerHTML = '';

  container.appendChild(el('div', { className: 'cw-header' },
    el('span', { className: 'cw-badge' }, '📍 Semana ' + week.id),
    el('span', { className: 'cw-phase-badge' }, phase.name + ' · ' + week.days)
  ));
  container.appendChild(el('h3', { className: 'cw-title' }, week.title));

  const tasksList = el('div', { className: 'cw-tasks' });
  week.tasks.forEach(task => {
    const isDone = !!state.tasks[task.id];
    const item = el('div', { className: 'task-item' + (isDone ? ' done' : '') });
    item.appendChild(el('div', { className: 'task-check' }, isDone ? '✓' : ''));
    item.appendChild(el('span', { className: 'task-text' }, task.text));
    item.addEventListener('click', () => { toggleTask(task.id, 'tasks'); renderCurrentWeekCard(); updateStats(); });
    tasksList.appendChild(item);
  });

  const delDone = !!state.deliverables[week.deliverable.id];
  const delItem = el('div', { className: 'task-item' + (delDone ? ' done' : '') });
  delItem.appendChild(el('div', { className: 'task-check' }, delDone ? '✓' : ''));
  const dc = el('div');
  dc.appendChild(el('div', { className: 'task-text', style: 'font-weight:600' }, week.deliverable.text));
  dc.appendChild(el('span', { className: 'task-deliverable-badge' }, week.deliverable.icon + ' Entregável'));
  delItem.appendChild(dc);
  delItem.addEventListener('click', () => { toggleTask(week.deliverable.id, 'deliverables'); renderCurrentWeekCard(); updateStats(); });
  tasksList.appendChild(delItem);
  container.appendChild(tasksList);

  const progBar = el('div', { style: 'margin-top:16px' });
  const bw = el('div', { className: 'stat-bar-wrap', style: 'height:6px' });
  bw.appendChild(el('div', { className: 'stat-bar', style: `width:${prog.pct}%; background:linear-gradient(90deg,var(--indigo),var(--violet))` }));
  progBar.appendChild(el('div', { style: 'font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600' },
    `${prog.done}/${prog.total} tarefas · ${prog.pct}% concluída`));
  progBar.appendChild(bw);
  container.appendChild(progBar);
}

function renderWeeksGrid() {
  const grid = $('weeks-grid'); grid.innerHTML = '';
  if (!hasPlanContent()) {
    grid.innerHTML = emptyNotice('Nenhum plano carregado',
      'Importe um .md programático para ver o mapa de semanas.');
    return;
  }
  const cw = getCurrentWeek();
  ACTIVE_PLAN.allWeeks.forEach(week => {
    const prog = getWeekProgress(week);
    const isCurrent = cw === week.id, isDone = prog.pct === 100, isLocked = cw && week.id > cw;
    let cls = 'week-tile';
    if (isCurrent) cls += ' current'; else if (isDone) cls += ' done'; else if (isLocked) cls += ' locked';
    const tile = el('div', { className: cls });
    tile.appendChild(el('div', { className: 'wt-week-num' }, 'Semana ' + week.id));
    tile.appendChild(el('div', { className: 'wt-title' }, week.title));
    const st = el('div', { className: 'wt-status' });
    st.textContent = isDone ? '✅' : isCurrent ? '📍' : isLocked ? '🔒' : '○';
    tile.appendChild(st);
    const pb = el('div', { className: 'wt-progress-bar' });
    pb.appendChild(el('div', { className: 'wt-progress-fill', style: `width:${prog.pct}%` }));
    tile.appendChild(pb);
    if (!isLocked) tile.addEventListener('click', () => openWeekModal(week.id));
    grid.appendChild(tile);
  });
}

// ════════════════════════════════════════════════════════
//  RENDER: PLAN VIEW
// ════════════════════════════════════════════════════════
function renderPlanView() {
  const container = $('plan-phases'); container.innerHTML = '';
  if (!hasPlanContent()) {
    container.innerHTML = emptyNotice('Nenhum plano programático carregado',
      'Importe um .md com <code>## FASE N — Dias...</code> (ex.: CONSOLIDADO-90-DIAS.md) em <strong>📂 Importar</strong>.');
    return;
  }
  const cw = getCurrentWeek();
  ACTIVE_PLAN.phases.forEach(phase => {
    const phasePct = getPhaseProgress(phase);
    const phaseBlock = el('div', { className: `phase-block phase-${phase.id}` });
    const phHeader = el('div', { className: 'phase-header' });
    phHeader.appendChild(el('div', { className: 'phase-icon-wrap' }, phase.icon));
    const pMeta = el('div', { className: 'phase-meta' });
    pMeta.appendChild(el('div', { className: 'phase-name' }, phase.name));
    pMeta.appendChild(el('div', { className: 'phase-days' }, phase.days));
    phHeader.appendChild(pMeta);
    phHeader.appendChild(el('div', { className: 'phase-progress-text' }, phasePct + '%'));
    phaseBlock.appendChild(phHeader);

    const weeksContainer = el('div', { className: 'phase-weeks' });
    phase.weeks.forEach(week => {
      const prog = getWeekProgress(week);
      const isCurrent = cw === week.id, isDone = prog.pct === 100;
      let rc = 'week-row';
      if (isCurrent) rc += ' current-row'; else if (isDone) rc += ' done-row';
      const row = el('div', { className: rc });

      const weekCol = el('div', { className: 'wr-week-col' });
      weekCol.appendChild(el('div', { className: 'wr-week-num' }, 'Semana ' + week.id));
      weekCol.appendChild(el('div', { className: 'wr-week-status' }, isDone ? '✅' : isCurrent ? '📍' : '○'));
      row.appendChild(weekCol);

      const contentCol = el('div', { className: 'wr-content-col' });
      contentCol.appendChild(el('div', { className: 'wr-title' }, week.title + ' — ' + week.days));
      contentCol.appendChild(el('div', { className: 'wr-desc' }, week.tasks.map(t => '• ' + t.text).join('\n')));
      const db = el('div', { className: 'wr-deliverable' });
      db.innerHTML = `${week.deliverable.icon} Entregável: ${week.deliverable.text}`;
      contentCol.appendChild(db);
      row.appendChild(contentCol);

      const actCol = el('div', { className: 'wr-actions-col' });
      const btn = el('button', { className: 'btn btn-secondary btn-sm' }, '👁 Ver');
      btn.addEventListener('click', e => { e.stopPropagation(); openWeekModal(week.id); });
      actCol.appendChild(btn);
      row.appendChild(actCol);
      row.addEventListener('click', () => openWeekModal(week.id));
      weeksContainer.appendChild(row);
    });
    phaseBlock.appendChild(weeksContainer);
    container.appendChild(phaseBlock);
  });
}

// ════════════════════════════════════════════════════════
//  RENDER: NOTES VIEW
// ════════════════════════════════════════════════════════
function renderNotesView() {
  const list = $('notes-week-list'); list.innerHTML = '';
  if (!hasPlanContent()) {
    list.innerHTML = emptyNotice('Nenhum plano carregado',
      'Importe um .md programático para criar notas por semana.');
    return;
  }
  ACTIVE_PLAN.allWeeks.forEach(week => {
    const hasNote = !!(state.notes[week.id] && state.notes[week.id].trim());
    const item = el('div', { className: 'note-week-item', 'data-week': week.id });
    item.appendChild(el('div', { className: 'nwi-week' }, 'Semana ' + week.id));
    const tr = el('div', { className: 'nwi-title' }, week.title);
    if (hasNote) tr.appendChild(el('span', { className: 'nwi-has-note' }));
    item.appendChild(tr);
    item.addEventListener('click', () => selectNoteWeek(week.id));
    list.appendChild(item);
  });
}

// ════════════════════════════════════════════════════════
//  RENDER: CHALLENGES VIEW
// ════════════════════════════════════════════════════════
function renderChallengesView() {
  // XP Stats (total = desafios + plano)
  const earnedXP = getTotalXP();
  const completed = getCompletedChallengesCount();
  const streak = getStreak();
  const curLevel = getCurrentXPLevel(earnedXP);
  const nextLevel = getNextXPLevel(earnedXP);

  $('xp-display-value').textContent = earnedXP + ' XP';
  $('xp-level-num').textContent = curLevel.level;
  $('xp-hero-title').textContent = curLevel.title;
  $('xp-completed-count').textContent = completed;
  $('xp-total-earned').textContent = earnedXP;
  $('xp-streak').textContent = streak;

  if (nextLevel) {
    const pct = Math.round(((earnedXP - curLevel.minXP) / (nextLevel.minXP - curLevel.minXP)) * 100);
    $('xp-hero-sub').textContent = `${earnedXP - curLevel.minXP} / ${nextLevel.minXP - curLevel.minXP} XP para ${nextLevel.title}`;
    $('xp-bar-fill').style.width = pct + '%';
    // conic-gradient for level ring
    $('xp-level-ring').style.background =
      `conic-gradient(var(--amber) 0deg, var(--rose) ${pct * 3.6}deg, var(--bg-hover) ${pct * 3.6}deg)`;
  } else {
    $('xp-hero-sub').textContent = '🏆 Nível máximo atingido!';
    $('xp-bar-fill').style.width = '100%';
  }

  // Nav badge
  const badge = $('nav-xp-badge');
  badge.textContent = earnedXP + ' XP';
  badge.classList.toggle('visible', earnedXP > 0);

  // Badges (também aparece aqui na view de desafios)
  renderBadges('badges-grid-challenges');
  renderChallengeBadges('challenge-badges-challenges');

  // Method steps (only build once)
  const methodSteps = $('method-steps');
  if (!methodSteps.dataset.built) {
    methodSteps.dataset.built = '1';
    CHALLENGES_DATA.method.steps.forEach(step => {
      const s = el('div', { className: 'method-step' });
      s.appendChild(el('div', { className: 'ms-num' }, `Passo ${step.n}`));
      s.appendChild(el('div', { className: 'ms-title' }, step.title));
      s.appendChild(el('div', { className: 'ms-desc' }, step.desc));
      methodSteps.appendChild(s);
    });
  }

  // Challenges by level
  const container = $('challenges-levels'); container.innerHTML = '';
  if (!hasChallengesContent()) {
    container.innerHTML = emptyNotice('Nenhum desafio mão na massa carregado',
      'Importe um .md com <code>## 🏦 Desafio N — ...</code> (ex.: 04-desafios-codigo-mao-na-massa.md) em <strong>📂 Importar</strong>.');
    return;
  }
  CHALLENGES_DATA.levels.forEach(level => {
    const levelDone = level.challenges.filter(c => getChallengeState(c.id).done).length;
    const block = el('div', { className: 'level-block' });

    // Level header
    const lh = el('div', { className: 'level-header' });
    lh.appendChild(el('span', { className: 'level-emoji' }, level.emoji));
    lh.appendChild(el('span', { className: 'level-name' }, `Nível ${level.id} — ${level.name}`));
    lh.appendChild(el('span', { className: 'level-xp-badge' }, `⚡ ${level.xpPerChallenge} XP cada`));
    lh.appendChild(el('span', { className: 'level-progress-text' }, `${levelDone}/${level.challenges.length} concluídos`));
    block.appendChild(lh);

    const grid = el('div', { className: 'challenges-grid' });
    level.challenges.forEach(challenge => {
      const cs = getChallengeState(challenge.id);
      const attemptCount = cs.attempts ? cs.attempts.length : 0;
      let cls = 'challenge-card';
      if (cs.done) cls += ' done';
      else if (attemptCount > 0) cls += ' attempted';

      const card = el('div', { className: cls });

      const header = el('div', { className: 'cc-header' });
      header.appendChild(el('span', { className: 'cc-num' }, `#${String(challenge.num).padStart(2,'0')}`));
      header.appendChild(el('span', { className: 'cc-status' }, cs.done ? '✅' : attemptCount > 0 ? '🔄' : '⬜'));
      header.appendChild(el('span', { className: 'cc-xp' }, `+${challenge.xp} XP`));
      card.appendChild(header);

      card.appendChild(el('div', { className: 'cc-title' }, challenge.title));

      // Progresso de tasks atômicas (mão na massa)
      const tprog = getChallengeTasksProgress(challenge);
      if (challenge.tasks && challenge.tasks.length) {
        const tp = el('div', { className: 'cc-tasks-progress' });
        tp.appendChild(el('span', {}, `🗂 ${tprog.done}/${tprog.total} tarefas`));
        const tpbar = el('div', { className: 'cc-tasks-bar' });
        tpbar.appendChild(el('div', { className: 'cc-tasks-fill', style: `width:${tprog.pct}%` }));
        tp.appendChild(tpbar);
        card.appendChild(tp);
      }

      const trains = el('div', { className: 'cc-trains' });
      challenge.trains.slice(0, 3).forEach(t => {
        trains.appendChild(el('span', { className: 'cc-train-tag' }, t));
      });
      card.appendChild(trains);

      const bottom = el('div', { className: 'cc-bottom' });
      bottom.appendChild(el('span', { className: 'cc-attempt-count' },
        attemptCount > 0 ? `${attemptCount} tentativa${attemptCount > 1 ? 's' : ''}` : ''));
      card.appendChild(bottom);

      card.addEventListener('click', () => openChallengeModal(challenge.id));
      grid.appendChild(card);
    });
    block.appendChild(grid);
    container.appendChild(block);
  });
}

// ════════════════════════════════════════════════════════
//  MODAL: WEEK
// ════════════════════════════════════════════════════════
let activeWeekId = null;
let activeNoteWeekId = null;

function openWeekModal(weekId) {
  activeWeekId = weekId;
  const week = ACTIVE_PLAN.allWeeks.find(w => w.id === weekId);
  const phase = ACTIVE_PLAN.phases.find(p => p.id === week.phase);
  $('modal-week-title').textContent = `Semana ${week.id} — ${week.title}`;

  const body = $('modal-week-body'); body.innerHTML = '';
  body.appendChild(el('div', { className: 'modal-section-label' }, '📅 ' + week.days + ' · ' + phase.name));

  body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:12px' }, 'Tarefas'));
  const ts = el('div', { className: 'modal-tasks-list' });
  week.tasks.forEach(task => {
    const isDone = !!state.tasks[task.id];
    const item = el('div', { className: 'modal-task-item' + (isDone ? ' done' : '') });
    item.appendChild(el('span', { className: 'modal-task-check' }, isDone ? '✅' : '⬜'));
    item.appendChild(el('span', {}, task.text));
    item.addEventListener('click', () => { toggleTask(task.id, 'tasks'); openWeekModal(weekId); });
    ts.appendChild(item);
  });
  body.appendChild(ts);

  body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:12px' }, '🎯 Entregável da Semana'));
  const delDone = !!state.deliverables[week.deliverable.id];
  const di = el('div', { className: 'modal-task-item' + (delDone ? ' done' : '') });
  di.appendChild(el('span', { className: 'modal-task-check' }, delDone ? '✅' : '⬜'));
  di.appendChild(el('span', { style: 'font-weight:600' }, week.deliverable.icon + ' ' + week.deliverable.text));
  di.addEventListener('click', () => { toggleTask(week.deliverable.id, 'deliverables'); openWeekModal(weekId); });
  body.appendChild(di);

  if (state.notes[weekId] && state.notes[weekId].trim()) {
    body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:12px' }, '📝 Nota'));
    body.appendChild(el('pre', {
      style: 'font-size:12px;color:var(--text-secondary);background:var(--bg-card);padding:12px;border-radius:8px;white-space:pre-wrap;max-height:150px;overflow-y:auto;font-family:JetBrains Mono,monospace;border:1px solid var(--border)'
    }, state.notes[weekId]));
  }

  body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:12px' }, '🏷️ Tags Obsidian'));
  const tw = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' });
  week.obsidianTags.forEach(tag => {
    tw.appendChild(el('span', {
      style: 'font-size:11px;background:var(--indigo-dim);border:1px solid var(--border-accent);color:var(--indigo-light);border-radius:99px;padding:2px 8px;font-family:JetBrains Mono,monospace'
    }, '#' + tag));
  });
  body.appendChild(tw);

  const prog = getWeekProgress(week);
  const doneBtn = $('modal-week-done-btn');
  doneBtn.textContent = prog.pct === 100 ? '✅ Semana Concluída!' : '✅ Marcar tudo como concluído';
  doneBtn.className = prog.pct === 100 ? 'btn btn-done' : 'btn btn-primary';
  $('modal-week').style.display = 'flex';
}

function closeWeekModal() {
  $('modal-week').style.display = 'none';
  activeWeekId = null;
  refreshAll();
}

// ════════════════════════════════════════════════════════
//  MODAL: CHALLENGE
// ════════════════════════════════════════════════════════
let activeChallengeId = null;

function openChallengeModal(challengeId) {
  activeChallengeId = challengeId;
  const challenge = CHALLENGES_DATA.allChallenges.find(c => c.id === challengeId);
  const level = CHALLENGES_DATA.levels.find(l => l.id === challenge.levelId);
  const cs = getChallengeState(challengeId);

  $('modal-challenge-title').textContent = `#${String(challenge.num).padStart(2,'0')} ${challenge.title}`;

  $('modal-challenge-level-badge').innerHTML =
    `<span style="font-size:11px;color:var(--text-muted)">${level.emoji} Nível ${level.id} — ${level.name} · </span>` +
    `<span style="font-size:11px;font-weight:700;color:var(--amber)">+${challenge.xp} XP</span>`;

  const body = $('modal-challenge-body'); body.innerHTML = '';

  // Description
  body.appendChild(el('div', { className: 'modal-section-label' }, '📋 O Problema'));
  body.appendChild(el('div', { className: 'challenge-desc' }, challenge.description));

  // Trains
  body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:14px' }, '🎓 O que você treina'));
  const trainsWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' });
  challenge.trains.forEach(t => {
    trainsWrap.appendChild(el('span', {
      style: 'font-size:12px;background:var(--indigo-dim);border:1px solid var(--border-accent);color:var(--indigo-light);border-radius:99px;padding:3px 10px;font-weight:500'
    }, t));
  });
  body.appendChild(trainsWrap);

  // Hints
  body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:14px' }, '💡 Perguntas-guia'));
  const hints = el('div', { className: 'challenge-hints' });
  challenge.hints.forEach(h => {
    const hi = el('div', { className: 'hint-item' });
    hi.appendChild(el('span', { className: 'hint-icon' }, '→'));
    hi.appendChild(el('span', {}, h));
    hints.appendChild(hi);
  });
  body.appendChild(hints);

  // Atomic tasks (mão na massa)
  if (challenge.tasks && challenge.tasks.length) {
    body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:14px' }, '🗂️ Tasks atômicas'));
    const tw = el('div', { className: 'atomic-tasks' });
    const cs2 = getChallengeState(challengeId);
    challenge.tasks.forEach(t => {
      const enabled = !t.deps.length || t.deps.every(d => cs2.tasks[d]);
      const item = el('label', {
        className: 'atomic-task' + (cs2.tasks[t.key] ? ' done' : '') + (enabled ? '' : ' locked')
      });
      const checkbox = el('input', { type: 'checkbox', dataChallenge: challengeId, dataTask: t.key, checked: !!cs2.tasks[t.key] });
      if (!enabled) checkbox.disabled = true;
      const content = el('div', { className: 'atomic-task-content' });
      const row = el('div', { className: 'atomic-task-title' }, `${t.icon} ${t.title}`);
      if (t.criteria) content.appendChild(el('div', { className: 'atomic-task-criteria' }, t.criteria));
      if (t.deps.length) content.appendChild(el('div', { className: 'atomic-task-deps' }, `depende de: ${t.deps.join(', ')}`));
      content.prepend(row);
      item.appendChild(checkbox);
      item.appendChild(content);
      tw.appendChild(item);
    });
    body.appendChild(tw);
  }

  // Attempt area
  body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:14px' }, '✏️ Registrar Tentativa'));
  const ta = el('textarea', {
    className: 'attempt-editor',
    id: 'challenge-attempt-text',
    placeholder: 'Escreva sua solução aqui (mesmo que incompleta).\n\nUse os 9 passos:\n1. Requirements\n2. Scale\n3. API\n4. Data Model\n5. Architecture\n6. Deep Dive\n7. Failure\n8. Scale x10\n9. Trade-offs'
  });
  body.appendChild(ta);

  // Past attempts
  if (cs.attempts && cs.attempts.length > 0) {
    body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:14px' }, `📚 Tentativas anteriores (${cs.attempts.length})`));
    const al = el('div', { className: 'attempts-list' });
    [...cs.attempts].reverse().forEach(a => {
      const ai = el('div', { className: 'attempt-item' });
      ai.innerHTML = `<span class="attempt-date">${new Date(a.date).toLocaleDateString('pt-BR', { dateStyle: 'short' })}</span> — ${a.text.slice(0, 120)}${a.text.length > 120 ? '...' : ''}`;
      al.appendChild(ai);
    });
    body.appendChild(al);
  }

  // Obsidian links
  body.appendChild(el('div', { className: 'modal-section-label', style: 'margin-top:14px' }, '🔗 Links Obsidian'));
  const lw = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' });
  challenge.obsidianLinks.forEach(link => {
    lw.appendChild(el('span', {
      style: 'font-size:11px;background:var(--violet-dim);border:1px solid rgba(139,92,246,0.2);color:#a78bfa;border-radius:99px;padding:2px 8px;font-family:JetBrains Mono,monospace'
    }, link));
  });
  body.appendChild(lw);

  // Done button state
  const doneBtn = $('modal-challenge-done');
  doneBtn.textContent = cs.done ? '✅ Concluído! Remover ✓' : '✅ Marcar como Concluído (+' + challenge.xp + ' XP)';
  doneBtn.className = cs.done ? 'btn btn-done' : 'btn btn-primary';

  $('modal-challenge').style.display = 'flex';
}

function closeChallengeModal() {
  $('modal-challenge').style.display = 'none';
  activeChallengeId = null;
  renderChallengesView();
}

function registerAttempt() {
  if (!activeChallengeId) return;
  const text = ($('challenge-attempt-text')?.value || '').trim();
  if (!text) { showToast('Escreva algo antes de registrar! ✏️'); return; }
  if (!state.challenges[activeChallengeId]) state.challenges[activeChallengeId] = { done: false, attempts: [] };
  state.challenges[activeChallengeId].attempts.push({ date: new Date().toISOString(), text });
  saveState();
  showToast('Tentativa registrada! 🔄');
  checkBadges();
  openChallengeModal(activeChallengeId); // re-render
}

function toggleChallengeDone() {
  if (!activeChallengeId) return;
  if (!state.challenges[activeChallengeId]) state.challenges[activeChallengeId] = { done: false, attempts: [] };
  const wasDone = state.challenges[activeChallengeId].done;
  state.challenges[activeChallengeId].done = !wasDone;

  if (!wasDone) {
    // Add a completed attempt if text exists
    const text = ($('challenge-attempt-text')?.value || '').trim();
    if (text) state.challenges[activeChallengeId].attempts.push({ date: new Date().toISOString(), text });
    const c = CHALLENGES_DATA.allChallenges.find(c => c.id === activeChallengeId);
    awardChallengeBadge(c);
    showToast(`+${c.xp} XP! Desafio concluído! ⚡`);
  } else {
    showToast('Desafio desmarcado');
  }
  saveState();
  checkBadges();
  openChallengeModal(activeChallengeId);
}

// ════════════════════════════════════════════════════════
//  TOGGLE TASKS
// ════════════════════════════════════════════════════════
function toggleTask(id, type) {
  const wasDone = !!state[type][id];
  state[type][id] = !state[type][id];
  const nowDone = state[type][id];
  saveState();
  if (nowDone && !wasDone) {
    // Toast de XP ganho
    if (type === 'deliverables') showToast(`+${PLAN_XP.deliverable} XP · Entregável concluído! 🎯`);
    else if (type === 'tasks') {
      const t = ACTIVE_PLAN.allWeeks.flatMap(w => w.tasks).find(t => t.id === id);
      const xp = t && t.type === 'pratica' ? PLAN_XP.pratica : PLAN_XP.leitura;
      showToast(`+${xp} XP${t && t.type === 'pratica' ? ' · Mão na massa!' : ''} ⚡`);
    }
  }
  checkBadges();

}

// ════════════════════════════════════════════════════════
//  NOTES
// ════════════════════════════════════════════════════════
function selectNoteWeek(weekId) {
  activeNoteWeekId = weekId;
  const week = ACTIVE_PLAN.allWeeks.find(w => w.id === weekId);
  document.querySelectorAll('.note-week-item').forEach(e => {
    e.classList.toggle('active', parseInt(e.dataset.week) === weekId);
  });
  $('notes-editor-header').innerHTML = `<strong>Semana ${weekId} — ${week.title}</strong> <span style="color:var(--text-muted);font-weight:400;font-size:12px;margin-left:8px">${week.days}</span>`;
  $('notes-editor').value = state.notes[weekId] || '';
  $('notes-editor').disabled = false;
  $('btn-save-note').disabled = false;
  $('btn-clear-note').disabled = false;
}

function saveNote() {
  if (!activeNoteWeekId) return;
  state.notes[activeNoteWeekId] = $('notes-editor').value;
  saveState(); renderNotesView(); selectNoteWeek(activeNoteWeekId);
  showToast('Nota salva! 💾');
}

// ════════════════════════════════════════════════════════
//  EXPORT / OBSIDIAN
// ════════════════════════════════════════════════════════
function generateWeekMD(week) {
  const phase = ACTIVE_PLAN.phases.find(p => p.id === week.phase);
  const prog = getWeekProgress(week);
  const note = state.notes[week.id] || '';
  const taskLines = week.tasks.map(t => `- [${state.tasks[t.id] ? 'x' : ' '}] ${t.text}`).join('\n');
  const delDone = state.deliverables[week.deliverable.id] ? 'x' : ' ';
  return `---
tags: [90-dias-na-gringa, semana-${week.id}, ${phase.name.toLowerCase().replace(/ /g,'-')}]
fase: "${phase.name}"
semana: ${week.id}
titulo: "${week.title}"
periodo: "${week.days}"
progresso: ${prog.pct}%
data_export: "${new Date().toISOString().split('T')[0]}"
---

# Semana ${week.id} — ${week.title}

> **${phase.name}** · ${week.days} · Progresso: ${prog.pct}%

## Links Relacionados
${week.obsidianLinks.join('\n')}

## Tarefas

${taskLines}

## 🎯 Entregável da Semana
- [${delDone}] ${week.deliverable.icon} ${week.deliverable.text}

## 📝 Minhas Notas
${note || '_Sem notas ainda._'}

## 🏷️ Tags
${week.obsidianTags.map(t => '#' + t).join(' ')}

---
*Gerado pelo 90 Dias na Gringa Tracker*
`;
}

function generateChallengeMD(challenge) {
  const cs = getChallengeState(challenge.id);
  const attempts = (cs.attempts || []).map((a, i) =>
    `### Tentativa ${i + 1} — ${new Date(a.date).toLocaleDateString('pt-BR')}\n\n${a.text}`
  ).join('\n\n---\n\n');
  return `---
tags: [90-dias-na-gringa, desafios, system-design, ${challenge.title.toLowerCase().replace(/ /g,'-')}]
desafio: "${challenge.title}"
nivel: ${challenge.levelId}
xp: ${challenge.xp}
concluido: ${cs.done}
tentativas: ${(cs.attempts || []).length}
data_export: "${new Date().toISOString().split('T')[0]}"
---

# Desafio #${String(challenge.num).padStart(2,'0')} — ${challenge.title}

> **Status:** ${cs.done ? '✅ Concluído' : (cs.attempts?.length > 0 ? '🔄 Em progresso' : '⏳ Não iniciado')} · **+${challenge.xp} XP**

## 📋 O Problema
${challenge.description}

## 🎓 O que treina
${challenge.trains.map(t => '- ' + t).join('\n')}

## 💡 Perguntas-guia
${challenge.hints.map(h => '- ' + h).join('\n')}

## 🔗 Links Relacionados
${challenge.obsidianLinks.join('\n')}

## ✏️ Minhas Tentativas
${attempts || '_Sem tentativas ainda._'}

---
*Gerado pelo 90 Dias na Gringa Tracker*
`;
}

function generateProgressMD() {
  const day = getCurrentDay();
  const rows = ACTIVE_PLAN.allWeeks.map(week => {
    const prog = getWeekProgress(week);
    const status = prog.pct === 100 ? '✅' : prog.pct > 0 ? '🔄' : '⏳';
    return `| ${week.id} | ${week.title} | ${week.days} | ${status} | ${prog.pct}% |`;
  }).join('\n');
  const challengeRows = CHALLENGES_DATA.allChallenges.map(c => {
    const cs = getChallengeState(c.id);
    return `| #${c.num} | ${c.title} | ${cs.done ? '✅' : cs.attempts?.length > 0 ? '🔄' : '⏳'} | ${cs.done ? c.xp : 0} XP |`;
  }).join('\n');
  return `---
tags: [90-dias-na-gringa, progresso, dashboard]
data_export: "${new Date().toISOString().split('T')[0]}"
---

# 📊 Progresso — 90 Dias na Gringa

> Dia **${day || '?'}** de ${ACTIVE_PLAN.totalDays} · Progresso total: **${getTotalProgress()}%** · XP: **${getTotalXP()}**

## Por Fase

${ACTIVE_PLAN.phases.map(p => `### ${p.icon} ${p.name} · ${p.days}\nProgresso: ${getPhaseProgress(p)}%`).join('\n\n')}

## Por Semana

| # | Título | Período | Status | % |
|---|--------|---------|--------|---|
${rows}

## Desafios de System Design

> XP Total: **${getTotalXP()}** / ${CHALLENGES_DATA.totalXP + getPlanXP()} · Concluídos: **${getCompletedChallengesCount()}** / ${CHALLENGES_DATA.allChallenges.length}

| # | Desafio | Status | XP |
|---|---------|--------|-----|
${challengeRows}

---
*Gerado em ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}*
`;
}

function generateIndexMD() {
  const weekLinks = ACTIVE_PLAN.allWeeks.map(w =>
    `- [[semana-${String(w.id).padStart(2,'0')}-${w.title.toLowerCase().replace(/ /g,'-').replace(/[^a-z0-9-]/g,'')}|Semana ${w.id} — ${w.title}]]`
  ).join('\n');
  const challengeLinks = CHALLENGES_DATA.allChallenges.map(c =>
    `- [[desafio-${String(c.num).padStart(2,'0')}-${c.title.toLowerCase().replace(/ /g,'-').replace(/[^a-z0-9-]/g,'')}|#${c.num} ${c.title}]]`
  ).join('\n');
  return `---
tags: [90-dias-na-gringa, índice]
---

# 🛫 90 Dias na Gringa — Índice

> Plano de 90 dias para preparação de vaga internacional como Senior Software Engineer.

## 📋 Semanas do Plano

${weekLinks}

## ⚔️ Desafios — System Design

${challengeLinks}

## 📊 Dashboard
→ [[00-progresso|Progresso Geral]]

## 🗺️ Conceitos-Chave
- [[SOLID]]
- [[Arquitetura Hexagonal]]
- [[DDD]]
- [[Domain Events]]
- [[Kafka]]
- [[Saga Pattern]]
- [[System Design]]
- [[rh-app]]

---
*90 Dias na Gringa Tracker*
`;
}

async function exportAllZip() {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  document.head.appendChild(script);
  script.onload = () => {
    const zip = new JSZip();
    const base = (ACTIVE_PLAN && ACTIVE_PLAN.name
      ? ACTIVE_PLAN.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : 'tracker') || 'tracker';
    const folder = zip.folder(base);
    folder.file('00-indice.md', generateIndexMD());
    folder.file('00-progresso.md', generateProgressMD());
    ACTIVE_PLAN.allWeeks.forEach(week => {
      const fn = `semana-${String(week.id).padStart(2,'0')}-${week.title.toLowerCase().replace(/ /g,'-').replace(/[^a-z0-9-]/g,'')}.md`;
      folder.file(fn, generateWeekMD(week));
    });
    CHALLENGES_DATA.allChallenges.forEach(c => {
      const fn = `desafio-${String(c.num).padStart(2,'0')}-${c.title.toLowerCase().replace(/ /g,'-').replace(/[^a-z0-9-]/g,'')}.md`;
      folder.file(fn, generateChallengeMD(c));
    });
    zip.generateAsync({ type: 'blob' }).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = base + '-obsidian.zip'; a.click();
      URL.revokeObjectURL(url);
      showToast('ZIP exportado com sucesso! 🗂️');
    });
  };
}

function downloadMD(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (!hasContent()) {
    const wv = document.getElementById('view-welcome');
    if (wv) wv.classList.add('active');
    return;
  }
  if (viewId === 'welcome') viewId = 'dashboard';
  const navEl = document.getElementById('nav-' + viewId);
  if (navEl) navEl.classList.add('active');
  document.getElementById('view-' + viewId).classList.add('active');
  if (viewId === 'dashboard')  renderDashboard();
  if (viewId === 'plan')       renderPlanView();
  if (viewId === 'notes')      renderNotesView();
  if (viewId === 'challenges') renderChallengesView();
  if (viewId === 'export')     $('export-preview-code').textContent = generateIndexMD();
}

function updateStats() {
  // Lightweight update without full re-render
  const totalPct = getTotalProgress();
  if ($('stat-total-pct')) { $('stat-total-pct').textContent = totalPct + '%'; setBar('bar-total', totalPct); }
  ACTIVE_PLAN.phases.forEach((phase, i) => {
    const pct = getPhaseProgress(phase); const n = i + 1;
    if ($(`stat-p${n}-pct`)) { $(`stat-p${n}-pct`).textContent = pct + '%'; setBar(`bar-p${n}`, pct); }
  });
}

function refreshAll() {
  syncAppBranding();
  const active = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (active) showView(active);
}

// ════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════
function showToast(msg) {
  let t = document.getElementById('toast-notification');
  if (!t) {
    t = el('div', { id: 'toast-notification', style: `
      position:fixed;bottom:24px;right:24px;z-index:999;
      background:var(--bg-surface);border:1px solid var(--border-accent);
      color:var(--text-primary);padding:12px 20px;border-radius:var(--radius-sm);
      font-size:13px;font-weight:600;font-family:Inter,sans-serif;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      transform:translateY(60px);opacity:0;
      transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
    ` }, msg);
    document.body.appendChild(t);
  } else { t.textContent = msg; }
  requestAnimationFrame(() => {
    t.style.transform = 'translateY(0)'; t.style.opacity = '1';
    setTimeout(() => { t.style.transform = 'translateY(60px)'; t.style.opacity = '0'; }, 2400);
  });
}

// ════════════════════════════════════════════════════════
//  MARK ALL IN WEEK
// ════════════════════════════════════════════════════════
function markAllInWeek(weekId) {
  const week = ACTIVE_PLAN.allWeeks.find(w => w.id === weekId);
  const prog = getWeekProgress(week);
  const allDone = prog.pct === 100;
  week.tasks.forEach(t => { state.tasks[t.id] = !allDone; });
  state.deliverables[week.deliverable.id] = !allDone;
  saveState();
}

// ════════════════════════════════════════════════════════
//  INIT
//  Expoe window.appInit: promise resolvida quando o app termina
//  de carregar (servidor + conteúdo + estado) e renderiza a 1ª view.
// ════════════════════════════════════════════════════════
window.appInit = new Promise(resolve => {
  document.addEventListener('DOMContentLoaded', async () => {
  // Carrega do servidor (SQLite) antes de restaurar, pois a chave de
  // estado depende do id do plano ativo.
  await loadAllFromServer();
  await restoreContent();
  await loadState();
  syncAppBranding();

  // Welcome (estado vazio) — importar primeiro .md
  const welcomeBtn = $('welcome-import-btn');
  if (welcomeBtn) welcomeBtn.addEventListener('click', () => $('modal-config').style.display = 'flex');

  // Navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // Config modal
  $('settings-btn').addEventListener('click', () => {
    if (state.startDate) $('input-start-date').value = state.startDate;
    $('modal-config').style.display = 'flex';
  });
  $('modal-close').addEventListener('click', () => $('modal-config').style.display = 'none');
  $('modal-config').addEventListener('click', e => { if (e.target === $('modal-config')) $('modal-config').style.display = 'none'; });
  $('btn-save-config').addEventListener('click', () => {
    const val = $('input-start-date').value;
    if (val) {
      state.startDate = val; saveState();
      $('modal-config').style.display = 'none';
      showToast('Data de início salva! 🗓️'); refreshAll();
    }
  });

  // Week modal
  $('modal-week-close').addEventListener('click', closeWeekModal);
  $('modal-week').addEventListener('click', e => { if (e.target === $('modal-week')) closeWeekModal(); });
  $('modal-week-done-btn').addEventListener('click', () => {
    if (!activeWeekId) return;
    markAllInWeek(activeWeekId); openWeekModal(activeWeekId);
    showToast('Semana atualizada! 🎯');
  });
  $('modal-week-note-btn').addEventListener('click', () => {
    if (!activeWeekId) return;
    const wid = activeWeekId; closeWeekModal();
    showView('notes'); setTimeout(() => selectNoteWeek(wid), 100);
  });

  // Challenge modal
  $('modal-challenge-close').addEventListener('click', closeChallengeModal);
  $('modal-challenge').addEventListener('click', e => { if (e.target === $('modal-challenge')) closeChallengeModal(); });
  $('modal-challenge-attempt').addEventListener('click', registerAttempt);
  $('modal-challenge-done').addEventListener('click', toggleChallengeDone);

  // Atomic task toggle (delegated)
  $('modal-challenge-body').addEventListener('change', e => {
    const cb = e.target;
    if (cb && cb.dataset && cb.dataset.challenge && cb.dataset.task) {
      toggleChallengeTask(cb.dataset.challenge, cb.dataset.task);
      openChallengeModal(cb.dataset.challenge);
      renderChallengesView();
    }
  });

  // Import .md
  $('import-btn').addEventListener('click', () => $('modal-config').style.display = 'flex');
  $('export-btn').addEventListener('click', () => showView('export'));
  $('btn-import-md').addEventListener('click', () => {
    const file = $('input-import-file').files && $('input-import-file').files[0];
    if (!file) { setImportStatus('Selecione um arquivo .md primeiro.', 'error'); return; }
    handleImportFile(file);
  });
  $('input-import-file').addEventListener('change', () => {
    const file = $('input-import-file').files && $('input-import-file').files[0];
    if (file) setImportStatus(`Arquivo selecionado: ${file.name}. Clique em “Importar .md”.`, '');
  });

  // Method toggle
  $('method-toggle-btn').addEventListener('click', () => {
    const steps = $('method-steps');
    const arrow = $('method-arrow');
    const open = steps.style.display === 'none';
    steps.style.display = open ? 'grid' : 'none';
    arrow.classList.toggle('open', open);
  });

  // Notes
  $('btn-save-note').addEventListener('click', saveNote);
  $('btn-clear-note').addEventListener('click', () => {
    if (!activeNoteWeekId) return;
    $('notes-editor').value = ''; state.notes[activeNoteWeekId] = '';
    saveState(); renderNotesView(); showToast('Nota apagada 🗑️');
  });

  // Export
  $('btn-export-all').addEventListener('click', exportAllZip);
  $('btn-export-week').addEventListener('click', () => {
    const wn = getCurrentWeek();
    if (!wn) { showToast('Importe um plano e configure a data de início primeiro!'); return; }
    const week = ACTIVE_PLAN.allWeeks.find(w => w.id === wn);
    const fn = `semana-${String(wn).padStart(2,'0')}-${week.title.toLowerCase().replace(/ /g,'-').replace(/[^a-z0-9-]/g,'')}.md`;
    downloadMD(fn, generateWeekMD(week));
    showToast('Semana exportada! 📄');
  });
  $('btn-export-progress').addEventListener('click', () => {
    downloadMD('00-progresso.md', generateProgressMD());
    $('export-preview-code').textContent = generateProgressMD();
    showToast('Progresso exportado! 📊');
  });
  $('btn-export-all').addEventListener('mouseenter', () => $('export-preview-code').textContent = generateIndexMD());
  $('btn-export-week').addEventListener('mouseenter', () => {
    const wn = getCurrentWeek();
    const week = wn ? ACTIVE_PLAN.allWeeks.find(w => w.id === wn) : ACTIVE_PLAN.allWeeks[0];
    $('export-preview-code').textContent = week ? generateWeekMD(week) : 'Importe um plano programático para exportar semanas.';
  });
  $('btn-export-progress').addEventListener('mouseenter', () => $('export-preview-code').textContent = generateProgressMD());

  showView('dashboard');
  resolve();
  });
});
