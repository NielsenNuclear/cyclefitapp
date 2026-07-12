# Confidence Engine Architecture
## Internal Engineering Design Document

**Phases:** 67 (core infrastructure) + D (pipeline integration)
**Status:** Production
**Last updated:** 2026-07-12

---

## 1. Purpose

The Confidence Engine is Axis's assessment of how much trust should be placed in each recommendation before it reaches the user. It answers the question: *"How reliable is today's recommendation?"*

**This is distinct from the recommendation itself.** The Adaptive Engine decides *what* to recommend. The Confidence Engine decides *how trustworthy that recommendation is*, based on measurable historical evidence — not heuristics.

**Design constraints:**
- Confidence must never be guessed — it must be earned through verification history
- Confidence must never determine the recommendation — it controls transparency only
- All calculations must be deterministic — same inputs always produce the same output
- Graceful degradation: if confidence fails, the recommendation still delivers; confidence UI shows "unavailable"
- All ops < 10ms (synchronous, localStorage-backed)

---

## 2. Architecture Diagram

```
Adaptive Engine (trainingDecisionVal)
        │
        ▼
Safety Engine — Phase A
  safetyResultVal.wasConstrained → enters confidence pipeline
        │
        ▼
Verification Registry — Phase C
  getVerifierOutput(today) → summary.overallSuccessRate, completedEvaluations
        │
        ▼
buildConfidenceInputs() — Phase D adapter
  (calibration + verification + data flags + safety + volume stability)
        │
        ▼
buildConfidenceProfile()  ────────────── Phase 67 engine
  calculateDimensions()
  computeCompositeScore()
  scoreToLevel()                        → ConfidenceProfile
  deriveMaturityStage()
  recordConfidenceSnapshot()  ────────── Phase 67 persistence
        │
        ├──→ setConfidenceProfile(state) → UI: ConfidenceBadge (subtle)
        │
        └──→ explainConfidence() ─────── Phase 67 explainer → dev inspector
```

---

## 3. Module Map

```
lib/intelligence/confidence/
  ConfidenceTypes.ts          ← All shared types (Phase 67)
  ConfidenceCalculator.ts     ← Dimension calculations, weight table (Phase 67 + D)
  ConfidenceEngine.ts         ← buildConfidenceProfile() orchestrator (Phase 67)
  ConfidenceExplainer.ts      ← explainConfidence(), getMissingDataOpportunities() (Phase 67)
  ConfidenceRegistry.ts       ← Snapshot persistence, timeline (Phase 67)
  buildConfidenceInputs.ts    ← Adapter: dashboard pipeline → ConfidenceInputs (Phase D)

components/intelligence/
  ConfidenceBadge.tsx         ← Subtle user-facing badge: "High Confidence" (Phase 67)
  ConfidenceIndicator.tsx     ← Bar + reasons component (Phase 67, older system)

components/dev/
  ConfidenceInspector.tsx     ← Developer inspection: dimensions, timeline, gaps (Phase 67 + D)
```

---

## 4. Type Contracts

```typescript
// Six confidence dimensions
interface ConfidenceDimension {
  name:      string;
  score:     number;    // 0–1
  weight:    number;    // sums to 1.0 across all six
  available: boolean;   // false when source data is absent
  notes?:    string;
}

// Full confidence assessment
interface ConfidenceProfile {
  level:          ConfidenceLevel;       // "High" | "Moderate" | "Building" | "Limited" | "Insufficient"
  compositeScore: number;                // 0–1 weighted aggregate
  dimensions: {
    calibration:             ConfidenceDimension;  // Phase 57
    verification:            ConfidenceDimension;  // Phase 64/C
    dataCompleteness:        ConfidenceDimension;
    personalizationMaturity: ConfidenceDimension;
    predictionStability:     ConfidenceDimension;  // Phase D: now uses predictionAgreement
    historicalContext:       ConfidenceDimension;
  };
  maturityStage:  MaturityStage;
  generatedAt:    string;
}

// Stored per-day snapshot for timeline
interface ConfidenceSnapshot {
  date:           string;     // YYYY-MM-DD (joins to VerificationRecord.timestamp)
  level:          ConfidenceLevel;
  compositeScore: number;
  maturityStage:  MaturityStage;
}
```

---

## 5. Evidence Model

The engine aggregates six independent evidence dimensions. Each has a documented weight. Weights sum to 1.0.

