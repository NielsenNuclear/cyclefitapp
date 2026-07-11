# Safety Engine Architecture
## Internal Engineering Design Document

**Phase:** 68 (Safety Engine) + A (Pipeline Integration)  
**Status:** Production  
**Last updated:** 2026-07-11

---

## 1. Purpose

The Safety Engine is a deterministic governance layer that constrains the workout recommendation volume before it reaches the user. It operates as a gate in the main recommendation pipeline — not as a filter on output, but as a hard constraint on the volume parameter that drives workout generation.

**Design contracts:**
- Rules are pure functions. Same context in → same constrained output out.
- Rules never modify recommendation logic, adaptive models, or personalization.
- The constrained `volumeScale` replaces `proposedVolumeScale` as the `adherenceRiskScale` parameter to `generateWorkout`.
- Bypasses are impossible by construction: there is one pipeline path, one safety gate.

---

## 2. Module Map

```
lib/intelligence/safety/
  SafetyRule.ts          ← Types + 9 built-in rules (the canonical rule set)
  SafetyRegistry.ts      ← Runtime registry (extensible; built-ins protected)
  SafetyEvaluator.ts     ← Runs all rules in priority order; produces SafetyEvaluation
  SafetyExplainer.ts     ← Converts SafetyEvaluation into user-facing text
  SafetyEngine.ts        ← Public API facade: applySafetyGovernance()
  buildSafetyContext.ts  ← Phase A: assembles SafetyContext from dashboard pipeline data

components/intelligence/
  SafetyConstraintBanner.tsx  ← Phase A: shows constraint notice when rules activate
```

---

## 3. Type Contracts

```typescript
// SafetyContext — 14 fields
interface SafetyContext {
  proposedVolumeScale:  number;   // 0.0–2.0 (from adaptive engine / training decision)
  currentVolumeScale:   number;   // previous session's scale (baseline reference)
  readinessScore:       number;   // 0–100 (from readiness calculation)
  recoveryScore:        number;   // 0–100
  fatigueEstimate:      number;   // 0–100 (higher = more fatigued)
  streakDays:           number;   // consecutive training days
  weeklyVolumeSets:     number;   // total sets logged this week
  prevWeekVolumeSets:   number;   // 0 if unknown
  hasSymptoms:          boolean;
  confidenceScore:      number;   // 0–1 (model confidence in current recommendations)
  isDeload:             boolean;
  lowRecoveryDays:      number;   // consecutive days with recovery < 40
  proposedIntensity:    string;   // "Low" | "Light to Moderate" | "Moderate" | ...
  currentIntensity:     string;
}

// SafetyResult — returned by applySafetyGovernance()
interface SafetyResult {
  volumeScale:  number;          // the constrained volume — use this, not proposedVolumeScale
  evaluation:   SafetyEvaluation;
  explanation:  SafetyExplanation;
}
```

---

## 4. The 9 Built-In Rules

Rules are defined in `SafetyRule.ts` and stored in the `BUILT_IN_RULES` array. They run in priority order: **critical** → **high** → **moderate** → **informational**.

Each subsequent rule receives the volume *already constrained by prior rules* — the most restrictive rule wins by construction.

### Critical (3 rules)

| ID | Trigger | Constraint | Cap |
|---|---|---|---|
| `max-weekly-volume-increase` | This week's sets > 10% above last week | Clamp to ≤ 108% of current scale | `currentVolumeScale × 1.08` |
| `critical-fatigue-override` | `fatigueEstimate ≥ 85` | Hard cap at 65% | `0.65` |
| `recovery-debt` | `lowRecoveryDays ≥ 3` (consecutive) | Hard cap at 70% | `0.70` |

### High (3 rules)

| ID | Trigger | Constraint | Cap |
|---|---|---|---|
| `readiness-minimum` | `readinessScore < 30` AND proposed > 75% | Clamp to 75% | `0.75` |
| `hard-session-streak` | `streakDays ≥ 6` AND proposed > 85% | Clamp to 85% | `0.85` |
| `symptom-override` | `hasSymptoms` AND proposed > 80% | Clamp to 80% | `0.80` |

### Moderate (2 rules)

