/**
 * PlanPage — mapa de semanas por fase, com desbloqueio sequencial
 * (semana N+1 só abre quando a anterior está 100%).
 */
import React from 'react';
import { useTracker } from '../hooks/useTracker';
import { EmptyNotice } from '../components/common/EmptyNotice';
import {
  getCurrentWeek, getPhaseProgress, getPlanXP, getWeekProgress, hasPlanContent,
} from '../core/business/progress';

export const PlanPage: React.FC<{ onOpenWeek: (weekId: number) => void }> = ({ onOpenWeek }) => {
  const { ctx, plan, state, weeks } = useTracker();

  const subtitle = hasPlanContent(ctx)
    ? `${weeks.length} semana${weeks.length !== 1 ? 's' : ''} · ${plan.phases.length} fase${plan.phases.length !== 1 ? 's' : ''} · 1 entregável por semana.`
    : 'Nenhum plano carregado ainda. Importe um .md programático em 📂 Importar.';

  // Desbloqueio sequencial (mesma regra do legado)
  const cw = getCurrentWeek(ctx);
  const lockedIds = new Set<number>();
  let prevDone = true;
  weeks.forEach((w) => {
    if (!prevDone) lockedIds.add(w.id);
    prevDone = getWeekProgress(state, w).pct === 100;
  });

  return (
    <section className="view active" id="view-plan">
      <header className="page-header">
        <div>
          <h1>Plano Semanal</h1>
          <p className="page-subtitle" id="plan-subtitle">{subtitle}</p>
        </div>
        <div className="xp-total-badge">
          <span className="xp-icon">⚡</span>
          <span>{getPlanXP(ctx)} XP</span>
        </div>
      </header>

      <div className="plan-phases" id="plan-phases">
        {!hasPlanContent(ctx) ? (
          <EmptyNotice title="Nenhum plano programático carregado">
            Importe um .md com <code>## FASE N — Dias...</code> em <strong>📂 Importar</strong>.
          </EmptyNotice>
        ) : (
          <>
            <h2 className="section-title"><span className="section-icon">🗺️</span> Mapa de Semanas</h2>
            {plan.phases.map((phase) => {
              const phasePct = getPhaseProgress(state, phase);
              return (
                <div key={phase.id} className={`phase-block phase-${phase.id}`}>
                  <div className="phase-header">
                    <div className="phase-icon-wrap">{phase.icon}</div>
                    <div className="phase-meta">
                      <div className="phase-name">{phase.name}</div>
                      <div className="phase-days">{phase.days}</div>
                    </div>
                    <div className="phase-progress-text">{phasePct}%</div>
                  </div>
                  <div className="weeks-grid phase-weeks-map">
                    {phase.weeks.map((week) => {
                      const prog = getWeekProgress(state, week);
                      const isDone = prog.pct === 100;
                      const isCurrent = cw === week.id;
                      const isLocked = lockedIds.has(week.id) && !isDone;
                      let cls = 'week-tile';
                      if (isDone) cls += ' done';
                      else if (isCurrent && !isLocked) cls += ' current';
                      else if (isLocked) cls += ' locked';
                      return (
                        <div key={week.id} className={cls}
                          onClick={() => { if (!isLocked) onOpenWeek(week.id); }}>
                          <div className="wt-week-num">Semana {week.id}</div>
                          <div className="wt-title">{week.title}</div>
                          <div className="wt-status">{isDone ? '✅' : isCurrent && !isLocked ? '📍' : isLocked ? '🔒' : '○'}</div>
                          <div className="wt-progress-bar">
                            <div className="wt-progress-fill" style={{ width: `${prog.pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
};
