/**
 * Shared UI primitives.
 *
 * Deliberately small and unstyled-by-props: appearance lives in CSS so that a
 * volunteer can restyle the whole game from `src/styles/` without reading any
 * TypeScript. Every interactive element here is keyboard-operable and labelled.
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import type { LabelId } from '@/types';
import { LABEL_INFO } from '@/ai/labels';
import { cx } from '@/utils/format';

// ---------------------------------------------------------------- Button

type ButtonVariant = 'default' | 'primary' | 'accent' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  block,
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        'btn',
        variant !== 'default' && `btn--${variant}`,
        size !== 'md' && `btn--${size}`,
        block && 'btn--block',
        className,
      )}
      {...rest}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Card

export function Card({
  title,
  subtitle,
  actions,
  className,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <header className="card__header">
          <div>
            {title ? <h3 className="card__title">{title}</h3> : null}
            {subtitle ? <p className="text-sm text-muted" style={{ margin: 0 }}>{subtitle}</p> : null}
          </div>
          {actions ? <div className="row">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

// --------------------------------------------------------------- Tooltip

/**
 * Tooltip for technical vocabulary. Opens on hover *and* on focus/click so it
 * is reachable by keyboard and on tablets.
 */
export function Tooltip({ text, label = 'More information' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="tooltip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="tooltip__trigger"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      {open ? (
        <span className="tooltip__bubble" role="tooltip" id={id}>
          {text}
        </span>
      ) : null}
    </span>
  );
}

// ----------------------------------------------------------------- Meter

export function Meter({
  value,
  max = 100,
  tone = 'default',
  label,
}: {
  value: number;
  max?: number;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  label?: string;
}) {
  const percent = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cx('meter', tone !== 'default' && `meter--${tone}`)}
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className="meter__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

// ------------------------------------------------------------------ Stat

export function Stat({
  label,
  value,
  sub,
  tooltip,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tooltip?: string;
  tone?: 'success' | 'warning' | 'danger';
}) {
  const colour =
    tone === 'success'
      ? 'var(--c-success)'
      : tone === 'warning'
        ? 'var(--c-warning)'
        : tone === 'danger'
          ? 'var(--c-danger)'
          : undefined;

  return (
    <div className="stat">
      <span className="stat__label">
        {label}
        {tooltip ? <Tooltip text={tooltip} label={`What does ${label} mean?`} /> : null}
      </span>
      <div className="stat__value" style={colour ? { color: colour } : undefined}>
        {value}
      </div>
      {sub ? <div className="stat__sub">{sub}</div> : null}
    </div>
  );
}

// --------------------------------------------------------------- Callout

const CALLOUT_ICONS = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger: '⛔',
} as const;

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: keyof typeof CALLOUT_ICONS;
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`callout callout--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="callout__icon" aria-hidden="true">
        {CALLOUT_ICONS[tone]}
      </span>
      <div>
        {title ? <strong style={{ display: 'block' }}>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Switch

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  hint?: string;
}) {
  return (
    <button
      type="button"
      className="switch"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span>
        <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{label}</span>
        {hint ? (
          <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--c-text-dim)' }}>
            {hint}
          </span>
        ) : null}
      </span>
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="sr-only">{checked ? 'On' : 'Off'}</span>
    </button>
  );
}

// ----------------------------------------------------------------- Modal

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
      >
        <div className="row row--between" style={{ marginBottom: 'var(--sp-4)' }}>
          <h2 id={titleId} style={{ margin: 0 }}>
            {title}
          </h2>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>
        {children}
        {footer ? (
          <div className="row row--end" style={{ marginTop: 'var(--sp-4)' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- LabelChip

/**
 * A classification label rendered with colour **and** shape **and** icon
 * **and** text, so it never depends on colour vision alone.
 */
export function LabelChip({ label, compact }: { label: LabelId; compact?: boolean }) {
  const info = LABEL_INFO[label];
  return (
    <span className="label-chip" style={{ color: info.colour }}>
      <span className={`label-chip__shape label-chip__shape--${info.shape}`} aria-hidden="true" />
      <span aria-hidden="true">{info.icon}</span>
      {!compact && <span>{info.name}</span>}
      {compact && <span className="sr-only">{info.name}</span>}
    </span>
  );
}

// ------------------------------------------------------------------ Tabs

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab.id === active}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ EmptyState

export function EmptyState({
  icon = '📭',
  title,
  children,
}: {
  icon?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      {children ? <div className="text-sm">{children}</div> : null}
    </div>
  );
}

// --------------------------------------------------------------- Loading

export function Loading({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="loading-screen" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
