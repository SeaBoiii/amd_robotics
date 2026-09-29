/** Tap-first controls for the Engineer Challenge: no sliders, no dropdowns. */

import { useCallback, useEffect, useId, useState } from 'react';
import { cx } from '@/utils/format';

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <span className="field__label" id={id}>
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={id}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={cx('segmented__option', option.value === value && 'segmented__option--active')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => String(v),
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  hint?: string;
}) {
  const id = useId();
  // Round to the step grid so repeated float additions never drift.
  const clampStep = (next: number) => Math.min(max, Math.max(min, Math.round(next / step) * step));
  return (
    <div className="field">
      <span className="field__label" id={id}>
        {label}
      </span>
      <div className="stepper" role="group" aria-labelledby={id}>
        <button
          type="button"
          className="stepper__button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clampStep(value - step))}
        >
          −
        </button>
        <output className="stepper__value mono" aria-live="polite">
          {format(value)}
        </output>
        <button
          type="button"
          className="stepper__button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clampStep(value + step))}
        >
          +
        </button>
      </div>
      {hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  );
}

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

/** Fullscreen with the webkit fallback iPadOS Safari still needs. */
export function useFullscreen() {
  const doc = document as FullscreenDocument;
  const supported = Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
  const current = () => Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
  const [isFullscreen, setIsFullscreen] = useState(current);

  useEffect(() => {
    const onChange = () => setIsFullscreen(current());
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (current()) {
        await (doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.());
      } else {
        const root = document.documentElement as FullscreenElement;
        await (root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen?.());
      }
    } catch (error) {
      console.warn('[engineer] Fullscreen request was refused.', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { supported, isFullscreen, toggle };
}
