// ─── lib/athlete/athleteProfile.ts ───────────────────────────────────────────
// Phase 62A — Athlete Profile Engine
// Synthesises all athlete intelligence into one persistent, evolving profile.
// This is the single source of truth for who this athlete is and how they adapt.

import type { WorkoutHistoryEntry }   from "@/lib/history/workoutHistory";
import type { RecoveryScore }         from "@/lib/recovery/recoveryScore";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { PersonalBaselines }     from "./adaptiveBaselines";
import type { RecoverySignature }     from "./recoverySignature";
import type { TrainingFingerprint }   from "./trainingFingerprint";
import type { AdaptationInsight }     from "./adaptationInsights";
import type { TimelineEvent }         from "./athleteTimeline";
import { computePersonalBaselines }  from "./adaptiveBaselines";
import { computeRecoverySignature }  from "./recoverySignature";
import { computeTrainingFingerprint } from "./trainingFingerprint";
import { generateAdaptationInsights } from "./adaptationInsights";
import { buildAthleteTimeline }       from "./athleteTimeline";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AthleteProfile {
  version:       number;      // schema version for migrations
  lastUpdated:   string;      // ISO timestamp

  // Training identity
  totalSessionsLogged: number;
  weeksActive:         number;
  firstSessionDate:    string | null;

  // Sub-profiles
  baselines:    PersonalBaselines;
  signature:    RecoverySignature;
  fingerprint:  TrainingFingerprint;

  // Insights and timeline
  adaptationInsights: AdaptationInsight[];
  timeline:           TimelineEvent[];

  // Confidence in profile data
  profileConfidence: number;    // 0–100 — grows with data
  dataReady:         boolean;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY   = "axis_athlete_profile";
const SCHEMA_VERSION = 1;

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function saveAthleteProfile(profile: AthleteProfile): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch { /* quota guard */ }
}

export function loadAthleteProfile(): AthleteProfile | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as AthleteProfile;
    return p.version === SCHEMA_VERSION ? p : null;
  } catch {
    return null;
  }
}

// ─── Profile confidence ───────────────────────────────────────────────────────

function profileConfidence(
  sessionCount: number,
  recoveryCount: number,
  readinessCount: number,
): number {
  const sessionScore  = Math.min(100, (sessionCount / 30) * 100);
  const recoveryScore = Math.min(100, (recoveryCount / 30) * 100);
  const readinessScore = Math.min(100, (readinessCount / 30) * 100);
  return Math.round((sessionScore + recoveryScore + readinessScore) / 3);
}

// ─── Weeks active ─────────────────────────────────────────────────────────────

function weeksActive(history: WorkoutHistoryEntry[]): number {
  const entries = history.filter(e => e.status !== "pending").sort((a, b) => a.id.localeCompare(b.id));
  if (entries.length < 2) return 0;
  const oldest = new Date(entries[0].id + "T12:00:00").getTime();
  const newest = new Date(entries[entries.length - 1].id + "T12:00:00").getTime();
  return Math.max(1, Math.round((newest - oldest) / (7 * 24 * 3600 * 1000)));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildAthleteProfile(
  workoutHistory:   WorkoutHistoryEntry[],
  recoveryScores:   RecoveryScore[],
  readinessHistory: ReadinessHistoryEntry[],
  todayReadiness?:  number,
  todayRecovery?:   number,
): AthleteProfile {
  const completed = workoutHistory.filter(
    e => e.status === "completed" || e.status === "partially_completed"
  );
  const firstEntry = completed
    .sort((a, b) => a.id.localeCompare(b.id))[0];

  const baselines   = computePersonalBaselines(readinessHistory, recoveryScores, workoutHistory, todayReadiness, todayRecovery);
  const signature   = computeRecoverySignature(recoveryScores);
  const fingerprint = computeTrainingFingerprint(workoutHistory);
  const insights    = generateAdaptationInsights(workoutHistory, recoveryScores, readinessHistory, baselines, fingerprint, signature);
  const timeline    = buildAthleteTimeline(workoutHistory, readinessHistory, recoveryScores);

  const confidence  = profileConfidence(completed.length, recoveryScores.length, readinessHistory.length);

  const profile: AthleteProfile = {
    version:             SCHEMA_VERSION,
    lastUpdated:         new Date().toISOString(),
    totalSessionsLogged: completed.length,
    weeksActive:         weeksActive(workoutHistory),
    firstSessionDate:    firstEntry?.id ?? null,
    baselines,
    signature,
    fingerprint,
    adaptationInsights:  insights,
    timeline,
    profileConfidence:   confidence,
    dataReady:           completed.length >= 5,
  };

  saveAthleteProfile(profile);
  return profile;
}
