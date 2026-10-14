/**
 * LevelUpOverlay — gato em destaque no CENTRO da tela, acima de
 * qualquer modal. Dois modos:
 *   rankup  → XP subiu de nível: confete + "Subiu de rank!"
 *   showoff → clique em qualquer gatinho: giro 360° + pulinho
 *             pra se exibir (funciona com qualquer skin/nível)
 * Fecha sozinho ou com clique/Esc.
 */
import React, { useEffect } from 'react';
import { useTracker } from '../../hooks/useTracker';
import { PixelCat } from './PixelCat';
import { Confetti } from './Confetti';
import { catName } from '../../core/business/cats';

export const LevelUpOverlay: React.FC = () => {
  const { mascot, dismissLevelUp } = useTracker();

  const isRankUp = mascot.levelUp != null;
  const isShowoff = !isRankUp && mascot.showoff != null;

  useEffect(() => {
    if (!isRankUp && !isShowoff) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismissLevelUp(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRankUp, isShowoff, dismissLevelUp]);

  if (!isRankUp && !isShowoff) return null;

  const level = (isRankUp ? mascot.levelUp : mascot.showoff)!;

  return (
    <div
      className={`levelup-overlay${isShowoff ? ' showoff' : ''}`}
      onClick={dismissLevelUp}
      role="alert"
      aria-live="assertive"
    >
      <div className="levelup-stage">
        {isRankUp && <Confetti burst={mascot.confettiKey || 1} />}
        <div className={isRankUp ? 'levelup-cat' : 'levelup-cat cat-spin'}>
          <PixelCat level={level} size={140} className={`cat-tier-${level}`} />
        </div>
        {isRankUp ? (
          <>
            <div className="levelup-rank">Subiu de rank! 🐾</div>
            <div className="levelup-name">{catName(level)}</div>
            <div className="levelup-hint">toque pra continuar</div>
          </>
        ) : (
          <>
            <div className="levelup-name">{catName(level)}</div>
            <div className="levelup-hint">✨</div>
          </>
        )}
      </div>
    </div>
  );
};
