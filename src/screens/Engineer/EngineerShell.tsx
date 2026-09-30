/** Chrome shared by every Engineer Challenge screen: nav plus the session countdown. */

import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Button, Modal } from '@/components/ui';
import { remainingMs, useEngineerSessionStore } from '@/store/useEngineerSessionStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatSeconds } from '@/utils/format';
import { useFullscreen } from './TouchControls';

const LINKS = [
  { to: '/engineer/build', label: 'Build', icon: '🔧' },
  { to: '/engineer/run', label: 'Run', icon: '🏁' },
  { to: '/engineer/leaderboard', label: 'Leaderboard', icon: '🏆' },
];

export function useSessionClock() {
  const startedAt = useEngineerSessionStore((state) => state.startedAt);
  const durationSec = useEngineerSessionStore((state) => state.durationSec);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const remaining = remainingMs(startedAt, durationSec, now);
  return { active: startedAt !== null, remaining, expired: startedAt !== null && remaining <= 0 };
}

export function RequireEngineerSession({ children }: { children: ReactNode }) {
  const startedAt = useEngineerSessionStore((state) => state.startedAt);
  const expireSession = useEngineerSessionStore((state) => state.expireSession);
  const { expired } = useSessionClock();

  // When the clock runs out the session is over: no more testing, back to the front page.
  useEffect(() => {
    if (expired) expireSession();
  }, [expired, expireSession]);

  if (startedAt === null || expired) return <Navigate to="/engineer" replace />;
  return <>{children}</>;
}

function Countdown() {
  const { active, remaining, expired } = useSessionClock();
  if (!active) return null;
  const tone = expired ? 'pill--danger' : remaining < 60_000 ? 'pill--warning' : 'pill--info';
  return (
    <span className={`pill ${tone} mono`} role="timer" aria-label="Session time remaining">
      {expired ? '⏱ Time up' : `⏱ ${formatSeconds(remaining / 1000)}`}
    </span>
  );
}

export function EngineerShell({ children }: { children: ReactNode }) {
  const engineerName = useEngineerSessionStore((state) => state.engineerName);
  const startedAt = useEngineerSessionStore((state) => state.startedAt);
  const startSession = useEngineerSessionStore((state) => state.startSession);
  const endSession = useEngineerSessionStore((state) => state.endSession);
  const minutes = useSettingsStore((state) => state.engineerSessionMinutes);
  const navigate = useNavigate();
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const fullscreen = useFullscreen();

  // Scales rem to the viewport so a 1080p or 4K wall display shows the same one-screen layout.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('engineer-kiosk');
    return () => root.classList.remove('engineer-kiosk');
  }, []);

  return (
    <div className="app-shell engineer-touch">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="topbar">
        <NavLink to="/engineer" className="topbar__brand">
          <span className="topbar__mark" aria-hidden="true">
            AMD
          </span>
          <span>
            <span className="topbar__title">Engineer Challenge</span>
            <span className="topbar__sub">Fastest autonomous run wins</span>
          </span>
        </NavLink>
        <nav className="topbar__nav" aria-label="Engineer Challenge">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `topbar__link${isActive ? ' topbar__link--active' : ''}`}
            >
              <span aria-hidden="true">{link.icon}</span> {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          {startedAt !== null && engineerName ? <span className="pill">👷 {engineerName}</span> : null}
          <Countdown />
          {startedAt !== null ? (
            <Button onClick={() => setSessionMenuOpen(true)}>⏻ Session</Button>
          ) : null}
          {fullscreen.supported ? (
            <button
              type="button"
              className="btn engineer-fullscreen"
              aria-pressed={fullscreen.isFullscreen}
              aria-label={fullscreen.isFullscreen ? 'Exit full screen' : 'Full screen'}
              title={fullscreen.isFullscreen ? 'Exit full screen' : 'Full screen'}
              onClick={fullscreen.toggle}
            >
              <span aria-hidden="true">{fullscreen.isFullscreen ? '✕' : '⛶'}</span>
            </button>
          ) : null}
        </div>
      </header>
      <Modal open={sessionMenuOpen} onClose={() => setSessionMenuOpen(false)} title="Session">
        <p>
          Your leaderboard entry is kept either way. Restarting gives <strong>{engineerName}</strong> a
          fresh {minutes}-minute timer and a baseline rover.
        </p>
        <div className="engineer-session-actions">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              startSession(engineerName, minutes * 60);
              setSessionMenuOpen(false);
              navigate('/engineer/build');
            }}
          >
            ↻ Restart session
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              endSession();
              setSessionMenuOpen(false);
              navigate('/engineer');
            }}
          >
            ⏹ End session
          </Button>
          <Button size="lg" onClick={() => setSessionMenuOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
      <main id="main" className="page engineer-page">
        {children}
      </main>
    </div>
  );
}
