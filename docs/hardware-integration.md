# Hardware Integration (Phase 2)

The MVP ships **simulation only**. Nothing in this document is implemented yet — the adapters exist
as typed stubs so that connecting a real robot is a matter of filling in a contract that already
exists, rather than restructuring the app.

## Why the seam is already there

`RoverController` is the boundary between "what the student's program decides" and "what actually
moves":

```ts
export interface RoverController {
  readonly id: string;
  readonly kind: 'simulated' | 'physical';
  isReady(): boolean;
  send(command: RoverCommand): Promise<void>;
  readSensors(): Promise<SensorReading[]>;
}
```

`SimulatedRoverController` implements it today. Everything above it — the rule engine, the AI, the
mission definitions, the scoring, the UI — targets the interface, not the simulator. A student's
program is already device-agnostic.

Below the controller sits the transport:

```ts
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
```

Three adapters are registered in `src/robotics/adapters/index.ts`. All of them currently throw
`NotImplementedError` on `connect()` with a friendly message, and all of them report **real**
browser capability detection so the Educator Mode panel never lies about what a machine can do.

| Adapter | Transport | Target hardware | Camera |
| --- | --- | --- | --- |
| `WebSerialAdapter` | Web Serial | Arduino, ESP32 over USB | No |
| `WebBluetoothAdapter` | Web Bluetooth | micro:bit, ESP32 | No |
| `PythonBridgeAdapter` | Local WebSocket | Raspberry Pi | Yes |

Browser support is detected at runtime via `detectBrowserCapabilities()` — Web Serial and Web
Bluetooth are Chromium-only, and both require a secure context (`https:` or `localhost`).

---

## Proposed wire protocol

Newline-delimited JSON, symmetric over serial, BLE characteristic or WebSocket. Small, readable and
debuggable from a terminal, which matters when a room full of students is troubleshooting.

### Host → rover

```json
{"t":"cmd","seq":41,"action":"move_forward","speed":70}
{"t":"cmd","seq":42,"action":"turn_left","degrees":90}
{"t":"cmd","seq":43,"action":"stop"}
{"t":"ping","seq":44}
```

`action` mirrors the existing `RoverCommand` union, so no translation layer is needed.

### Rover → host

```json
{"t":"ack","seq":41}
{"t":"sensors","ts":10432,"readings":[
  {"sensorId":"d0","type":"distance","value":37.5,"unit":"cm"},
  {"sensorId":"l0","type":"line","value":true}
]}
{"t":"telemetry","battery":81.2,"heading":"east"}
{"t":"error","code":"motor_stall","message":"Left motor stalled"}
```

`readings` matches `SensorReading` exactly, minus `timestamp`, which the host stamps on receipt.

### Rules

- Rate-limit commands to `capabilities.maxCommandRateHz`.
- Every command carries a monotonic `seq`; the rover acks it. Three unacked commands ⇒ disconnect.
- A **watchdog on the robot** stops the motors if no command arrives for 500 ms. This is the single
  most important safety requirement.
- Unknown message types are ignored, never fatal — forward compatibility for firmware drift.

---

## Implementation plan

1. **Firmware reference implementation** — one micro:bit (MakeCode/Python) and one Arduino sketch
   that speak the protocol above. Ship them in `hardware/` with wiring diagrams.
2. **Implement `WebSerialAdapter`** — `navigator.serial.requestPort()`, a `TextDecoderStream` line
   reader, ack tracking and reconnection. Serial first: it is the most reliable in a classroom and
   needs no pairing.
3. **`PhysicalRoverController`** — implements `RoverController` over a `HardwareAdapter`, adding
   command queueing, rate limiting and a sensor cache so `readSensors()` stays synchronous-ish for
   the rule engine.
4. **Connection UI** — a Rover Workshop panel: choose adapter, connect, live sensor readout, a
   manual drive pad, and a "test each motor" wizard. Connection must be an explicit student action;
   never auto-connect.
5. **Hybrid mode** — run the same program in the simulator and on the robot side by side, and show
   the divergence. This is where the real learning is: *reality is noisier than the model*.
6. **`WebBluetoothAdapter`**, then the Python bridge for camera-equipped Raspberry Pi rovers.

## Design constraints to preserve

- **The simulator must never depend on hardware.** A missing, broken or disconnected robot degrades
  to simulation with a clear message; it never blocks a mission.
- **Mission JSON stays device-agnostic.** A physical mission maps a real arena onto the same grid.
- **Scoring stays comparable.** Physical runs are recorded and scored with the same weights, with a
  visible "physical run" marker on the report.
- **Determinism is simulation-only.** Say so explicitly in the UI: a real robot will not reproduce a
  run exactly, and that is a teaching point rather than a defect.

## Classroom safety

- Watchdog stop on the robot, plus a large on-screen emergency stop bound to the Escape key.
- Cap motor power in `workshopSafeMode`.
- Physical rovers run on a bounded floor arena with a barrier, never on desks.
- Batteries are charged and inspected by an adult before the session.

## Testing

- Mock `HardwareAdapter` for unit tests — no device required in CI.
- A protocol conformance test suite firmware authors can run against their board.
- A loopback adapter that replays recorded telemetry for UI development.
