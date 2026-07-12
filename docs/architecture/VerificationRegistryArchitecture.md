# Verification Registry Architecture
## Internal Engineering Design Document

**Phases:** 64 (core infrastructure) + C (pipeline integration)  
**Status:** Production  
**Last updated:** 2026-07-12

---

## 1. Purpose

The Verification Registry is Axis's permanent record of whether the platform made correct decisions. Every recommendation the Adaptive Engine generates is a hypothesis about future athlete performance. The Verification Registry records that hypothesis, waits for the evidence window to expire, collects actual outcomes, and scores the prediction.

This is not analytics. This is not logging. This is the objective source of truth for how well Axis performs over time.

**Design constraints:**
- Verification must never delay UI rendering (all ops < 2ms in practice)
- Historical records are immutable — evaluations append, never overwrite
- One verification record per recommendation per day (idempotent)
- Verification survives application restarts (localStorage persistence)

---

## 2. Module Map

```
lib/intelligence/verification/
  verificationTypes.ts          ← All shared types (Phase 64 + C extensions)
  verificationRegistry.ts       ← Storage layer: load/save/query/expire (Phase 64 + C)
  recommendationVerifier.ts     ← Orchestrator: record/evaluate/summarise (Phase 64)
  evaluateOutcome.ts            ← Outcome collection + scoring (Phase 64)
  calculateRecommendationAccuracy.ts  ← Accuracy aggregation + calibration signal (Phase 64)
  buildVerificationInput.ts     ← Adapter: dashboard pipeline → RecordRecommendationParams (Phase C)

components/dev/
  VerificationDashboard.tsx     ← Developer inspection UI (Phase 64)
  ConfidenceInspector.tsx       ← Confidence + verification cross-reference (Phase 64)
```

---

## 3. Type Contracts

All types defined in `verificationTypes.ts`.

```typescript
// Phase C: explicit lifecycle state (computed, never stored)
type VerificationState =
  | "waiting"           // inside evaluation window
  | "pending"           // window expired, awaiting processing
  | "verified"          // evaluated with sufficient data
  | "insufficient_data" // evaluated but < 3 data points
  | "expired"           // > 30 days past due (orphan)
  | "cancelled";        // extension point

// Phase C: prediction types the registry supports
type PredictionType =
  | "readiness" | "recovery" | "workout_completion" | "adherence"
  | "performance_improvement" | "fatigue" | "cycle_prediction"
  | "nutrition_compliance";

// Core record
interface VerificationRecord {
  id:                      string;
  recommendationId:        string;    // ties to effectiveness registry
  timestamp:               string;    // YYYY-MM-DD — recommendation date
  evaluationDueDate:       string;    // YYYY-MM-DD — timestamp + horizonDays
  recommendationClass:     RecommendationClass;
  recommendationSummary:   string;
  supportingSignals:       string[];
  expectedOutcome:         ExpectedOutcome;
  athleteState:            AthleteStateSnapshot;
  algorithmVersion:        string;
  confidenceAtGeneration:  number;    // 0–1
  evaluated:               boolean;
  actualOutcome?:          ActualOutcome;
  verificationScore?:      VerificationScore;
  scoreRationale?:         string;
}
```

---

## 4. Prediction Lifecycle (State Machine)

```
recordRecommendation()
        │
        ▼
    [waiting]
    inside evaluation window (horizonDays = 5–7)
    evidence accumulates in adherence/readiness/recovery history
        │
        │ evaluationDueDate <= today
        ▼
    [pending]
    runPendingEvaluations() processes this record
        │
        ├─ samplesCollected >= 3 ──────────────────┐
        │                                          ▼
        │                                     [verified]
        │                                  or [insufficient_data]
        │                                     (score set, evaluated=true)
        │
        └─ no evidence at all ─────────────────────┐
                                                   ▼
                                            [insufficient_data]
                                            (score=insufficient_data)

Alternate paths:
        [waiting/pending]
              │
              │ > 30 days past evaluationDueDate
              ▼
          [expired]
          expireOldRecords() sweeps to insufficient_data
```

All state transitions are deterministic and timestamped. `computeVerificationState(record, today)` derives state from existing fields — no stored state field, no possibility of state/data divergence.

---

## 5. Pipeline Integration (Phase C)

The Verification Registry gates in immediately after the Safety Engine in the main dashboard pipeline:

```
app/dashboard/page.tsx
  │
  ├─ Adaptive Engine (trainingDecisionVal)
  ├─ Safety Engine  (safetyResultVal)        ← Phase A
  │
  ├─── VERIFICATION GATE ──────────────────────────────
  │   expireOldRecords(todayStr)             ← sweep orphans
  │   runPendingEvaluations(                 ← process expired windows
  │     todayStr,
  │     fullRdxHistory,
  │     recoveryScoresNow,
  │     adherenceHistoryPre,
  │   )
  │   existingVerRecord = getRecordForDate(todayStr)
  │   if (!existingVerRecord) {
  │     verInput = buildVerificationInput({...})
  │     setVerificationRecord(recordRecommendation(verInput))
  │   } else {
  │     setVerificationRecord(existingVerRecord)
  │   }
  ├─────────────────────────────────────────────────────
  │
  └─ runWorkoutPipeline(safetyResultVal.volumeScale)
```

