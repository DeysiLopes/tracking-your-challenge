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
import { catName } from '../../core/business/cats';

interface Props {
  onOpenConfig: () => void;
}

const NAV_ITEMS = [
  { to: '/', icon: '⚡', label: 'Dashboard', end: true },
  { to: '/plano', icon: '📋', label: 'Plano Semanal', end: false },
  { to: '/notas', icon: '📝', label: 'Minhas Notas', end: false },
  { to: '/desafios', icon: '⚔️', label: 'Desafios', end: false, xp: true },
];

const COLLAPSED_KEY = 'tracker-sidebar-collapsed';

export const Sidebar: React.FC<Props> = ({ onOpenConfig }) => {
  const { ctx, plan, mascot, driveStatus, connectDrive, disconnectDrive, toast, showOffCat } = useTracker();
  const [driveBusy, setDriveBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1');

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
  };

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
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} id="sidebar">
      <button
        className="sidebar-toggle"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expandir menu' : 'Recolher menu (só ícones)'}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? '»' : '«'}
      </button>
      <div className="sidebar-logo">
        <button
          className="logo-icon logo-cat-btn"
          id="logo-icon"
          title={`${catName(mascot.level)} — clique pra ver o gato se exibir 🐾`}
          onClick={() => showOffCat()}
        >
          <PixelCat level={mascot.level} size={32} className={`logo-cat cat-tier-${mascot.level}`} />
        </button>
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
        <button className="settings-btn" title="Configurar data de início" onClick={onOpenConfig}>⚙ <span className="sb-label">Config</span></button>
        <button className="settings-btn" title="Importar plano a partir de .md" onClick={onOpenConfig}>📂 <span className="sb-label">Importar</span></button>
        <button
          className={`settings-btn${driveStatus.connected ? ' connected' : ''}`}
          id="drive-btn"
          disabled={driveBusy}
          title={driveStatus.connected
            ? `Sincronizando com Google Drive (${driveStatus.user || 'conectado'}) — clique para desconectar`
            : 'Conectar Google Drive para sincronizar entre aparelhos'}
          onClick={onDrive}
        >
          ☁️ <span className="sb-label">{driveStatus.connected ? (driveStatus.user || 'Drive') : 'Drive'}</span>
        </button>
      </div>
    </aside>
  );
};
