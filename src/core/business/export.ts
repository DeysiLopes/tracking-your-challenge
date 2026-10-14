/**
 * export.ts — Exportação para Obsidian (.md com YAML frontmatter).
 * Portado do app.js legado: uma nota por semana + uma por desafio +
 * índice + progresso, ou tudo junto num .zip (jszip).
 */
import JSZip from 'jszip';
import type { Challenge, Plan, TrackerState, Week } from '../models/tracker';
import { allChallenges, allWeeks } from '../models/tracker';
import {
  getChallengeState, getChallengeTasksProgress, getCompletedChallengesCount,
  getCurrentDay, getEarnedXP, getPhaseProgress, getPlanXP, getTotalProgress,
  getTotalXP, getWeekProgress, type Ctx,
} from './progress';

function slug(s: string): string {
  return s.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
}

export function generateWeekMD(ctx: Ctx, week: Week): string {
  const phase = ctx.plan.phases.find((p) => p.id === week.phase);
  const prog = getWeekProgress(ctx.state, week);
  const note = ctx.state.notes[week.id] || '';
  const taskLines = week.tasks.map((t) => `- [${ctx.state.tasks[t.id] ? 'x' : ' '}] ${t.text}`).join('\n');
  const delDone = ctx.state.deliverables[week.deliverable.id] ? 'x' : ' ';
  const phaseName = phase ? phase.name : '';
  return `---
tags: [90-dias-na-gringa, semana-${week.id}, ${phaseName.toLowerCase().replace(/ /g, '-')}]
fase: "${phaseName}"
semana: ${week.id}
titulo: "${week.title}"
periodo: "${week.days}"
progresso: ${prog.pct}%
data_export: "${new Date().toISOString().split('T')[0]}"
---

# Semana ${week.id} — ${week.title}

> **${phaseName}** · ${week.days} · Progresso: ${prog.pct}%

## Links Relacionados
${week.obsidianLinks.join('\n')}

## Tarefas

${taskLines}

## 🎯 Entregável da Semana
- [${delDone}] ${week.deliverable.icon} ${week.deliverable.text}

## 📝 Minhas Notas
${note || '_Sem notas ainda._'}

## 🏷️ Tags
${week.obsidianTags.map((t) => '#' + t).join(' ')}

---
*Gerado pelo Tracker*
`;
}

export function generateChallengeMD(ctx: Ctx, challenge: Challenge): string {
  const cs = getChallengeState(ctx.state, challenge.id);
  const attempts = (cs.attempts || [])
    .map((a, i) => `### Tentativa ${i + 1} — ${new Date(a.date).toLocaleDateString('pt-BR')}\n\n${a.text}`)
    .join('\n\n---\n\n');
  return `---
tags: [90-dias-na-gringa, desafios, system-design, ${challenge.title.toLowerCase().replace(/ /g, '-')}]
desafio: "${challenge.title}"
nivel: ${challenge.levelId}
xp: ${challenge.xp}
concluido: ${cs.done}
tentativas: ${(cs.attempts || []).length}
data_export: "${new Date().toISOString().split('T')[0]}"
---

# Desafio #${String(challenge.num).padStart(2, '0')} — ${challenge.title}

> **Status:** ${cs.done ? '✅ Concluído' : (cs.attempts?.length ? '🔄 Em progresso' : '⏳ Não iniciado')} · **+${challenge.xp} XP**

## 📋 O Problema
${challenge.description}

## 🎓 O que treina
${challenge.trains.map((t) => '- ' + t).join('\n')}

## 💡 Perguntas-guia
${challenge.hints.map((h) => '- ' + h).join('\n')}

## 🔗 Links Relacionados
${challenge.obsidianLinks.join('\n')}

## ✏️ Minhas Tentativas
${attempts || '_Sem tentativas ainda._'}

---
*Gerado pelo Tracker*
`;
}

export function generateProgressMD(ctx: Ctx): string {
  const day = getCurrentDay(ctx);
  const weeks = allWeeks(ctx.plan);
  const challenges = allChallenges(ctx.challengesData);
  const rows = weeks.map((week) => {
    const prog = getWeekProgress(ctx.state, week);
    const status = prog.pct === 100 ? '✅' : prog.pct > 0 ? '🔄' : '⏳';
    return `| ${week.id} | ${week.title} | ${week.days} | ${status} | ${prog.pct}% |`;
  }).join('\n');
  const challengeRows = challenges.map((c) => {
    const cs = getChallengeState(ctx.state, c.id);
    return `| #${c.num} | ${c.title} | ${cs.done ? '✅' : (cs.attempts?.length ? '🔄' : '⏳')} | ${cs.done ? c.xp : 0} XP |`;
  }).join('\n');
  return `---
tags: [90-dias-na-gringa, progresso, dashboard]
data_export: "${new Date().toISOString().split('T')[0]}"
---

# 📊 Progresso — Tracker

> Dia **${day || '?'}** de ${ctx.plan.totalDays} · Progresso total: **${getTotalProgress(ctx)}%** · XP: **${getTotalXP(ctx)}**

## Por Fase

${ctx.plan.phases.map((p) => `### ${p.icon} ${p.name} · ${p.days}\nProgresso: ${getPhaseProgress(ctx.state, p)}%`).join('\n\n')}

## Por Semana

| # | Título | Período | Status | % |
|---|--------|---------|--------|---|
${rows}

## Desafios de System Design

> XP Total: **${getTotalXP(ctx)}** · Concluídos: **${getCompletedChallengesCount(ctx)}** / ${challenges.length}

| # | Desafio | Status | XP |
|---|---------|--------|-----|
${challengeRows}

---
*Gerado em ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}*
`;
}

export function generateIndexMD(ctx: Ctx): string {
  const weekLinks = allWeeks(ctx.plan).map((w) =>
    `- [[semana-${String(w.id).padStart(2, '0')}-${slug(w.title)}|Semana ${w.id} — ${w.title}]]`
  ).join('\n');
  const challengeLinks = allChallenges(ctx.challengesData).map((c) =>
    `- [[desafio-${String(c.num).padStart(2, '0')}-${slug(c.title)}|#${c.num} ${c.title}]]`
  ).join('\n');
  return `---
tags: [90-dias-na-gringa, índice]
---

# 🛫 Tracker — Índice

> Plano de estudo de N dias para preparação de vaga internacional como Senior Software Engineer.

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

---
*Tracker*
`;
}

export function downloadMD(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAllZip(ctx: Ctx): Promise<string> {
  const zip = new JSZip();
  const base = (ctx.plan.name
    ? ctx.plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : 'tracker') || 'tracker';
  const folder = zip.folder(base)!;
  folder.file('00-indice.md', generateIndexMD(ctx));
  folder.file('00-progresso.md', generateProgressMD(ctx));
  allWeeks(ctx.plan).forEach((week) => {
    folder.file(`semana-${String(week.id).padStart(2, '0')}-${slug(week.title)}.md`, generateWeekMD(ctx, week));
  });
  allChallenges(ctx.challengesData).forEach((c) => {
    folder.file(`desafio-${String(c.num).padStart(2, '0')}-${slug(c.title)}.md`, generateChallengeMD(ctx, c));
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = base + '-obsidian.zip';
  a.click();
  URL.revokeObjectURL(url);
  return base + '-obsidian.zip';
}