### Inputs to buildVerificationInput

All inputs come from already-computed pipeline values — no additional localStorage reads:

| Input | Source |
|---|---|
| `decisionType` | `trainingDecisionVal.type` |
| `finalVolumeScale` | `safetyResultVal.volumeScale` (safety-constrained) |
| `headline` | `trainingDecisionVal.headline` |
| `rationale` | `trainingDecisionVal.rationale` |
| `isDeload` | `periodizationStatusVal?.phase === "deload"` |
| `workoutMode` | `lifeContextVal.recommendedMode` |
| `readinessScore` | `readiness.score` |
| `recoveryScore` | `recoveryScoreVal.score` |
| `fatigueEstimate` | `fatigueEntryVal.score` |
| `cyclePhase` | `phase.name` |
| `cycleDay` | `phase.cycleDay ?? null` |
| `weeklyVolumeSets` | `currentWeekSets` (computed at safety gate) |
| `streakDays` | `computeStreakDays(rawHistory)` |
| `adherenceRate` | computed from `adherenceHistoryPre` |
| `confidenceScore` | `(rdxConfidenceVal?.confidence ?? 40) / 100` |

---

## 6. Recommendation Class Derivation

`decisionToRecommendationClass(decisionType, finalVolumeScale, isDeload, workoutMode)`:

```
isDeload=true                → deload
decisionType="recover"       → recovery_focus
workoutMode="recovery"       → recovery_focus
decisionType="swap"          → workout_type_change
decisionType="scale_up"      → volume_increase
decisionType="scale_down"    → volume_decrease
finalVolumeScale >= 1.05     → volume_increase
finalVolumeScale <= 0.90     → volume_decrease
(default)                    → volume_maintain
```

The safety-constrained `volumeScale` (not the proposed scale) is used. This means if Safety clamps volume from 1.1 to 0.65, the record reflects the actual delivered recommendation class (`volume_decrease`), not the intended one.

---

## 7. Outcome Evaluation

`collectActualOutcome(record, rdxHistory, recHistory, adhHistory, today)`:

Collects metrics from the day after the recommendation (`timestamp + 1`) through the evaluation due date:

```
Evaluation window:
  from = timestamp + 1 day
  to   = timestamp + horizonDays

Readiness mean:  mean(readinessHistory[from..to])
Recovery mean:   mean(recoveryHistory[from..to])
Completion rate: completed_or_partial / all_adherence_entries[from..to]
Adherence delta: completion_rate[from..to] − completion_rate[prior_window]
Workouts done:   count(adherence.status === "completed"[from..to])
Samples:         count(readinessHistory[from..to])
```

`deriveVerificationScore(expected, actual, baseline)`:

```
samplesCollected < 3             → insufficient_data
readiness/recovery/adherence
  all fully met                  → successful
  all partially met (≥ 50%)      → partially_successful
  some met                       → partially_successful
  none met + negative deltas     → unsuccessful
  (default)                      → neutral
```

Verification score maps to a 0.0–1.0 calibration signal:
- `successful` → 1.0
- `partially_successful` → 0.7
- `neutral` → 0.5
- `unsuccessful` → 0.1

---

## 8. Calibration Feedback Loop

`computeConfidenceFeedback(records): number | null`

Returns `null` until ≥ 5 actionable records exist (insufficient data signal). Once enough data accumulates, returns a weighted mean in [0, 1] that Forecast Calibration and the Confidence Engine can consume.

Consumed via `getVerifierOutput(today)`:
```typescript
{
  summary:            VerificationSummary,     // overall stats
  classAccuracy:      ClassAccuracy[],         // per-class breakdown
  confidenceFeedback: number | null,           // 0–1 calibration signal
}
```

This output is the bridge between the Verification Registry and Phase 57 Forecast Calibration. Phase 57 reads `confidenceFeedback` when computing its calibration profile.

---

## 9. Storage

**Key:** `axis_verification_registry_v1`  
**Format:** JSON array of `VerificationRecord[]`  
**Max entries:** 300 (oldest trimmed on save)  
**Retention:** 120 days (records older than 120 days filtered on load)

**Expiration sweep:** `expireOldRecords(today)` marks records > 30 days past `evaluationDueDate` as `evaluated: true, verificationScore: "insufficient_data"`. Called at every pipeline run (fast — no-op when nothing is eligible).

---

## 10. Idempotency

One verification record per calendar day. Guard in dashboard:

```typescript
const existingVerRecord = getRecordForDate(todayStr);
if (!existingVerRecord) {
  // create and store
} else {
  // reuse existing (re-renders don't create duplicates)
}
```

