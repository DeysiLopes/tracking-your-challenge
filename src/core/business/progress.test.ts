import { describe, expect, it } from 'vitest';
import {
  challengesFinalized, getChallengeState, getChallengeTasksProgress,
  getCompletedChallengesCount, getCurrentXPLevel, getEarnedXP, getNextXPLevel,
  getPlanXP, getStreak, getTotalProgress, getTotalXP, getWeekProgress,
  hasOverdueChallenges, newlyUnlockedBadges, planFinalized, PLAN_XP,
  type Ctx,
} from './progress';
import { emptyPlan, emptyState } from '../models/tracker';
import type { ChallengesData, Plan } from '../models/tracker';

const plan: Plan = {
  id: 'p1', name: 'P', icon: '🎯', description: '', totalDays: 14, source: 'p.md',
  phases: [{
    id: 1, name: 'F1', icon: '📚', days: 'Dias 1–7', color: 'emerald',
    weeks: [{
      id: 1, title: 'W1', days: 'Dias 1–7', phase: 1,
      tasks: [
        { id: '1-1', text: 'ler', type: 'leitura' },
        { id: '1-2', text: 'praticar', type: 'pratica' },
      ],
      deliverable: { id: '1-d', text: 'entrega', icon: '🎯' },
      obsidianTags: [], obsidianLinks: [],
    }, {
      id: 2, title: 'W2', days: 'Dias 8–14', phase: 1,
      tasks: [{ id: '2-1', text: 'ler', type: 'leitura' }],
      deliverable: { id: '2-d', text: 'entrega', icon: '🎯' },
      obsidianTags: [], obsidianLinks: [],
    }],
  }],
};

const challenges: ChallengesData = {
  method: { name: 'M', steps: [] },
  levels: [{
    id: 1, name: 'L1', color: 'rose', emoji: '🛠️', xpPerChallenge: 500,
    challenges: [{
      id: 'm-01', num: 1, title: 'Banco', description: '', trains: [], obsidianLinks: [], hints: [],
      tasks: [
        { key: 'Fase A', title: 'Fase A', icon: '🖊️', description: '', deps: [], criteria: '' },
        { key: 'App', title: 'Aplicação', icon: '⚙️', description: '', deps: ['Fase A'], criteria: '' },
        { key: 'Dif', title: '(Opcional) Diferenciais', icon: '💡', description: '', deps: [], criteria: '' },
      ],
    }],
  }],
  totalXP: 500,
};

const ctxOf = (s: ReturnType<typeof emptyState>, p = plan, c: ChallengesData | null = challenges): Ctx =>
  ({ state: s, plan: p, challengesData: c });

describe('progresso semanal', () => {
  it('conta tasks + entregável no denominador', () => {
    const s = emptyState();
    const w = plan.phases[0].weeks[0];
    expect(getWeekProgress(s, w)).toEqual({ done: 0, total: 3, pct: 0 });
    s.tasks['1-1'] = true;
    s.deliverables['1-d'] = true;
    expect(getWeekProgress(s, w).pct).toBe(67);
    s.tasks['1-2'] = true;
    expect(getWeekProgress(s, w).pct).toBe(100);
  });
  it('totalProgress agrega semanas', () => {
    const s = emptyState();
    s.tasks['1-1'] = s.tasks['1-2'] = true;
    s.deliverables['1-d'] = true;
    // semana 1: 3/3 · semana 2: 0/2 → 3/5 = 60%
    expect(getTotalProgress(ctxOf(s))).toBe(60);
  });
});

describe('XP do plano', () => {
  it('leitura 10 / pratica 20 / entregável 50 + bônus', () => {
    const s = emptyState();
    s.tasks['1-1'] = true;               // +10
    s.tasks['1-2'] = true;               // +20
    s.deliverables['1-d'] = true;        // +50
    // semana 1 completa +100, fase não (semana 2 aberta)
    expect(getPlanXP(ctxOf(s))).toBe(10 + 20 + 50 + 100);
  });
  it('fase completa dá +300', () => {
    const s = emptyState();
    ['1-1', '1-2', '2-1'].forEach((id) => { s.tasks[id] = true; });
    ['1-d', '2-d'].forEach((id) => { s.deliverables[id] = true; });
    const expected =
      (10 + 20 + 50) + (10 + 50) + // tasks + deliverables
      2 * PLAN_XP.weekBonus + PLAN_XP.phaseBonus;
    expect(getPlanXP(ctxOf(s))).toBe(expected);
  });
  it('sem plano, XP do plano é 0', () => {
    expect(getPlanXP(ctxOf(emptyState(), emptyPlan()))).toBe(0);
  });
});

