// ─── lib/data/schema/coreSchemas.ts ──────────────────────────────────────────
// Phase 70 — schema definitions for every major Axis object.

import type { SchemaDefinition } from "./SchemaTypes";

export const CORE_SCHEMAS: Record<string, SchemaDefinition> = {

  // ── Workout & session ───────────────────────────────────────────────────────

  workoutSession: {
    name: "Workout Session",
    schemaVersion: "1.0",
    fields: {
      id:            { type: "string",  required: true, minLength: 1, maxLength: 128 },
      workoutId:     { type: "string",  required: true, minLength: 1 },
      startedAt:     { type: "isoDate", required: true },
      lastHeartbeat: { type: "isoDate", required: true },
      completedSets: { type: "array",   required: true },
      totalSets:     { type: "number",  required: true, min: 0, max: 500 },
      isPaused:      { type: "boolean", required: true },
      resumeCount:   { type: "number",  required: true, min: 0, max: 200 },
    },
  },

  completedSet: {
    name: "Completed Set",
    schemaVersion: "1.0",
    fields: {
      exerciseId:  { type: "string",  required: true },
      setIndex:    { type: "number",  required: true, min: 0, max: 100 },
      reps:        { type: "number",  required: false, min: 0, max: 1000 },
      weight:      { type: "number",  required: false, min: 0, max: 2000 },
      rpe:         { type: "number",  required: false, min: 1, max: 10 },
      completedAt: { type: "isoDate", required: true },
    },
  },

  // ── Recommendations & verification ─────────────────────────────────────────

  verificationRecord: {
    name: "Verification Record",
    schemaVersion: "1.0",
    fields: {
      id:                      { type: "string",  required: true },
      recommendationId:        { type: "string",  required: true },
      timestamp:               { type: "isoDate", required: true },
      evaluationDueDate:       { type: "string",  required: true },
      recommendationClass:     { type: "string",  required: true },
      recommendationSummary:   { type: "string",  required: true, maxLength: 500 },
      algorithmVersion:        { type: "string",  required: true },
      confidenceAtGeneration:  { type: "number",  required: true, min: 0, max: 1 },
      evaluated:               { type: "boolean", required: true },
    },
  },

  // ── Decision traces ─────────────────────────────────────────────────────────

  decisionTrace: {
    name: "Decision Trace",
    schemaVersion: "1.0",
    fields: {
      id:                   { type: "string",  required: true },
      timestamp:            { type: "isoDate", required: true },
      finalVolumeScale:     { type: "number",  required: true, min: 0.0, max: 2.0 },
      finalConfidence:      { type: "number",  required: true, min: 0,   max: 1   },
      recommendationClass:  { type: "string",  required: true },
      algorithmVersion:     { type: "string",  required: true },
      uncertaintyScore:     { type: "number",  required: true, min: 0,   max: 1   },
      calibrationFactor:    { type: "number",  required: true, min: 0,   max: 2   },
      finalIntensity:       { type: "string",  required: true },
    },
  },

  // ── Safety ─────────────────────────────────────────────────────────────────

  safetyAuditEntry: {
    name: "Safety Audit Entry",
    schemaVersion: "1.0",
    fields: {
      id:           { type: "string",  required: true },
      timestamp:    { type: "isoDate", required: true },
      inputVolume:  { type: "number",  required: true, min: 0, max: 2 },
      outputVolume: { type: "number",  required: true, min: 0, max: 2 },
      activations:  { type: "number",  required: true, min: 0, max: 50 },
    },
  },

  // ── Confidence ─────────────────────────────────────────────────────────────

  confidenceSnapshot: {
    name: "Confidence Snapshot",
    schemaVersion: "1.0",
    fields: {
      date:           { type: "string", required: true, minLength: 10, maxLength: 10 },
      level:          { type: "string", required: true, enum: ["High","Moderate","Building","Limited","Insufficient"] },
      compositeScore: { type: "number", required: true, min: 0, max: 1 },
      maturityStage:  { type: "string", required: true },
    },
  },

  // ── Athlete profile ─────────────────────────────────────────────────────────

  athleteProfile: {
    name: "Athlete Onboarding Profile",
    schemaVersion: "1.0",
    fields: {
      goals:           { type: "array",  required: true },
      trainingLevel:   { type: "string", required: true },
      sessionsPerWeek: { type: "number", required: true, min: 1, max: 14 },
      sleepHours:      { type: "number", required: false, min: 2, max: 16 },
      stressLevel:     { type: "number", required: false, min: 0, max: 10 },
      cycleLength:     { type: "number", required: false, min: 20, max: 45 },
      equipment:       { type: "array",  required: false },
    },
  },

  // ── Recovery & readiness ────────────────────────────────────────────────────

  recoveryRecord: {
    name: "Recovery Record",
    schemaVersion: "1.0",
    fields: {
      date:         { type: "string", required: true, minLength: 10, maxLength: 10 },
      score:        { type: "number", required: true, min: 0, max: 100 },
      stressLevel:  { type: "number", required: false, min: 0, max: 10 },
      notes:        { type: "string", required: false, maxLength: 2000 },
    },
  },

  readinessRecord: {
    name: "Readiness Record",
    schemaVersion: "1.0",
    fields: {
      date:           { type: "string", required: true },
      readinessScore: { type: "number", required: true, min: 0, max: 100 },
      badge:          { type: "string", required: false, enum: ["Push","Maintain","Watch","Recover"] },
    },
  },

  // ── Cycle data ──────────────────────────────────────────────────────────────

  cycleRecord: {
    name: "Cycle Record",
    schemaVersion: "1.0",
    fields: {
      date:     { type: "string", required: true },
      cycleDay: { type: "number", required: true, min: 1, max: 60 },
      phase:    { type: "string", required: true },
      symptoms: { type: "array",  required: false },
    },
  },

  // ── Nutrition ───────────────────────────────────────────────────────────────

  nutritionRecord: {
    name: "Nutrition Record",
    schemaVersion: "1.0",
    fields: {
      date:         { type: "string", required: true },
      caloriesKcal: { type: "number", required: false, min: 0, max: 10000 },
      proteinG:     { type: "number", required: false, min: 0, max: 500 },
      carbsG:       { type: "number", required: false, min: 0, max: 1500 },
      fatG:         { type: "number", required: false, min: 0, max: 500 },
    },
  },

  // ── Regression ─────────────────────────────────────────────────────────────

  regressionSnapshot: {
    name: "Regression Snapshot",
    schemaVersion: "1.0",
    fields: {
      scenarioId:       { type: "string",  required: true },
      capturedAt:       { type: "isoDate", required: true },
      algorithmVersion: { type: "string",  required: true },
      allPropertiesPass:{ type: "boolean", required: true },
    },
  },
};

// Map from storage key to schema + storage shape
export const STORAGE_SCHEMA_MAP: Record<string, {
  schema:     SchemaDefinition;
  shape:      "array" | "object" | "record";   // record = object keyed by ID
}> = {
  axis_verification_registry_v1: { schema: CORE_SCHEMAS.verificationRecord, shape: "array"  },
  axis_decision_traces_v1:        { schema: CORE_SCHEMAS.decisionTrace,       shape: "array"  },
  axis_regression_snapshots_v1:   { schema: CORE_SCHEMAS.regressionSnapshot,  shape: "record" },
  axis_confidence_registry_v1:    { schema: CORE_SCHEMAS.confidenceSnapshot,  shape: "array"  },
  axis_safety_audit_v1:           { schema: CORE_SCHEMAS.safetyAuditEntry,    shape: "array"  },
  axis_session_recovery_v1:       { schema: CORE_SCHEMAS.workoutSession,      shape: "object" },
};
