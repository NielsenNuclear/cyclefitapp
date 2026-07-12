// ─── lib/telemetry/ObservabilityEvents.ts ─────────────────────────────────────
// Phase E — typed observability event emitters for each governance subsystem.
//
// All functions emit through TelemetryBus.emit() — never directly to storage.
// No PII. Only system-level signals: levels, scores, latencies, booleans.

import { emit, registerEventType } from "./TelemetryBus";
import type { SafetyResult }        from "@/lib/intelligence/safety/SafetyEngine";
import type { VerificationRecord }  from "@/lib/intelligence/verification/verificationTypes";
import type { ConfidenceProfile }   from "@/lib/intelligence/confidence/ConfidenceTypes";
import type { ErrorLogEntry }       from "@/types/ErrorTypes";

// ─── Register all observability event types ────────────────────────────────────

registerEventType("adaptive_decision_made", {
  category:    "system",
  description: "Adaptive Engine produced a training decision",
  schema:      ["decisionType", "finalVolumeScale", "isDeload"],
});
registerEventType("safety_evaluated", {
  category:    "system",
  description: "Safety Engine gate completed",
  schema:      ["wasConstrained", "originalScale", "constrainedScale", "criticalCount", "highCount", "durationMs"],
});
registerEventType("verification_registered", {
  category:    "system",
  description: "Verification Registry gate — record created or reused",
  schema:      ["isNew", "recommendationClass", "confidenceAtGeneration", "durationMs"],
});
registerEventType("verification_evaluated", {
  category:    "system",
  description: "A pending verification was scored",
  schema:      ["verificationScore", "samplesCollected", "recommendationClass"],
});
registerEventType("confidence_calculated", {
  category:    "system",
  description: "Confidence Engine gate completed",
  schema:      ["level", "compositeScore", "maturityStage", "calibrationAvailable", "verificationAvailable", "durationMs"],
});
registerEventType("calibration_updated", {
  category:    "system",
  description: "Phase 57 calibration profile updated",
  schema:      ["overallAccuracy", "trend", "dataReady"],
});
registerEventType("pipeline_completed", {
  category:    "system",
  description: "Full recommendation pipeline finished for session",
  schema:      ["totalDurationMs", "safetyConstrained", "confidenceLevel", "verificationState"],
});
registerEventType("error_recovery_triggered", {
  category:    "health",
  description: "Phase B error boundary caught and recovered an error",
  schema:      ["category", "strategyId", "recoverable", "retryCount", "componentLabel"],
});
registerEventType("storage_quota_warning", {
  category:    "health",
  description: "localStorage nearing cap for a key",
  schema:      ["storageKey", "currentSize"],
});
registerEventType("session_restored", {
  category:    "health",
  description: "Phase B session snapshot restored after a crash",
  schema:      ["restoredKeys"],
});

// ─── Typed event helpers ───────────────────────────────────────────────────────

export function trackAdaptiveDecision(
  decisionType:    string,
  finalVolumeScale: number,
  isDeload:        boolean,
  durationMs?:     number,
): void {
  emit("adaptive_decision_made", {
    decisionType,
    finalVolumeScale: Math.round(finalVolumeScale * 100) / 100,
    isDeload,
    ...(durationMs !== undefined ? { durationMs } : {}),
  });
}

export function trackSafetyEvaluation(
  result:     SafetyResult,
  durationMs: number,
): void {
  emit("safety_evaluated", {
    wasConstrained:  result.evaluation.wasConstrained,
    originalScale:   Math.round(result.evaluation.originalVolumeScale * 100) / 100,
    constrainedScale: Math.round(result.evaluation.constrainedVolumeScale * 100) / 100,
    criticalCount:   result.evaluation.criticalActivations.length,
    highCount:       result.evaluation.highActivations.length,
    durationMs,
  });
}

export function trackVerificationRegistered(
  record:  VerificationRecord | null,
  isNew:   boolean,
  durationMs: number,
): void {
  if (!record) return;
  emit("verification_registered", {
    isNew,
    recommendationClass:      record.recommendationClass,
    confidenceAtGeneration:   Math.round(record.confidenceAtGeneration * 100) / 100,
    durationMs,
  });
}

export function trackVerificationEvaluated(
  record: VerificationRecord,
): void {
  if (!record.evaluated || !record.verificationScore) return;
  emit("verification_evaluated", {
    verificationScore:    record.verificationScore,
    samplesCollected:     record.actualOutcome?.samplesCollected ?? 0,
    recommendationClass:  record.recommendationClass,
  });
}

export function trackConfidenceCalculated(
  profile:    ConfidenceProfile,
  durationMs: number,
): void {
  emit("confidence_calculated", {
    level:                    profile.level,
    compositeScore:           Math.round(profile.compositeScore * 1000) / 1000,
    maturityStage:            profile.maturityStage,
    calibrationAvailable:     profile.dimensions.calibration.available,
    verificationAvailable:    profile.dimensions.verification.available,
    durationMs,
  });
}

export function trackPipelineCompleted(opts: {
  totalDurationMs:    number;
  safetyConstrained:  boolean;
  confidenceLevel:    string;
  verificationState:  string;
}): void {
  emit("pipeline_completed", {
    totalDurationMs:   Math.round(opts.totalDurationMs),
    safetyConstrained: opts.safetyConstrained,
    confidenceLevel:   opts.confidenceLevel,
    verificationState: opts.verificationState,
  });
}

export function trackErrorRecovery(entry: ErrorLogEntry): void {
  emit("error_recovery_triggered", {
    category:       entry.category,
    strategyId:     entry.strategyId,
    recoverable:    entry.recoverable,
    retryCount:     entry.retryCount,
    componentLabel: entry.componentLabel ?? "unknown",
  });
}

export function trackStorageQuotaWarning(
  storageKey:  string,
  currentSize: number,
): void {
  emit("storage_quota_warning", { storageKey, currentSize });
}

export function trackSessionRestored(restoredKeys: string[]): void {
  emit("session_restored", { restoredKeys: restoredKeys.join(",") });
}
