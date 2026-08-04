# AMD AI Rover Challenge: Sense, Think, Move

An interactive robotics + AI learning game for Singapore secondary school students (approximately
ages 13–16). Students build a virtual rover, teach it a small AI model, write a rule-based control
program, and run it through five missions in a simulated Singapore-inspired environment.

Everything runs **in the browser**. No student accounts, no cloud services, no paid APIs, no
physical hardware required.

```
Sense  →  Analyse  →  Decide  →  Move  →  Test  →  Improve
```

---

## Quick start

```powershell
npm install
npm run dev
```

Open the URL Vite prints (usually <http://localhost:5173>) and click **🚀 Start new mission**.

For a workshop, prefer the production build — it is faster and does not depend on the dev server
staying alive:

```powershell
npm run build
npm run preview   # serves dist/ on http://localhost:4173
```

**Requirements:** Node.js 20 or newer and a Chromium-based browser, Firefox, or Safari with WebGL
enabled. The app degrades to an accessible text grid if WebGL is unavailable, so a locked-down
school laptop can still complete every mission.

---

## What students do

| Screen | What happens |
| --- | --- |
| **Team Setup** | Name the team, pick a colour and difficulty. Stored locally only. |
| **Command Centre** | Choose a mission, see progress, badges and total score. |
| **Rover Workshop** | Spend a budget on sensors, wheels, motors and batteries. Trade-offs are real. |
| **AI Lab** | Label training images, inspect class balance, train a real classifier, read the confusion matrix. |
| **Programming Lab** | Build an ordered IF/THEN rule list. Plain-English sentences, live pseudocode, validation warnings. |
| **Mission Simulator** | Run, pause, step and rewind the rover. Live telemetry, sensor readouts and decision log. |
| **Mission Report** | Score out of 100, why the rover behaved that way, and concrete next steps. |
| **Engineering Notebook** | Auto-logged design decisions plus student reflections. Exportable. |
| **AMD Technology Corner** | Clearly-labelled *illustrative* comparisons of on-device vs. accelerated compute. |

## Missions

| # | Mission | Focus | Needs AI |
| --- | --- | --- | --- |
| 1 | First Movement | Movement, sequencing, the sense–decide loop | No |
| 2 | Sense and Avoid | Sensors, thresholds, rule ordering | No |
| 3 | Teach the Rover | Data collection, labelling, training, accuracy | Yes |
| 4 | AI in Control | Predictions, confidence thresholds, uncertainty | Yes |
| 5 | Rescue Rover Challenge | Full system integration, energy and reliability | Yes |

## Scoring

100 points, deliberately weighted so that **speed alone never wins**:

| Component | Points |
| --- | --- |
| Mission completion | 30 |
| AI accuracy | 20 |
| Reliability (no crashes, no stalls) | 15 |
| Energy efficiency | 10 |
| Time taken | 10 |
| Safety | 10 |
| Responsible AI practice | 5 |

## Badges

Data Detective · Sensor Specialist · Debugging Hero · Energy Saver · Responsible AI Engineer ·
Reliable Rover · Creative Solution · Mission Master

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Typecheck then produce `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit + integration tests (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Build, then run the Playwright browser tests |
| `npm run test:e2e:install` | One-time: download the Chromium test browser |
| `npm run typecheck` | TypeScript project build, no emit |

## Testing

- **109 unit and integration tests** cover mission loading and schema validation, scoring and
  badges, rover movement, sensor readings, rule evaluation, AI prediction handling, confidence
  thresholds, battery consumption, progress persistence and invalid mission files.
- **4 end-to-end tests** drive a real browser through the full workshop journey: register a team →
  open Mission 1 → configure the rover → run the simulation → complete the mission → read the
  mission report.

```powershell
npm test
npm run test:e2e:install   # first time only
npm run test:e2e
```

## Documentation

| Document | Audience |
| --- | --- |
| [docs/plan.md](docs/plan.md) | The full design and delivery plan |
| [docs/architecture.md](docs/architecture.md) | Developers |
| [docs/educator-guide.md](docs/educator-guide.md) | Teachers and workshop facilitators |
| [docs/student-guide.md](docs/student-guide.md) | Students |
| [docs/mission-authoring.md](docs/mission-authoring.md) | Anyone writing new missions |
| [docs/hardware-integration.md](docs/hardware-integration.md) | Phase 2 physical-robot work |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Whoever is running the room |
| [docs/deployment.md](docs/deployment.md) | Whoever is hosting it |

---

## Privacy

All data — team name, rover builds, AI models, programs, scores and notebook entries — lives in the
browser's `localStorage` on the student's own machine. Nothing is transmitted anywhere. Clearing
site data or using **Settings → Reset progress** removes it. Ask students not to enter real names
or any personal information; a team nickname is all the game needs.

## A note on AMD content

The AMD Technology Corner explains the *idea* of accelerated compute using clearly-labelled
illustrative figures. It contains **no real AMD product benchmark numbers**, and every comparison is
marked as simulated for teaching purposes. Replace `src/branding/branding.json` and
`src/content/amdContent.ts` if you have approved assets and figures.

## Licence

Not yet specified — add one before distributing.
