/**
 * Confetti — chuva de confetes no mascote ao subir de nível ou
 * concluir desafio (equivalente ao spawnConfetti() do legado).
 * Re-renderiza a rajada quando `burst` muda.
 */
import React, { useMemo } from 'react';

const COLORS = ['#89b4fa', '#f9e2af', '#f38ba8', '#a6e3a1', '#cba6f7', '#94e2d5'];

export const Confetti: React.FC<{ burst: number }> = ({ burst }) => {
  const pieces = useMemo(() => {
    if (!burst) return [];
    return Array.from({ length: 18 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      background: COLORS[i % COLORS.length],
      animationDelay: `${(Math.random() * 0.25).toFixed(2)}s`,
    }));
  }, [burst]);

  if (!pieces.length) return null;
  return (
    <>
      {pieces.map((s, i) => (
        <span key={`${burst}-${i}`} className="confetti" style={s} />
      ))}
    </>
  );
};
