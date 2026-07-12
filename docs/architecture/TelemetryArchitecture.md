# Telemetry & Observability Architecture
## Production Integration Phase E

---

## 1. Philosophy

**Telemetry ≠ Analytics.**

Phase 75 built product analytics — user action tracking (workouts started, check-ins submitted, pages viewed). Phase E builds system observability — traces of the adaptive governance pipeline.

The distinction matters because they answer different questions:

| Dimension | Product Analytics (Phase 75) | System Observability (Phase E) |
|---|---|---|
| Question | "What did the user do?" | "Why did the system decide X?" |
| Audience | Product team | Engineering / debugging |
| Event source | User interactions | Governance subsystems |
| Privacy risk | Higher (user intent) | Lower (scores, durations, booleans) |
| Retention use | Engagement metrics | Pipeline audit trails |

**Core principle:** Every major decision made by Axis should leave a structured trace.

---

## 2. Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Governance Subsystems                         │
│  Safety Engine · Verification Registry · Confidence Engine      │
│  Phase B Error Recovery · Phase 57 Calibration                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ typed helpers
┌──────────────────────────▼──────────────────────────────────────┐
│               ObservabilityEvents.ts  (Phase E)                  │
│  trackSafetyEvaluation()  trackConfidenceCalculated()           │
│  trackVerificationRegistered()  trackPipelineCompleted()        │
│  trackErrorRecovery()  trackStorageQuotaWarning()  ...          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ emit()
┌──────────────────────────▼──────────────────────────────────────┐
│                   TelemetryBus.ts  (Phase E)                     │
│  registerEventType() · emit() · timedEmit()                     │
│  addBusListener() · removeBusListener()                         │
│  Extensible registry — no switch statements                     │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ track()                  │ listener hooks
┌──────────────▼──────────┐  ┌───────────▼──────────────────────┐
│  TelemetryCollector.ts   │  │  Bus Listeners                   │
│  (Phase 75)              │  │  Phase B error hook              │
│  localStorage persistence│  │  Future: remote sink             │
└─────────────────────────┘  └──────────────────────────────────┘
                           
┌─────────────────────────────────────────────────────────────────┐
│               SessionTimeline.ts  (Phase E)                      │
│  buildSessionTimeline() · getSessionSummary()                   │
│  filterTimeline() · getAllSessions() · getLatestSessionId()     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ reads from
┌──────────────────────────▼──────────────────────────────────────┐
│           ObservabilityInspector.tsx  (Phase E)                  │
│  /dev → Observability tab — session timeline, filtering,        │
│  session summary, system vs health category drill-down          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Event Registry

Phase E registers 10 observability event types via `registerEventType()`:

### System category (governance pipeline)

| Event name | Emitter | Key properties |
|---|---|---|
| `adaptive_decision_made` | Adaptive Engine | decisionType, finalVolumeScale, isDeload |
| `safety_evaluated` | Safety Engine gate | wasConstrained, originalScale, constrainedScale, criticalCount, durationMs |
| `verification_registered` | Verification gate | isNew, recommendationClass, confidenceAtGeneration, durationMs |
| `verification_evaluated` | Verification scorer | verificationScore, samplesCollected, recommendationClass |
| `confidence_calculated` | Confidence Engine gate | level, compositeScore, maturityStage, calibrationAvailable, durationMs |
| `calibration_updated` | Phase 57 calibration | overallAccuracy, trend, dataReady |
| `pipeline_completed` | Dashboard pipeline | totalDurationMs, safetyConstrained, confidenceLevel, verificationState |

### Health category (app resilience)

| Event name | Emitter | Key properties |
|---|---|---|
| `error_recovery_triggered` | Phase B error hook | category, strategyId, recoverable, retryCount, componentLabel |
| `storage_quota_warning` | Storage monitor | storageKey, currentSize |
| `session_restored` | Phase B session restore | restoredKeys |

---

## 4. TelemetryBus

`TelemetryBus.ts` is the orchestration layer between observability helpers and persistence.