| Dimension | Weight | Source | Available when |
|---|---|---|---|
| **Forecast Calibration** | 0.25 | Phase 57 `loadCalibrationProfile().overallAccuracy` | ≥ 5 evaluated predictions |
| **Recommendation Verification** | 0.20 | Phase C `getVerifierOutput().summary` | ≥ 3 evaluated recommendations |
| **Data Completeness** | 0.20 | Recovery/nutrition/cycle/sleep flags + check-in streak | Always (degrades to 0) |
| **Personalization Maturity** | 0.15 | `completedWorkouts` count | Always (starts at 0.05) |
| **Prediction Stability** | 0.10 | Volume CV + safety agreement (Phase D) | ≥ 3 non-zero weeks OR safety result |
| **Historical Context** | 0.10 | `weeksTracked`, `completedWorkouts` | `weeksTracked > 0` |

---

## 6. Confidence Levels

| Level | compositeScore | Minimum available dims |
|---|---|---|
| **High** | ≥ 0.75 | ≥ 2 |
| **Moderate** | ≥ 0.55 | ≥ 2 |
| **Building** | ≥ 0.35 | ≥ 2 |
| **Limited** | ≥ 0.15 | ≥ 2 |
| **Insufficient** | < 0.15 OR < 2 dims available | — |

No raw numeric percentages are shown to users. Labels only.

---

## 7. Dimension Calculations

### Calibration (weight 0.25)

```
calibrationFactor available? → score = calibrationFactor (0–1)
calibrationFactor undefined? → score = 0, available = false
```

Source: `prevCalibration57.overallAccuracy` (loaded before the adaptive engine runs).

### Verification (weight 0.20)

```
completedEvaluations = 0           → score = 0,    available = false
completedEvaluations in [1, 4]    → score = (n/5) * 0.5,  available = (n >= 3)
completedEvaluations ≥ 5          → score = verificationSuccessRate, available = true
```

Ensures small sample sizes produce conservative confidence.

### Data Completeness (weight 0.20)

Five boolean flags:
1. `hasRecoveryData` — recovery scores exist
2. `hasNutritionData` — nutrition check-in history exists
3. `hasCycleData` — cycle phase is known
4. `hasSleepData` — user sleep quality is set
5. `checkInStreak ≥ 7` — at least a week of consecutive check-ins

`score = count(true flags) / 5`

### Personalization Maturity (weight 0.15)

```
completedWorkouts ≥ 100 → 1.00
completedWorkouts ≥ 50  → 0.80
completedWorkouts ≥ 25  → 0.60
completedWorkouts ≥ 10  → 0.40
completedWorkouts ≥ 3   → 0.20
otherwise               → 0.05
```

### Prediction Stability (weight 0.10) — Updated Phase D

Phase D extended this dimension to blend volume consistency with safety agreement:

```
cvScore     = 1 - recentVolumeCv  (lower CV = more stable)
agreement   = predictionAgreement  (1.0 if safety agreed, 0.5 if constrained)

if both available:   score = cvScore * 0.75 + agreement * 0.25
if CV only:          score = cvScore
if agreement only:   score = agreement * 0.5 + 0.25   (conservative mid-range)
if neither:          score = 0.5, available = false
```

`predictionAgreement` is set by `buildConfidenceInputs` from `safetyWasConstrained`:
- `false` → 1.0 (engines agreed — recommendation was delivered as planned)
- `true`  → 0.5 (safety overrode the adaptive recommendation)

### Historical Context (weight 0.10)

```
score = min(1.0, (weeksTracked / 12) * 0.6 + (completedWorkouts / 50) * 0.4)
```

---

## 8. Pipeline Integration (Phase D)

The Confidence Engine gate runs immediately after the Verification Registry gate in `app/dashboard/page.tsx`:

