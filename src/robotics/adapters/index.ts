/**
 * Hardware adapter registry — **stubs only** in the MVP.
 *
 * These classes intentionally do not talk to any device. They exist so that:
 *  1. The Educator Mode troubleshooting panel can report real capability
 *     detection (does this browser even have Web Serial?).
 *  2. Phase 2 has a precise, already-agreed contract to fill in.
 *
 * See docs/hardware-integration.md for the wire protocol proposal.
 */

import type { HardwareAdapter, HardwareCapabilities, RoverCommand, SensorReading } from '@/types';

export class NotImplementedError extends Error {
  constructor(adapter: string) {
    super(
      `${adapter} is planned for a future release. The simulated rover is fully playable today.`,
    );
  }
}

abstract class StubAdapter implements HardwareAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly capabilities: HardwareCapabilities;
  protected connected = false;

  async connect(): Promise<void> {
    throw new NotImplementedError(this.name);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async sendCommand(_command: RoverCommand): Promise<void> {
    throw new NotImplementedError(this.name);
  }

  async readSensors(): Promise<SensorReading[]> {
    throw new NotImplementedError(this.name);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export class WebSerialAdapter extends StubAdapter {
  readonly id = 'web-serial';
  readonly name = 'USB cable (Web Serial)';
  readonly capabilities: HardwareCapabilities = {
    transport: 'web-serial',
    supportsSensors: true,
    supportsMotors: true,
    supportsCamera: false,
    maxCommandRateHz: 20,
  };
}

export class WebBluetoothAdapter extends StubAdapter {
  readonly id = 'web-bluetooth';
  readonly name = 'Bluetooth (micro:bit / ESP32)';
  readonly capabilities: HardwareCapabilities = {
    transport: 'web-bluetooth',
    supportsSensors: true,
    supportsMotors: true,
    supportsCamera: false,
    maxCommandRateHz: 10,
  };
}

export class PythonBridgeAdapter extends StubAdapter {
  readonly id = 'python-bridge';
  readonly name = 'Local Python bridge (Raspberry Pi / Arduino)';
  readonly capabilities: HardwareCapabilities = {
    transport: 'python-bridge',
    supportsSensors: true,
    supportsMotors: true,
    supportsCamera: true,
    maxCommandRateHz: 30,
  };
}

export const HARDWARE_ADAPTERS: HardwareAdapter[] = [
  new WebSerialAdapter(),
  new WebBluetoothAdapter(),
  new PythonBridgeAdapter(),
];

export interface BrowserCapability {
  name: string;
  available: boolean;
  note: string;
}

/** Honest capability detection for the Educator Mode troubleshooting panel. */
export function detectBrowserCapabilities(): BrowserCapability[] {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & {
    serial?: unknown;
    bluetooth?: unknown;
  });

  let webglAvailable = false;
  try {
    const canvas = document.createElement('canvas');
    webglAvailable = Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
    );
  } catch {
    webglAvailable = false;
  }

  return [
    {
      name: 'Web Serial API',
      available: Boolean(nav?.serial),
      note: 'Needed for USB-connected robots in a future release. Chrome and Edge only.',
    },
    {
      name: 'Web Bluetooth API',
      available: Boolean(nav?.bluetooth),
      note: 'Needed for micro:bit and ESP32 over Bluetooth in a future release.',
    },
    {
      name: 'WebGL',
      available: webglAvailable,
      note: 'Used for smooth map rendering. The game falls back to Canvas if this is missing.',
    },
    {
      name: 'Local storage',
      available: (() => {
        try {
          window.localStorage.setItem('__probe__', '1');
          window.localStorage.removeItem('__probe__');
          return true;
        } catch {
          return false;
        }
      })(),
      note: 'Used to save team progress on this device. Private browsing blocks it.',
    },
  ];
}