| ID | Trigger | Constraint | Cap |
|---|---|---|---|
| `low-confidence-conservative` | `confidenceScore < 0.25` AND proposed > 105% | Clamp to 105% | `1.05` |
| `deload-volume-guard` | `isDeload` AND proposed > 75% | Clamp to 75% | `0.75` |

### Informational (1 rule)

| ID | Trigger | Constraint | Note |
|---|---|---|---|
| `intensity-step-check` | Proposed intensity is 2+ steps above current | None (outcome: `pass`) | Logged for audit only |

---

## 5. Evaluation Pipeline

`evaluateSafety(ctx: SafetyContext): SafetyEvaluation`

```
SafetyContext (proposedVolumeScale = P)
  │
  ├─ critical rules (3) evaluated in order
  │     each receives proposedVolumeScale = min(P, prior_caps...)
  │
  ├─ high rules (3) evaluated with current constrained volume
  │
  ├─ moderate rules (2) evaluated with current constrained volume
  │
  └─ informational rules (1) evaluated — no volume effect
  │
  └─ SafetyEvaluation {
       originalVolumeScale:    P  (never modified)
       constrainedVolumeScale: min(P, all caps)
       wasConstrained:         constrainedVolumeScale < P
       results:                SafetyRuleResult[] (9 entries)
       userMessages:           string[] (deduped, non-pass only)
       criticalActivations:    SafetyRuleResult[]
       highActivations:        SafetyRuleResult[]
     }
```

Every evaluation is persisted to `axis_safety_audit_v1` (200 entries, 60-day TTL).

---

## 6. Pipeline Integration (Phase A)

The safety gate sits between the adaptive engine and `generateWorkout`:

```
Dashboard pipeline (app/dashboard/page.tsx)
  │
  ├─ ... readiness, recovery, fatigue, symptoms, periodization ...
  ├─ trainingDecision (finalVolumeScale: proposed)
  ├─ phase39Equipment
  │
  ├─── SAFETY GATE ────────────────────────────────────────────────
  │   buildSafetyContext(input)          → SafetyContext
  │   applySafetyGovernance(ctx)         → SafetyResult
  │   setSafetyResult(safetyResultVal)   ← stored in React state
  ├─────────────────────────────────────────────────────────────────
  │
  └─ runWorkoutPipeline(
       ...,
       safetyResultVal.volumeScale   ← constrained volume (not proposed)
     )
```

`safetyResultVal.volumeScale` is passed as `adherenceRiskScale` — the last volume scaling step inside `generateWorkout`.

### All call sites

Three call sites in `app/dashboard/page.tsx` use the volume scale. All use the safety-constrained value:

| Location | Expression |
|---|---|
| Main pipeline (first call) | `safetyResultVal.volumeScale` |
| Check-in recalc (line ~2395) | `safetyResult?.volumeScale ?? trainingDecision?.finalVolumeScale ?? 1.0` |
| Environment change (line ~2608) | `safetyResult?.volumeScale ?? trainingDecision?.finalVolumeScale ?? 1.0` |

The fallback chain (`?? trainingDecision?.finalVolumeScale ?? 1.0`) only fires if `safetyResult` is null — which cannot happen after the main pipeline has run.

### Post-safety additive offset

`periodizationStatus.setsOffset` (±1–2 sets) is applied inside `generateWorkout` *after* the safety-constrained `adherenceRiskScale`. This is a pre-existing architectural property, not a bypass:
- Safety caps (0.65–0.85) remain protective even with a +2 set offset applied to individual exercises.
- The setsOffset is additive to individual exercise volumes, not a multiplier on the overall scale.

---

## 7. buildSafetyContext

`buildSafetyContext(input: BuildSafetyContextInput): SafetyContext`

Pure function with two computed fields:

**`streakDays`** — walks backward from today through `workoutHistory`, counts consecutive days with `status === "completed" | "partially_completed"`, breaks on first gap. Max 30 days.

**`lowRecoveryDays`** — sorts `recoveryScores` by date descending, counts leading entries with `score < 40`, breaks on first score ≥ 40.

**Intensity mapping** (`trainingDecisionType` → `proposedIntensity`):

```
"recover"     → "Low"
"scale_down"  → "Light to Moderate"
"swap"        → "Light to Moderate"
"proceed"     → "Moderate"
"scale_up"    → "Moderate to High"
(default)     → "Moderate"
```