```
app/dashboard/page.tsx
  │
  ├─ Adaptive Engine (trainingDecisionVal)
  ├─ Safety Engine  (safetyResultVal)        ← Phase A
  │
  ├─── VERIFICATION GATE ────────────────── Phase C
  │    expireOldRecords / runPendingEvaluations / recordRecommendation
  │
  ├─── CONFIDENCE GATE ───────────────────── Phase D
  │    verifierOutput = getVerifierOutput(todayStr)
  │    weeklyVolumeTotals = weeklyVolumesVal.slice(0,4).map(sum)
  │    inputs = buildConfidenceInputs({
  │      calibrationFactor:       prevCalibration57?.overallAccuracy ?? null,
  │      verificationSuccessRate: verifierOutput.summary.overallSuccessRate,
  │      completedEvaluations:    verifierOutput.summary.completedEvaluations,
  │      completedWorkouts:       rawHistory.filter(completed).length,
  │      weeksTracked:            daysBetween(oldest, today) / 7,
  │      hasRecoveryData:         recoveryScoresNow.length > 0,
  │      hasNutritionData:        getNutritionCheckinHistory().length > 0,
  │      hasCycleData:            !!phase.name,
  │      hasSleepData:            !!effectiveUser.sleepQuality,
  │      checkInStreak:           fullRdxHistory.length,
  │      recentWeeklyVolumeSets:  weeklyVolumeTotals,
  │      safetyWasConstrained:    safetyResultVal.evaluation.wasConstrained,
  │    })
  │    setConfidenceProfile(buildConfidenceProfile(inputs))
  │    └─ internally: recordConfidenceSnapshot() → axis_confidence_registry_v1
  │
  ├─────────────────────────────────────────────
  │
  └─ runWorkoutPipeline(safetyResultVal.volumeScale)
```

### Inputs at the confidence gate

All inputs come from already-computed pipeline values — no additional blocking reads except `getNutritionCheckinHistory()` (lightweight localStorage read not needed elsewhere at this point).

---

## 9. buildConfidenceInputs Adapter

`lib/intelligence/confidence/buildConfidenceInputs.ts` — Phase D

Maps the live pipeline state → `ConfidenceInputs`. Key derivations:

**Volume CV computation:**
```typescript
function computeVolumeCv(weeklyTotals: number[]): number | undefined {
  const nonZero = weeklyTotals.filter(v => v > 0);
  if (nonZero.length < 3) return undefined;  // not enough weeks
  const mean = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
  if (mean === 0) return undefined;
  const variance = nonZero.reduce((s, v) => s + (v - mean) ** 2, 0) / nonZero.length;
  return Math.sqrt(variance) / mean;
}
```

**Safety-agreement signal:**
```typescript
predictionAgreement: params.safetyWasConstrained ? 0.5 : 1.0
```

---

## 10. Calibration Feedback Chain

```
Phase 57 CalibrationProfile
  overallAccuracy (0–1)
        │
        ▼
buildConfidenceInputs.calibrationFactor
        │
        ▼
ConfidenceCalculator.calibration dimension (weight 0.25)
        │
        ▼
compositeScore + level
```

Phase 57 `overallAccuracy` is `null` (stored as `undefined` in `ConfidenceInputs`) until the calibration engine has accumulated ≥ 5 evaluated predictions per domain. This means the calibration dimension is `available: false` for new users, which appropriately pushes them toward "Building" or "Limited" confidence.

---

## 11. Storage

**Key:** `axis_confidence_registry_v1`
**Format:** JSON array of `ConfidenceSnapshot[]`
**Max entries:** 90 (≈ 3 months)
**Behaviour:** `recordConfidenceSnapshot()` upserts (one record per calendar day, same date → replace)

`getConfidenceTimeline()` returns all snapshots sorted by insertion order (oldest first for charting).

The snapshot `date` field (YYYY-MM-DD) is the natural join key to `VerificationRecord.timestamp`. Consumers can join these by date when they need to cross-reference confidence level with verification outcome.

---

## 12. User Experience

Confidence is exposed subtly via `ConfidenceBadge` — rendered below `SafetyConstraintBanner` in the dashboard, right-aligned, small size:

```tsx
{confidenceProfile && (
  <div className="flex justify-end px-1 -mt-1">
    <ConfidenceBadge level={confidenceProfile.level} size="sm" />
  </div>
)}
```

Labels only: **High Confidence** · **Moderate Confidence** · **Building Confidence** · **Limited Confidence** · **Insufficient**

Never shows numeric scores, internal weights, or stack traces. Low confidence encourages data completion rather than implying the recommendation is wrong.

---

## 13. Developer Inspection

`components/dev/ConfidenceInspector.tsx` — available in the `/dev` debug console ("Confidence" tab, era "67").

Phase D fix: `calibrationFactor` was previously `undefined` (TODO comment). Now correctly reads from `loadCalibrationProfile()?.overallAccuracy`.

The inspector shows:
- Current level + composite score
- Dimension table (name, score, weight, available)
- 30-day confidence timeline (bar chart)
- Explanation gaps and opportunities

---

## 14. Failure Modes

