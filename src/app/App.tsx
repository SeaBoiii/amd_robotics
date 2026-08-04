/**
 * Application shell and routing.
 *
 * Routes are lazy-loaded so the Phaser bundle is only fetched when a student
 * actually opens the simulator — which keeps the first paint fast on a school
 * laptop.
 */

import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loading } from '@/components/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { TopBar } from './TopBar';
import { useAppearance } from '@/hooks/useAppearance';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTeamStore } from '@/store/useTeamStore';

const Landing = lazy(() => import('@/screens/Landing/Landing'));
const TeamSetup = lazy(() => import('@/screens/TeamSetup/TeamSetup'));
const CommandCentre = lazy(() => import('@/screens/CommandCentre/CommandCentre'));
const RoverWorkshop = lazy(() => import('@/screens/RoverWorkshop/RoverWorkshop'));
const AILab = lazy(() => import('@/screens/AILab/AILab'));
const ProgrammingLab = lazy(() => import('@/screens/ProgrammingLab/ProgrammingLab'));
const MissionSimulator = lazy(() => import('@/screens/MissionSimulator/MissionSimulator'));
const MissionReport = lazy(() => import('@/screens/MissionReport/MissionReport'));
const Notebook = lazy(() => import('@/screens/Notebook/Notebook'));
const EducatorMode = lazy(() => import('@/screens/Educator/EducatorMode'));
const TechCorner = lazy(() => import('@/screens/TechCorner/TechCorner'));
const Settings = lazy(() => import('@/screens/Settings/Settings'));
const Credits = lazy(() => import('@/screens/Credits/Credits'));

/** Sends a visitor with no team profile back to Team Setup. */
function RequireTeam({ children }: { children: React.ReactNode }) {
  const profile = useTeamStore((state) => state.profile);
  const location = useLocation();
  if (!profile) return <Navigate to="/team-setup" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <TopBar />
      <main id="main" className="page">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  useAppearance();
  const educatorMode = useSettingsStore((state) => state.educatorMode);

  return (
    <ErrorBoundary educatorMode={educatorMode}>
      <Suspense fallback={<Loading message="Powering up the command centre…" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/team-setup" element={<TeamSetup />} />
          <Route path="/credits" element={<Credits />} />

          <Route
            path="/settings"
            element={
              <Shell>
                <Settings />
              </Shell>
            }
          />
          <Route
            path="/educator"
            element={
              <Shell>
                <EducatorMode />
              </Shell>
            }
          />
          <Route
            path="/amd"
            element={
              <Shell>
                <TechCorner />
              </Shell>
            }
          />

          <Route
            path="/command"
            element={
              <RequireTeam>
                <Shell>
                  <CommandCentre />
                </Shell>
              </RequireTeam>
            }
          />
          <Route
            path="/workshop"
            element={
              <RequireTeam>
                <Shell>
                  <RoverWorkshop />
                </Shell>
              </RequireTeam>
            }
          />
          <Route
            path="/ai-lab"
            element={
              <RequireTeam>
                <Shell>
                  <AILab />
                </Shell>
              </RequireTeam>
            }
          />
          <Route
            path="/programming"
            element={
              <RequireTeam>
                <Shell>
                  <ProgrammingLab />
                </Shell>
              </RequireTeam>
            }
          />
          <Route
            path="/notebook"
            element={
              <RequireTeam>
                <Shell>
                  <Notebook />
                </Shell>
              </RequireTeam>
            }
          />
          <Route
            path="/mission/:missionId"
            element={
              <RequireTeam>
                <Shell>
                  <MissionSimulator />
                </Shell>
              </RequireTeam>
            }
          />
          <Route
            path="/report/:missionId"
            element={
              <RequireTeam>
                <Shell>
                  <MissionReport />
                </Shell>
              </RequireTeam>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
