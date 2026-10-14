import { describe, it, expect } from 'vitest';
import { renderMarkdown, mdFileName } from './markdown';

describe('renderMarkdown', () => {
  it('escapa HTML (seguro contra XSS)', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renderiza headings, bold, itálico e code', () => {
    const html = renderMarkdown('# Título\n**negrito** e *itálico* e `codigo`');
    expect(html).toContain('<h1>Título</h1>');
    expect(html).toContain('<strong>negrito</strong>');
    expect(html).toContain('<em>itálico</em>');
    expect(html).toContain('<code>codigo</code>');
  });

  it('renderiza listas e checkboxes', () => {
    const html = renderMarkdown('- item\n- [x] feito\n- [ ] pendente');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>item</li>');
    expect(html).toContain('☑');
    expect(html).toContain('☐');
  });

  it('renderiza [[wikilinks]] e links externos', () => {
    const html = renderMarkdown('ver [[Semana 3]] e [site](https://ex.com)');
    expect(html).toContain('class="wikilink"');
    expect(html).toContain('href="https://ex.com"');
  });

  it('renderiza bloco de código sem inline', () => {
    const html = renderMarkdown('```\nconst x = **1**;\n```');
    expect(html).toContain('<pre><code>');
    expect(html).toContain('**1**');
  });

  it('blockquote e hr', () => {
    const html = renderMarkdown('> nota\n\n---');
    expect(html).toContain('<blockquote>nota</blockquote>');
    expect(html).toContain('<hr>');
  });
});

describe('mdFileName', () => {
  it('gera slug seguro', () => {
    expect(mdFileName('Semana 3 — Revisão & Hooks!')).toBe('semana-3-revisao-hooks.md');
  });
  it('fallback pra título vazio', () => {
    expect(mdFileName('')).toBe('nota.md');
  });
});
