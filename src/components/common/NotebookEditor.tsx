/**
 * NotebookEditor — editor de nota em tela cheia, estética de
 * caderno pautado (margem vermelha + linhas), no espírito do
 * caderno de resenhas da biblioteca. Markdown com modo
 * Editar/Ler e exportação .md pra qualquer app.
 */
import React, { useEffect, useRef, useState } from 'react';
import { renderMarkdown, mdFileName, downloadMarkdown } from '../../core/business/markdown';

interface Props {
  title: string;
  subtitle?: string;
  /** rótulo superior estilo folha de citações (ex.: "Semana 3") */
  mark?: string;
  initial: string;
  onSave: (text: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

export const NotebookEditor: React.FC<Props> = ({ title, subtitle, mark, initial, onSave, onClear, onClose }) => {
  const [draft, setDraft] = useState(initial);
  const [reading, setReading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!reading) taRef.current?.focus();
  }, [reading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); onSave(draft); setDirty(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, onSave, onClose]);

  const exportMd = () => downloadMarkdown(mdFileName(title), draft);

  return (
    <div className="notebook-overlay" role="dialog" aria-modal="true" aria-label={`Nota: ${title}`}>
      <div className="notebook">
        <header className="nb-head">
          <div className="nb-title-wrap">
            {mark && <div className="nb-mark">📝 {mark}</div>}
            <h3 className="nb-title">{title}</h3>
            {subtitle && <p className="nb-sub">{subtitle}</p>}
          </div>
          <div className="nb-modes">
            <button
              className={`nb-mode${!reading ? ' active' : ''}`}
              onClick={() => setReading(false)}
            >✏️ Editar</button>
            <button
              className={`nb-mode${reading ? ' active' : ''}`}
              onClick={() => setReading(true)}
            >📖 Ler</button>
          </div>
          <button className="nb-close" onClick={onClose} title="Fechar (Esc)">✕</button>
        </header>

        {reading ? (
          <div
            className="nb-reading nb-writing"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(draft) || '<p class="nb-empty">Nota vazia — clique em ✏️ Editar.</p>' }}
          />
        ) : (
          <div className="nb-writing">
            <textarea
              ref={taRef}
              className="nb-textarea"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setDirty(true); }}
              placeholder={'Escreva em Markdown…\n# título, - listas, - [ ] checkboxes, [[wikilinks]], **negrito**'}
              spellCheck={false}
            />
          </div>
        )}

        <footer className="nb-foot">
          <span className="nb-hint">{dirty ? 'alterações não salvas' : 'Markdown · Ctrl+S salva'}</span>
          <div className="nb-actions">
            <button className="btn btn-secondary" onClick={exportMd} title="Baixar .md pra abrir em qualquer app">⬇️ Exportar .md</button>
            {onClear && <button className="btn btn-secondary" onClick={onClear}>🗑 Limpar</button>}
            <button className="btn btn-primary" onClick={() => { onSave(draft); setDirty(false); }}>💾 Salvar</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
