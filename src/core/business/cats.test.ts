import { describe, expect, it } from 'vitest';
import { buildCat, catForLevel, catName, CAT_SKINS } from './cats';

describe('cats — skins por nível', () => {
  it('7 níveis mapeados; fallback pro nível 1', () => {
    expect(Object.keys(CAT_SKINS)).toHaveLength(7);
    expect(catForLevel(99).name).toBe('Kitten');
    expect(catName(7)).toBe('Gato Lendário');
  });
});

describe('cats — buildCat', () => {
  it('monta grid com todas as partes', () => {
    const cat = buildCat(catForLevel(1));
    expect(cat.width).toBeGreaterThan(0);
    expect(cat.height).toBeGreaterThan(0);
    expect(cat.body.length).toBeGreaterThan(0);
    expect(cat.earL.length).toBeGreaterThan(0);
    expect(cat.earR.length).toBeGreaterThan(0);
    expect(cat.eyeL.length).toBeGreaterThan(0);
    expect(cat.eyeR.length).toBeGreaterThan(0);
  });
  it('chapéu remove as orelhas (nível 5 — Gato Mago)', () => {
    const cat = buildCat(catForLevel(5));
    expect(cat.earL).toHaveLength(0);
    expect(cat.earR).toHaveLength(0);
  });
  it('óculos mantém orelhas mas cobre os olhos (nível 2)', () => {
    const cat = buildCat(catForLevel(2));
    expect(cat.earL.length).toBeGreaterThan(0);
    expect(cat.eyeL).toHaveLength(0);
    expect(cat.eyeR).toHaveLength(0);
  });
  it('coroa mantém orelhas (nível 7)', () => {
    const cat = buildCat(catForLevel(7));
    expect(cat.earL.length).toBeGreaterThan(0);
    expect(cat.earR.length).toBeGreaterThan(0);
  });
  it('simetria das orelhas', () => {
    const cat = buildCat(catForLevel(3));
    expect(cat.earL.length).toBe(cat.earR.length);
  });
});
