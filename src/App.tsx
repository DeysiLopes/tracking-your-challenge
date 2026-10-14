/**
 * App — shell do Tracker: sidebar + rotas SPA + modais.
 * Cada item do menu é uma rota real (React Router); sem conteúdo
 * importado, qualquer rota cai na tela de boas-vindas (mesma regra
 * do showView() legado).
 */
import React, { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { TrackerProvider, useTracker } from './hooks/useTracker';
import { Sidebar } from './components/common/Sidebar';
import { ConfigModal } from './components/modals/ConfigModal';
import { LevelUpOverlay } from './components/common/LevelUpOverlay';
import { WeekModal } from './components/modals/WeekModal';
import { ChallengeModal } from './components/modals/ChallengeModal';
import { WelcomePage } from './pages/WelcomePage';
import { DashboardPage } from './pages/DashboardPage';
import { PlanPage } from './pages/PlanPage';
import { NotesPage } from './pages/NotesPage';
import { ChallengesPage } from './pages/ChallengesPage';
import { hasContent } from './core/business/progress';

const Shell: React.FC = () => {
  const { loaded, ctx } = useTracker();
  const navigate = useNavigate();
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
    navigate('/notas');
  };

  if (empty) {
    return (
      <>
        <Sidebar onOpenConfig={openConfig} />
        <main className="main" id="main-content">
          <WelcomePage onOpenConfig={openConfig} />
        </main>
        <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Sidebar onOpenConfig={openConfig} />
      <main className="main" id="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/plano" element={<PlanPage onOpenWeek={setWeekId} />} />
          <Route path="/plan" element={<Navigate to="/plano" replace />} />
          <Route
            path="/notas"
            element={<NotesPage selectedWeekId={noteWeekId} onConsumed={() => setNoteWeekId(null)} />}
          />
          <Route path="/notes" element={<Navigate to="/notas" replace />} />
          <Route path="/desafios" element={<ChallengesPage onOpenChallenge={setChallengeId} />} />
          <Route path="/challenges" element={<Navigate to="/desafios" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
      {weekId != null && (
        <WeekModal weekId={weekId} onClose={() => setWeekId(null)} onEditNote={editWeekNote} />
      )}
      {challengeId != null && (
        <ChallengeModal challengeId={challengeId} onClose={() => setChallengeId(null)} />
      )}
      <LevelUpOverlay />
    </>
  );
};

const App: React.FC = () => (
  <TrackerProvider>
    <Shell />
  </TrackerProvider>
);

export default App;
