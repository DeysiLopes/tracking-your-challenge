/**
 * WeekModal — detalhe da semana: tarefas, entregável, nota e tags
 * (equivalente ao #modal-week do legado, mesma regra de conclusão:
 * 100% das tasks + nota preenchida habilitam "Semana Concluída").
 */
import React, { useEffect, useState } from 'react';
import { useTracker } from '../../hooks/useTracker';
import { getWeekProgress } from '../../core/business/progress';

interface Props {
  weekId: number | null;
  onClose: () => void;
  onEditNote: (weekId: number) => void;
}

export const WeekModal: React.FC<Props> = ({ weekId, onClose, onEditNote }) => {
  const { ctx, plan, state, weeks, toggleTask, markAllInWeek, saveWeekNote, toast } = useTracker();
  const week = weeks.find((w) => w.id === weekId) || null;
  const [noteDraft, setNoteDraft] = useState('');

  useEffect(() => {
    setNoteDraft(week ? (state.notes[week.id] || '') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId]);

  if (!week) return null;
  const phase = plan.phases.find((p) => p.id === week.phase);
  const prog = getWeekProgress(state, week);
  const noteText = (state.notes[week.id] || '').trim();
  const canComplete = noteText.length > 0;
  const delDone = !!state.deliverables[week.deliverable.id];

  const saveNote = () => {
    const v = noteDraft.trim();
    if (!v) { toast('Escreva algo antes de salvar! ✏️'); return; }
    saveWeekNote(week.id, v);
    toast('Nota salva! 💾');
  };

  const clearNote = () => {
    setNoteDraft('');
    saveWeekNote(week.id, '');
    toast('Nota apagada 🗑️');
  };

  const reasons: string[] = [];
  if (prog.pct < 100) reasons.push('Complete todas as tarefas');
  if (!canComplete) reasons.push('Adicione uma nota');

  return (
    <div className="modal-overlay" id="modal-week" style={{ display: 'flex' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>Semana {week.id} — {week.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-section-label">📅 {week.days} · {phase ? phase.name : ''}</div>

          <div className="modal-section-label" style={{ marginTop: 12 }}>Tarefas</div>
          <div className="modal-tasks-list">
            {week.tasks.map((task) => {
              const done = !!state.tasks[task.id];
              return (
                <div key={task.id} className={`modal-task-item${done ? ' done' : ''}`}
                  onClick={() => toggleTask(task.id, 'tasks')}>
                  <span className="modal-task-check">{done ? '✅' : '⬜'}</span>
                  <span>{task.text}</span>
                </div>
              );
            })}
          </div>

          <div className="modal-section-label" style={{ marginTop: 12 }}>🎯 Entregável da Semana</div>
          <div className={`modal-task-item${delDone ? ' done' : ''}`}
            onClick={() => toggleTask(week.deliverable.id, 'deliverables')}>
            <span className="modal-task-check">{delDone ? '✅' : '⬜'}</span>
            <span style={{ fontWeight: 600 }}>{week.deliverable.icon} {week.deliverable.text}</span>
          </div>

          <div className="modal-section-label" style={{ marginTop: 12 }}>📝 Nota</div>
          <textarea
            className="attempt-editor"
            placeholder="Escreva uma nota para a semana (será salva no painel de Notas)..."
            style={{ minHeight: 96, width: '100%', boxSizing: 'border-box', marginTop: 8 }}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={saveNote}>💾 Salvar Nota</button>
            <button className="btn btn-secondary" onClick={clearNote}>🗑 Limpar Nota</button>
          </div>

          <div className="modal-section-label" style={{ marginTop: 12 }}>🏷️ Tags Obsidian</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {week.obsidianTags.map((tag) => (
              <span key={tag} style={{
                fontSize: 11, background: 'var(--indigo-dim)', border: '1px solid var(--border-accent)',
                color: 'var(--indigo-light)', borderRadius: 99, padding: '2px 8px',
                fontFamily: 'JetBrains Mono,monospace',
              }}>#{tag}</span>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => { onClose(); onEditNote(week.id); }}>
            📝 Editar Nota
          </button>
          <button
            className={prog.pct === 100 && canComplete ? 'btn btn-done' : 'btn btn-primary'}
            disabled={!(prog.pct === 100 && canComplete)}
            title={reasons.join(' e ')}
            onClick={() => { markAllInWeek(week.id); toast('Semana atualizada! 🎯'); }}
          >
            {prog.pct === 100 && canComplete ? '✅ Semana Concluída!' : '✅ Marcar tudo como concluído'}
          </button>
        </div>
      </div>
    </div>
  );
};
