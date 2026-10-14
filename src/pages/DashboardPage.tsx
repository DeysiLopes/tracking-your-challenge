/**
 * DashboardPage — hero de XP (gato + nível + barra), estatísticas
 * e conquistas (badges + gatinhos colecionáveis por desafio).
 */
import React from 'react';
import { useTracker } from '../hooks/useTracker';
import { PixelCat } from '../components/common/PixelCat';
import {
  BADGES, formatDate, fullyTaskedChallenges, getCurrentDay, getCurrentWeek,
  getCurrentXPLevel, getEarnedXP, getNextXPLevel, getPlanXP, getTotalXP,
  hasPlanContent, isBadgeUnlocked,
} from '../core/business/progress';
import { catName } from '../core/business/cats';

export const DashboardPage: React.FC = () => {
  const { ctx, plan, state, mascot, showOffCat } = useTracker();

  const day = getCurrentDay(ctx);
  const totalXP = getTotalXP(ctx);
  const xpMao = getEarnedXP(ctx);
  const xpPlano = getPlanXP(ctx);
  const curLevel = getCurrentXPLevel(totalXP);
  const nextLevel = getNextXPLevel(totalXP);

  const pct = nextLevel
    ? Math.round(((totalXP - curLevel.minXP) / (nextLevel.minXP - curLevel.minXP)) * 100)
    : 100;

  const headerDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const unlocked = BADGES.filter((b) => isBadgeUnlocked(state, b.id));
  const fullyTasked = fullyTaskedChallenges(ctx);
  const challengeBadges = state.challengeBadges || [];

  return (
    <section className="view active" id="view-dashboard">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle" id="header-subtitle">
            {state.startDate && hasPlanContent(ctx)
              ? `Dia ${day} de ${plan.totalDays} · Iniciado em ${formatDate(state.startDate)} · Semana ${getCurrentWeek(ctx)} de ${ctx.plan.phases.reduce((s, p) => s + p.weeks.length, 0)}`
              : 'Acompanhe seu progresso rumo à vaga internacional.'}
          </p>
        </div>
        <div className="header-date">{headerDate}</div>
        <div className="page-xp"><div className="page-xp-value">{totalXP} XP</div></div>
      </header>

      <div className="xp-hero dashboard-hero" id="xp-hero">
        <div className="xp-hero-left">
          <div
            className="xp-level-ring"
            id="xp-level-ring"
            style={nextLevel
              ? { background: `conic-gradient(var(--amber) 0deg, var(--rose) ${pct * 3.6}deg, var(--bg-hover) ${pct * 3.6}deg)` }
              : undefined}
          >
            <div
              className="xp-cat dashboard-cat cat-clickable"
              id="xp-cat"
              role="button"
              title={`${catName(mascot.level)} — clique pra ver o gato se exibir 🐾`}
              onClick={() => showOffCat()}
            >
              <PixelCat level={mascot.level} className={`cat-idle cat-tier-${mascot.level}`} />
            </div>
            <span className="xp-level-num" id="xp-level-num">{curLevel.level}</span>
          </div>
          <div className="xp-hero-info">
            <div className="xp-hero-title" id="xp-hero-title">{curLevel.title}</div>
            <div className="xp-hero-sub" id="xp-hero-sub">
              {nextLevel
                ? `${totalXP - curLevel.minXP} / ${nextLevel.minXP - curLevel.minXP} XP para ${nextLevel.title}`
                : '🏆 Nível máximo atingido!'}
            </div>
          </div>
        </div>
        <div className="xp-hero-right">
          <div className="xp-stats">
            <div className="xp-stat"><span>{totalXP}</span><small>XP Geral</small></div>
            <div className="xp-stat"><span>{xpMao}</span><small>XP Mão na Massa</small></div>
            <div className="xp-stat"><span>{xpPlano}</span><small>XP Plano</small></div>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="badges-section">
        <h2 className="section-title"><span className="section-icon">🏅</span> Conquistas</h2>
        <div className="badges-container" id="badges-grid-dashboard">
          {unlocked.length ? (
            <>
              <div className="badges-grid">
                {unlocked.map((b) => (
                  <div key={b.id} className="badge-card">
                    <div className="badge-name">{b.icon} {b.name}</div>
                    {b.id === 'task-atomicas' && (
                      <div className="badge-detail">
                        {fullyTasked.length
                          ? fullyTasked.map((dc) => (
                            <div key={dc.id} className="badge-challenge">#{String(dc.num).padStart(2, '0')} — {dc.title}</div>
                          ))
                          : 'Conclua todas as tasks atômicas de um desafio para ganhar este badge.'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="badges-count">🏅 {unlocked.length} de {BADGES.length} conquistas</div>
            </>
          ) : (
            <div className="badges-empty">🏅 Conquiste badges concluindo tarefas, semanas, fases e desafios!</div>
          )}
        </div>
        <div className="challenge-badges-container" id="challenge-badges-dashboard">
          {challengeBadges.length ? (
            <div className="challenge-badges-grid">
              {challengeBadges.map((b) => (
                <div key={b.challengeId} className="challenge-badge-card">
                  <div
                    className="challenge-badge-cat cat-clickable"
                    role="button"
                    title={`${catName(b.skin)} — clique pra ver o gato se exibir 🐾`}
                    onClick={() => showOffCat(b.skin)}
                  >
                    <PixelCat level={b.skin} size={48} className={`cat-tier-${b.skin}`} />
                  </div>
                  <div className="challenge-badge-info">
                    <div className="challenge-badge-title">{b.title}</div>
                    <div className="challenge-badge-meta">
                      #{String(b.num).padStart(2, '0')} · +{b.xp} XP · {formatDate(b.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="challenge-badges-empty">🐾 Conclua desafios para colecionar badges de gatinho com o nome de cada um!</div>
          )}
        </div>
      </div>
    </section>
  );
};
