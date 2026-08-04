# Educator Guide

For teachers and workshop facilitators running the AMD AI Rover Challenge.

---

## Before the session

### Set up (once, on each machine or on a shared server)

```powershell
npm install
npm run build
npm run preview
```

Students open <http://localhost:4173>. If you are running a lab, host `dist/` on any static web
server — see [deployment.md](deployment.md). The built app is fully static and works offline.

### Reliability checklist

- [ ] Build the production bundle in advance. Do not demo from the dev server.
- [ ] Open the app on one student machine and complete Mission 1 yourself.
- [ ] Check the browser renders the graphics view. If you see *"Graphics could not start on this
      computer"*, the accessible text grid takes over — every mission still works, so do not panic.
- [ ] Turn on **Settings → Educator mode** on your own machine only.
- [ ] Decide the difficulty: **Explorer** (forgiving), **Engineer** (default), **Expert**.
- [ ] Remind students to use a **team nickname**, not real names.

### What to prepare in the room

- One machine per pair works better than one per student — pair programming drives discussion.
- A projector for the debrief. The Mission Report screen is designed to be read from the back.
- Paper is optional; the Engineering Notebook is built in and exportable.

---

## Session plans

### 60 minutes — "Make it move"

| Time | Activity |
| --- | --- |
| 0–5 | Hook: what does a rover need before it can act? (*Sense → Think → Move*) |
| 5–15 | Team Setup + Rover Workshop. Budget forces a trade-off conversation. |
| 15–35 | Mission 1: First Movement. Expect the first run to crash — that is the lesson. |
| 35–50 | Mission 2: Sense and Avoid. Rule order becomes the central idea. |
| 50–60 | Debrief on the Mission Report: why did the score reward more than speed? |

### 90 minutes — "Teach the rover"

Add Mission 3 after Mission 2. Budget 25 minutes for the AI Lab: labelling data is slower and more
interesting than students expect, and the class-balance warnings are the point.

### Half day — full challenge

Missions 1–5, with a 10-minute break after Mission 3 and a 20-minute showcase at the end. Ask each
team to present one Engineering Notebook entry, not their score.

---

## The learning arc

| Mission | Core idea | The moment to catch |
| --- | --- | --- |
| 1 First Movement | Actuation, sequencing, rule order | The rover drives into a wall. "What did it *know*?" |
| 2 Sense and Avoid | Sensors, thresholds, noise | A threshold that works once fails on a rerun with noise. |
| 3 Teach the Rover | Data, labels, class balance, accuracy | The model is confidently wrong about the class with 3 examples. |
| 4 AI in Control | Confidence, uncertainty, fallbacks | "What should the rover do when it is not sure?" |
| 5 Rescue Rover | Integration, energy, reliability | Trade-offs stop being hypothetical. |

## Questions that work

- "Before you press Run — predict what will happen and why."
- "Your rover turned left there. Which rule fired? How do you know?"
- "Your model is 92% accurate. On *which* class is it wrong, and does that matter here?"
- "You added five training images of one sign and two of another. What did the model learn?"
- "What should a self-driving car do when its confidence is 51%?"
- "Which of your points came from speed? Which came from care?"

## Deliberate design choices to be aware of

- **The starter program fails Mission 1.** "Always → drive forward" hits the corner. This is the
  designed entry point into debugging, not a bug.
- **Speed is capped at 10 of 100 points.** Teams that optimise only for time will lose to teams that
  are reliable, efficient and careful.
- **Hints cost you.** Using many hints reduces the responsible-AI component slightly. One or two
  hints cost nothing meaningful — encourage students to use them rather than stall.
- **The Debugging Hero badge requires a previous failure.** Failing first is rewarded.
- **The AI is real.** Predictions genuinely go wrong when data is imbalanced. Resist "fixing" it.
- **AMD performance comparisons are labelled illustrative.** They teach the concept of accelerated
  compute; they are not product benchmarks. Say so out loud.

## Educator mode

**Settings → Educator mode** unlocks a facilitator panel at `/#/educator`:

- Unlock all missions (for demos or a student who arrives late).
- Override the time limit — useful when a discussion runs long.
- Allow or block instant AI training (skips the training animation).
- Presentation mode (larger text, cleaner chrome) for projecting.
- Debug overlay and a browser capability report for troubleshooting.
- Workshop safe mode: disables the more experimental features.
- Session export: a summary of every team on that machine, for assessment.

## Assessment

The score is a conversation starter, not a grade. Better evidence:

- **Engineering Notebook** — auto-logs every rover change, model training run and mission attempt,
  and stores student reflections. Export it from the Notebook screen.
- **Mission Report** — the "Why the rover did what it did" section shows whether a team can explain
  their own system.
- **Badges** — map to behaviours (careful data work, debugging, efficiency, responsible AI) rather
  than to outcomes.

## Safety, privacy and inclusion

- No accounts, no network calls, no telemetry. Everything is on the local machine.
- Accessibility settings: high contrast, colour-blind-safe palette, reduced motion, text scaling,
  captions. Point them out at the start rather than waiting for someone to ask.
- Full keyboard operation and a screen-reader-friendly text view of the simulation.
- To wipe a shared machine between classes: **Settings → Reset progress**, or clear site data.
