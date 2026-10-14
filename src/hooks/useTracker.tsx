/**
 * useTracker — estado global do Tracker (contexto React).
 *
 * Substitui os globais do app.js legado: plano ativo, desafios,
 * estado persistido (IndexedDB → server.py → localStorage), sync
 * opcional com Drive, mascot (animações), toast e todas as ações
 * (toggle, tentativas, import, notas, badges).
 *
 * Toda escrita passa por aqui → persist() → IDB + carimbo p/ Drive
 * (+ server.py se estiver rodando + espelho localStorage).
 */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type {
  Challenge, ChallengesData, Plan, TrackerContent, TrackerSnapshot, TrackerState, Week,
} from '../core/models/tracker';
import { allChallenges, allWeeks, emptyPlan, emptyState } from '../core/models/tracker';
import { parsePlanMD } from '../core/business/parser';
import * as TrackerDB from '../core/storage/db';
import { TrackerDrive } from '../core/storage/drive';
import {
  challengesFinalized, getChallengeState, getChallengeTasksProgress,
  getCompletedChallengesCount, getCurrentXPLevel, getTotalProgress,
  getTotalXP, hasChallengesContent, hasOverdueChallenges, hasOverdueWeeks,
  hasPlanContent, newlyUnlockedBadges, planFinalized, PLAN_XP, type Ctx,
} from '../core/business/progress';
import { catName } from '../core/business/cats';

const STATE_KEY_BASE = '90dias-tracker-state';
const CONTENT_KEY = '90dias-tracker-content';
const THEME_KEY = '90dias-tracker-theme';

const stateKeyFor = (planId: string | null) =>
  STATE_KEY_BASE + (planId ? '-' + planId : '');

// ────────────────────────────────────────────────────────────
//  MASCOTE — reações
// ────────────────────────────────────────────────────────────
const MASCOT_SAYS = [
  'Meow! Ótimo! 🐾',
  'Você é incrível! 😼',
  'Continue assim! 🔥',
  'Mais um passo! ✨',
  'Purrr... 🐱',
];

type MascotAnim = 'idle' | 'lick' | 'celebrate';
export interface Mascot {
  level: number;
  anim: MascotAnim;
  saying: string | null;
  crying: boolean;
  confettiKey: number;
}

export interface DriveStatus { connected: boolean; user?: string }

export interface ImportResult { ok: boolean; msg: string }

interface TrackerContextValue {
  loaded: boolean;
  ctx: Ctx;
  plan: Plan;
  challengesData: ChallengesData | null;
  state: TrackerState;
  weeks: Week[];
  challenges: Challenge[];
  mascot: Mascot;
  theme: string;
  driveStatus: DriveStatus;
  toast: (msg: string) => void;
  setTheme: (t: string) => void;
  setStartDate: (d: string) => void;
  toggleTask: (id: string, type: 'tasks' | 'deliverables') => void;
  toggleChallengeTask: (challengeId: string, taskKey: string) => void;
  registerAttempt: (challengeId: string, text: string) => void;
  toggleChallengeDone: (challengeId: string, attemptText: string) => void;
  markAllInWeek: (weekId: number) => void;
  saveWeekNote: (weekId: number, text: string) => void;
  saveChallengeNote: (challengeId: string, text: string) => void;
  clearChallengeNotes: (challengeId: string) => void;
  importFile: (file: File) => Promise<ImportResult>;
  connectDrive: () => Promise<void>;
  disconnectDrive: () => Promise<void>;
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

// Semeia o IDB a partir do espelho localStorage (migração silenciosa)
function seedFromLocalStorage(): TrackerSnapshot | null {
  const snap: TrackerSnapshot = { content: null, states: {} };
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (raw) snap.content = JSON.parse(raw);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STATE_KEY_BASE)) {
        const v = localStorage.getItem(k);
        if (v) snap.states[k] = JSON.parse(v);
      }
    }
  } catch { /* ignore */ }
  return snap.content != null || Object.keys(snap.states).length ? snap : null;
}

