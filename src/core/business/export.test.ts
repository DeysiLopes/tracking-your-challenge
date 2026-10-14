import { describe, expect, it } from 'vitest';
import { generateChallengeMD, generateIndexMD, generateProgressMD, generateWeekMD } from './export';
import { emptyState } from '../models/tracker';
import type { ChallengesData, Plan } from '../models/tracker';
import type { Ctx } from './progress';

const plan: Plan = {
  id: 'p1', name: 'Plano Teste', icon: '🎯', description: '', totalDays: 7, source: 'p.md',
  phases: [{
    id: 1, name: 'Fase Um', icon: '📚', days: 'Dias 1–7', color: 'emerald',
    weeks: [{
      id: 1, title: 'Primeira Semana', days: 'Dias 1–7', phase: 1,
      tasks: [{ id: '1-1', text: 'ler SOLID', type: 'leitura' }],
      deliverable: { id: '1-d', text: 'resumo escrito', icon: '🎯' },
      obsidianTags: ['plano-fase-um'],
      obsidianLinks: ['[[SOLID]]'],
    }],
  }],
};

const challenges: ChallengesData = {
  method: { name: 'M', steps: [] },
  levels: [{
    id: 1, name: 'L1', color: 'rose', emoji: '🛠️', xpPerChallenge: 500,
    challenges: [{
      id: 'm-01', num: 1, title: 'Sistema Bancário', description: 'desc',
      trains: ['Hexagonal'], obsidianLinks: ['[[Hexagonal]]'], hints: ['hint?'],
      tasks: [], levelId: 1, xp: 500,
    }],
  }],
};

const ctxOf = (s = emptyState()): Ctx => ({ state: s, plan, challengesData: challenges });

describe('export — week md', () => {
  it('gera frontmatter + checkboxes + nota', () => {
    const s = emptyState();
    s.tasks['1-1'] = true;
    s.notes['1'] = 'minha nota aqui';
    const md = generateWeekMD(ctxOf(s), plan.phases[0].weeks[0]);
    expect(md).toContain('semana: 1');
    expect(md).toContain('- [x] ler SOLID');
    expect(md).toContain('- [ ] 🎯 resumo escrito');
    expect(md).toContain('minha nota aqui');
    expect(md).toContain('#plano-fase-um');
  });
});

describe('export — challenge md', () => {
  it('marca status e tentativas', () => {
    const s = emptyState();
    s.challenges['m-01'] = {
      done: true,
      attempts: [{ date: '2024-01-02T10:00:00Z', text: 'tentei X' }],
    };
    const md = generateChallengeMD(ctxOf(s), challenges.levels[0].challenges[0]);
    expect(md).toContain('concluido: true');
    expect(md).toContain('✅ Concluído');
    expect(md).toContain('### Tentativa 1');
    expect(md).toContain('tentei X');
  });
});

describe('export — progress + index', () => {
  it('progress inclui tabelas de semana e desafio', () => {
    const s = emptyState();
    s.tasks['1-1'] = true;
    const md = generateProgressMD(ctxOf(s));
    expect(md).toContain('| 1 | Primeira Semana | Dias 1–7 | 🔄 | 50% |');
    expect(md).toContain('| #1 | Sistema Bancário | ⏳ | 0 XP |');
  });
  it('index linka semanas e desafios com wikilinks', () => {
    const md = generateIndexMD(ctxOf());
    expect(md).toContain('[[semana-01-primeira-semana|Semana 1 — Primeira Semana]]');
    expect(md).toContain('[[desafio-01-sistema-bancrio|#1 Sistema Bancário]]');
  });
});
