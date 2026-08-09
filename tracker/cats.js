/**
 * cats.js — Mascote em pixel art (gatinhos) para o Tracker.
 *
 * Cada nível de XP tem um gatinho diferente (cada vez mais "fodas").
 * São SVGs gerados a partir de um grid de pixel art (14 colunas),
 * usando a paleta do Catppuccin. O gato reage a ações:
 *   - terminar uma task  → se lambendo (groom / lick)
 *   - concluir um desafio → comemorando (jump + confete)
 */

// Grid base da face (14 colunas). Caracteres:
//   . = transparente · o = contorno · b = corpo · i = orelha interna
//   e = olho · E = olho alternativo · n = nariz · w = branco · s = óculos
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

// Um gatinho por nível de XP (ver XP_LEVELS em app.js).
const CAT_SKINS = {
  1: { name: 'Kitten',      body: '#45475a', outline: '#11111b', ear: '#f38ba8', eye: '#89b4fa', eyeAlt: '#89b4fa', nose: '#eba0ac', white: '#cdd6f4', sunglasses: '#181825', accessory: null },
  2: { name: 'Gato Cool',   body: '#b4befe', outline: '#45475a', ear: '#f5c2e7', eye: '#1e1e2e', eyeAlt: '#1e1e2e', nose: '#eba0ac', white: '#f5e0dc', sunglasses: '#181825', accessory: 'sunglasses' },
  3: { name: 'Gato Ninja',  body: '#94e2d5', outline: '#1e1e2e', ear: '#f9e2af', eye: '#1e1e2e', eyeAlt: '#1e1e2e', nose: '#f38ba8', white: '#f5e0dc', sunglasses: '#181825', accessory: null },
  4: { name: 'Gato Rocker', body: '#fab387', outline: '#1e1e2e', ear: '#f38ba8', eye: '#1e1e2e', eyeAlt: '#1e1e2e', nose: '#f38ba8', white: '#f5e0dc', sunglasses: '#181825', accessory: null },
  5: { name: 'Gato Mago',   body: '#cba6f7', outline: '#1e1e2e', ear: '#f5e0dc', eye: '#1e1e2e', eyeAlt: '#1e1e2e', nose: '#f38ba8', white: '#f5e0dc', sunglasses: '#181825', accessory: 'hat' },
  6: { name: 'Gato Brabo',  body: '#f38ba8', outline: '#1e1e2e', ear: '#f9e2af', eye: '#f9e2af', eyeAlt: '#f9e2af', nose: '#eba0ac', white: '#f5e0dc', sunglasses: '#181825', accessory: null },
  7: { name: 'Gato Lendário', body: '#f9e2af', outline: '#11111b', ear: '#fab387', eye: '#11111b', eyeAlt: '#11111b', nose: '#f38ba8', white: '#ffffff', sunglasses: '#181825', accessory: 'crown' },
};

function catForLevel(level) {
  return CAT_SKINS[level] || CAT_SKINS[1];
}

function catName(level) {
  return catForLevel(level).name;
}

// Constrói as linhas do grid final (com orelhas/acessórios da skin).
function catRows(skin) {
  const rows = [];
  const faceBase = (() => {
    if (skin.accessory === 'hat') { rows.push(...HAT); return rows.length; }
    if (skin.accessory === 'crown') rows.push(...CROWN);
    rows.push(...EARS);
    return rows.length;
  })();
  rows.push(...FACE);
  if (skin.accessory === 'sunglasses') rows[faceBase + 4] = SUNGLASSES_FACE;
  return { rows, faceBase };
}

// Renderiza o SVG pixel art do gatinho. `cls` permite animação/glow via CSS.
// As partes ganham grupos semânticos para animação por CSS (SVG):
//   <g class="cat-body">    corpo
//   <g class="cat-ear">     orelha (cat-ear-l / cat-ear-r) — some quando há chapéu
//   <g class="cat-eye">     olho (cat-eye-l / cat-eye-r)    — some com óculos
// As orelhas/olhos "mexem" via CSS (transform-box: fill-box), mantendo
// o restante do pixel-art estático para não borrar.
function catSVG(skin, cls) {
  const { rows, faceBase } = catRows(skin);
  const H = rows.length;
  const W = Math.max(...rows.map(r => r.length));
  const fillFor = {
    o: skin.outline, b: skin.body, i: skin.ear, e: skin.eye,
    E: skin.eyeAlt, n: skin.nose, w: skin.white, s: skin.sunglasses,
  };
  const rectFor = (r, c, ch) =>
    `<rect x="${c}" y="${r}" width="1" height="1" fill="${fillFor[ch] || skin.outline}"/>`;

  const hasEars = skin.accessory !== 'hat';
  const earRow0 = skin.accessory === 'crown' ? CROWN.length : 0; // linha onde as orelhas começam
  const midCol = Math.floor(W / 2);

  const bodyRects = [];
  let earL = '', earR = '', eyeL = '', eyeR = '';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const inEars = hasEars && r >= earRow0 && r < earRow0 + EARS.length;
      const isEyeRow = r === faceBase + 4 && (ch === 'e' || ch === 'E');
      if (inEars && c < midCol) earL += rectFor(r, c, ch);
      else if (inEars && c >= midCol) earR += rectFor(r, c, ch);
      else if (isEyeRow && c < midCol) eyeL += rectFor(r, c, ch);
      else if (isEyeRow && c >= midCol) eyeR += rectFor(r, c, ch);
      else bodyRects.push(rectFor(r, c, ch));
    }
  }

  let parts = `<g class="cat-body">${bodyRects.join('')}</g>`;
  if (earL || earR) {
    parts += '<g class="cat-ears">' +
      (earL ? `<g class="cat-ear cat-ear-l">${earL}</g>` : '') +
      (earR ? `<g class="cat-ear cat-ear-r">${earR}</g>` : '') +
      '</g>';
  }
  if (eyeL) parts += `<g class="cat-eyes cat-eye cat-eye-l">${eyeL}</g>`;
  if (eyeR) parts += `<g class="cat-eyes cat-eye cat-eye-r">${eyeR}</g>`;

  return `<svg class="cat-svg ${cls || ''}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="${skin.name}">${parts}</svg>`;
}
