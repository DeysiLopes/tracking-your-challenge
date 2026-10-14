/**
 * MascotBox — gatinho da sidebar com bolha de fala e confete.
 * Reações vêm do contexto (mascot.anim/saying/crying).
 */
import React from 'react';
import { useTracker } from '../../hooks/useTracker';
import { PixelCat } from './PixelCat';
import { Confetti } from './Confetti';
import { catName } from '../../core/business/cats';

export const MascotBox: React.FC = () => {
  const { mascot } = useTracker();
  const animCls = mascot.anim === 'lick' ? 'cat-lick' : mascot.anim === 'celebrate' ? 'cat-celebrate' : 'cat-idle';
  const cls = `cat-svg ${animCls} cat-tier-${mascot.level}` + (mascot.crying && mascot.anim === 'idle' ? ' cat-crying' : '');

  return (
    <div className="mascot-box" id="mascot-box">
      <div className="mascot-cat" id="mascot-cat">
        <PixelCat level={mascot.level} className={cls.replace('cat-svg', '').trim()} />
      </div>
      <div className="mascot-name" id="mascot-name">{catName(mascot.level)}</div>
      <div className={`mascot-bubble${mascot.saying ? ' show' : ''}`} id="mascot-bubble">
        {mascot.saying || ''}
      </div>
      <Confetti burst={mascot.confettiKey} />
    </div>
  );
};
