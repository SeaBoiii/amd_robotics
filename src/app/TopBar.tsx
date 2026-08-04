/** Persistent top navigation shown on every screen except the landing page. */

import { NavLink, useLocation } from 'react-router-dom';
import { useBranding } from '@/hooks/useBranding';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTeamStore } from '@/store/useTeamStore';

const LINKS = [
  { to: '/command', label: 'Command Centre', icon: '🛰️' },
  { to: '/workshop', label: 'Rover Workshop', icon: '🔧' },
  { to: '/ai-lab', label: 'AI Lab', icon: '🧠' },
  { to: '/programming', label: 'Programming', icon: '🧩' },
  { to: '/notebook', label: 'Notebook', icon: '📓' },
  { to: '/amd', label: 'Tech Corner', icon: '⚡' },
];

export function TopBar() {
  const branding = useBranding();
  const profile = useTeamStore((state) => state.profile);
  const totalScore = useTeamStore((state) => state.totalScore);
  const educatorMode = useSettingsStore((state) => state.educatorMode);
  const workshopSafeMode = useSettingsStore((state) => state.workshopSafeMode);
  const location = useLocation();

  return (
    <header className="topbar">
      <NavLink to="/command" className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true">
          AMD
        </span>
        <span>
          <span className="topbar__title">{branding.programmeTitle}</span>
          <span className="topbar__sub">{branding.eventTitle}</span>
        </span>
      </NavLink>

      <nav className="topbar__nav" aria-label="Main">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `topbar__link${isActive ? ' topbar__link--active' : ''}`
            }
            aria-current={location.pathname === link.to ? 'page' : undefined}
          >
            <span aria-hidden="true">{link.icon}</span> {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="spacer" />

      <div className="row" style={{ gap: 'var(--sp-2)' }}>
        {workshopSafeMode ? (
          <span className="pill pill--info" title="Workshop Safe Mode is on">
            🛟 Safe Mode
          </span>
        ) : null}
        {educatorMode ? (
          <NavLink to="/educator" className="pill pill--warning" style={{ textDecoration: 'none' }}>
            🎓 Educator
          </NavLink>
        ) : null}
        {profile ? (
          <span className="pill" title={`Total score across missions: ${totalScore}`}>
            <span
              aria-hidden="true"
              style={{
                width: '0.6rem',
                height: '0.6rem',
                borderRadius: '50%',
                background: profile.colour,
                display: 'inline-block',
              }}
            />
            {profile.teamName} · {totalScore}
          </span>
        ) : null}
        <NavLink to="/settings" className="topbar__link" aria-label="Settings">
          ⚙️
        </NavLink>
      </div>
    </header>
  );
}