async function loadSnapshot(): Promise<{ snap: TrackerSnapshot; serverUp: boolean }> {
  const snap: TrackerSnapshot = { content: null, states: {} };
  let authoritative = false;
  let serverUp = false;

  // 1) IndexedDB — fonte local-first
  try {
    const fromIdb = await TrackerDB.getAll();
    if (fromIdb.content != null || Object.keys(fromIdb.states).length) {
      snap.content = fromIdb.content;
      snap.states = fromIdb.states || {};
      authoritative = true;
    }
  } catch (e) {
    console.warn('IndexedDB indisponível; usando fallbacks', e);
  }

  // 2) server.py (se rodando): semeia o IDB, dual-write segue ativo
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const srv: TrackerSnapshot = await res.json();
      srv.states = srv.states || {};
      serverUp = true;
      if (!authoritative) {
        snap.content = srv.content;
        snap.states = srv.states;
        authoritative = true;
      } else {
        for (const k of Object.keys(srv.states)) {
          if (!(k in snap.states)) snap.states[k] = srv.states[k];
        }
        if (snap.content == null && srv.content != null) snap.content = srv.content;
      }
      try { await TrackerDB.seed(srv); } catch { /* ignore */ }
      return { snap, serverUp };
    }
  } catch { /* sem servidor — normal em produção estática */ }

  // 3) localStorage legado — semeia o IDB para a próxima abertura
  if (!authoritative) {
    const ls = seedFromLocalStorage();
    if (ls) {
      snap.content = ls.content;
      snap.states = ls.states;
      try { await TrackerDB.seed(ls); } catch { /* ignore */ }
    }
  }
  return { snap, serverUp };
}

