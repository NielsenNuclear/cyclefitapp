# Error Recovery Architecture
## Internal Engineering Design Document

**Phase:** B (Global Error Boundary & Recovery System)  
**Status:** Production  
**Last updated:** 2026-07-11

---

## 1. Purpose

This document describes the architecture of Axis's application-level error recovery system. The system enforces two non-negotiable constraints:

1. **No blank screen.** Every render failure must show a helpful, accessible fallback UI.
2. **No data loss.** User session state must be captured before any recovery action runs.

The system is intentionally separate from the recommendation and adaptive engines — it never touches training logic.

---

## 2. Module Map

```
types/
  ErrorTypes.ts                   ← Shared type contracts (all modules import from here)

lib/errorRecovery/
  ErrorClassifier.ts              ← Pure function: Error → ClassifiedError
  RecoveryStrategies.ts           ← Static registry of 7 built-in strategy definitions
  RecoveryRegistry.ts             ← Runtime registry (extensible, built-ins protected)
  RecoveryManager.ts              ← Orchestrator: classify → log → snapshot → telemetry
  SessionRecovery.ts              ← Session key capture/restore; interrupted-session detect

hooks/
  useRecovery.ts                  ← Lightweight UI state for ErrorFallback

components/ErrorBoundary/
  GlobalErrorBoundary.tsx         ← Class component; root error boundary
  ErrorFallback.tsx               ← Accessible fallback UI (role=alert)
  ErrorDetails.tsx                ← Dev-only diagnostics panel
  RetryButton.tsx                 ← Accessible retry action (auto-focus)
```

---

## 3. Type Contracts

All types live in `types/ErrorTypes.ts`. Nothing in the error recovery system invents its own types.

```
ErrorCategory        "rendering" | "storage" | "network" | "user_input"
                     | "transient" | "unexpected" | "developer"

RecoveryStrategyId   "retry_component" | "reload_local_state" | "recompute_derived"
                     | "restore_snapshot" | "reset_ui" | "fallback_recommendation"
                     | "graceful_shutdown"

ClassifiedError      { original, category, strategyId, recoverable, userMessage, devNote }
RecoveryStrategyDef  { id, label, description, autoExecute, maxAttempts }
ErrorLogEntry        { id, timestamp, componentLabel?, category, strategyId,
                       recoverable, recoverySuccess?, recoveryDurationMs?,
                       devMessage, userMessage, retryCount }
SessionSnapshot      { capturedAt, keys: Record<string, string | null> }
RecoveryContext      { error, componentLabel?, retryCount, snapshot? }
```

---

## 4. Classification Pipeline

`ErrorClassifier.classifyError(error: Error): ClassifiedError`

A pure function — no state, no side effects.

```
Error
  │
  ├─ name === "QuotaExceededError"     → storage  / reload_local_state  / recoverable
  ├─ message includes "JSON"           → storage  / reload_local_state  / recoverable
  ├─ name === "NetworkError" / fetch   → network  / retry_component     / recoverable
  ├─ TypeError + null/undefined        → rendering/ retry_component     / recoverable
  ├─ message starts "Minified React"   → rendering/ retry_component     / recoverable
  ├─ instanceof RangeError             → transient/ recompute_derived   / recoverable
  ├─ name === "AssertionError"         → developer/ retry_component     / NOT recoverable
  └─ (default)                         → unexpected/retry_component     / recoverable
```

Rules are evaluated in order; first match wins. The default catches everything else, so `classifyError` never throws.

**Determinism:** Rules read only `error.name` and `error.message`. No mutable state is accessed.

---

## 5. Recovery Strategy Registry

Two layers:

**`RecoveryStrategies.ts`** — static array of 7 built-in `RecoveryStrategyDef` objects. Import this for type-safe access to the immutable defaults.

**`RecoveryRegistry.ts`** — runtime registry. Pre-populated from `RecoveryStrategies` at module load. Provides:

```typescript
registerStrategy(def: RecoveryStrategyDef): void   // add or replace
deregisterStrategy(id: RecoveryStrategyId): void   // no-op for built-ins
getStrategy(id): RecoveryStrategyDef | undefined
getAllStrategies(): RecoveryStrategyDef[]
```

Built-in strategies cannot be deregistered (only replaced). This protects the `graceful_shutdown` strategy, which must always be available as the last resort.

**Strategy table:**

| ID | autoExecute | maxAttempts | Use case |
|---|---|---|---|
| `retry_component` | true | 3 | Re-render after transient failure |
| `reload_local_state` | true | 2 | Re-read corrupt localStorage |
| `recompute_derived` | true | 2 | Recalculate derived values |
| `restore_snapshot` | true | 1 | Restore pre-crash session |
| `reset_ui` | true | 2 | Reset non-critical UI state |
| `fallback_recommendation` | true | 1 | Use static safe recommendation |
| `graceful_shutdown` | false | 1 | Cannot recover — guide to reload |

