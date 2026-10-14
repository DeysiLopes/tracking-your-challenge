import { describe, expect, it } from 'vitest';
import { parsePlanMD } from './parser';
import { allChallenges, allWeeks } from '../models/tracker';

const PLAN_MD = `# Plano 30 dias — Java Backend

## FASE 1 — Dias 1–15: Fundamentos

### Semana 1 — SOLID
- Ler capítulo de SOLID
- Mão na massa: refatorar serviço
- **Entregável:** documento com exemplos

### Semana 2 — Arquitetura
- Ler sobre hexagonal
- **Entregável:** desenho da arquitetura

## FASE 2 — Dias 16–30: Projetos

### Semana 1 — API REST
- Construir endpoints
- **Entregável:** API rodando
`;

const CHALLENGES_MD = `# Desafios mão na massa

## 🏦 Desafio 1 — Sistema Bancário (Hexagonal + DDD)

Implemente um sistema bancário com arquitetura hexagonal.

### 🖊️ Fase A
- desenhe primeiro

### 🧱 Requisitos funcionais
- contas
- transferências

### 🧠 Arquitetura obrigatória
- camadas separadas

## 🏦 Desafio 2 — E-commerce (Kafka)

Descrição do segundo desafio com texto longo suficiente para passar no filtro.
`;

describe('parsePlanMD — detecção', () => {
  it('detecta plano programático', () => {
    const r = parsePlanMD(PLAN_MD, 'plano.md');
    expect(r.type).toBe('programatico');
  });
  it('detecta desafios mão na massa', () => {
    const r = parsePlanMD(CHALLENGES_MD, 'desafios.md');
    expect(r.type).toBe('mao-na-massa');
  });
  it('retorna null para formato desconhecido', () => {
    expect(parsePlanMD('# só um título\n\ntexto qualquer', 'x.md').type).toBeNull();
  });
});

describe('parsePlanMD — programático', () => {
  const r = parsePlanMD(PLAN_MD, 'plano-30dias.md');
  if (r.type !== 'programatico') throw new Error('tipo errado');
  const { plan } = r;

  it('extrai nome do H1 e id do filename', () => {
    expect(plan.name).toBe('Plano 30 dias');
    expect(plan.id).toBe('imported-plano-30dias-md');
    expect(plan.source).toBe('plano-30dias.md');
  });
  it('monta fases com dias', () => {
    expect(plan.phases).toHaveLength(2);
    expect(plan.phases[0].days).toBe('Dias 1–15');
    expect(plan.phases[1].days).toBe('Dias 16–30');
  });
  it('encadeia ids de semana entre fases (sem colisão)', () => {
    const weeks = allWeeks(plan);
    expect(weeks.map((w) => w.id)).toEqual([1, 2, 3]);
    expect(weeks[2].phase).toBe(2);
  });
  it('classifica tasks leitura vs pratica', () => {
    const w1 = plan.phases[0].weeks[0];
    expect(w1.tasks[0].type).toBe('leitura');
    expect(w1.tasks[1].type).toBe('pratica');
  });
  it('extrai entregável por semana', () => {
    expect(plan.phases[0].weeks[0].deliverable.text).toContain('documento com exemplos');
  });
  it('calcula totalDays pelo maior range', () => {
    expect(plan.totalDays).toBe(30);
  });
  it('distribui dias entre semanas da fase', () => {
    expect(plan.phases[0].weeks[0].days).toBe('Dias 1–7');
    expect(plan.phases[0].weeks[1].days).toBe('Dias 8–15');
  });
});

describe('parsePlanMD — mão na massa', () => {
  const r = parsePlanMD(CHALLENGES_MD, '04-desafios.md');
  if (r.type !== 'mao-na-massa') throw new Error('tipo errado');
  const { challenges } = r;
  const all = allChallenges(challenges);

  it('extrai desafios com num/título/tags', () => {
    expect(all).toHaveLength(2);
    expect(all[0].num).toBe(1);
    expect(all[0].title).toBe('Sistema Bancário');
    expect(all[0].trains).toContain('Hexagonal');
    expect(all[0].levelId).toBe(1);
    expect(all[0].xp).toBe(500);
  });
  it('gera tasks atômicas das seções mapeadas com deps', () => {
    const c1 = all[0];
    const keys = c1.tasks.map((t) => t.key);
    expect(keys).toEqual(['Fase A', 'Requisitos', 'Arquitetura']);
    expect(c1.tasks[1].deps).toEqual(['Fase A']);
  });
  it('desafio sem seções ganha tasks mínimas', () => {
    const c2 = all[1];
    expect(c2.tasks.length).toBeGreaterThanOrEqual(2);
    expect(c2.tasks[0].key).toBe('Fase A');
  });
  it('método padrão "Os 9 Passos" presente', () => {
    expect(challenges.method.steps).toHaveLength(9);
  });
  it('totalXP = 500 por desafio', () => {
    expect(challenges.totalXP).toBe(1000);
  });
});
