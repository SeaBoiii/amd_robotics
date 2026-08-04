# Troubleshooting

Ordered roughly by how likely you are to hit it in a live workshop.

---

## During a session

### "Graphics could not start on this computer"

The browser could not create a WebGL or Canvas context — common on locked-down school images or in
a remote desktop session.

**Nothing is broken.** The simulator automatically switches to the accessible text-grid view, which
shows the same map, rover, sensed tiles and telemetry. Every mission is completable this way. Carry
on, and mention it as an accessibility feature rather than a failure.

To try to fix it: enable hardware acceleration in the browser settings, close other GPU-heavy tabs,
or use a different browser.

### The rover drives straight into a wall

Working as designed on Mission 1. The starter program is `Always → drive forward`. Ask the student
what the rover *knew* at that moment. This is the entry point to the whole game.

### The rover does nothing at all

1. Is the run actually playing (**▶ Run**, not paused)?
2. Does the program have at least one rule?
3. Is the top rule an `Always` rule that blocks everything below it? First match wins.
4. Is the rover fitted with the sensor its rules refer to? A rule that reads a sensor that is not
   fitted can never be true. The Programming Lab warns about this.

### "The rover got stuck in the same spot"

The stall guard ended the run after 40 ticks with no movement — usually the rover is pressed against
a wall and the rule that should turn it is never true. Check the Decision Log to see which rule is
firing, and check the sensor threshold.

### The battery runs flat before the end

Lower the motor power slider. Around 60–70% costs very little speed and saves a lot of energy. Also
check the rover is not repeatedly colliding — collisions are expensive.

### The AI is confidently wrong

Almost always class imbalance. Open the AI Lab, look at the balance warnings and the confusion
matrix, and count the examples per class. Three examples of a class is not enough. This is real
model behaviour, not a bug — it is one of the most valuable moments in the session.

### Training seems slow

Turn on **Settings → Educator mode → instant training** to skip the animation. Training itself takes
milliseconds; the animation exists for the explanation.

### A student's work disappeared

- Did they open the app in a **private/incognito window**? Storage is discarded on close.
- Did they use a **different browser** or a different machine? Storage is per-browser, per-origin.
- Did someone use **Settings → Reset progress**?
- Is browser storage blocked by policy? The app detects this and degrades to in-memory state — work
  survives navigation but not a refresh. The Educator Mode panel reports storage availability.

### A mission is locked

Missions unlock in order. Use **Settings → Educator mode → unlock all missions** for a late arrival
or a demo.

### Everything is too fast / too slow

The simulator speed control (0.5× / 1× / 2× / 4×) does not change the outcome, only the playback.
For a class that needs longer, use the Educator Mode time-limit override, or drop the difficulty to
Explorer.

---

## Setup and build

### `npm install` fails

Check Node.js is version 20 or newer: `node --version`. Behind a school proxy you may need
`npm config set proxy` / `https-proxy`.

### The dev server starts but the page is blank

Open the browser console. A stale `dist/` or an old service worker is the usual cause — hard-refresh
with Ctrl+Shift+R. Also confirm you opened the URL Vite printed, not a cached one.

### The production build works locally but not when deployed

The app uses `HashRouter` and a relative `base`, so it works from any subpath and needs no server
rewrite rules. If assets 404, check they were uploaded from `dist/` including the `assets/` folder
and `missions/`. Mission JSON is fetched at runtime from `missions/index.json` relative to the page.

### Missions fail to load

The console will name the file and the exact field. Run `npm test` — the integration suite validates
every mission file and will point at the problem. See [mission-authoring.md](mission-authoring.md).

---

## Development

### `window.localStorage.clear is not a function` in tests

Node 25 exposes an experimental global `localStorage` that shadows jsdom's and is inert without
`--localstorage-file`. `tests/setup.ts` installs an in-memory `Storage` shim over both `globalThis`
and `window`. If you see this, the setup file is not being loaded — check
`setupFiles: ['./tests/setup.ts']` in `vite.config.ts`.

### A storage test poisons later tests

`getStorage()` latches `storageAvailable = false` permanently once its probe key throws. A mock that
rejects *all* writes will disable storage for the rest of the file. Let the `__probe__` key through
and only throw for real writes.

### Playwright: "strict mode violation: resolved to 2 elements"

Rule rows repeat their aria-labels. Scope the locator to a single row —
`page.locator('.rule-row').first()` — rather than using a page-wide `getByLabel`.

### Playwright cannot start

```powershell
npm run test:e2e:install
```

The suite runs against `vite preview` on port 4173. If the port is busy, the config will reuse an
existing server locally; kill the stray process if it is serving something else.

### Typecheck passes but the build fails

`npm run build` runs `tsc -b` first, then Vite. If `tsc -b` seems to skip files, force it:

```powershell
npx tsc -b --force
```

---

## Reporting a problem

Include: browser and version, OS, what you clicked, what you expected, what happened, and anything
in the browser console. If it is mission-specific, include the mission id and the difficulty.
