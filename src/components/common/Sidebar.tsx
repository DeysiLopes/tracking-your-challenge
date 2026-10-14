/**
 * Sidebar — logo (gato), navegação entre views, mascote, contador
 * de dias e ações (Config, Importar, Exportar, Drive).
 */
import React, { useState } from 'react';
import { useTracker } from '../../hooks/useTracker';
import { PixelCat } from './PixelCat';
import { MascotBox } from './MascotBox';
import { getCurrentDay, getEarnedXP, hasPlanContent } from '../../core/business/progress';

export type ViewId = 'dashboard' | 'plan' | 'notes' | 'challenges' | 'export';

interface Props {
  view: ViewId;
  onNavigate: (v: ViewId) => void;
  onOpenConfig: () => void;
}

export const Sidebar: React.FC<Props> = ({ view, onNavigate, onOpenConfig }) => {
  const { ctx, plan, mascot, driveStatus, connectDrive, disconnectDrive, toast } = useTracker();
  const [driveBusy, setDriveBusy] = useState(false);

  const day = getCurrentDay(ctx);
  const earnedXP = getEarnedXP(ctx);
  const planName = hasPlanContent(ctx) ? plan.name : 'Tracker';
  const planSub = hasPlanContent(ctx) ? `${plan.totalDays} dias` : 'na Gringa';

  const nav = (id: ViewId, icon: string, label: string, xpBadge = false) => (
    <button
      className={`nav-item${view === id ? ' active' : ''}`}
      data-view={id}
      onClick={() => onNavigate(id)}
    >
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {xpBadge && (
        <span className={`nav-xp-badge${earnedXP > 0 ? ' visible' : ''}`}>{earnedXP} XP</span>
      )}
    </button>
  );

  const onDrive = async () => {
    if (driveStatus.connected) {
      await disconnectDrive();
      return;
    }
    setDriveBusy(true);
    try {
      await connectDrive();
    } catch (e) {
      const msg = (e as Error).message || '';
      toast(msg.includes('VITE_GOOGLE_CLIENT_ID')
        ? 'Configure VITE_GOOGLE_CLIENT_ID neste build para habilitar o sync.'
        : 'Falha ao conectar no Drive: ' + msg);
    } finally {
      setDriveBusy(false);
    }
  };

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon" id="logo-icon">
          <PixelCat level={mascot.level} size={32} className={`logo-cat cat-tier-${mascot.level}`} />
        </div>
        <div className="logo-text">
          <span className="logo-title" id="plan-name">{planName}</span>
          <span className="logo-sub" id="plan-sub">{planSub}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav('dashboard', '⚡', 'Dashboard')}
        {nav('plan', '📋', 'Plano Semanal')}
        {nav('notes', '📝', 'Minhas Notas')}
        {nav('challenges', '⚔️', 'Desafios', true)}
      </nav>

      <MascotBox />

      <div className="sidebar-footer">
        <div className="day-counter" id="day-counter">
          <span className="day-label">Dia</span>
          <span className="day-number" id="current-day">{day ?? '—'}</span>
          <span className="day-label">de <span id="total-days">{plan.totalDays || 90}</span></span>
        </div>
        <button className="settings-btn" title="Configurar data de início" onClick={onOpenConfig}>⚙ Config</button>
        <button className="settings-btn" title="Importar plano a partir de .md" onClick={onOpenConfig}>📂 Importar</button>
        <button className="settings-btn" title="Exportar para o Obsidian" onClick={() => onNavigate('export')}>🗂️ Exportar Obsidian</button>
        <button
          className={`settings-btn${driveStatus.connected ? ' connected' : ''}`}
          id="drive-btn"
          disabled={driveBusy}
          title={driveStatus.connected
            ? `Sincronizando com Google Drive (${driveStatus.user || 'conectado'}) — clique para desconectar`
            : 'Conectar Google Drive para sincronizar entre aparelhos'}
          onClick={onDrive}
        >
          {driveStatus.connected ? `☁️ ${driveStatus.user || 'Drive'}` : '☁️ Drive'}
        </button>
      </div>
    </aside>
  );
};
