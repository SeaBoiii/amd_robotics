/** Chrome shared by every Engineer Challenge screen: nav plus the session countdown. */

import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { remainingMs, useEngineerSessionStore } from '@/store/useEngineerSessionStore';
import { formatSeconds } from '@/utils/format';

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
  if (startedAt === null) return <Navigate to="/engineer" replace />;
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

  return (
    <div className="app-shell">
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
        </div>
      </header>
      <main id="main" className="page">
        {children}
      </main>
    </div>
  );
}