**Key properties:**
- **No switch statements** — event types registered dynamically via `registerEventType()`
- **Listener hooks** — `addBusListener()` / `removeBusListener()` for Phase B error integration
- **timedEmit()** — convenience wrapper that measures a synchronous operation and attaches duration
- Delegates persistence to existing `TelemetryCollector.track()` (Phase 75) — no new storage logic

**Phase B error hook integration:**
```typescript
// In RecoveryManager.ts
registerErrorTelemetryHook(hook)  // registered at Phase B design time

// In dashboard/page.tsx (Phase E)
useEffect(() => {
  registerErrorTelemetryHook(trackErrorRecovery);
}, []);
```

---

## 5. SessionTimeline

`SessionTimeline.ts` reconstructs a chronological replay of all system events within a session.

**API:**
```typescript
buildSessionTimeline(sessionId: string): TimelineEntry[]   // sorted oldest→newest
getAllSessions(): string[]
getSessionSummary(sessionId: string): SessionSummary | null
getLatestSessionId(): string | null
filterTimeline(timeline, opts): TimelineEntry[]
```

**SessionSummary includes:**
- `eventCount` — total events in session
- `systemEvents` — governance pipeline traces
- `errorEvents` — health + error category events
- `safetyConstraints` — count of safety_evaluated where wasConstrained=true
- `confidenceLevels` — array of confidence levels observed (for trend review)

---

## 6. Privacy

All observability events follow the same no-PII contract as Phase 75:

- No user names, emails, or identifiers
- No raw user input
- Only system signals: scores (0–1), levels (low/moderate/high), durations (ms), booleans, enums
- Stored in localStorage only — no network transmission

---

## 7. Dashboard Pipeline Instrumentation

`app/dashboard/page.tsx` instruments four governance gates:

```
pipelineT0 = performance.now()
    │
    ├── Safety gate  →  trackSafetyEvaluation(result, durationMs)
    │
    ├── Verification gate  →  trackVerificationRegistered(record, isNew, durationMs)
    │
    ├── Confidence gate  →  trackConfidenceCalculated(profile, durationMs)
    │
    └── trackPipelineCompleted({ totalDurationMs, safetyConstrained, confidenceLevel, verificationState })
```

---

## 8. Developer Inspector

`/dev → Observability` tab (`ObservabilityInspector.tsx`) provides:

- **Stats row** — session count, total system events, this-session event count
- **Session selector** — navigate to any of the last 6 sessions by ID
- **Session summary card** — system/health/constraint counts, observed confidence levels
- **Category filter** — drill into system, health, error, recommendation, workout, checkin
- **Timeline** — scrollable list, each row expandable to show full property set with typed colour coding

---

## 9. Relationship to Other Phases

| Phase | Role |
|---|---|
| Phase 75 | Product analytics (user actions) — `TelemetryCollector` is shared persistence |
| Phase B  | Error Recovery — `registerErrorTelemetryHook` was Phase B's integration point for Phase E |
| Phase 67 | Confidence Engine — `buildConfidenceProfile()` emits `confidence_calculated` |
| Phase 68 | Safety Engine — `applySafetyGovernance()` emits `safety_evaluated` |
| Phase 64 | Verification Registry — registration gate emits `verification_registered` |
| Phase D  | Confidence wiring — Phase E adds observability on top of Phase D's pipeline wiring |

---

## 10. Files

| File | Role |
|---|---|
| `lib/telemetry/TelemetryBus.ts` | Centralized dispatcher, registry, listener hooks |
| `lib/telemetry/ObservabilityEvents.ts` | 10 registered event types + 8 typed helpers |
| `lib/telemetry/SessionTimeline.ts` | Timeline reconstruction and session analysis |
| `lib/telemetry/TelemetryTypes.ts` | Extended with system/health categories, 10 new event names, TimelineEntry |
| `lib/telemetry/TelemetryCollector.ts` | Extended CATEGORY_MAP for 10 new event names |
| `components/dev/ObservabilityInspector.tsx` | Developer inspector UI |
| `lib/telemetry/__tests__/telemetry.test.ts` | 60-test suite |
