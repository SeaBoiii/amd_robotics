/**
 * Physical-hardware contracts.
 *
 * NOTHING in this file is implemented against real devices in the MVP. The
 * point of shipping the interface now is that the rest of the application only
 * ever talks to `RoverController`, so a micro:bit / Arduino / ESP32 /
 * Raspberry Pi adapter can be added later without touching game logic.
 *
 * See docs/hardware-integration.md.
 */

import type { RoverCommand } from './rover';
import type { SensorReading } from './sensor';

export type HardwareTransport = 'simulated' | 'web-serial' | 'web-bluetooth' | 'python-bridge';

export interface HardwareCapabilities {
  transport: HardwareTransport;
  supportsSensors: boolean;
  supportsMotors: boolean;
  supportsCamera: boolean;
  maxCommandRateHz: number;
}

export interface HardwareAdapter {
  readonly id: string;
  readonly name: string;
  readonly capabilities: HardwareCapabilities;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendCommand(command: RoverCommand): Promise<void>;
  readSensors(): Promise<SensorReading[]>;
  isConnected(): boolean;
}

export interface HardwareStatus {
  adapterId: string | null;
  connected: boolean;
  transport: HardwareTransport;
  lastError: string | null;
  lastMessageAt: number | null;
}