---

## 6. RecoveryManager — Orchestration

`RecoveryManager.ts` is the only module with side effects. It owns the error log and the telemetry hook.

### Public API

```typescript
classify(error: Error): ClassifiedError
shouldAutoRecover(strategyId, retryCount): boolean
recordError(error, componentLabel, retryCount): ErrorLogEntry
markRecoveryComplete(componentLabel, success, durationMs): void
getErrorLog(): ErrorLogEntry[]
clearErrorLog(): void
registerErrorTelemetryHook(hook: (entry: ErrorLogEntry) => void): void
buildRecoveryContext(error, componentLabel, retryCount): RecoveryContext
```

### recordError sequence

```
recordError(error, componentLabel, retryCount)
  │
  ├─ classify(error)                    ← ErrorClassifier (pure)
  ├─ captureSessionSnapshot()           ← SessionRecovery (reads localStorage)
  ├─ saveSessionSnapshot(snapshot)      ← persists to axis_session_snapshot_v1
  ├─ build ErrorLogEntry                ← assign unique ID (err-{ts}-{rand4})
  ├─ loadLog() → append → saveLog()    ← persists to axis_error_recovery_log_v1
  ├─ telemetryHook?.(entry)            ← Phase E integration point
  └─ return entry                       ← returned to GlobalErrorBoundary
```

**Persistence:** `axis_error_recovery_log_v1` — JSON array, capped at 100 entries (oldest trimmed).

**Telemetry:** Module-level `let telemetryHook: TelemetryHook | null`. Set once at app init. No-op if null.

---

## 7. Session Recovery

`SessionRecovery.ts` manages pre-crash snapshots of 7 session-critical localStorage keys:

```
axis_workout_log_v1         in-progress workout (most critical)
axis_checkin_v1             today's check-in
axis_daily_symptoms_v1      today's symptom log
axis_history_v1             completed workout history
axis_readiness_history_v1   readiness history
axis_recovery_scores        recovery score history
axis_onboarding             user profile (never lose)
```

### API

```typescript
captureSessionSnapshot(): SessionSnapshot    // reads all 7 keys
saveSessionSnapshot(snap): void              // writes to axis_session_snapshot_v1
loadSessionSnapshot(): SessionSnapshot | null  // null if absent or > 24h old
restoreSessionSnapshot(snap): void          // writes non-null values back
detectInterruptedSession(): boolean          // true if workout log has today's date
clearSessionSnapshot(): void
```

**Restore is non-destructive:** `restoreSessionSnapshot` skips keys with `null` values, so it never overwrites newer data with absent pre-crash data.

**Snapshot expiry:** 24-hour TTL. Stale snapshots return null from `loadSessionSnapshot`.

---

## 8. GlobalErrorBoundary — Root Boundary

```
app/layout.tsx
└── <body>
    └── GlobalErrorBoundary label="RootLayout"   ← catches all unhandled renders
        └── {children}                           ← entire app
```

### State machine

```
normal: hasError=false
  │
  │ (render throws)
  ▼
getDerivedStateFromError()   → hasError=true  (synchronous, before paint)
componentDidCatch(error)     → recordError(), detectInterruptedSession()
                               → setState({ entry, hasInterruptedSession })
  │
  ▼
render() → <ErrorFallback>
  │
  ├─ isGracefulShutdown=false & retryCount<3
  │    └─ user clicks "Try again" → handleRetry()
  │         → markRecoveryComplete(true)
  │         → setState({ hasError:false, retryCount: n+1 })
  │         → children re-render
  │
  └─ isGracefulShutdown=true (graceful_shutdown strategy OR !recoverable)
       └─ user clicks "Reload page" → window.location.reload()
```

### isGracefulShutdown derivation

```typescript
const isGraceful = entry.strategyId === "graceful_shutdown" || !entry.recoverable;
```

Derived directly from the log entry; no second classification call.

---

## 9. ErrorFallback — Accessible UI

```tsx
<div role="alert" aria-live="assertive" aria-atomic="true">
  <h2>Something went wrong</h2>
  <p>{entry.userMessage}</p>           ← never contains internal identifiers
  
  {hasInterruptedSession && (
    <p>You had a workout in progress. Your session data has been saved.</p>
  )}
  
  {!isGracefulShutdown && retryCount < 3
    ? <RetryButton onRetry={onRetry} retryCount={retryCount} />
    : <button onClick={() => window.location.reload()}>Reload page</button>
  }
  
  <ErrorDetails entry={entry} />       ← dev-only (process.env.NODE_ENV check)
</div>
```

