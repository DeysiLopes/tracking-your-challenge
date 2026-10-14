/**
 * NotesPage (/notas) — índice de notas no estilo Obsidian:
 * todas as semanas e desafios são "arquivos" possíveis; clicar
 * abre o caderno fullscreen (NotebookEditor) com Markdown,
 * modo leitura e exportação .md.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTracker } from '../hooks/useTracker';
import { EmptyNotice } from '../components/common/EmptyNotice';
import { NotebookEditor } from '../components/common/NotebookEditor';
import { getChallengeState, hasChallengesContent, hasPlanContent } from '../core/business/progress';

type NoteSel = { type: 'week'; id: number } | { type: 'challenge'; id: string } | null;

interface Entry {
  type: 'week' | 'challenge';
  id: number | string;
  label: string;
  title: string;
  subtitle: string;
  hasNote: boolean;
  preview: string;
}

export const NotesPage: React.FC<{ selectedWeekId?: number | null; onConsumed?: () => void }> = ({ selectedWeekId, onConsumed }) => {
  const { ctx, challenges, state, weeks, saveWeekNote, saveChallengeNote, clearChallengeNotes, toast } = useTracker();
  const [sel, setSel] = useState<NoteSel>(null);
  const [query, setQuery] = useState('');

  // Cada semana e desafio é um "arquivo" de nota — com ou sem texto.
  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];
    if (hasPlanContent(ctx)) {
      weeks.forEach((week) => {
        const note = (state.notes[week.id] || '').trim();
        list.push({
          type: 'week', id: week.id,
          label: `Semana ${week.id}`,
          title: week.title,
          subtitle: week.days,
          hasNote: !!note,
          preview: note.split('\n').find((l) => l.trim()) || '',
        });
      });
    }
    if (hasChallengesContent(ctx)) {
      challenges.forEach((c) => {
        const cs = getChallengeState(state, c.id);
        const last = cs.attempts && cs.attempts.length ? cs.attempts[cs.attempts.length - 1].text : '';
        list.push({
          type: 'challenge', id: c.id,
          label: `Desafio ${String(c.num).padStart(2, '0')}`,
          title: c.title,
          subtitle: (c.trains || []).join(', '),
          hasNote: !!last.trim(),
          preview: last.split('\n').find((l) => l.trim()) || '',
        });
      });
    }
    return list;
  }, [ctx, weeks, challenges, state]);

  // "Editar Nota" vindo do WeekModal abre o caderno direto na semana
  useEffect(() => {
    if (selectedWeekId != null) {
      setSel({ type: 'week', id: selectedWeekId });
      onConsumed && onConsumed();
    }
  }, [selectedWeekId, onConsumed]);

  const filtered = entries.filter((e) =>
    !query || `${e.label} ${e.title}`.toLowerCase().includes(query.toLowerCase()));

  const selWeek = sel && sel.type === 'week' ? weeks.find((w) => w.id === sel.id) : null;
  const selChallenge = sel && sel.type === 'challenge' ? challenges.find((c) => c.id === sel.id) : null;

  const initialText = (): string => {
    if (!sel) return '';
    if (sel.type === 'week') return state.notes[sel.id] || '';
    const cs = getChallengeState(state, sel.id);
    return cs.attempts && cs.attempts.length ? cs.attempts[cs.attempts.length - 1].text : '';
  };

  const save = (text: string) => {
    if (!sel) return;
    if (sel.type === 'week') {
      saveWeekNote(sel.id, text.trim());
      toast('Nota salva! 💾');
      return;
    }
    const txt = text.trim();
    if (!txt) { toast('Escreva algo antes de salvar! ✏️'); return; }
    saveChallengeNote(sel.id, txt);
    toast('Nota/Tentativa do desafio salva! 💾');
  };

  const clear = () => {
    if (!sel) return;
    if (sel.type === 'week') {
      saveWeekNote(sel.id, '');
      toast('Nota apagada 🗑️');
      setSel(null);
      return;
    }
    clearChallengeNotes(sel.id);
    toast('Notas/tentativas do desafio apagadas 🗑️');
    setSel(null);
  };

  return (
    <section className="view active" id="view-notes">
      <header className="page-header">
        <div>
          <h1>Minhas Notas</h1>
          <p className="page-subtitle">Markdown por semana e desafio — clique pra abrir o caderno.</p>
        </div>
        <input
          className="notes-search"
          type="search"
          placeholder="🔍 buscar nota…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      {!entries.length ? (
        <EmptyNotice title="Nenhuma nota possível ainda">
          Importe um plano ou desafios (.md) pra começar a escrever notas.
        </EmptyNotice>
      ) : (
        <div className="notes-grid">
          {filtered.map((en) => (
            <button
              key={`${en.type}-${en.id}`}
              className={`note-card${en.hasNote ? ' has-note' : ''}`}
              onClick={() => setSel({ type: en.type, id: en.id } as NoteSel)}
            >
              <div className="nc-top">
                <span className="nc-label">{en.label}</span>
                <span className={`nc-dot${en.hasNote ? ' on' : ''}`} title={en.hasNote ? 'com nota' : 'sem nota'} />
              </div>
              <div className="nc-title">{en.title}</div>
              <div className="nc-sub">{en.subtitle}</div>
              <div className="nc-preview">{en.hasNote ? en.preview : 'Escrever nota…'}</div>
            </button>
          ))}
          {!filtered.length && (
            <EmptyNotice title="Nada encontrado">Nenhuma nota bate com “{query}”.</EmptyNotice>
          )}
        </div>
      )}

      {sel && (selWeek || selChallenge) && (
        <NotebookEditor
          title={selWeek ? `Semana ${selWeek.id} — ${selWeek.title}` : `Desafio ${String(selChallenge!.num).padStart(2, '0')} — ${selChallenge!.title}`}
          subtitle={selWeek ? selWeek.days : (selChallenge!.trains || []).join(', ')}
          initial={initialText()}
          onSave={save}
          onClear={clear}
          onClose={() => setSel(null)}
        />
      )}
    </section>
  );
};