describe('XP de desafios', () => {
  it('tasks atômicas +25 cada; conclusão +xp do nível', () => {
    const s = emptyState();
    s.challenges['m-01'] = { done: false, attempts: [], tasks: { 'Fase A': true } };
    expect(getEarnedXP(ctxOf(s))).toBe(25);
    s.challenges['m-01'].done = true;
    expect(getEarnedXP(ctxOf(s))).toBe(25 + 500);
  });
  it('getTotalXP soma plano + desafios', () => {
    const s = emptyState();
    s.tasks['1-1'] = true;
    s.challenges['m-01'] = { done: true, attempts: [], tasks: { 'Fase A': true } };
    expect(getTotalXP(ctxOf(s))).toBe(10 + 25 + 500);
  });
  it('níveis por faixa de XP', () => {
    expect(getCurrentXPLevel(0).level).toBe(1);
    expect(getCurrentXPLevel(599).level).toBe(2);
    expect(getCurrentXPLevel(5000).level).toBe(7);
    expect(getNextXPLevel(0)?.minXP).toBe(200);
    expect(getNextXPLevel(6000)).toBeNull();
  });
});

describe('challenge state', () => {
  it('default seguro quando não há registro', () => {
    const cs = getChallengeState(emptyState(), 'm-99');
    expect(cs.done).toBe(false);
    expect(cs.attempts).toEqual([]);
    expect(cs.tasks).toEqual({});
  });
  it('tasks progress conta percentuais', () => {
    const s = emptyState();
    s.challenges['m-01'] = { done: false, attempts: [], tasks: { 'Fase A': true, App: true } };
    const tp = getChallengeTasksProgress(s, challenges.levels[0].challenges[0]);
    expect(tp).toEqual({ done: 2, total: 3, pct: 67 });
  });
});

describe('gates de import', () => {
  it('plano sem conteúdo conta como finalizado', () => {
    expect(planFinalized(ctxOf(emptyState(), emptyPlan()))).toBe(true);
  });
  it('plano só finalizado com todas as semanas 100%', () => {
    const s = emptyState();
    s.tasks['1-1'] = s.tasks['1-2'] = true; s.deliverables['1-d'] = true;
    expect(planFinalized(ctxOf(s))).toBe(false);
    s.tasks['2-1'] = true; s.deliverables['2-d'] = true;
    expect(planFinalized(ctxOf(s))).toBe(true);
  });
  it('desafios só finalizados com todos done', () => {
    const s = emptyState();
    expect(challengesFinalized(ctxOf(s))).toBe(false);
    s.challenges['m-01'] = { done: true, attempts: [] };
    expect(challengesFinalized(ctxOf(s))).toBe(true);
  });
});

describe('streak e atraso', () => {
  it('streak conta dias consecutivos até hoje', () => {
    const s = emptyState();
    // Mesma codificação de getStreak: meia-noite local → ISO date
    const d = (offset: number) => {
      const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - offset);
      return t.toISOString().split('T')[0];
    };
    s.activityDates = [d(0), d(1), d(2), d(4)];
    expect(getStreak(ctxOf(s))).toBe(3);
  });
  it('desafio parado >7 dias sem done → gato chora', () => {
    const s = emptyState();
    s.challenges['m-01'] = {
      done: false, attempts: [],
      lastActivity: new Date(Date.now() - 8 * 86400000).toISOString(),
    };
    expect(hasOverdueChallenges(ctxOf(s))).toBe(true);
    s.challenges['m-01'].done = true;
    expect(hasOverdueChallenges(ctxOf(s))).toBe(false);
  });
});

describe('badges', () => {
  it('desbloqueia badges novas e respeita já conquistadas', () => {
    const s = emptyState();
    s.tasks['1-1'] = true;
    const fresh = newlyUnlockedBadges(ctxOf(s)).map((b) => b.id);
    expect(fresh).toContain('primeira-tarefa');
    s.badges = ['primeira-tarefa'];
    expect(newlyUnlockedBadges(ctxOf(s)).map((b) => b.id)).not.toContain('primeira-tarefa');
  });
  it('contagem de desafios concluídos', () => {
    const s = emptyState();
    expect(getCompletedChallengesCount(ctxOf(s))).toBe(0);
    s.challenges['m-01'] = { done: true, attempts: [] };
    expect(getCompletedChallengesCount(ctxOf(s))).toBe(1);
  });
});
