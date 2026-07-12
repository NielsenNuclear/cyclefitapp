# Workout Experience
## Phase UX-1 — Premium Experience Initiative

---

## Design Goals

1. A new user can identify today's workout within **5 seconds**.
2. A workout can be started with **one primary action**.
3. Every screen has **exactly one primary action**.
4. Exercise logging requires **minimal interaction** (stepper controls, large touch targets).
5. **One exercise is the clear focus** at any time during logging.
6. Progress persists automatically.
7. Confidence integrates unobtrusively.
8. Safety messaging is calm and never alarming.

---

## User Journey

```
Open Axis
    ↓
Today's Workout card (hero view)
    ↓ see: name, duration, exercise count, focus, confidence
    ↓
[Start Workout]
    ↓
Exercise 1 of N (GuidedExerciseFlow)
    ↓ log: weight + reps via steppers
    ↓
[Complete Set 1]  →  [Rest screen with countdown]
    ↓
[Complete Set 2]  →  [Rest screen]
    ↓
[Complete Set 3]  →  (last set — no rest)
    ↓
[Next Exercise →]
    ↓
... repeats ...
    ↓
[Finish Workout]
    ↓
Completion screen
(duration · exercises completed · sets · reinforcement · recovery reminder)
    ↓
[Done]
```

---

## Component Hierarchy

```
WorkoutCard (state orchestrator — app/components/dashboard/WorkoutCard.tsx)
├── WorkoutHeroView      (idle mode — pre-workout)
├── GuidedExerciseFlow   (active mode — during workout)
│   └── ExerciseFocusCard  (one exercise at a time)
│       └── SetStepper     (thumb-friendly weight/reps)
├── RestScreen           (between sets)
└── WorkoutCompletionView (done mode)
```

### WorkoutCard

Owns all state:
- `mode`: "idle" | "active" | "done"
- `exercises`: mutable list supporting in-session swaps
- `actuals`: `Record<number, SetRecord[]>` — per-exercise set logging
- `elapsedSeconds`: session timer
- `restTimer`: current rest state
- `overallDifficulty`: post-session slider value

Owns all data writes:
- `saveLoggedWorkout()` — detailed set-level log
- `saveExercisePerformances()` — performance history
- `setActiveWorkout()` / `clearActiveWorkout()` — crash recovery marker

### WorkoutHeroView

Pre-workout experience. Shows what matters before you start:
- Environment selector (gym / home / dumbbells / bodyweight)
- Safety/state warning (calm, only if applicable)
- Workout name (large, serif)
- Duration estimate + exercise count
- Muscle focus
- Confidence level (quiet — "High confidence", "Building confidence")
- Workout rationale (brief italic)
- Exercise preview (collapsed by default)
- **Primary action: Start Workout**
- Secondary (collapsed): Mark without logging (Done / Partial / Skip)

### GuidedExerciseFlow

One exercise visible at a time. Manages `currentExerciseIdx` locally.

Progress:
- "Exercise N of M" label
- Progress dots (green = complete, brand = current, grey = upcoming)
- Live elapsed timer

Navigation:
- Previous exercise button (ghost, only if not first)
- Skip exercise (ghost, only if current not done)
- End early (ghost, only if some sets done but not on last exercise)

Primary action adapts to state:
- When current exercise complete and not last: **"Next Exercise →"**
- When current exercise complete and IS last: session difficulty slider + **"Finish Workout"**
- During exercise: no nav CTA (the `ExerciseFocusCard` has the primary action)

### ExerciseFocusCard

Single-exercise focus card shown inside `GuidedExerciseFlow`.

Layout:
1. Exercise name (large serif)
2. Muscle pills + prescription summary
3. Previous best banner (purple, shows last weight × reps)
4. Completed sets (green rows, each with undo)
5. Active set card (bordered, prominent):
   - Set N of M label
   - Weight stepper + Reps stepper
   - **Primary action: "Complete Set N"**
6. Expandable: Technique notes, Swap exercise

### SetStepper

