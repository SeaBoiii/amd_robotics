import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useBranding } from '@/hooks/useBranding';
import { useTeamStore } from '@/store/useTeamStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const LOOP = [
  { icon: '📡', label: 'Sense' },
  { icon: '🔍', label: 'Analyse' },
  { icon: '🧠', label: 'Decide' },
  { icon: '🚗', label: 'Move' },
  { icon: '🧪', label: 'Test' },
  { icon: '📈', label: 'Improve' },
];

export default function Landing() {
  const branding = useBranding();
  const navigate = useNavigate();
  const profile = useTeamStore((state) => state.profile);
  const setEducator = useSettingsStore((state) => state.setEducator);

  return (
    <div className="landing">
      <div className="landing__hero">
        <div>
          <p className="eyebrow">{branding.sponsorMessage}</p>
          <h1 className="landing__title">
            AMD AI Rover Challenge
            <span>Sense · Think · Move</span>
          </h1>
          <p className="landing__lede">
            Severe weather has damaged a smart-city district. You are junior robotics engineers.
            Build a rover, teach it to see, program how it thinks, and get emergency supplies
            through — without wrecking it.
          </p>

          <div className="landing__actions">
            <Button variant="primary" size="lg" onClick={() => navigate('/team-setup')}>
              🚀 Start new mission
            </Button>
            <Button
              size="lg"
              disabled={!profile}
              onClick={() => navigate('/command')}
              title={profile ? undefined : 'No saved team on this device yet'}
            >
              ▶️ Continue{profile ? ` as ${profile.teamName}` : ''}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => {
                setEducator('educatorMode', true);
                navigate('/educator');
              }}
            >
              🎓 Educator mode
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate('/engineer')}>
              🏁 Engineer Challenge
            </Button>
          </div>

          <div className="landing__loop" aria-label="The core learning loop">
            {LOOP.map((step, index) => (
              <span key={step.label} className="landing__loop-step">
                <span aria-hidden="true">{step.icon}</span>
                {step.label}
                {index < LOOP.length - 1 ? (
                  <span aria-hidden="true" className="text-dim">
                    →
                  </span>
                ) : null}
              </span>
            ))}
          </div>

          <p className="text-sm text-dim" style={{ marginTop: 'var(--sp-5)' }}>
            For students aged about 13–16. Runs entirely in your browser. No account needed, and
            nothing you do is uploaded anywhere.
          </p>
        </div>

        <div className="landing__visual" aria-hidden="true">
          <div className="landing__scan" />
          <div className="landing__rover">🤖</div>
        </div>
      </div>

      <footer className="landing__footer">
        <div className="row" style={{ gap: 'var(--sp-3)' }}>
          <span className="logo-slot">
            {branding.amdLogo ? (
              <img src={branding.amdLogo} alt="Programme sponsor logo" />
            ) : (
              'AMD logo slot'
            )}
          </span>
          {branding.partnerLogos.map((partner) => (
            <span className="logo-slot" key={partner.name}>
              {partner.src ? <img src={partner.src} alt={`${partner.name} logo`} /> : partner.name}
            </span>
          ))}
        </div>
        <div className="spacer" />
        <Link to="/settings">Settings</Link>
        <Link to="/credits">Credits &amp; privacy</Link>
        <span>Original artwork. Logo slots are placeholders until official assets are supplied.</span>
      </footer>
    </div>
  );
}
