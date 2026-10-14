/**
 * Sidebar — logo (gato), navegação por rotas, mascote, contador
 * de dias e ações (Config, Importar, Drive).
 */
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTracker } from '../../hooks/useTracker';
import { PixelCat } from './PixelCat';
import { MascotBox } from './MascotBox';
import { getCurrentDay, getEarnedXP, hasPlanContent } from '../../core/business/progress';

interface Props {
  onOpenConfig: () => void;
}

const NAV_ITEMS = [
  { to: '/', icon: '⚡', label: 'Dashboard', end: true },
  { to: '/plan', icon: '📋', label: 'Plano Semanal', end: false },
  { to: '/notes', icon: '📝', label: 'Minhas Notas', end: false },
  { to: '/challenges', icon: '⚔️', label: 'Desafios', end: false, xp: true },
];

export const Sidebar: React.FC<Props> = ({ onOpenConfig }) => {
  const { ctx, plan, mascot, driveStatus, connectDrive, disconnectDrive, toast } = useTracker();
  const [driveBusy, setDriveBusy] = useState(false);

  const day = getCurrentDay(ctx);
  const earnedXP = getEarnedXP(ctx);
  const planName = hasPlanContent(ctx) ? plan.name : 'Tracker';
  const planSub = hasPlanContent(ctx) ? `${plan.totalDays} dias` : 'na Gringa';

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
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.xp && (
              <span className={`nav-xp-badge${earnedXP > 0 ? ' visible' : ''}`}>{earnedXP} XP</span>
            )}
          </NavLink>
        ))}
      </nav>

      <MascotBox />

      <div className="sidebar-footer">
        <div className="day-counter" id="day-counter">
          <span className="day-label">Dia</span>
          <span className="day-number" id="current-day">{hasPlanContent(ctx) ? (day ?? '—') : '—'}</span>
          <span className="day-label">de <span id="total-days">{hasPlanContent(ctx) ? plan.totalDays : '—'}</span></span>
        </div>
        <button className="settings-btn" title="Configurar data de início" onClick={onOpenConfig}>⚙ Config</button>
        <button className="settings-btn" title="Importar plano a partir de .md" onClick={onOpenConfig}>📂 Importar</button>
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