`currentIntensity` is hardcoded to `"Moderate"` as a conservative baseline (the intensity-step rule is informational, not blocking).

---

## 8. SafetyConstraintBanner

`components/intelligence/SafetyConstraintBanner.tsx`

Renders between `TrainingCard` and `WorkoutCard` in the dashboard only when `safetyResult?.explanation.hasConstraints === true`.

Shows: headline text from `explanation.headline`, optional detail from `explanation.detail`, and expandable per-rule user messages (from `criticalActivations` + `highActivations`).

Returns `null` when no rules activated — zero visual noise in normal sessions.

---

## 9. Registry & Extensibility

`SafetyRegistry.ts` is a runtime map pre-populated from `BUILT_IN_RULES`.

```typescript
registerRule(rule: SafetyRule): void     // add or replace
deregisterRule(id: string): void         // no-op for built-ins
getAllRules(): SafetyRule[]
getRulesByPriority(): SafetyRule[]       // sorted: critical→high→moderate→informational
```

Custom rules must implement:
```typescript
interface SafetyRule {
  id:       string;
  name:     string;
  priority: RulePriority;
  evaluate: (ctx: SafetyContext) => SafetyRuleResult;
}
```

The `evaluate` function must be pure — no side effects, no network calls, no localStorage access.

---

## 10. Testing Strategy

Tests live in `lib/intelligence/safety/__tests__/safetyEngine.test.ts` (54 tests, all passing).

**Coverage:**
- All 9 built-in rules (threshold below → pass, threshold at limit → pass, threshold above → clamps correctly)
- `evaluateSafety` with multiple rules activating (most restrictive wins)
- `explainSafetyEvaluation` text output
- `buildSafetyContext` field derivation (streakDays, lowRecoveryDays, intensity mapping)
- Performance: 100 evaluations average < 0.010ms (budget: 15ms)
- Determinism: same context evaluated twice produces bit-identical output

---

## 11. Performance Characteristics

Measured in test suite (100 iterations):

| Operation | Measured | Budget |
|---|---|---|
| `evaluateSafety` (9 rules) | ~0.010ms avg | 15ms |
| `buildSafetyContext` | < 0.1ms | — |
| `applySafetyGovernance` (full) | < 0.1ms | — |

Safety adds negligible overhead to the dashboard pipeline, which is already dominated by React state updates and localStorage reads.

---

## 12. Failure Modes

| Scenario | Behaviour |
|---|---|
| `prevWeekVolumeSets === 0` | `max-weekly-volume-increase` passes (skips division) |
| `workoutHistory` is empty | `streakDays` returns 0 (no streak rules activate) |
| `recoveryScores` is empty | `lowRecoveryDays` returns 0 (no recovery-debt rule) |
| Rule `evaluate()` throws | Unhandled — rule implementations must be defensive |
| localStorage full during audit save | `try/catch` swallows; audit entry is lost but evaluation succeeds |
| `safetyResult` is null at secondary call sites | Fallback chain uses `trainingDecision?.finalVolumeScale ?? 1.0` |

---

## 13. Audit Log

Every `evaluateSafety` call writes to `axis_safety_audit_v1`:

```typescript
interface SafetyAuditEntry {
  id:          string;        // safe-{ts}-{rand4}
  timestamp:   string;        // ISO-8601
  results:     SafetyRuleResult[];
  inputVolume: number;        // proposedVolumeScale
  outputVolume: number;       // constrainedVolumeScale
  activations: number;        // count of non-pass rules
}
```

- Max 200 entries
- 60-day TTL (older entries pruned on save)
- Available via `loadSafetyAudit()` — used by Phase 69 dev console

---

## 14. Future Roadmap

- **Custom rule API:** Allow trainers or the personalization engine to register session-specific rules (e.g., "post-race recovery week: hard cap 60%").
- **Rule conflict detection:** Warn when two rules clamp to the same level via different triggers (redundant rules have the same effect, increasing cognitive load in the audit log).
- **Adaptive rule thresholds:** Let the personalization engine tune rule thresholds (e.g., raise the fatigue cap from 85 to 90 for highly trained athletes based on historical data).
- **Safety audit card:** Surface `axis_safety_audit_v1` in the dashboard as a "Why was my volume adjusted?" explainability feature.