`getRecordForDate(date)` scans the registry for any record with `timestamp === date`. The first call per day creates the record; all subsequent calls (re-renders, check-in recalcs) reuse it.

---

## 11. Developer Inspection Interface

`components/dev/VerificationDashboard.tsx` — available in the `/dev` debug console.

Shows per-record inspection:
```
Recommendation → [class, summary, confidence, timestamp]
                ↓
Expected        → [readinessDelta, recoveryDelta, adherenceTarget, horizonDays]
                ↓
Actual          → [readinessMean, recoveryMean, completionRate, samplesCollected]
                ↓
Score           → [verificationScore, scoreRationale, evaluationDueDate]
                ↓
State           → computeVerificationState(record, today)
```

Also shows aggregate summary (totalRecords, pendingEvaluations, completedEvaluations, overallSuccessRate) and per-class accuracy breakdown.

---

## 12. Evaluation Classes

Eight recommendation classes, each with distinct default expected outcomes:

| Class | readinessDelta | recoveryDelta | adherenceTarget | horizonDays |
|---|---|---|---|---|
| `volume_increase` | +3 | -3 | 0.70 | 7 |
| `volume_decrease` | +5 | +5 | 0.80 | 7 |
| `volume_maintain` | 0 | 0 | 0.75 | 7 |
| `deload` | +8 | +8 | 0.90 | 7 |
| `recovery_focus` | +6 | +7 | 0.85 | 5 |
| `intensity_up` | +2 | -2 | 0.70 | 7 |
| `intensity_down` | +4 | +4 | 0.80 | 7 |
| `workout_type_change` | +2 | +1 | 0.75 | 7 |

---

## 13. Testing Strategy

Tests in `lib/intelligence/verification/__tests__/verificationRegistry.test.ts` (57 tests, all passing in Phase C).

**All dates must be relative to today** (within 120-day retention window). Use `addDays(today(), -N)` for historical dates. Use fixed recent dates for evaluation functions that operate on raw history arrays (not registry queries).

Test categories:
- **Unit (34 tests):** registry CRUD, state machine, ID generation, scoring, expiration, duplicate protection
- **Integration (14 tests):** recommendation→record, safety→verification, evidence collection, calibration signal
- **Resilience (9 tests):** corrupt storage, missing evidence, duplicate submissions, delayed evidence
- **Regression (4 tests):** one record per day, record count accuracy

---

## 14. Performance Characteristics

All operations synchronous. Measured averages:

| Operation | Target | Measured |
|---|---|---|
| `recordRecommendation` | < 2ms | < 0.5ms |
| `runPendingEvaluations` (0 pending) | < 10ms | < 0.1ms |
| `getRecordForDate` | < 5ms | < 0.1ms |
| `expireOldRecords` (nothing to sweep) | — | < 0.1ms |
| Full verification gate (registration + evaluation) | < 15ms | < 1ms |

---

## 15. Failure Modes

| Scenario | Behaviour |
|---|---|
| `localStorage` full during save | `try/catch` swallows; record not persisted; recommendation still delivered |
| Corrupt registry JSON | `loadVerificationRegistry()` returns `[]`; next record rebuilds from scratch |
| Missing readiness/recovery history | `collectActualOutcome` returns nulls; `deriveVerificationScore` → `insufficient_data` |
| Records older than 120 days | Filtered on load; never returned from queries |
| Duplicate registration on same day | `getRecordForDate` guard prevents second `recordRecommendation` call |
| Record > 30d past due | `expireOldRecords` marks as evaluated/insufficient_data at next pipeline run |

---

## 16. Extension Guide

### Adding a new recommendation class

1. Add the string to `RecommendationClass` union in `verificationTypes.ts`
2. Add a default `ExpectedOutcome` entry to `defaultExpected()` in `recommendationVerifier.ts`
3. Add a mapping case to `decisionToRecommendationClass()` in `buildVerificationInput.ts`

### Adding a new prediction type

Add to `PredictionType` union in `verificationTypes.ts`. The type is available as metadata; evaluation logic is class-based (not type-based), so no other changes are required.

### Registering external outcome sources

To feed additional evidence (e.g., HRV from wearables) into evaluations, extend `collectActualOutcome` in `evaluateOutcome.ts` with a new optional parameter and corresponding window-mean computation.

---

## 17. Future Roadmap

- **Phase E telemetry:** Wire `verificationScore` into the telemetry hook alongside `ErrorLogEntry` so production accuracy can be monitored in aggregate.
- **Cloud sync:** Verification records are currently device-local. Cloud sync would enable cross-device accuracy tracking.
- **Adaptive expected outcomes:** Replace the fixed `defaultExpected()` table with athlete-personalized targets based on historical delta distributions.
- **Per-cycle-phase accuracy:** Break down `classAccuracy` by `athleteState.cyclePhase` to detect phase-specific recommendation biases.
- **Conflict detection:** Flag cases where Safety overrode a `volume_increase` recommendation so the Adaptive Engine can learn the override threshold.
