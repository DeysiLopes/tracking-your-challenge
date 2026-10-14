/**
 * App — shell do Tracker: sidebar + view ativa + modais.
 * Navegação por estado (mesma lógica de showView() do legado):
 * sem conteúdo importado, sempre cai na tela de boas-vindas.
 */
import React, { useState } from 'react';
import { TrackerProvider, useTracker } from './hooks/useTracker';
import { Sidebar, type ViewId } from './components/common/Sidebar';
import { ConfigModal } from './components/modals/ConfigModal';
import { WeekModal } from './components/modals/WeekModal';
import { ChallengeModal } from './components/modals/ChallengeModal';
import { WelcomePage } from './pages/WelcomePage';
import { DashboardPage } from './pages/DashboardPage';
import { PlanPage } from './pages/PlanPage';
import { NotesPage } from './pages/NotesPage';
import { ChallengesPage } from './pages/ChallengesPage';
import { ExportPage } from './pages/ExportPage';
import { hasContent } from './core/business/progress';

const Shell: React.FC = () => {
  const { loaded, ctx } = useTracker();
  const [view, setView] = useState<ViewId>('dashboard');
  const [configOpen, setConfigOpen] = useState(false);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [noteWeekId, setNoteWeekId] = useState<number | null>(null);

  if (!loaded) {
    return (
      <main className="main" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="empty-state">
          <div className="empty-icon">🐱</div>
          <h3>Carregando tracker…</h3>
        </div>
      </main>
    );
  }

  const empty = !hasContent(ctx);
  const openConfig = () => setConfigOpen(true);
  const editWeekNote = (id: number) => {
    setNoteWeekId(id);
    setView('notes');
  };

  return (
    <>
      <Sidebar view={view} onNavigate={setView} onOpenConfig={openConfig} />
      <main className="main" id="main-content">
        {empty ? (
          <WelcomePage onOpenConfig={openConfig} />
        ) : view === 'dashboard' ? (
          <DashboardPage />
        ) : view === 'plan' ? (
          <PlanPage onOpenWeek={setWeekId} />
        ) : view === 'notes' ? (
          <NotesPage selectedWeekId={noteWeekId} onConsumed={() => setNoteWeekId(null)} />
        ) : view === 'challenges' ? (
          <ChallengesPage onOpenChallenge={setChallengeId} />
        ) : (
          <ExportPage />
        )}
      </main>

      <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
      {weekId != null && (
        <WeekModal weekId={weekId} onClose={() => setWeekId(null)} onEditNote={editWeekNote} />
      )}
      {challengeId != null && (
        <ChallengeModal challengeId={challengeId} onClose={() => setChallengeId(null)} />
      )}
    </>
  );
};

const App: React.FC = () => (
  <TrackerProvider>
    <Shell />
  </TrackerProvider>
);

export default App;
