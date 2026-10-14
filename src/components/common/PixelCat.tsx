/**
 * PixelCat — renderiza o mascote em pixel art como <svg> React.
 * A montagem do grid (orelas/olhos partidos p/ animar) vem de buildCat().
 */
import React, { useMemo } from 'react';
import { buildCat, catForLevel } from '../../core/business/cats';

interface Props {
  level: number;
  size?: number;
  className?: string;
}

export const PixelCat: React.FC<Props> = ({ level, size = 112, className = '' }) => {
  const cat = useMemo(() => buildCat(catForLevel(level)), [level]);
  const scale = size / cat.width;
  const h = cat.height * scale;
  const cls = 'cat-svg' + (className ? ' ' + className : '');
  const rx = (p: { x: number; y: number; fill: string }, i: number) => (
    <rect key={i} x={p.x * scale} y={p.y * scale} width={scale} height={scale} fill={p.fill} />
  );

  return (
    <svg className={cls} viewBox={`0 0 ${size} ${h}`} width={size} height={h} aria-label="mascote gatinho" role="img">
      {cat.body.map(rx)}
      {cat.earL.length > 0 && <g className="cat-ear-left">{cat.earL.map(rx)}</g>}
      {cat.earR.length > 0 && <g className="cat-ear-right">{cat.earR.map(rx)}</g>}
      {cat.eyeL.length > 0 && <g className="cat-eye-left">{cat.eyeL.map(rx)}</g>}
      {cat.eyeR.length > 0 && <g className="cat-eye-right">{cat.eyeR.map(rx)}</g>}
    </svg>
  );
};
