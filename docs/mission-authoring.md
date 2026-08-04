# Mission Authoring Guide

A mission is a single JSON file. No code changes are required to add one.

## Where things live

```
public/missions/
  index.json                 ← the catalogue the app loads first
  m1-first-movement.json     ← one file per mission
  ...
```

`src/missions/loadMissions.ts` fetches the index, then each file, and passes every one through
`src/missions/validateMission.ts`. A file that fails validation is rejected with a precise,
file-prefixed message rather than crashing the app.

## Add a mission in four steps

1. Copy an existing mission file in `public/missions/` and rename it.
2. Change the `id` (must be unique) and edit the content.
3. Add an entry to `public/missions/index.json`.
4. Run `npm test` — the integration suite validates every file, checks the index and the files
   agree, checks the scoring weights, and actually runs each mission to make sure it is playable.

### `index.json`

```json
{
  "schemaVersion": 1,
  "missions": [
    {
      "id": "m6-your-mission",
      "index": 6,
      "title": "Your Mission",
      "subtitle": "One line describing the goal",
      "requiresAI": false,
      "file": "m6-your-mission.json"
    }
  ]
}
```

`id`, `title`, `subtitle` and `requiresAI` must match the mission file exactly.

---

## Mission file reference

### Identity and framing

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique. Used in URLs and as the storage key for builds and programs. |
| `index` | number | Sort order and unlock order. |
| `title` | string | Shown everywhere. |
| `subtitle` | string | One line. |
| `description` | string | The concrete task. |
| `story` | string | The narrative hook shown in the briefing modal. |
| `learningObjectives` | string[] | Plain-language, student-facing. Warned if empty. |
| `requiresAI` | boolean | If `true`, `availableSensors` **must** include `"camera"`. |
| `seed` | number | Makes runs reproducible. Change it and the mission behaves differently. |

### `map`

```json
"map": {
  "width": 14,
  "height": 9,
  "tileSize": 48,
  "rows": ["##############", "..."]
}
```

`rows.length` must equal `height`, and every row's length must equal `width`.

| Char | Tile | Behaviour |
| --- | --- | --- |
| `.` | Road | Normal |
| `#` | Building | Solid — cannot be entered |
| `o` | Obstacle | Solid — cannot be entered |
| `~` | Flood water | Passable hazard |
| `!` | Debris hazard | Passable hazard |
| `g` | Greenery | Passable, slower and more energy |
| `S` | Supply station | Collectable |
| `T` | Person or target | Collectable |
| `B` | Command centre | The base |

Any other character is a validation error. Always enclose the map in a solid border; the world model
treats out-of-bounds as `#`, but an explicit border is clearer to read.

### `start`

```json
"start": { "x": 1, "y": 7, "heading": "east" }
```

Must be inside the map and not on `#` or `o`. `heading` is `north` | `east` | `south` | `west`.

### `availableSensors` and `availableComponents`

`availableSensors` is a list of sensor **types** the mission permits, e.g.
`["distance", "line", "light", "camera"]`.

`availableComponents` is a list of catalogue **ids** the Rover Workshop will offer. Both must be
non-empty. Valid ids (see `src/robotics/components.ts`):

```
sensor-distance-basic  sensor-distance-long  sensor-line     sensor-camera
sensor-colour          sensor-temperature    sensor-light    sensor-sound
wheel-standard         wheel-allterrain      wheel-speed
motor-standard         motor-efficient       motor-power
battery-standard       battery-extended      battery-solar
storage-small          storage-large         comms-radio
```

`budget` is the number of credits a team may spend. Set it so the mission is winnable but forces at
least one real trade-off.

### `objectives`

At least one, and at least one should be `"required": true` (otherwise the mission can never be won
— you get a warning).

| `type` | `target` means | Extra fields |
| --- | --- | --- |
| `reach_base` | 1 | — |
| `reach_tile` | 1 | `tile: { x, y }` **required** |
| `deliver_supplies` | how many | — |
| `find_targets` | how many | — |
| `avoid_hazards` | max hazard entries allowed | — |
| `no_collisions` | max collisions allowed | — |
| `classify_correctly` | how many correct predictions | — |
| `energy_remaining` | percentage remaining | — |

```json
{
  "id": "o1",
  "type": "reach_tile",
  "description": "Reach the checkpoint at the top of Sector 1",
  "target": 1,
  "tile": { "x": 11, "y": 1 },
  "required": true
}
```

Objective ids must be unique within a mission. Optional objectives (`"required": false`) make good
stretch goals.

### `failureConditions`

```json
[
  { "type": "out_of_energy", "message": "The battery ran flat..." },
  { "type": "time_limit", "message": "Time ran out..." },
  { "type": "too_many_collisions", "limit": 4, "message": "The rover crashed too many times..." }
]
```

Write the `message` as an explanation a 13-year-old can act on, not as an error.

### `timeLimit`

Seconds. Multiplied by the difficulty `timeMultiplier`. Be generous — students think slowly on
purpose in this game.

### `scoring`

```json
{
  "completion": 30, "aiAccuracy": 20, "reliability": 15,
  "energy": 10, "time": 10, "safety": 10, "responsibleAi": 5
}
```

All seven keys are required and **must total 100**. For a non-AI mission, move the `aiAccuracy`
weight into `completion` and `reliability` rather than leaving points unreachable.

> Keep `time` at 10 or below. Rewarding speed is explicitly against the design of this game, and the
> integration tests assert it.

### `difficultyModifiers`

All three difficulties are required:

```json
{
  "explorer": { "sensorNoise": 0.5, "aiUncertainty": 0,    "energyMultiplier": 0.75, "timeMultiplier": 1.4 },
  "engineer": { "sensorNoise": 1,   "aiUncertainty": 0.15, "energyMultiplier": 1,    "timeMultiplier": 1 },
  "expert":   { "sensorNoise": 1.6, "aiUncertainty": 0.35, "energyMultiplier": 1.25, "timeMultiplier": 0.85 }
}
```

### `hints` and `reflectionQuestions`

`hints` are revealed one at a time. Order them from *"notice this"* to *"here is the answer"*. A
mission with no hints produces a warning — students in a workshop will get stuck, and stuck students
stop learning.

`reflectionQuestions` appear on the Mission Report and feed the Engineering Notebook. Ask about
cause and reasoning, not about the score.

---

## Design checklist

- [ ] Can the mission be completed with the cheapest legal build? If not, is the budget fair?
- [ ] Does the **starter program fail** in an instructive way?
- [ ] Is there at least one moment where rule **order** matters?
- [ ] Does the map fit on a laptop screen at a sensible tile size? Around 14×9 works well.
- [ ] Do the failure messages explain the cause?
- [ ] For AI missions: can a student build a *bad* training set and see it fail honestly?
- [ ] Have you played it end to end at all three difficulties?

## Validation and testing

```powershell
npm test
```

The integration suite (`tests/integration/missionRun.test.ts`) will fail if:

- the index and the mission files disagree,
- any file fails schema validation,
- scoring weights do not total 100, or `time` exceeds 10,
- a mission cannot be run to completion by the engine without stalling or hanging.

The validator is also worth running mentally: every error message names the file and the exact
field, so a broken mission tells you precisely what to fix.
