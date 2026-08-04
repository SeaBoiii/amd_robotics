/**
 * Top-level error boundary.
 *
 * Students see a calm, non-technical message and a way out. The stack trace is
 * only revealed in Educator Mode (and always in the browser console), because a
 * red wall of JavaScript in front of a class is worse than useless.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Callout } from '@/components/ui';
import { clearAllState } from '@/utils/storage';

interface Props {
  children: ReactNode;
  educatorMode: boolean;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AMD Rover] Unhandled error', error, info);
    this.setState({ info });
  }

  private reload = () => {
    this.setState({ error: null, info: null });
    window.location.reload();
  };

  private resetEverything = () => {
    clearAllState();
    window.location.href = import.meta.env.BASE_URL ?? '/';
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="page" style={{ maxWidth: '46rem' }}>
        <div className="card stack">
          <h1>Something went wrong in the rover software</h1>
          <p className="text-muted">
            Nothing you did was wrong, and your saved progress is still on this device. Try
            reloading first.
          </p>

          <div className="row">
            <Button variant="primary" onClick={this.reload}>
              Reload the game
            </Button>
            <Button variant="danger" onClick={this.resetEverything}>
              Reset all saved data
            </Button>
          </div>

          {this.props.educatorMode ? (
            <Callout tone="warning" title="Technical details (Educator Mode)">
              <pre className="code-view" style={{ marginTop: 'var(--sp-2)' }}>
                {error.message}
                {'\n\n'}
                {error.stack ?? ''}
                {info?.componentStack ?? ''}
              </pre>
            </Callout>
          ) : (
            <p className="text-xs text-dim">
              Technical details are in the browser console, and in Educator Mode.
            </p>
          )}
        </div>
      </div>
    );
  }
}
