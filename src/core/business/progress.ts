/**
 * progress.ts — Regras de domínio do Tracker, como funções puras.
 *
 * Tudo que o app.js legado calculava sobre estado global virou função
 * pura recebendo `ctx` ({ plan, challengesData, state }) — testável
 * e desacoplada de UI/storage.
 */
import type {
  Challenge, ChallengeLevel, ChallengeState, ChallengesData, Phase, Plan,
  TrackerState, Week,
} from '../models/tracker';
import { allChallenges, allWeeks } from '../models/tracker';

export interface Ctx {
  plan: Plan;
  challengesData: ChallengesData | null;
  state: TrackerState;
}

// ─── Conteúdo ───
export const hasPlanContent = (ctx: Ctx) => !!(ctx.plan && ctx.plan.id);
export const hasChallengesContent = (ctx: Ctx) =>
  !!(ctx.challengesData && ctx.challengesData.levels && ctx.challengesData.levels.length);
export const hasContent = (ctx: Ctx) => hasPlanContent(ctx) || hasChallengesContent(ctx);

// ─── Gates de import (igual ao legado) ───
export function challengesFinalized(ctx: Ctx): boolean {
  const all = allChallenges(ctx.challengesData);
  return all.length > 0 && all.every((c) => getChallengeState(ctx.state, c.id).done);
}

export function planFinalized(ctx: Ctx): boolean {
  if (!hasPlanContent(ctx)) return true;
  const weeks = allWeeks(ctx.plan);
  return weeks.length > 0 && weeks.every((w) => getWeekProgress(ctx.state, w).pct === 100);
}

// ─── Atraso (gato chora) ───
export function hasOverdueWeeks(ctx: Ctx): boolean {
  if (!hasPlanContent(ctx) || !ctx.state.startDate) return false;
  const now = new Date();
  const weeks = allWeeks(ctx.plan);
  for (const week of weeks) {
    if (getWeekProgress(ctx.state, week).pct < 100) {
      const weekNum = weeks.indexOf(week) + 1;
      const expectedEnd = new Date(ctx.state.startDate);
      expectedEnd.setDate(expectedEnd.getDate() + weekNum * 7);
      if (now > expectedEnd) return true;
    }
  }
  return false;
}

export function hasOverdueChallenges(ctx: Ctx): boolean {
  if (!hasChallengesContent(ctx)) return false;
  const now = new Date();
  for (const challenge of allChallenges(ctx.challengesData)) {
    const cs = getChallengeState(ctx.state, challenge.id);
    if (!cs.done) {
      const activity = cs.lastActivity ? new Date(cs.lastActivity) : new Date(ctx.state.startDate || now);
      const daysSinceUpdate = Math.floor((now.getTime() - activity.getTime()) / 86400000);
      if (daysSinceUpdate > 7) return true;
    }
  }
  return false;
}

