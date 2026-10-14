/**
 * ExportPage — exporta notas .md para o Obsidian: ZIP completo,
 * semana atual ou dashboard de progresso, com preview.
 */
import React, { useState } from 'react';
import { useTracker } from '../hooks/useTracker';
import {
  downloadMD, exportAllZip, generateIndexMD, generateProgressMD, generateWeekMD,
} from '../core/business/export';
import { getCurrentWeek, hasPlanContent } from '../core/business/progress';

export const ExportPage: React.FC = () => {
  const { ctx, toast } = useTracker();
  const [preview, setPreview] = useState('← Selecione uma exportação para ver o preview do arquivo .md');

  const currentWeekMD = () => {
    const wn = getCurrentWeek(ctx);
    const weeks = ctx.plan.phases.flatMap((p) => p.weeks);
    const week = wn ? weeks.find((w) => w.id === wn) : weeks[0];
    return week ? generateWeekMD(ctx, week) : 'Importe um plano programático para exportar semanas.';
  };

  const onExportAll = async () => {
    try {
      const name = await exportAllZip(ctx);
      toast(`ZIP exportado: ${name} 🗂️`);
    } catch (e) {
      toast('Falha ao gerar o ZIP: ' + (e as Error).message);
    }
  };

  const onExportWeek = () => {
    const wn = getCurrentWeek(ctx);
    if (!wn || !hasPlanContent(ctx)) {
      toast('Importe um plano e configure a data de início primeiro!');
      return;
    }
    const week = ctx.plan.phases.flatMap((p) => p.weeks).find((w) => w.id === wn);
    if (!week) return;
    const fn = `semana-${String(wn).padStart(2, '0')}-${week.title.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')}.md`;
    downloadMD(fn, generateWeekMD(ctx, week));
    toast('Semana exportada! 📄');
  };

  const onExportProgress = () => {
    downloadMD('00-progresso.md', generateProgressMD(ctx));
    toast('Progresso exportado! 📊');
  };

  return (
    <section className="view active" id="view-export">
      <header className="page-header">
        <div>
          <h1>Export Obsidian</h1>
          <p className="page-subtitle">Gere arquivos <code>.md</code> prontos para seu vault do Obsidian.</p>
        </div>
      </header>

      <div className="export-grid">
        <div className="export-card">
          <div className="export-icon">📦</div>
          <h3>Export Completo</h3>
          <p>Exporta todos os arquivos do plano (uma nota por semana + índice) em um arquivo ZIP pronto para importar no Obsidian.</p>
          <button className="btn btn-primary" onClick={onExportAll}
            onMouseEnter={() => setPreview(generateIndexMD(ctx))}>
            ⬇ Baixar ZIP — Plano Completo
          </button>
        </div>
        <div className="export-card">
          <div className="export-icon">📄</div>
          <h3>Semana Atual</h3>
          <p>Exporta apenas a nota da semana atual, com o progresso marcado e suas anotações.</p>
          <button className="btn btn-secondary" onClick={onExportWeek}
            onMouseEnter={() => setPreview(currentWeekMD())}>
            ⬇ Baixar — Semana Atual
          </button>
        </div>
        <div className="export-card">
          <div className="export-icon">📊</div>
          <h3>Dashboard de Progresso</h3>
          <p>Exporta um arquivo <code>00-progresso.md</code> com tabela de progresso de todas as semanas.</p>
          <button className="btn btn-secondary" onClick={onExportProgress}
            onMouseEnter={() => setPreview(generateProgressMD(ctx))}>
            ⬇ Baixar — Progresso
          </button>
        </div>
      </div>

      <div className="export-preview">
        <h2 className="section-title"><span className="section-icon">👁</span> Preview do Arquivo</h2>
        <pre className="preview-code" id="export-preview-code">{preview}</pre>
      </div>
    </section>
  );
};
