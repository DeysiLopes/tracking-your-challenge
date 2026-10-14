/**
 * NotesPage — notas por semana e tentativas de desafio, editáveis
 * (equivalente ao #view-notes + selectNoteWeek/Challenge do legado).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTracker } from '../hooks/useTracker';
import { EmptyNotice } from '../components/common/EmptyNotice';
import { getChallengeState, hasChallengesContent, hasPlanContent } from '../core/business/progress';

type NoteSel = { type: 'week'; id: number } | { type: 'challenge'; id: string } | null;

export const NotesPage: React.FC<{ selectedWeekId?: number | null; onConsumed?: () => void }> = ({ selectedWeekId, onConsumed }) => {
  const { ctx, challenges, state, weeks, saveWeekNote, saveChallengeNote, clearChallengeNotes, toast } = useTracker();
  const [sel, setSel] = useState<NoteSel>(null);
  const [draft, setDraft] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Entries: semanas com nota + desafios com tentativas (mesma regra do legado)
  const entries: { type: 'week' | 'challenge'; id: number | string; title: string; subtitle: string; label: string }[] = [];
  if (hasPlanContent(ctx)) {
    weeks.forEach((week) => {
      const noteText = state.notes[week.id] && state.notes[week.id].trim();
      if (noteText) {
        entries.push({ type: 'week', id: week.id, title: `Semana ${week.id} — ${week.title}`, subtitle: week.days, label: `Semana ${week.id}` });
      }
    });
  }
  if (hasChallengesContent(ctx)) {
    challenges.forEach((c) => {
      const cs = getChallengeState(state, c.id);
      if (cs.attempts && cs.attempts.length > 0) {
        entries.push({
          type: 'challenge', id: c.id,
          title: `Desafio ${String(c.num).padStart(2, '0')} — ${c.title}`,
          subtitle: (c.trains || []).join(', '),
          label: `Desafio ${String(c.num).padStart(2, '0')}`,
        });
      }
    });
  }

  const loadSel = (s: NoteSel) => {
    setSel(s);
    if (!s) { setDraft(''); return; }
    if (s.type === 'week') setDraft(state.notes[s.id] || '');
    else {
      const cs = getChallengeState(state, s.id);
      const last = cs.attempts && cs.attempts.length ? cs.attempts[cs.attempts.length - 1].text : '';
      setDraft(last || '');
    }
  };

  // "Editar Nota" vindo do WeekModal: seleciona a semana aqui
  useEffect(() => {
    if (selectedWeekId != null) {
      loadSel({ type: 'week', id: selectedWeekId });
      onConsumed && onConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekId]);

  const selWeek = sel && sel.type === 'week' ? weeks.find((w) => w.id === sel.id) : null;
  const selChallenge = sel && sel.type === 'challenge' ? challenges.find((c) => c.id === sel.id) : null;

  const saveNote = () => {
    const txt = draft.trim();
    if (sel && sel.type === 'week') {
      saveWeekNote(sel.id, txt);
      toast('Nota salva! 💾');
      return;
    }
    if (sel && sel.type === 'challenge') {
      if (!txt) { toast('Escreva algo antes de salvar! ✏️'); return; }
      saveChallengeNote(sel.id, txt);
      toast('Nota/Tentativa do desafio salva! 💾');
    }
  };

  const clearNote = () => {
    if (sel && sel.type === 'week') {
      setDraft('');
      saveWeekNote(sel.id, '');
      toast('Nota apagada 🗑️');
      return;
    }
    if (sel && sel.type === 'challenge') {
      setDraft('');
      clearChallengeNotes(sel.id);
      toast('Notas/tentativas do desafio apagadas 🗑️');
    }
  };

  return (
    <section className="view active" id="view-notes">
      <header className="page-header">
        <div>
          <h1>Minhas Notas</h1>
          <p className="page-subtitle">Anotações por semana, exportáveis para o Obsidian.</p>
        </div>
      </header>

      <div className="notes-layout">
        <div className="notes-sidebar-list" id="notes-week-list">
          {!entries.length ? (
            <EmptyNotice title="Nenhuma nota registrada">
              Escreva notas nas views de Semana ou Desafio e elas aparecerão aqui para edição.
            </EmptyNotice>
          ) : entries.map((en) => (
            <div
              key={`${en.type}-${en.id}`}
              className={`note-week-item${sel && sel.type === en.type && String(sel.id) === String(en.id) ? ' active' : ''}`}
              onClick={() => loadSel({ type: en.type, id: en.id } as NoteSel)}
            >
              <div className="nwi-week">{en.label}</div>
              <div className="nwi-title">
                {en.title.replace(/^Semana \d+ — /, '').replace(/^Desafio \d+ — /, '')}
                <div className="nwi-sub">{en.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="notes-editor-area">
          <div className="notes-editor-header" id="notes-editor-header">
            {selWeek ? (
              <>
                <strong>Semana {selWeek.id} — {selWeek.title}</strong>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>{selWeek.days}</span>
              </>
            ) : selChallenge ? (
              <strong>Desafio {String(selChallenge.num).padStart(2, '0')} — {selChallenge.title}</strong>
            ) : (
              <span>Selecione uma semana ao lado →</span>
            )}
          </div>
          <textarea
            className="notes-editor"
            id="notes-editor"
            ref={editorRef}
            placeholder={'Escreva aqui suas anotações em Markdown...\nUse [[links]] para conectar assuntos no Obsidian.'}
            disabled={!sel}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="notes-actions">
            <button className="btn btn-secondary" disabled={!sel} onClick={clearNote}>🗑 Limpar</button>
            <button className="btn btn-primary" disabled={!sel} onClick={saveNote}>💾 Salvar Nota</button>
          </div>
        </div>
      </div>
    </section>
  );
};
