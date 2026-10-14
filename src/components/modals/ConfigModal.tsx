/**
 * ConfigModal — data de início, tema e importação de .md
 * (equivalente ao #modal-config do legado).
 */
import React, { useRef, useState } from 'react';
import { useTracker } from '../../hooks/useTracker';

interface Props { open: boolean; onClose: () => void }

export const ConfigModal: React.FC<Props> = ({ open, onClose }) => {
  const { state, setStartDate, theme, setTheme, importFile, toast } = useTracker();
  const [dateVal, setDateVal] = useState(state.startDate || '');
  const [importStatus, setImportStatus] = useState<{ msg: string; kind: '' | 'error' | 'ok' }>({ msg: '', kind: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const save = () => {
    if (!dateVal) return;
    setStartDate(dateVal);
    onClose();
    toast('Data de início salva! 🗓️');
  };

  const pickTheme = (t: string) => {
    setTheme(t);
    toast('Tema atualizado! 🎨');
  };

  const doImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setImportStatus({ msg: 'Selecione um arquivo .md primeiro.', kind: 'error' }); return; }
    const r = await importFile(file);
    setImportStatus({ msg: r.msg, kind: r.ok ? 'ok' : 'error' });
    if (r.ok) toast(r.msg);
  };

  return (
    <div className="modal-overlay" id="modal-config" style={{ display: 'flex' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>⚙ Configurações</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="form-label">Data de início do plano (Dia 1)</label>
          <input type="date" className="form-input" id="input-start-date"
            value={dateVal} onChange={(e) => setDateVal(e.target.value)} />
          <p className="form-hint">O tracker calculará automaticamente em qual semana você está, com base nessa data.</p>

          <div className="modal-divider" />

          <label className="form-label">🎨 Tema</label>
          <div className="theme-options">
            <div className={`theme-option${theme === 'catppuccin' ? ' active' : ''}`} onClick={() => pickTheme('catppuccin')}>
              <div className="theme-swatch catppuccin"><span /><span /><span /><span /></div>
              <span>🐱 Catppuccin</span>
            </div>
            <div className={`theme-option${theme === 'premium' ? ' active' : ''}`} onClick={() => pickTheme('premium')}>
              <div className="theme-swatch premium"><span /><span /><span /><span /></div>
              <span>🌙 Dark Premium</span>
            </div>
          </div>
          <p className="form-hint">O tema fica salvo no seu navegador. Catppuccin é o padrão.</p>

          <div className="modal-divider" />

          <label className="form-label">📂 Importar plano a partir de um .md</label>
          <input type="file" className="form-input" id="input-import-file" accept=".md,text/markdown"
            ref={fileRef}
            onChange={() => {
              const f = fileRef.current?.files?.[0];
              if (f) setImportStatus({ msg: `Arquivo selecionado: ${f.name}. Clique em “Importar .md”.`, kind: '' });
            }} />
          <p className="form-hint">Importe um arquivo do plano e o tracker se adapta a ele (10, 30, N dias):</p>
          <ul className="form-hint" style={{ margin: '6px 0 10px 0', paddingLeft: 16 }}>
            <li><strong>conteúdo programático</strong> → arquivos com <code>## FASE N — Dias...</code> — gera fases, semanas, tarefas, entregáveis</li>
            <li><strong>mão na massa</strong> → arquivos com <code>## 🏦 Desafio N — ...</code> — gera desafios com tasks atômicas</li>
          </ul>
          <p className="form-hint">
            🔒 <strong>Regra:</strong> novo upload de <strong>desafios</strong> só é permitido quando os desafios atuais estiverem todos concluídos. O plano programático pode ser substituído a qualquer momento.
          </p>
          <button className="btn btn-secondary" onClick={doImport}>📥 Importar .md</button>
          {importStatus.msg && (
            <span className={`import-status ${importStatus.kind}`}>{importStatus.msg}</span>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  );
};