export const TrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState<Plan>(emptyPlan());
  const [challengesData, setChallengesData] = useState<ChallengesData | null>(null);
  const [snapshot, setSnapshot] = useState<TrackerSnapshot>({ content: null, states: {} });
  const [state, setState_] = useState<TrackerState>(emptyState());
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null);
  const [theme, setTheme_] = useState('catppuccin');
  const [driveStatus, setDriveStatus] = useState<DriveStatus>({ connected: false });
  const [mascot, setMascot] = useState<Mascot>({ level: 1, anim: 'idle', saying: null, crying: false, confettiKey: 0 });

  const stateRef = useRef(state);
  const snapshotRef = useRef(snapshot);
  const serverApiRef = useRef(false);
  const lastLevelRef = useRef(1);
  const mascotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  stateRef.current = state;
  snapshotRef.current = snapshot;

  // ─── Toast ───
  const toast = useCallback((msg: string) => {
    const id = Date.now();
    setToastMsg({ id, text: msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);

  // ─── Mascote ───
  const mascotSay = useCallback((text: string, ms = 2600) => {
    setMascot((m) => ({ ...m, saying: text }));
    if (sayTimer.current) clearTimeout(sayTimer.current);
    sayTimer.current = setTimeout(() => setMascot((m) => ({ ...m, saying: null })), ms);
  }, []);

  const mascotAnim = useCallback((anim: MascotAnim, ms: number) => {
    setMascot((m) => ({ ...m, anim }));
    if (mascotTimer.current) clearTimeout(mascotTimer.current);
    mascotTimer.current = setTimeout(() => setMascot((m) => ({ ...m, anim: 'idle' })), ms);
  }, []);

  const mascotCheer = useCallback(() => {
    mascotAnim('lick', 1700);
    mascotSay(MASCOT_SAYS[Math.floor(Math.random() * MASCOT_SAYS.length)], 2000);
  }, [mascotAnim, mascotSay]);

  const mascotCelebrate = useCallback(() => {
    mascotAnim('celebrate', 2400);
    setMascot((m) => ({ ...m, confettiKey: m.confettiKey + 1 }));
    mascotSay('Meow! 🎉');
  }, [mascotAnim, mascotSay]);

  // ─── ctx derivado (funções puras de progresso) ───
  const ctx: Ctx = useMemo(
    () => ({ plan, challengesData, state }),
    [plan, challengesData, state]
  );
  const weeks = useMemo(() => allWeeks(plan), [plan]);
  const challenges = useMemo(() => allChallenges(challengesData), [challengesData]);

  // ─── Persistência ───
  const persist = useCallback((payload: TrackerDB.PatchPayload) => {
    TrackerDB.patch(payload)
      .then(() => TrackerDrive.onLocalChange(payload.state ? payload.state.key : 'content'))
      .catch((e) => console.warn('Falha ao salvar no IndexedDB', e));
    if (serverApiRef.current) {
      fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('Falha ao salvar no servidor', e));
    }
  }, []);

  const saveState = useCallback((next: TrackerState) => {
    const key = stateKeyFor(plan.id || next.activePlanId);
    setSnapshot((snap) => {
      const s = { ...snap, states: { ...snap.states, [key]: next } };
      snapshotRef.current = s;
      return s;
    });
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
    persist({ state: { key, value: next } });
  }, [persist, plan.id]);

  const updateState = useCallback((fn: (draft: TrackerState) => void) => {
    const next = structuredClone(stateRef.current);
    fn(next);
    stateRef.current = next;
    setState_(next);
    saveState(next);
  }, [saveState]);

  const saveContent = useCallback((p: Plan, d: ChallengesData | null) => {
    const hasD = !!(d && d.levels && d.levels.length);
    const content: TrackerContent = {
      plan: p.id ? p : null,
      planSource: p.id ? p.source : null,
      challenges: hasD ? d : null,
      challengesSource: hasD ? (d!.source || null) : null,
    };
    setSnapshot((snap) => {
      const s = { ...snap, content };
      snapshotRef.current = s;
      return s;
    });
    try { localStorage.setItem(CONTENT_KEY, JSON.stringify(content)); } catch { /* ignore */ }
    persist({ content });
  }, [persist]);

  // ─── Boot ───
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Tema
      try {
        const t = localStorage.getItem(THEME_KEY);
        const theme = t === 'premium' || t === 'catppuccin' ? t : 'catppuccin';
        document.documentElement.setAttribute('data-theme', theme);
        setTheme_(theme);
      } catch { /* ignore */ }

      const { snap, serverUp } = await loadSnapshot();
      serverApiRef.current = serverUp;

      // Drive: se estava conectado, baixa e funde antes de renderizar
      try {
        const merged = await TrackerDrive.boot();
        if (merged) {
          snap.content = merged.content;
          snap.states = merged.states || {};
          try {
            if (snap.content != null) localStorage.setItem(CONTENT_KEY, JSON.stringify(snap.content));
            for (const k of Object.keys(snap.states)) localStorage.setItem(k, JSON.stringify(snap.states[k]));
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.warn('Drive sync no boot falhou', e);
      }
      TrackerDrive.onStatus((s) => setDriveStatus(s));
      if (cancelled) return;

      // Restaura conteúdo + estado do plano ativo
      const c = snap.content;
      let st: TrackerState = emptyState();
      if (c && c.plan && c.plan.id && Array.isArray(c.plan.phases)) {
        setPlan(c.plan);
        const key = stateKeyFor(c.plan.id);
        const raw = snap.states[key];
        st = raw ? { ...emptyState(), ...raw } : { ...emptyState(), activePlanId: c.plan.id };
      }
      if (c && c.challenges && Array.isArray(c.challenges.levels)) {
        setChallengesData(c.challenges);
      }
      setSnapshot(snap);
      setState_(st);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Nível do gato + choro por atraso ───
  const totalXP = getTotalXP(ctx);
  useEffect(() => {
    if (!loaded) return;
    const lvl = getCurrentXPLevel(totalXP).level;
    if (lvl > lastLevelRef.current) {
      mascotCelebrate();
      mascotSay(`Você virou ${catName(lvl)}! 🐾`, 3200);
    }
    lastLevelRef.current = lvl;
    setMascot((m) => ({ ...m, level: lvl }));
  }, [totalXP, loaded, mascotCelebrate, mascotSay]);

  useEffect(() => {
    if (!loaded) return;
    const crying = hasOverdueWeeks(ctx) || hasOverdueChallenges(ctx);
    setMascot((m) => ({ ...m, crying }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, plan, challengesData, loaded]);

  // ─── Badges recém-desbloqueadas → toast + persist ───
  useEffect(() => {
    if (!loaded) return;
    const fresh = newlyUnlockedBadges(ctx);
    if (!fresh.length) return;
    updateState((s) => { s.badges = [...(s.badges || []), ...fresh.map((b) => b.id)]; });
    fresh.forEach((b, i) => setTimeout(() => toast(`${b.icon} Badge desbloqueado: ${b.name}!`), 150 + i * 200));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, loaded]);

  // ─── Branding (título + sidebar via props) ───
  useEffect(() => {
    document.title = plan.id ? `${plan.name} — Tracker` : 'Tracker — Importe seu .md';
  }, [plan]);

  // ─── Atividade (streak) ───
  const recordActivity = (s: TrackerState) => {
    const today = new Date().toISOString().split('T')[0];
    s.activityDates = s.activityDates || [];
    if (!s.activityDates.includes(today)) s.activityDates.push(today);
  };

  // ─── Ações ───
  const toggleTask = useCallback((id: string, type: 'tasks' | 'deliverables') => {
    const was = !!stateRef.current[type][id];
    updateState((s) => { s[type][id] = !s[type][id]; });
    if (!was) {
      updateState((s) => recordActivity(s));
      mascotCheer();
      if (type === 'deliverables') toast(`+${PLAN_XP.deliverable} XP · Entregável concluído! 🎯`);
      else {
        const t = allWeeks(plan).flatMap((w) => w.tasks).find((t) => t.id === id);
        const xp = t && t.type === 'pratica' ? PLAN_XP.pratica : PLAN_XP.leitura;
        toast(`+${xp} XP${t && t.type === 'pratica' ? ' · Mão na massa!' : ''} ⚡`);
      }
    }
  }, [updateState, mascotCheer, toast, plan]);

  const toggleChallengeTask = useCallback((challengeId: string, taskKey: string) => {
    const cs = getChallengeState(stateRef.current, challengeId);
    const was = !!(cs.tasks && cs.tasks[taskKey]);
    updateState((s) => {
      const c = getChallengeState(s, challengeId);
      c.tasks = c.tasks || {};
      c.tasks[taskKey] = !c.tasks[taskKey];
      if (c.tasks[taskKey] && !was) {
        recordActivity(s);
        c.lastActivity = new Date().toISOString();
      }
      s.challenges[challengeId] = c;
    });
    if (!was) {
      mascotCheer();
      const c = challenges.find((c) => c.id === challengeId);
      const t = c && c.tasks ? c.tasks.find((t) => t.key === taskKey) : null;
      if (t) toast(`+25 XP · ${t.title} ⚡`);
    }
  }, [updateState, mascotCheer, toast, challenges]);

  const registerAttempt = useCallback((challengeId: string, text: string) => {
    updateState((s) => {
      if (!s.challenges[challengeId]) s.challenges[challengeId] = { done: false, attempts: [], tasks: {} };
      const cs = s.challenges[challengeId];
      cs.attempts.push({ date: new Date().toISOString(), text });
      cs.lastActivity = new Date().toISOString();
      recordActivity(s);
    });
    toast('Tentativa registrada! 🔄');
  }, [updateState, toast]);

  const toggleChallengeDone = useCallback((challengeId: string, attemptText: string) => {
    const challengeObj = challenges.find((c) => c.id === challengeId);
    if (!challengeObj) return;
    const cs = getChallengeState(stateRef.current, challengeId);

    if (!cs.done) {
      // Gate 1: todas as tasks obrigatórias (não-opcionais) concluídas
      const required = (challengeObj.tasks || []).filter((t) => !/opcional|diferencial/i.test(t.title));
      const requiredAll = required.length ? required.every((t) => cs.tasks && cs.tasks[t.key]) : true;
      if (!requiredAll) {
        toast('Complete todas as tasks obrigatórias antes de concluir!');
        return;
      }
      // Gate 2: exige uma tentativa — texto novo ou tentativa anterior válida
      const hasPastAttempts = cs.attempts && cs.attempts.some((a) => a && a.text && a.text.trim().length > 0);
      const text = (attemptText || '').trim();
      if (!text && !hasPastAttempts) {
        toast('✏️ Escreva a solução ou nota do entregável antes de concluir!');
        return;
      }
      updateState((s) => {
        if (!s.challenges[challengeId]) s.challenges[challengeId] = { done: false, attempts: [], tasks: {} };
        const c = s.challenges[challengeId];
        if (text) c.attempts.push({ date: new Date().toISOString(), text });
        c.done = true;
        c.lastActivity = new Date().toISOString();
        // Badge de gatinho colecionável por desafio concluído
        s.challengeBadges = s.challengeBadges || [];
        if (!s.challengeBadges.some((b) => b.challengeId === challengeId)) {
          s.challengeBadges.push({
            challengeId,
            num: challengeObj.num,
            title: challengeObj.title,
            xp: challengeObj.xp,
            date: new Date().toISOString().split('T')[0],
            skin: getCurrentXPLevel(getTotalXP(ctx)).level,
          });
        }
        recordActivity(s);
      });
      toast(`+${challengeObj.xp} XP! Desafio concluído! ⚡`);
      mascotCelebrate();
    } else {
      updateState((s) => {
        if (!s.challenges[challengeId]) s.challenges[challengeId] = { done: false, attempts: [], tasks: {} };
        s.challenges[challengeId].done = false;
      });
      toast('Desafio desmarcado');
    }
  }, [challenges, ctx, updateState, toast, mascotCelebrate]);

  const markAllInWeek = useCallback((weekId: number) => {
    const week = weeks.find((w) => w.id === weekId);
    if (!week) return;
    const allIds = [...week.tasks.map((t) => t.id)];
    const allDone = week.tasks.every((t) => stateRef.current.tasks[t.id]) && stateRef.current.deliverables[week.deliverable.id];
    updateState((s) => {
      allIds.forEach((id) => { s.tasks[id] = !allDone; });
      s.deliverables[week.deliverable.id] = !allDone;
    });
  }, [weeks, updateState]);

  const saveWeekNote = useCallback((weekId: number, text: string) => {
    updateState((s) => { s.notes[weekId] = text; });
  }, [updateState]);

  const saveChallengeNote = useCallback((challengeId: string, text: string) => {
    updateState((s) => {
      if (!s.challenges[challengeId]) s.challenges[challengeId] = { done: false, attempts: [], tasks: {} };
      s.challenges[challengeId].attempts.push({ date: new Date().toISOString(), text });
      recordActivity(s);
    });
  }, [updateState]);

  const clearChallengeNotes = useCallback((challengeId: string) => {
    updateState((s) => { s.challenges[challengeId] = { done: false, attempts: [] }; });
  }, [updateState]);

  const setStartDate = useCallback((d: string) => {
    updateState((s) => { s.startDate = d; });
  }, [updateState]);

  const setTheme = useCallback((t: string) => {
    const theme = t === 'premium' || t === 'catppuccin' ? t : 'catppuccin';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
    setTheme_(theme);
  }, []);

  // ─── Import de .md (gates iguais ao legado) ───
  const importFile = useCallback(async (file: File): Promise<ImportResult> => {
    const text = await file.text();
    const parsed = parsePlanMD(text, file.name);
    if (!parsed.type) {
      return { ok: false, msg: '⚠️ Formato não reconhecido. Use um .md de plano (com "## FASE ...") ou de desafios (com "## Desafio N ...").' };
    }
    if (parsed.type === 'programatico') {
      if (hasPlanContent(ctx) && !planFinalized(ctx)) {
        const prog = getTotalProgress(ctx);
        return { ok: false, msg: `⛔ Upload bloqueado: finalize o plano atual (${prog}% completo) antes de importar um novo.` };
      }
      const newPlan = parsed.plan;
      // Estado do novo plano: reusa se existir (plano reimportado)
      const key = stateKeyFor(newPlan.id);
      const existing = snapshotRef.current.states[key];
      const st: TrackerState = existing
        ? { ...emptyState(), ...existing, activePlanId: newPlan.id }
        : { ...emptyState(), activePlanId: newPlan.id };
      if (!st.startDate) st.startDate = new Date().toISOString().slice(0, 10);
      setPlan(newPlan);
      stateRef.current = st;
      setState_(st);
      saveState(st);
      saveContent(newPlan, challengesData);
      const nWeeks = newPlan.phases.reduce((s, p) => s + (p.weeks || []).length, 0);
      return { ok: true, msg: `✅ Plano importado de ${file.name}: ${newPlan.totalDays} dias, ${nWeeks} semana(s).` };
    }
    // mão na massa — só com todos os desafios atuais concluídos
    if (hasChallengesContent(ctx) && !challengesFinalized(ctx)) {
      const done = getCompletedChallengesCount(ctx);
      const total = challenges.length;
      return { ok: false, msg: `⛔ Upload bloqueado: finalize os desafios atuais (${done}/${total} concluídos) antes de importar uma nova lista.` };
    }
    const data = parsed.challenges;
    setChallengesData(data);
    saveContent(plan, data);
    if (!stateRef.current.startDate) {
      updateState((s) => { s.startDate = new Date().toISOString().slice(0, 10); });
    }
    const n = allChallenges(data).length;
    return { ok: true, msg: `✅ Desafios importados de ${file.name}: ${n} desafio(s) substituindo a lista anterior.` };
  }, [plan, challengesData, challenges, ctx, saveState, saveContent, updateState]);

  // ─── Drive ───
  const connectDrive = useCallback(async () => {
    const r = await TrackerDrive.connect();
    setDriveStatus(TrackerDrive.status());
    if (r.merged) applySnapshot(r.merged);
    toast(`Google Drive conectado${r.user ? ' · ' + r.user : ''} ☁️`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const disconnectDrive = useCallback(async () => {
    await TrackerDrive.disconnect();
    setDriveStatus(TrackerDrive.status());
    toast('Drive desconectado — seus dados continuam salvos localmente.');
  }, [toast]);

  /** Aplica snapshot vindo do Drive (pull-merge) e re-renderiza. */
  const applySnapshot = useCallback((snap: TrackerSnapshot) => {
    snapshotRef.current = snap;
    setSnapshot(snap);
    try {
      if (snap.content != null) localStorage.setItem(CONTENT_KEY, JSON.stringify(snap.content));
      for (const k of Object.keys(snap.states || {})) localStorage.setItem(k, JSON.stringify(snap.states[k]));
    } catch { /* ignore */ }
    const c = snap.content;
    if (c && c.plan && c.plan.id && Array.isArray(c.plan.phases)) {
      setPlan(c.plan);
      const key = stateKeyFor(c.plan.id);
      const raw = snap.states[key];
      const st = raw ? { ...emptyState(), ...raw } : { ...emptyState(), activePlanId: c.plan.id };
      stateRef.current = st;
      setState_(st);
    }
    if (c && c.challenges && Array.isArray(c.challenges.levels)) {
      setChallengesData(c.challenges);
    }
  }, []);

  const value: TrackerContextValue = {
    loaded, ctx, plan, challengesData, state, weeks, challenges,
    mascot, theme, driveStatus,
    toast, setTheme, setStartDate,
    toggleTask, toggleChallengeTask, registerAttempt, toggleChallengeDone,
    markAllInWeek, saveWeekNote, saveChallengeNote, clearChallengeNotes,
    importFile, connectDrive, disconnectDrive,
  };

  return (
    <TrackerContext.Provider value={value}>
      {children}
      {toastMsg && (
        <div id="toast-notification" className="toast show" key={toastMsg.id}>
          {toastMsg.text}
        </div>
      )}
    </TrackerContext.Provider>
  );
};

export function useTracker(): TrackerContextValue {
  const v = useContext(TrackerContext);
  if (!v) throw new Error('useTracker fora do TrackerProvider');
  return v;
}
