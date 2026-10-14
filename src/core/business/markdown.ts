/**
 * markdown.ts — renderer Markdown mínimo e seguro pro modo "Ler"
 * das notas (estilo Obsidian). Escapa HTML primeiro — nenhuma
 * tag do texto vira markup. Suporta:
 *   # h1..h6, **bold**, *itálico*, `code`, ```blocos```,
 *   - listas, - [ ]/- [x] checkboxes, [[wikilinks]], [links](url),
 *   > citações, --- hr e parágrafos.
 */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inline = (s: string): string =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink">$1</span>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inCode = false;
  let inList = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (inList) { out.push('</ul>'); inList = false; }
  };

  for (const raw of lines) {
    const line = raw;

    if (/^\s*```/.test(line)) {
      if (inCode) { out.push('</code></pre>'); inCode = false; }
      else { flushPara(); flushList(); out.push('<pre><code>'); inCode = true; }
      continue;
    }
    if (inCode) { out.push(esc(line) + '\n'); continue; }

    if (/^\s*$/.test(line)) { flushPara(); flushList(); continue; }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flushPara(); flushList(); out.push('<hr>'); continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }

    const q = line.match(/^>\s?(.*)$/);
    if (q) { flushPara(); flushList(); out.push(`<blockquote>${inline(q[1])}</blockquote>`); continue; }

    const li = line.match(/^\s*[-*+]\s+(.*)$/) || line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (li) {
      flushPara();
      if (!inList) { out.push('<ul>'); inList = true; }
      const cb = li[1].match(/^\[([ xX])\]\s+(.*)$/);
      out.push(cb
        ? `<li class="task ${cb[1] === ' ' ? '' : 'done'}"><span class="cb">${cb[1] === ' ' ? '☐' : '☑'}</span> ${inline(cb[2])}</li>`
        : `<li>${inline(li[1])}</li>`);
      continue;
    }

    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

/** Nome de arquivo seguro a partir do título da nota. */
export function mdFileName(title: string): string {
  const slug = title
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'nota'}.md`;
}

/** Baixa um texto como arquivo .md (exportação p/ Obsidian etc.). */
export function downloadMarkdown(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
