/**
 * The shared rover-control contract.
 *
 * Everything above this line (rules, missions, UI) targets `RoverController`.
 * Everything below it (the simulator today, a micro:bit tomorrow) implements
 * it. Keeping the boundary here is what makes "run the same student program on
 * a real robot" a configuration change rather than a rewrite.
 */

import type { RoverCommand, SensorReading } from '@/types';
import type { Simulation } from '@/game/engine/simulation';

export interface RoverController {
  readonly id: string;
  readonly kind: 'simulated' | 'physical';
  isReady(): boolean;
  send(command: RoverCommand): Promise<void>;
  readSensors(): Promise<SensorReading[]>;
}

/**
 * Simulated controller. In the MVP the simulation drives itself from the rule
 * engine, so this wrapper exists to prove the seam is real and to give the
 * hardware phase something concrete to mirror.
 */
export class SimulatedRoverController implements RoverController {
  readonly id = 'simulated-rover';
  readonly kind = 'simulated' as const;

  constructor(private readonly simulation: Simulation) {}

  isReady(): boolean {
    return true;
  }

  async send(_command: RoverCommand): Promise<void> {
    // Commands are applied inside Simulation.step() during a run. Direct sends
    // are reserved for the future manual-drive / hardware-test panel.
  }

  async readSensors(): Promise<SensorReading[]> {
    return this.simulation.getSnapshot().readings;
  }
}