| Scenario | Behaviour |
|---|---|
| `getVerifierOutput()` returns empty summary | `verificationSuccessRate = 0`, `completedEvaluations = 0` → verification dim unavailable → confidence falls to Building/Limited |
| `loadCalibrationProfile()` returns null | `calibrationFactor = null` → adapter passes `undefined` → calibration dim unavailable |
| `buildConfidenceProfile()` throws | Wrapped implicitly by React error boundary (Phase B) — dashboard continues, `confidenceProfile` stays null, badge not rendered |
| `recordConfidenceSnapshot()` fails (localStorage full) | `try/catch` swallows; profile still computed and returned; timeline not updated |
| Corrupt confidence timeline JSON | `load()` returns `[]`; next snapshot rebuilds from scratch |
| `confidenceProfile === null` in render | Badge not rendered; no crash |

---

## 15. Testing Strategy

Tests in `lib/intelligence/confidence/__tests__/confidenceEngine.test.ts` (74 tests, all passing in Phase D).

Both `localStorage` AND `window` must be stubbed:
```typescript
vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("window", { localStorage: localStorageMock });
```

`isClient()` in `ConfidenceRegistry.ts` checks `typeof window !== "undefined"`. Without the window stub, all persistence ops are silent no-ops.

Test categories:
- **Unit (36 tests):** dimensions, composite, maturity, level mapping, adapter CV, adapter safety signal
- **Explainer (7 tests):** strengths/gaps/improvements, maturity context, opportunities
- **Registry (5 tests):** record, dedup, timeline, clear
- **Integration (11 tests):** verification→confidence, calibration→confidence, safety→confidence, full pipeline
- **Resilience (6 tests):** all-zero inputs, extreme values, corrupt storage, empty volumes
- **Regression (4 tests):** deterministic output, level boundaries, maturity consistency, weight integrity

---

## 16. Performance Characteristics

All operations synchronous. Measured averages:

| Operation | Target | Measured |
|---|---|---|
| `buildConfidenceInputs()` | < 1ms | < 0.1ms |
| `calculateDimensions()` | < 1ms | < 0.1ms |
| `computeCompositeScore()` | < 1ms | < 0.05ms |
| `buildConfidenceProfile()` + snapshot | < 10ms | < 0.5ms |
| `explainConfidence()` | < 5ms | < 0.1ms |
| Full confidence gate | < 15ms | < 1ms |

The dominant cost is the `getVerifierOutput(today)` call (JSON.parse on verification registry, ≤ 300 records). Still well under 10ms.

---

## 17. Extension Guide

### Adding a new evidence dimension

1. Add field to `ConfidenceInputs` in `ConfidenceCalculator.ts`
2. Add entry to `DimensionSet` interface
3. Add computation in `calculateDimensions()`
4. Adjust `WEIGHTS` table so all weights still sum to 1.0
5. Add field to `ConfidencePipelineParams` in `buildConfidenceInputs.ts`
6. Map the new field in `buildConfidenceInputs()`
7. Add tests

### Adding a new confidence level

1. Add to `ConfidenceLevel` union in `ConfidenceTypes.ts`
2. Add boundary in `scoreToLevel()` in `ConfidenceEngine.ts`
3. Add to `LEVEL_SUMMARY` in `ConfidenceExplainer.ts`
4. Add color/bg/border helpers in `ConfidenceEngine.ts`
5. Add to `ConfidenceBadge.tsx` styling

### Wiring wearable HRV as a dimension

HRV data (Phase 12 wearables) could replace `recentVolumeCv` as the primary stability signal — a low HRV CV implies stable recovery capacity. Add `hrvCv?: number` to `ConfidencePipelineParams`, map it through `buildConfidenceInputs`, and blend with `recentVolumeCv` in the stability calculation.

---

## 18. Future Roadmap

- **Phase E telemetry:** Wire `confidenceProfile.level` into the telemetry hook alongside `ErrorLogEntry` so operators can monitor confidence distribution across the user base.
- **Per-cycle-phase confidence:** Break down confidence by `athleteState.cyclePhase` to detect phase-specific accuracy drops.
- **Wearable HRV integration:** Replace volume-CV stability signal with continuous HRV CV from wearable data (Phase 12).
- **Confidence trend alerts:** If confidence drops from High to Limited over 7 days, surface an actionable insight card.
- **Cloud sync:** Confidence history is currently device-local. Cloud sync enables cross-device trend analysis.
- **Adaptive weights:** Replace fixed WEIGHTS table with athlete-personalized weights derived from which dimensions historically correlate best with verification success for that user.
