# Deployment

The build is a **static site**. There is no server, no database and no API. Anything that can serve
files can host it.

Two properties make this easy:

- `base: './'` in `vite.config.ts` — all asset paths are relative, so the app works from any
  subpath, from a USB stick, or from `file://`.
- **`HashRouter`** — routes live after the `#`, so no server rewrite rules are needed.

```powershell
npm ci
npm run build     # produces dist/
```

Upload the entire contents of `dist/`, including `assets/` and `missions/`.

---

## Option 1 — Local, for a workshop (most reliable)

```powershell
npm run build
npm run preview   # http://localhost:4173
```

Or serve `dist/` with anything:

```powershell
npx serve dist
python -m http.server --directory dist 8080
```

For a lab, build once, copy `dist/` to a shared drive or a USB stick, and open `index.html`
directly. The app works fully offline — mission JSON is fetched relative to the page, and there are
no external requests.

> Prefer this for a real session. It removes the network from the list of things that can fail.

## Option 2 — GitHub Pages

`.github/workflows/deploy-pages.yml` builds and publishes on every push to `main`.

1. Repository **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`.

The workflow runs the test suite before publishing and adds `.nojekyll` so Jekyll does not strip
underscore-prefixed files. Because the base is relative, a project page at
`https://user.github.io/repo/` works with no extra configuration.

## Option 3 — Netlify

`netlify.toml` is included. Connect the repository, or drag `dist/` onto the Netlify dashboard.

## Option 4 — Vercel

`vercel.json` is included. Import the repository, or run `npx vercel --prod`.

## Option 5 — Any static host or school intranet

Copy `dist/` into the web root, or any subdirectory of it. No configuration required.

---

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

1. `npx tsc -b --force` — typecheck
2. `npm test` — 109 unit and integration tests
3. `npm run build`
4. `npx playwright test` — 4 end-to-end tests in Chromium

The Playwright HTML report is uploaded as an artifact when the e2e stage fails.

## Caching

The bundles are content-hashed, so `assets/*` is safe to cache forever. **`missions/*` is not
hashed** — it is fetched at runtime so that a teacher can drop in a new mission without rebuilding.
The provided configs cache it for five minutes.

## Size expectations

| Asset | Size | Gzipped |
| --- | --- | --- |
| `index.css` | ~27 kB | — |
| `index.js` | ~257 kB | ~83 kB |
| `phaser` chunk | ~1,482 kB | ~340 kB |

Phaser is a separate chunk and is only downloaded when a student first opens the simulator, so the
landing page and Command Centre load quickly on a slow school connection.

## Privacy and security notes

- No accounts, no analytics, no telemetry, no third-party requests at runtime.
- All student data stays in `localStorage` on the student's own machine.
- The supplied Netlify and Vercel configs set `X-Content-Type-Options`, `X-Frame-Options` and
  `Referrer-Policy`. Add a Content-Security-Policy at the host level if your institution requires
  one; the app needs `script-src 'self'` and `connect-src 'self'` only.