// ─── Datas ───
export function getCurrentDay(ctx: Ctx): number | null {
  if (!ctx.state.startDate) return null;
  const start = new Date(ctx.state.startDate + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.max(1, Math.min(ctx.plan.totalDays, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1));
}

export function getCurrentWeek(ctx: Ctx): number | null {
  const day = getCurrentDay(ctx);
  if (!day) return null;
  return Math.min(allWeeks(ctx.plan).length, Math.ceil(day / 7));
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Progresso — plano ───
export function getWeekProgress(state: TrackerState, week: Week): { done: number; total: number; pct: number } {
  const all = [...week.tasks.map((t) => t.id), week.deliverable.id];
  const done = all.filter((id) => state.tasks[id] || state.deliverables[id]).length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
}

export function getPhaseProgress(state: TrackerState, phase: Phase): number {
  const wp = phase.weeks.map((w) => getWeekProgress(state, w));
  const total = wp.reduce((s, w) => s + w.total, 0);
  const done = wp.reduce((s, w) => s + w.done, 0);
  return total ? Math.round((done / total) * 100) : 0;
}

export function getTotalProgress(ctx: Ctx): number {
  const all = allWeeks(ctx.plan).map((w) => getWeekProgress(ctx.state, w));
  const total = all.reduce((s, w) => s + w.total, 0);
  const done = all.reduce((s, w) => s + w.done, 0);
  return total ? Math.round((done / total) * 100) : 0;
}

// ─── XP / Níveis ───
export const XP_LEVELS = [
  { level: 1, title: 'Iniciante',      minXP: 0 },
  { level: 2, title: 'Aprendiz',       minXP: 200 },
  { level: 3, title: 'Praticante',     minXP: 600 },
  { level: 4, title: 'Competente',     minXP: 1200 },
  { level: 5, title: 'Proficiente',    minXP: 2200 },
  { level: 6, title: 'Senior',         minXP: 3500 },
  { level: 7, title: 'Staff Engineer', minXP: 5000 },
] as const;

export type XPLevel = (typeof XP_LEVELS)[number];

export const PLAN_XP = { leitura: 10, pratica: 20, deliverable: 50, weekBonus: 100, phaseBonus: 300 } as const;
export const CHALLENGE_TASK_XP = 25;

export function getChallengeState(state: TrackerState, id: string): ChallengeState {
  const cs = state.challenges[id] || { done: false, attempts: [], tasks: {} };
  if (!cs.tasks) cs.tasks = {};
  return cs;
}

export function getChallengeTasksProgress(state: TrackerState, challenge: Challenge): { done: number; total: number; pct: number } {
  const cs = getChallengeState(state, challenge.id);
  const tasks = challenge.tasks || [];
  const total = tasks.length;
  const done = tasks.filter((t) => cs.tasks![t.key]).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** XP dos desafios mão na massa: tasks atômicas +25, conclusão +xp do nível. */
export function getEarnedXP(ctx: Ctx): number {
  let xp = 0;
  allChallenges(ctx.challengesData).forEach((c) => {
    const cs = getChallengeState(ctx.state, c.id);
    (c.tasks || []).forEach((t) => { if (cs.tasks && cs.tasks[t.key]) xp += CHALLENGE_TASK_XP; });
    if (cs.done) xp += c.xp || 0;
  });
  return xp;
}

/** XP do plano: leitura 10 · prática 20 · entregável 50 · semana 100 · fase 300. */
export function getPlanXP(ctx: Ctx): number {
  let xp = 0;
  if (!hasPlanContent(ctx)) return 0;
  allWeeks(ctx.plan).forEach((w) => {
    w.tasks.forEach((t) => {
      if (ctx.state.tasks[t.id]) xp += t.type === 'pratica' ? PLAN_XP.pratica : PLAN_XP.leitura;
    });
    if (ctx.state.deliverables[w.deliverable.id]) xp += PLAN_XP.deliverable;
    if (getWeekProgress(ctx.state, w).pct === 100) xp += PLAN_XP.weekBonus;
  });
  ctx.plan.phases.forEach((ph) => {
    const allDone = ph.weeks.length > 0 && ph.weeks.every((w) => getWeekProgress(ctx.state, w).pct === 100);
    if (allDone) xp += PLAN_XP.phaseBonus;
  });
  return xp;
}

export const getTotalXP = (ctx: Ctx) => getEarnedXP(ctx) + getPlanXP(ctx);

export function getCompletedChallengesCount(ctx: Ctx): number {
  return allChallenges(ctx.challengesData).filter((c) => getChallengeState(ctx.state, c.id).done).length;
}

/** Dias consecutivos com atividade (plano ou desafios), contando a partir de hoje. */
export function getStreak(ctx: Ctx): number {
  const datesSet = new Set<string>(ctx.state.activityDates || []);
  Object.values(ctx.state.challenges || {}).forEach((cs) => {
    (cs.attempts || []).forEach((a) => datesSet.add(a.date.split('T')[0]));
    if (cs.done) datesSet.add(new Date().toISOString().split('T')[0]);
  });
  let streak = 0;
  const d = new Date(); d.setHours(0, 0, 0, 0);
  while (datesSet.has(d.toISOString().split('T')[0])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getCurrentXPLevel(xp: number): XPLevel {
  let current: XPLevel = XP_LEVELS[0];
  for (const lvl of XP_LEVELS) {
    if (xp >= lvl.minXP) current = lvl;
  }
  return current;
}

export function getNextXPLevel(xp: number): XPLevel | null {
  return XP_LEVELS.find((l) => l.minXP > xp) || null;
}

// ─── Badges ───
export interface BadgeDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  check: (ctx: Ctx) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'primeira-tarefa',  icon: '🚀', name: 'Primeira Tarefa',  desc: 'Conclua a primeira tarefa do plano.',      check: (c) => Object.keys(c.state.tasks).some((id) => c.state.tasks[id]) },
  { id: 'primeira-semana',  icon: '📅', name: 'Primeira Semana',  desc: 'Conclua 100% de uma semana.',               check: (c) => allWeeks(c.plan).some((w) => getWeekProgress(c.state, w).pct === 100) },
  { id: 'primeira-fase',    icon: '🧱', name: 'Fase Concluída',   desc: 'Conclua uma fase inteira do plano.',        check: (c) => c.plan.phases.some((ph) => ph.weeks.length > 0 && ph.weeks.every((w) => getWeekProgress(c.state, w).pct === 100)) },
  { id: 'plano-completo',   icon: '🏆', name: 'Plano Completo',   desc: 'Conclua 100% do plano programático.',       check: (c) => hasPlanContent(c) && getTotalProgress(c) === 100 },
  { id: 'primeiro-desafio', icon: '⚔️', name: 'Primeiro Desafio', desc: 'Conclua o primeiro desafio.',               check: (c) => getCompletedChallengesCount(c) > 0 },
  { id: 'task-atomicas',    icon: '🧩', name: 'Tasks Atômicas',   desc: 'Conclua todas as tasks de um desafio.',     check: (c) => allChallenges(c.challengesData).some((ch) => getChallengeTasksProgress(c.state, ch).pct === 100) },
  { id: 'desafio-final',    icon: '👑', name: 'Desafio Final',    desc: 'Conclua TODOS os desafios.',                check: (c) => allChallenges(c.challengesData).length > 0 && getCompletedChallengesCount(c) === allChallenges(c.challengesData).length },
  { id: 'streak-3',         icon: '🔥', name: 'Ritmo 3 Dias',     desc: 'Fique 3 dias seguidos ativo.',              check: (c) => getStreak(c) >= 3 },
  { id: 'streak-7',         icon: '⚡', name: 'Ritmo 7 Dias',     desc: 'Fique 7 dias seguidos ativo.',              check: (c) => getStreak(c) >= 7 },
  { id: 'streak-30',        icon: '🌋', name: 'Ritmo 30 Dias',    desc: 'Fique 30 dias seguidos ativo.',             check: (c) => getStreak(c) >= 30 },
  { id: 'xp-500',           icon: '💎', name: '500 XP',           desc: 'Acumule 500 XP no total.',                  check: (c) => getTotalXP(c) >= 500 },
  { id: 'xp-1500',          icon: '💠', name: '1500 XP',          desc: 'Acumule 1500 XP no total.',                 check: (c) => getTotalXP(c) >= 1500 },
];

export const isBadgeUnlocked = (state: TrackerState, id: string) => (state.badges || []).includes(id);

/** Badges que acabaram de ser desbloqueadas (não constam em state.badges). */
export function newlyUnlockedBadges(ctx: Ctx): BadgeDef[] {
  const unlocked = ctx.state.badges || [];
  return BADGES.filter((b) => {
    if (unlocked.includes(b.id)) return false;
    try { return b.check(ctx); } catch { return false; }
  });
}

/** Desafios com 100% das tasks atômicas (detalhe do badge 🧩). */
export function fullyTaskedChallenges(ctx: Ctx): Challenge[] {
  return allChallenges(ctx.challengesData).filter((c) => getChallengeTasksProgress(ctx.state, c).pct === 100);
}

export type { ChallengeLevel };