Thumb-friendly ± stepper control. Replaces number inputs.

```
[−] [value + unit] [+]
```

- Large touch targets (40px min)
- Step-size aware (2.5 for weight, 1 for reps)
- Displays "—" if no value set

### RestScreen

Full-width bottom sheet (replaces small RestTimerOverlay toast).

Layout:
- Drag handle
- "Rest" label
- Large circular countdown ring (128px)
- "Up next: [exercise name]" preview panel
- Actions: "+30s" (extend) | "Skip rest" (primary)
- Tap backdrop to dismiss

Behaviour:
- Auto-dismisses at 0
- "+30s" available once per rest period
- `nextExerciseName` is the next exercise in the exercise list, not the exercise that just fired the rest

### WorkoutCompletionView

Post-workout summary screen.

Shows:
- Check icon
- "Workout complete" heading
- Date
- Stats: Duration | Exercises (N/total) | Sets logged
- Reinforcement message (deterministic by date, never gamified)
- Recovery reminder
- **Primary action: "Done"**

---

## Interaction Model

### One primary action per screen

| State | Primary Action |
|---|---|
| Pre-workout | Start Workout |
| During exercise (active set) | Complete Set N |
| Exercise complete, more exercises remain | Next Exercise → |
| Last exercise complete | Finish Workout |
| During rest | Skip Rest (or auto-advance) |
| Post-workout | Done |

### Set logging flow

1. Arrive at Exercise N
2. Previous best auto-loaded into steppers
3. Adjust weight/reps using ± steppers
4. Tap "Complete Set" → rest screen (if not last set)
5. Repeat until all sets done
6. Exercise shows green "complete" banner
7. "Next Exercise →" becomes primary CTA

### Exercise navigation

Users can navigate backwards to review / correct a previous exercise using the "← Prev" button. They can also skip forward using "Skip exercise →" without logging.

---

## Accessibility

- All buttons have `aria-label`
- Rest timer uses `role="timer"` and `aria-live="polite"`
- Completion state uses `aria-live="polite"`
- Stepper buttons have descriptive `aria-label` (e.g., "Increase Weight")
- Color is never the sole indicator of state (icons + text also convey meaning)
- Large touch targets (minimum 40×40px for steppers, 48px+ for primary actions)

---

## Performance

- No new data fetches — all reads from localStorage
- `ExerciseFocusCard` uses `key={currentIdx}` to reset state on exercise change
- History lookup in `ExerciseFocusCard` uses `useMemo` to avoid repeat localStorage reads
- No unnecessary re-renders — `actuals` state update is targeted per exercise index

---

## Intelligence Integration

### Confidence

`WorkoutHeroView` receives `confidenceLevel` as an optional string prop.

Displayed as quiet text only:
- "High confidence" — green
- "Moderate confidence" — brand purple
- "Building confidence" — grey
- "Early stage" — grey

No numerical scores. Never interrupts the workout.

### Safety

`stateWarning` is derived from `workout.trainingState` inside `WorkoutCard`:
- `"overreached"` → calm amber banner explaining volume reduction
- `"fatigued"` → calm amber banner explaining quality focus
- Otherwise → no banner shown

The banner appears in `WorkoutHeroView` before the workout starts.

---

## Preserved Behaviours

These existing behaviours are fully preserved:
- In-session exercise swaps (via ExerciseFocusCard swap panel)
- Quick-mark without logging (Done / Partial / Skip — collapsed in hero view)
- Active workout persistence (crash recovery via `setActiveWorkout()`)
- Previous best auto-fill (pre-filled into SetStepper defaults)
- Overall difficulty rating (shown in GuidedExerciseFlow before Finish Workout)
- Partial workout completion

---

## Future Enhancements

- Swipe gesture between exercises (Phase UX-2)
- Rest timer extend/reduce
- Per-exercise difficulty check-in
- Exercise demo video / animation
- Rep target suggestion ("try one more?")
- Warmup/cooldown guided blocks integrated into the guided flow
- Keyboard shortcuts for desktop
