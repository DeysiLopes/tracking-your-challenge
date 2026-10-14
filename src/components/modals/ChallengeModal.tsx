/**
 * ChallengeModal — detalhe do desafio: problema, o que treina,
 * perguntas-guia, tasks atômicas (com dependências), tentativas e
 * links Obsidian. Gates iguais ao legado: tasks obrigatórias +
 * solução escrita antes de concluir.
 */
import React, { useEffect, useState } from 'react';
import { useTracker } from '../../hooks/useTracker';
import { getChallengeState } from '../../core/business/progress';

interface Props {
  challengeId: string | null;
  onClose: () => void;
}

export const ChallengeModal: React.FC<Props> = ({ challengeId, onClose }) => {
  const { ctx, challengesData, challenges, state, toggleChallengeTask, registerAttempt, toggleChallengeDone, toast } = useTracker();
  const challenge = challenges.find((c) => c.id === challengeId) || null;
  const [attemptText, setAttemptText] = useState('');

  useEffect(() => { setAttemptText(''); }, [challengeId]);

  if (!challenge) return null;
  const level = (challengesData?.levels || []).find((l) => l.id === challenge.levelId);
  const cs = getChallengeState(state, challenge.id);

  const requiredTasks = (challenge.tasks || []).filter((t) => !/opcional|diferencial/i.test(t.title));
  const requiredAllDone = requiredTasks.length ? requiredTasks.every((t) => cs.tasks && cs.tasks[t.key]) : true;

  const doneBtnText = cs.done
    ? '✅ Concluído! Remover ✓'
    : `✅ Marcar como Concluído (+${challenge.xp} XP)`;

  return (
    <div className="modal-overlay" id="modal-challenge" style={{ display: 'flex' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div>
            <h2>#{String(challenge.num).padStart(2, '0')} {challenge.title}</h2>
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {level ? `${level.emoji} Nível ${level.id} — ${level.name} · ` : ''}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)' }}>+{challenge.xp} XP</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-section-label">📋 O Problema</div>
          <div className="challenge-desc">{challenge.description}</div>

          <div className="modal-section-label" style={{ marginTop: 14 }}>🎓 O que você treina</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {challenge.trains.map((t) => (
              <span key={t} style={{
                fontSize: 12, background: 'var(--indigo-dim)', border: '1px solid var(--border-accent)',
                color: 'var(--indigo-light)', borderRadius: 99, padding: '3px 10px', fontWeight: 500,
              }}>{t}</span>
            ))}
          </div>

          <div className="modal-section-label" style={{ marginTop: 14 }}>💡 Perguntas-guia</div>
          <div className="challenge-hints">
            {challenge.hints.map((h, i) => (
              <div key={i} className="hint-item">
                <span className="hint-icon">→</span>
                <span>{h}</span>
              </div>
            ))}
          </div>

          {challenge.tasks && challenge.tasks.length > 0 && (
            <>
              <div className="modal-section-label" style={{ marginTop: 14 }}>🗂️ Tasks atômicas</div>
              <div className="atomic-tasks">
                {challenge.tasks.map((t) => {
                  const enabled = !t.deps.length || t.deps.every((d) => cs.tasks && cs.tasks[d]);
                  const done = !!(cs.tasks && cs.tasks[t.key]);
                  return (
                    <label key={t.key}
                      className={`atomic-task${done ? ' done' : ''}${enabled ? '' : ' locked'}`}>
                      <input
                        type="checkbox"
                        checked={done}
                        disabled={!enabled}
                        onChange={() => toggleChallengeTask(challenge.id, t.key)}
                      />
                      <div className="atomic-task-content">
                        <div className="atomic-task-title">{t.icon} {t.title}</div>
                        {t.criteria && <div className="atomic-task-criteria">{t.criteria}</div>}
                        {t.deps.length > 0 && <div className="atomic-task-deps">depende de: {t.deps.join(', ')}</div>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <div className="modal-section-label" style={{ marginTop: 14 }}>✏️ Registrar Tentativa</div>
          <textarea
            className="attempt-editor"
            placeholder={'Escreva sua solução aqui (mesmo que incompleta).\n\nUse os 9 passos:\n1. Requirements\n2. Scale\n3. API\n4. Data Model\n5. Architecture\n6. Deep Dive\n7. Failure\n8. Scale x10\n9. Trade-offs'}
            value={attemptText}
            onChange={(e) => setAttemptText(e.target.value)}
          />

          {cs.attempts && cs.attempts.length > 0 && (
            <>
              <div className="modal-section-label" style={{ marginTop: 14 }}>📚 Tentativas anteriores ({cs.attempts.length})</div>
              <div className="attempts-list">
                {[...cs.attempts].reverse().map((a, i) => (
                  <div key={i} className="attempt-item">
                    <span className="attempt-date">{new Date(a.date).toLocaleDateString('pt-BR', { dateStyle: 'short' })}</span>
                    {' — '}{a.text.slice(0, 120)}{a.text.length > 120 ? '...' : ''}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="modal-section-label" style={{ marginTop: 14 }}>🔗 Links Obsidian</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {challenge.obsidianLinks.map((link) => (
              <span key={link} style={{
                fontSize: 11, background: 'var(--violet-dim)', border: '1px solid var(--violet-border)',
                color: 'var(--violet-light)', borderRadius: 99, padding: '2px 8px',
                fontFamily: 'JetBrains Mono,monospace',
              }}>{link}</span>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => {
            if (!attemptText.trim()) { toast('Escreva algo antes de registrar! ✏️'); return; }
            registerAttempt(challenge.id, attemptText.trim());
            setAttemptText('');
          }}>
            📝 Registrar Tentativa
          </button>
          <button
            className={cs.done ? 'btn btn-done' : 'btn btn-primary'}
            disabled={!requiredAllDone}
            title={!requiredAllDone ? 'Complete todas as tasks obrigatórias antes de concluir (tarefas opcionais não bloqueiam).' : ''}
            onClick={() => { toggleChallengeDone(challenge.id, attemptText); setAttemptText(''); }}
          >
            {doneBtnText}
          </button>
        </div>
      </div>
    </div>
  );
};
