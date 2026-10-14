/**
 * cats.ts — Mascote em pixel art (gatinhos), um por nível de XP.
 * Dados e montagem do grid; o SVG é renderizado por <PixelCat />.
 *
 * Reações do gato (ver MascotBox/useTracker):
 *   - concluir uma task      → se lambe (groom/lick)
 *   - concluir desafio/nível → comemora (jump + confete)
 *   - semana/desafio atrasado → chora (cat-crying)
 */

export interface CatSkin {
  name: string;
  body: string;
  outline: string;
  ear: string;
  eye: string;
  eyeAlt: string;
  nose: string;
  white: string;
  sunglasses: string;
  accessory: 'sunglasses' | 'hat' | 'crown' | null;
}

const FACE = [
  '..obbbbbbbbbbo..',
  '.obbbbbbbbbbbbo.',
  'obbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbo',
  'obbbeebbbbeebbbo',
  'obbbbbbbbbbbbbbo',
  'obbwbbbwwbbbwbbo',
  '.obbwwwwwwwwbbo.',
  '..obbbbbbbbbbo..',
];

const EARS = [
  '...oo......oo...',
  '..obio....oibo..',
  '..obbo....obbo..',
];

const HAT = [
  '.......oo.......',
  '......oooo......',
  '.....oooooo.....',
  '....oooooooo....',
  '..oooooooooooo..',
];

const CROWN = [
  '...o....o....o..',
  '..ooo..ooo..ooo.',
  '.oooooooooooooo.',
];

const SUNGLASSES_FACE = 'obbbssssssssbbbo';

export const CAT_SKINS: Record<number, CatSkin> = {
  1: { name: 'Kitten',        body: '#45475a', outline: '#11111b', ear: '#f38ba8', eye: '#89b4fa', eyeAlt: '#89b4fa', nose: '#eba0ac', white: '#cdd6f4', sunglasses: '#181825', accessory: null },
  2: { name: 'Gato Cool',     body: '#b4befe', outline: '#45475a', ear: '#f5c2e7', eye: '#1e1e2e', eyeAlt: '#1e1e2e', nose: '#eba0ac', white: '#f5e0dc', sunglasses: '#181825', accessory: 'sunglasses' },
  3: { name: 'Gato Ninja',    body: '#94e2d5', outline: '#1e1e2e', ear: '#f9e2af', eye: '#1e1e2e', eyeAlt: '#1e1e2e', nose: '#f38ba8', white: '#f5e0dc', sunglasses: '#181825', accessory: null },
  4: { name: 'Gato Rocker',   body: '#fab387', outline: '#1e1e2e', ear: '#f38ba8', eye: '#1e1e2e', eyeAlt: '#1e1e2e', nose: '#f38ba8', white: '#f5e0dc', sunglasses: '#181825', accessory: null },
  5: { name: 'Gato Mago',     body: '#cba6f7', outline: '#1e1e2e', ear: '#f5e0dc', eye: '#1e1e2e', eyeAlt: '#1e1e2e', nose: '#f38ba8', white: '#f5e0dc', sunglasses: '#181825', accessory: 'hat' },
  6: { name: 'Gato Brabo',    body: '#f38ba8', outline: '#1e1e2e', ear: '#f9e2af', eye: '#f9e2af', eyeAlt: '#f9e2af', nose: '#eba0ac', white: '#f5e0dc', sunglasses: '#181825', accessory: null },
  7: { name: 'Gato Lendário', body: '#f9e2af', outline: '#11111b', ear: '#fab387', eye: '#11111b', eyeAlt: '#11111b', nose: '#f38ba8', white: '#ffffff', sunglasses: '#181825', accessory: 'crown' },
};

export const catForLevel = (level: number): CatSkin => CAT_SKINS[level] || CAT_SKINS[1];
export const catName = (level: number): string => catForLevel(level).name;

export interface CatPart {
  x: number;
  y: number;
  fill: string;
}

export interface CatModel {
  width: number;
  height: number;
  body: CatPart[];   // tudo que não é orelha/olho
  earL: CatPart[];   // orelha esquerda (some com chapéu)
  earR: CatPart[];
  eyeL: CatPart[];   // olho esquerdo (some com óculos)
  eyeR: CatPart[];
}

/** Monta as partes do gato da skin (espelha catSVG do legado). */
export function buildCat(skin: CatSkin): CatModel {
  const rows: string[] = [];
  let faceBase: number;
  if (skin.accessory === 'hat') { rows.push(...HAT); faceBase = rows.length; }
  else if (skin.accessory === 'crown') { rows.push(...CROWN); faceBase = rows.length; }
  else { rows.push(...EARS); faceBase = rows.length; }
  rows.push(...FACE);
  if (skin.accessory === 'sunglasses') rows[faceBase + 4] = SUNGLASSES_FACE;

  const W = Math.max(...rows.map((r) => r.length));
  const fillFor: Record<string, string> = {
    o: skin.outline, b: skin.body, i: skin.ear, e: skin.eye,
    E: skin.eyeAlt, n: skin.nose, w: skin.white, s: skin.sunglasses,
  };

  const hasEars = skin.accessory !== 'hat';
  const earRow0 = skin.accessory === 'crown' ? CROWN.length : 0;
  const midCol = Math.floor(W / 2);

  const model: CatModel = { width: W, height: rows.length, body: [], earL: [], earR: [], eyeL: [], eyeR: [] };
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const part = { x: c, y: r, fill: fillFor[ch] || skin.outline };
      const inEars = hasEars && r >= earRow0 && r < earRow0 + EARS.length;
      const isEyeRow = r === faceBase + 4 && (ch === 'e' || ch === 'E');
      if (inEars && c < midCol) model.earL.push(part);
      else if (inEars) model.earR.push(part);
      else if (isEyeRow && c < midCol) model.eyeL.push(part);
      else if (isEyeRow) model.eyeR.push(part);
      else model.body.push(part);
    }
  }
  return model;
}
