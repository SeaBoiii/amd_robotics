# Architecture

## Design goals, in priority order

1. **Workshop reliability** — it must work on a locked-down school laptop, offline, first time.
2. **Student engagement** — visible cause and effect, fast feedback.
3. **Clear learning outcomes** — every mechanic maps to a stated objective.
4. **Maintainable code** — layered, typed, testable.
5. **Technical sophistication** — last, and never at the expense of the four above.

## Layer map

```
┌──────────────────────────────────────────────────────────────┐
│  React screens (src/screens)                                  │  presentation
│  App shell + HashRouter (src/app)                             │
├──────────────────────────────────────────────────────────────┤
│  Zustand stores (src/store)                                   │  state
│  team · rover · ai · program · settings                       │
├──────────────────────────────────────────────────────────────┤
│  Simulation engine (src/game/engine)                          │  domain
│  world · sensors · simulation · scoring · runner              │
│  Rule engine (src/program) · AI (src/ai)                      │
│  Robotics catalogue + adapters (src/robotics)                 │
├──────────────────────────────────────────────────────────────┤
│  Mission content (public/missions/*.json)                     │  data
│  Loader + schema validator (src/missions)                     │
├──────────────────────────────────────────────────────────────┤
│  Phaser renderer (src/game/phaser, src/game/scenes)           │  view of domain
│  Accessible text-grid fallback (src/screens/MissionSimulator) │
└──────────────────────────────────────────────────────────────┘
```

**Dependencies only ever point downwards.** The engine imports nothing from React, Zustand or
Phaser. This is what makes it testable in Node without a DOM, and what allows the same engine to
drive a physical rover later.

## The four decoupling rules

### 1. Phaser is not coupled to React state

`PhaserStage.tsx` mounts a Phaser game into a `<div>` **once**, in an effect with an empty
dependency list. React never re-renders the canvas. Snapshots are pushed into the scene through an
imperative bridge:

```
Simulation.step() ──▶ SimulationRunner ──SimulationSnapshot──▶ MissionScene.applySnapshot()
                            │
                            └──────────────────────────────▶ React setState (telemetry only)
```

The scene owns its own graphics objects and redraws them from the snapshot it is handed. If Phaser
fails to start (no WebGL, blocked canvas), the simulator swaps in `TextGrid.tsx`, which renders the
same snapshot as an accessible grid of characters. **Every mission is completable in the fallback.**

### 2. Hardware is not coupled to the simulator

`RoverController` (`src/robotics/control/RoverController.ts`) is an interface: `send(command)`,
`readSensors()`, `isReady()`. `SimulatedRoverController` implements it today; a
`PhysicalRoverController` backed by a `HardwareAdapter` (`src/robotics/adapters/index.ts`) will
implement it tomorrow. The adapters are deliberate stubs — they report real browser capability
detection but throw `NotImplementedError` on connect. See
[hardware-integration.md](hardware-integration.md).

### 3. Mission logic is not hard-coded into components

A mission is a JSON file. Map, objectives, failure conditions, budget, available components,
scoring weights, difficulty modifiers, hints and reflection questions all come from data. Adding a
mission means adding a file and an index entry — no code change. See
[mission-authoring.md](mission-authoring.md).

### 4. No fake AI

The AI Lab trains a **real multinomial logistic regression classifier** in plain TypeScript
(`src/ai/classifier/logisticRegression.ts`) using gradient descent on standardised features. It has
genuine training loss, genuine accuracy, a genuine confusion matrix and genuinely wrong predictions
when the data is imbalanced. Rule conditions that read predictions are labelled as *predictions with
confidence*, and rules that read sensors are labelled as *sensor rules* — the UI never blurs the
two. No TensorFlow.js, no bundled model, no network call.

## Determinism

Every simulation run is reproducible. A mission carries a `seed`; `createRng` (`src/utils/rng.ts`)
is a seeded mulberry32 generator, and every stochastic input — sensor noise, AI uncertainty — draws
from it. The same seed + rover build + program + model produces byte-identical telemetry. This is
what makes "run it again and show me" a reliable teaching move, and it is covered by a test.

The loop also cannot hang: `MAX_TICKS = 3000` hard-stops any run, and `STALL_LIMIT = 40` ends a run
where the rover has not moved for 40 consecutive ticks with the explanation *"The rover got stuck in
the same spot"*.

## Tick model

`Simulation` owns *what happens*; `SimulationRunner` owns *when it happens*. The runner accumulates
elapsed `requestAnimationFrame` time and calls `Simulation.step()` once every
`BASE_STEP_INTERVAL_MS / speed` (320 ms at 1×), so the logical result is independent of display
refresh rate. Speed controls (0.5× / 1× / 2× / 4×) change only the interval, never the physics.
Single-stepping calls `step()` directly, so stepping and running produce identical results. Tests
call `simulation.step()` with no browser at all.

Per step:

1. `readSensors()` builds `SensorReading[]` from the world, the rover's fitted sensors and seeded
   noise scaled by the difficulty modifier.
2. If a camera is fitted, the current tile is turned into a feature vector and the trained model
   produces a `{ label, confidence }` prediction.
3. `evaluateProgram()` walks the rule list top-to-bottom; **the first matching rule wins**.
4. The chosen action becomes a `RoverCommand`; movement, collision and battery drain are applied.
5. Objectives and failure conditions are checked. A `SimulationSnapshot` is emitted to subscribers.

## State and persistence

Five Zustand stores, each persisted through a small custom middleware (`src/store/persisted.ts`)
over `src/utils/storage.ts`:

| Store | Holds |
| --- | --- |
| `useTeamStore` | Team profile, mission results, badges, notebook entries |
| `useRoverStore` | Per-mission rover builds |
| `useAIStore` | Training samples, trained model weights, evaluation metrics |
| `useProgramStore` | Per-mission rule programs |
| `useSettingsStore` | Accessibility and educator settings |

Every value is written under a versioned envelope `{ version, data }`. Corrupt JSON, a wrong shape
or an older version all fall back to defaults rather than throwing — a student refreshing mid-run
must never see a white screen. `localStorage` being unavailable (private mode, blocked storage) is
detected once with a probe key and degrades to in-memory state.

## Routing

`HashRouter`, so the build works from `file://`, a USB stick, or any static host with no server
rewrite rules. Routes are lazily imported; the ~1.5 MB Phaser chunk is only fetched when a student
first opens the simulator.

## Accessibility

- Keyboard-operable throughout; visible focus rings; skip link to `#main`.
- Semantic landmarks, labelled form controls, `aria-live` telemetry.
- Settings: high contrast, reduced motion, colour-blind-safe palette, text scaling, captions.
- The text-grid renderer is a first-class alternative view, not an error state.

## Build output

| Chunk | Size | Gzipped |
| --- | --- | --- |
| `index.css` | ~27 kB | — |
| `index.js` | ~257 kB | ~83 kB |
| `phaser` | ~1,482 kB | ~340 kB |

Phaser is split into its own chunk via `manualChunks`, so the landing page and command centre load
without it.

## Testing strategy

| Level | Tool | What it protects |
| --- | --- | --- |
| Unit | Vitest + jsdom | Engine maths, scoring, rule evaluation, AI, persistence |
| Integration | Vitest | Every shipped mission JSON loads, validates, scores to 100 and can actually be run |
| End-to-end | Playwright (Chromium) | The real workshop journey in a real browser against the production build |

Node 25 exposes an experimental global `localStorage` that shadows jsdom's and is unusable without
`--localstorage-file`. `tests/setup.ts` installs an in-memory `Storage` shim over both `globalThis`
and `window` to neutralise this.
