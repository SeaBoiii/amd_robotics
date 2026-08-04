/**
 * Drives the deterministic `Simulation` from a browser animation frame loop.
 *
 * The separation matters: `Simulation` owns *what happens*, `SimulationRunner`
 * owns *when it happens*. Tests call `simulation.step()` directly and never
 * need a browser; the UI subscribes here and never touches the engine.
 */

import type { SimulationSnapshot } from '@/types';
import { Simulation, type SimulationConfig } from './simulation';

export type SnapshotListener = (snapshot: SimulationSnapshot) => void;

const BASE_STEP_INTERVAL_MS = 320;

export class SimulationRunner {
  readonly simulation: Simulation;
  private listeners = new Set<SnapshotListener>();
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private accumulator = 0;
  private speedMultiplier = 1;
  private destroyed = false;

  constructor(config: SimulationConfig) {
    this.simulation = new Simulation(config);
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.simulation.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.simulation.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  play(): void {
    if (this.destroyed || this.simulation.isFinished()) return;
    this.simulation.start();
    if (this.rafId === null) {
      this.lastFrameTime = performance.now();
      this.accumulator = 0;
      this.rafId = requestAnimationFrame(this.loop);
    }
    this.emit();
  }

  pause(): void {
    this.simulation.pause();
    this.stopLoop();
    this.emit();
  }

  /** Advances exactly one decision, for the step-through teaching mode. */
  step(): void {
    if (this.destroyed) return;
    this.simulation.pause();
    this.stopLoop();
    this.simulation.step();
    this.emit();
  }

  reset(): void {
    this.stopLoop();
    this.simulation.reset();
    this.emit();
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.25, Math.min(8, multiplier));
  }

  getSpeed(): number {
    return this.speedMultiplier;
  }

  destroy(): void {
    this.destroyed = true;
    this.stopLoop();
    this.listeners.clear();
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (now: number): void => {
    if (this.destroyed) return;

    // Clamp delta so a backgrounded tab does not fast-forward the whole mission
    // the moment a student switches back to it.
    const delta = Math.min(now - this.lastFrameTime, 250);
    this.lastFrameTime = now;
    this.accumulator += delta * this.speedMultiplier;

    const interval = BASE_STEP_INTERVAL_MS;
    let stepsThisFrame = 0;

    while (this.accumulator >= interval && stepsThisFrame < 12) {
      this.accumulator -= interval;
      this.simulation.step();
      stepsThisFrame += 1;
      if (this.simulation.isFinished()) break;
    }

    if (stepsThisFrame > 0) this.emit();

    if (this.simulation.isFinished()) {
      this.stopLoop();
      this.emit();
      return;
    }

    if (this.simulation.getPhase() === 'running') {
      this.rafId = requestAnimationFrame(this.loop);
    } else {
      this.stopLoop();
    }
  };
}
