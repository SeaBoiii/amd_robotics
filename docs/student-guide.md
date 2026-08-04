# Student Guide

Welcome to the AMD AI Rover Challenge. You are the engineer. The rover only does what you tell it.

---

## The loop you will repeat

```
Sense  →  Analyse  →  Decide  →  Move  →  Test  →  Improve
```

Real robotics engineers do exactly this. Your first run is *supposed* to fail — that is where the
information is.

---

## 1. Start your team

Pick a team name (a nickname, not your real name), a colour, and a difficulty:

- **Explorer** — quieter sensors, more time, gentler energy use.
- **Engineer** — the standard challenge. Start here.
- **Expert** — noisy sensors, an unreliable AI, tight time and energy.

Everything you do is saved **on this computer only**. Nothing is sent anywhere.

## 2. Build your rover (Rover Workshop)

You have a budget. You cannot buy everything, and that is the point.

| Part | What it does | The catch |
| --- | --- | --- |
| Distance sensor | Tells you how far away the wall ahead is | Costs budget |
| Line sensor | Detects a line under the rover | Only useful on some maps |
| Light sensor | Detects brightness | Only useful on some maps |
| Camera | Lets the AI see, needed for AI missions | Expensive |
| Wheels | Speed vs. grip | Fast wheels slip more |
| Motor | Power vs. efficiency | More power uses much more energy |
| Battery | How long you can run | Big batteries cost more |

**Motor power** is a slider, not a purchase. Higher is faster and much thirstier. Around 60–70% is
usually a good deal.

> **A rover with no sensors is blind.** It will drive into things. If a mission needs the rover to
> react to something, fit a sensor that can detect it.

## 3. Teach the AI (AI Lab) — missions 3 and up

1. **Collect** images into classes.
2. **Label** every one of them honestly.
3. **Check the balance.** If one class has 14 examples and another has 3, the model will be good at
   the first and bad at the second. The Lab warns you.
4. **Train.** Watch the accuracy climb.
5. **Read the confusion matrix.** It shows *which* things the model mixes up, not just how often.
6. **Look at the mistakes.** The Lab shows you exactly which images it got wrong.

This is a real machine-learning model doing real training. If it is wrong, it is wrong because of
the data you gave it.

## 4. Write the program (Programming Lab)

Your program is a list of IF/THEN rules in plain English:

```
1.  IF something is close ahead   THEN turn left
2.  IF always                     THEN drive forward
```

**Three things to remember:**

1. Rules are checked **from the top down**.
2. The **first rule that matches wins**. Nothing below it runs this tick.
3. A rule that says *always* matches everything — so anything below it never runs. Keep it last.

Watch the pseudocode panel: it shows exactly what your rules say, in the order the rover reads them.
The checker warns you about unreachable rules, missing sensors, and rules that can never be true.

## 5. Run it (Mission Simulator)

| Control | Use it for |
| --- | --- |
| ▶ Run | Watch the whole attempt |
| ⏸ Pause | Stop and think |
| ⏭ Step once | Advance exactly one decision — the best debugging tool here |
| ↺ Reset | Start over |
| 0.5× … 4× | Slow down to see what went wrong; speed up when you already know |
| 💡 Hint | Take it. Getting stuck teaches nothing. |

The **Decision Log** tells you which rule fired and why, every single tick. When the rover does
something strange, this is the first place to look.

## 6. Read the report (Mission Report)

Your score is out of 100:

| Where the points come from | Points |
| --- | --- |
| Completing the mission | 30 |
| AI accuracy | 20 |
| Reliability — no crashes, no getting stuck | 15 |
| Energy efficiency | 10 |
| Time taken | 10 |
| Safety | 10 |
| Responsible AI — balanced data, handling uncertainty | 5 |

**Being fast is worth 10 points. Being careful is worth 60.** Rushing is a bad strategy here.

The report also explains *why* the rover did what it did, and gives you specific things to change.

## 7. Write it down (Engineering Notebook)

The notebook records your design changes automatically. Add your own reflections — what you
predicted, what actually happened, and what you changed. This is what engineers actually do, and it
is what your teacher will look at.

---

## Badges

| Badge | How to earn it |
| --- | --- |
| 🔍 Data Detective | Build a balanced, well-labelled training set |
| 📡 Sensor Specialist | Use sensors effectively to make decisions |
| 🛠 Debugging Hero | Fail a mission, work out why, and come back and win it |
| 🔋 Energy Saver | Finish with plenty of battery left |
| ⚖️ Responsible AI Engineer | Handle uncertainty instead of blindly trusting the model |
| 🎯 Reliable Rover | Complete a mission with no crashes and no stalls |
| 💡 Creative Solution | Solve a mission in an unusual way |
| 🏆 Mission Master | Complete every mission |

## When you are stuck

1. **Slow it down** to 0.5× and watch where it goes wrong.
2. **Step once**, repeatedly, and read the Decision Log.
3. Ask: *which rule fired, and was it the one I expected?*
4. Ask: *does my rover even have a sensor that can detect this?*
5. Check the **order** of your rules.
6. Take a **hint**. Then take the next one.

## Accessibility

Open **Settings** at any time for high contrast, a colour-blind-safe palette, reduced motion, larger
text and captions. Everything works with a keyboard alone, and there is a text version of the
simulation view.
