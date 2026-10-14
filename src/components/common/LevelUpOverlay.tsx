/**
 * LevelUpOverlay — comemoração de rank-up do mascote no CENTRO
 * da tela, acima de qualquer modal (o efeito da sidebar ficava
 * escondido atrás do modal da semana). Fecha sozinho (~4,5s)
 * ou com clique/Esc.
 */
import React, { useEffect } from 'react';
import { useTracker } from '../../hooks/useTracker';
import { PixelCat } from './PixelCat';
import { Confetti } from './Confetti';
import { catName } from '../../core/business/cats';

export const LevelUpOverlay: React.FC = () => {
  const { mascot, dismissLevelUp } = useTracker();

  useEffect(() => {
    if (mascot.levelUp == null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismissLevelUp(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mascot.levelUp, dismissLevelUp]);

  if (mascot.levelUp == null) return null;

  return (
    <div className="levelup-overlay" onClick={dismissLevelUp} role="alert" aria-live="assertive">
      <div className="levelup-stage">
        <Confetti burst={mascot.confettiKey || 1} />
        <div className="levelup-cat cat-celebrate">
          <PixelCat level={mascot.levelUp} size={140} className={`cat-tier-${mascot.levelUp}`} />
        </div>
        <div className="levelup-rank">Subiu de rank! 🐾</div>
        <div className="levelup-name">{catName(mascot.levelUp)}</div>
        <div className="levelup-hint">toque pra continuar</div>
      </div>
    </div>
  );
};
