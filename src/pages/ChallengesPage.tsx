/**
 * ChallengesPage — desafios mão na massa por nível + card do método
 * "Os 9 Passos" (equivalente ao #view-challenges do legado).
 */
import React, { useState } from 'react';
import { useTracker } from '../hooks/useTracker';
import { EmptyNotice } from '../components/common/EmptyNotice';
import {
  getChallengeState, getChallengeTasksProgress, getCompletedChallengesCount,
  getEarnedXP, getStreak, hasChallengesContent,
} from '../core/business/progress';

export const ChallengesPage: React.FC<{ onOpenChallenge: (id: string) => void }> = ({ onOpenChallenge }) => {
  const { ctx, challengesData, challenges, state } = useTracker();
  const [methodOpen, setMethodOpen] = useState(false);

  const earnedXP = getEarnedXP(ctx);
  const completed = getCompletedChallengesCount(ctx);
  const streak = getStreak(ctx);
  const n = challenges.length;
  const lv = challengesData ? challengesData.levels.length : 0;

  const subtitle = hasChallengesContent(ctx)
    ? `${n} desafio${n !== 1 ? 's' : ''} em ${lv} nível${lv !== 1 ? 'is' : ''}. Resolva antes de pesquisar. 💪`
    : 'Desafios de System Design em níveis. Resolva antes de pesquisar. 💪';

  return (
    <section className="view active" id="view-challenges">
      <header className="page-header">
        <div>
          <h1>Desafios — Mão na Massa</h1>
          <p className="page-subtitle" id="challenges-subtitle">{subtitle}</p>
        </div>
        <div className="xp-total-badge" id="xp-total-display">
          <span className="xp-icon">⚡</span>
          <span id="xp-display-value">{earnedXP} XP</span>
        </div>
      </header>

      <div className="challenges-stats">
        <div className="challenge-stat"><span>{completed}</span><small>Concluídos</small></div>
        <div className="challenge-stat"><span>{streak}</span><small>Streak 🔥</small></div>
        <div className="challenge-stat"><span>{earnedXP}</span><small>XP Mão na Massa</small></div>
      </div>

      <div className="method-card" id="method-toggle-card">
        <div className="method-header" onClick={() => setMethodOpen((o) => !o)}>
          <span>📐 Os 9 Passos — Método de Resolução</span>
          <span className={`method-arrow${methodOpen ? ' open' : ''}`}>▼</span>
        </div>
        <div className="method-steps" style={{ display: methodOpen ? 'grid' : 'none' }}>
          {(challengesData?.method.steps || []).map((step) => (
            <div key={step.n} className="method-step">
              <div className="ms-num">Passo {step.n}</div>
              <div className="ms-title">{step.title}</div>
              <div className="ms-desc">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="challenges-levels" id="challenges-levels">
        {!hasChallengesContent(ctx) ? (
          <EmptyNotice title="Nenhum desafio mão na massa carregado">
            Importe um .md com <code>## 🏦 Desafio N — ...</code> (ex.: 04-desafios-codigo-mao-na-massa.md) em <strong>📂 Importar</strong>.
          </EmptyNotice>
        ) : (
          (challengesData?.levels || []).map((level) => {
            const levelDone = level.challenges.filter((c) => getChallengeState(state, c.id).done).length;
            return (
              <div key={level.id} className="level-block">
                <div className="level-header">
                  <span className="level-emoji">{level.emoji}</span>
                  <span className="level-name">Nível {level.id} — {level.name}</span>
                  <span className="level-xp-badge">⚡ {level.xpPerChallenge} XP cada</span>
                  <span className="level-progress-text">{levelDone}/{level.challenges.length} concluídos</span>
                </div>
                <div className="challenges-grid">
                  {level.challenges.map((challenge) => {
                    const cs = getChallengeState(state, challenge.id);
                    const attemptCount = cs.attempts ? cs.attempts.length : 0;
                    let cls = 'challenge-card';
                    if (cs.done) cls += ' done';
                    else if (attemptCount > 0) cls += ' attempted';
                    const tprog = getChallengeTasksProgress(state, challenge);
                    return (
                      <div key={challenge.id} className={cls} onClick={() => onOpenChallenge(challenge.id)}>
                        <div className="cc-header">
                          <span className="cc-num">#{String(challenge.num).padStart(2, '0')}</span>
                          <span className="cc-status">{cs.done ? '✅' : attemptCount > 0 ? '🔄' : '⬜'}</span>
                          <span className="cc-xp">+{challenge.xp} XP</span>
                        </div>
                        <div className="cc-title">{challenge.title}</div>
                        {challenge.tasks && challenge.tasks.length > 0 && (
                          <div className="cc-tasks-progress">
                            <span>🗂 {tprog.done}/{tprog.total} tarefas</span>
                            <div className="cc-tasks-bar">
                              <div className="cc-tasks-fill" style={{ width: `${tprog.pct}%` }} />
                            </div>
                          </div>
                        )}
                        <div className="cc-trains">
                          {(challenge.trains || []).slice(0, 3).map((t) => (
                            <span key={t} className="cc-train-tag">{t}</span>
                          ))}
                        </div>
                        <div className="cc-bottom">
                          <span className="cc-attempt-count">
                            {attemptCount > 0 ? `${attemptCount} tentativa${attemptCount > 1 ? 's' : ''}` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