`RetryButton` auto-focuses on mount so keyboard users reach the action without tabbing. `role="alert"` announces the error to screen readers immediately on render.

---

## 10. ErrorDetails — Developer Diagnostics

Renders only when:
- `process.env.NODE_ENV === "development"`, OR
- `window.location.hash === "#axis-debug"` (production debug mode)

Shows: `category`, `strategyId`, `retryCount`, `timestamp`, `componentLabel`, `devMessage`.

**Never shows:** stack traces, full error objects, localStorage contents.

---

## 11. Extension Guide

### Adding a new recovery strategy

```typescript
import { registerStrategy } from "@/lib/errorRecovery/RecoveryRegistry";
import type { RecoveryStrategyDef } from "@/types/ErrorTypes";

// Also add the ID to the RecoveryStrategyId union in types/ErrorTypes.ts first
const myStrategy: RecoveryStrategyDef = {
  id: "my_custom_strategy",
  label: "Custom Recovery",
  description: "What it does",
  autoExecute: true,
  maxAttempts: 2,
};
registerStrategy(myStrategy);
```

### Wiring the telemetry hook (Phase E)

```typescript
import { registerErrorTelemetryHook } from "@/lib/errorRecovery/RecoveryManager";

registerErrorTelemetryHook((entry) => {
  telemetry.track("error_recovery", {
    category:   entry.category,
    strategy:   entry.strategyId,
    component:  entry.componentLabel,
    recovered:  entry.recoverySuccess,
    durationMs: entry.recoveryDurationMs,
  });
});
```

Call this once at app initialisation. All subsequent errors fire it automatically.

### Adding a component-level boundary

Phase 69 `components/resilience/ErrorBoundary.tsx` wraps individual cards. Nest it inside the root boundary:

```tsx
<GlobalErrorBoundary label="RootLayout">
  <ErrorBoundary label="NutritionCard">
    <NutritionIntelligenceCard />
  </ErrorBoundary>
</GlobalErrorBoundary>
```

Failures in `NutritionCard` are caught by the inner boundary first. Only unhandled errors (or boundary-level errors) bubble to the root.

---

## 12. Testing Strategy

Tests live in `lib/errorRecovery/__tests__/errorRecovery.test.ts` (31 unit tests) and `lib/errorRecovery/__tests__/errorBoundaryIntegration.test.ts` (47 integration tests).

**No jsdom required.** All recovery logic is pure TypeScript or localStorage-based. Tests use `vi.stubGlobal("localStorage", mock)` and `vi.stubGlobal("window", { localStorage: mock })`.

**React boundary tests** require a browser or `@testing-library/react` with `jsdom`. These are manual-test items:
- Dashboard crash → fallback renders
- Retry → children re-render
- Third retry → graceful shutdown UI
- Interrupted session notice appears

---

## 13. Performance Characteristics

All operations are synchronous. Measured averages over 50–100 iterations in test environment:

| Operation | Measured | Budget |
|---|---|---|
| `classifyError` | < 0.1ms | 1ms |
| `classify + recordError` | < 0.5ms | 5ms |
| `captureSessionSnapshot` | < 0.2ms | 2ms |

Error classification adds negligible overhead to the render pipeline.

---

## 14. Failure Modes

| Scenario | Behaviour |
|---|---|
| localStorage full during snapshot | `try/catch` swallows; snapshot is empty but error still logged |
| localStorage corrupt during log load | Returns empty array; next error creates fresh log |
| Telemetry hook throws | Not caught — hook implementer must guard internally |
| Error inside componentDidCatch | React will call componentDidCatch again (infinite loop risk) — guard against this if implementing complex logic inside componentDidCatch |
| Error inside ErrorFallback render | Unhandled (cannot have a boundary catch its own boundary's render) — ErrorFallback must be kept maximally simple |

---

## 15. Future Roadmap

- **Phase E:** Wire `registerErrorTelemetryHook` to the production analytics pipeline.
- **jsdom test coverage:** Add `@testing-library/react` + `jsdom` to test `GlobalErrorBoundary` render cycles, retry behaviour, and `aria-live` announcements.
- **Per-card recovery:** Align Phase 69 `ErrorBoundary` log key with `axis_error_recovery_log_v1` so all errors appear in one log.
- **Recovery analytics card:** Surface `axis_error_recovery_log_v1` in `/dev` debug console.
- **Snapshot diff:** Compare restored snapshot against current state and notify user of any missing data before reload.
