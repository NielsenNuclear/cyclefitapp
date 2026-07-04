// ─── lib/athlete/athleteTimeline.ts ──────────────────────────────────────────
// Phase 62G — Athlete Timeline
// Builds a longitudinal event timeline from stored workout and readiness history.
// Each event represents a meaningful milestone or change in the athlete's journey.

import type { WorkoutHistoryEntry }   from "@/lib/history/workoutHistory";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { RecoveryScore }         from "@/lib/recovery/recoveryScore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimelineEventType =
  | "started"            // first logged session
  | "consistency"        // reached a streak milestone
  | "volume_increase"    // weekly volume up ≥20%
  | "volume_reduction"   // volume dropped ≥20%
  | "readiness_peak"     // highest readiness score
  | "readiness_low"      // 7d sustained low readiness
  | "recovery_peak"      // highest recovery score
  | "recovery_trend"     // sustained improvement
  | "session_milestone"  // 10th, 25th, 50th, 100th session
  | "program_change";    // split type changed

export interface TimelineEvent {
  id:     string;
  type:   TimelineEventType;
  date:   string;    // YYYY-MM-DD
  label:  string;    // short heading
  detail: string;    // one sentence of context
  emoji?: string;    // visual indicator (a character, not emoji if user disabled)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eventId(type: string, date: string): string {
  return `${type}_${date}`;
}

function isoToDisplay(date: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Individual event detectors ───────────────────────────────────────────────

function firstSession(history: WorkoutHistoryEntry[]): TimelineEvent | null {
  const first = history
    .filter(e => e.status !== "skipped" && e.status !== "pending")
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!first) return null;
  return {
    id:     eventId("started", first.id),
    type:   "started",
    date:   first.id,
    label:  "First session logged",
    detail: `Started with a ${first.splitType.replace(/_/g, " ")} session on ${isoToDisplay(first.id)}.`,
  };
}

function sessionMilestones(history: WorkoutHistoryEntry[]): TimelineEvent[] {
  const MILESTONES = [10, 25, 50, 100, 200];
  const completed = history
    .filter(e => e.status === "completed" || e.status === "partially_completed")
    .sort((a, b) => a.id.localeCompare(b.id));
  return MILESTONES
    .filter(n => completed.length >= n)
    .map(n => {
      const entry = completed[n - 1];
      return {
        id:     eventId(`session_${n}`, entry.id),
        type:   "session_milestone" as TimelineEventType,
        date:   entry.id,
        label:  `Session #${n}`,
        detail: `Completed ${n} training sessions — a genuine commitment milestone.`,
      };
    });
}

function readinessPeak(readinessHistory: ReadinessHistoryEntry[]): TimelineEvent | null {
  if (readinessHistory.length < 7) return null;
  const peak = readinessHistory.reduce((best, e) => e.score > best.score ? e : best, readinessHistory[0]);
  return {
    id:     eventId("readiness_peak", peak.date),
    type:   "readiness_peak",
    date:   peak.date,
    label:  `Peak readiness — ${peak.score}/100`,
    detail: `Highest recorded readiness on ${isoToDisplay(peak.date)}.`,
  };
}

function recoveryPeak(recoveryScores: RecoveryScore[]): TimelineEvent | null {
  if (recoveryScores.length < 7) return null;
  const peak = recoveryScores.reduce((best, s) => s.score > best.score ? s : best, recoveryScores[0]);
  return {
    id:     eventId("recovery_peak", peak.date),
    type:   "recovery_peak",
    date:   peak.date,
    label:  `Peak recovery — ${peak.score}/100`,
    detail: `Highest recorded recovery score on ${isoToDisplay(peak.date)}.`,
  };
}

function programChanges(history: WorkoutHistoryEntry[]): TimelineEvent[] {
  const sorted = history
    .filter(e => e.status !== "pending")
    .sort((a, b) => a.id.localeCompare(b.id));
  const events: TimelineEvent[] = [];
  let lastSplit = sorted[0]?.splitType;
  let changeCount = 0;
  for (const entry of sorted) {
    if (entry.splitType !== lastSplit) {
      changeCount++;
      events.push({
        id:     eventId(`program_change_${changeCount}`, entry.id),
        type:   "program_change",
        date:   entry.id,
        label:  "Program structure changed",
        detail: `Switched from ${lastSplit?.replace(/_/g, " ")} to ${entry.splitType.replace(/_/g, " ")}.`,
      });
      lastSplit = entry.splitType;
    }
  }
  return events;
}

function recoveryTrendEvent(recoveryScores: RecoveryScore[]): TimelineEvent | null {
  if (recoveryScores.length < 21) return null;
  const sorted = [...recoveryScores].sort((a, b) => a.date.localeCompare(b.date));
  const recent7 = sorted.slice(-7).map(s => s.score);
  const prior14 = sorted.slice(-21, -7).map(s => s.score);
  const avgRecent = recent7.reduce((s, v) => s + v, 0) / recent7.length;
  const avgPrior  = prior14.reduce((s, v) => s + v, 0) / prior14.length;
  if (avgRecent - avgPrior < 8) return null;
  const date = sorted[sorted.length - 1].date;
  return {
    id:     eventId("recovery_trend", date),
    type:   "recovery_trend",
    date,
    label:  "Recovery improvement streak",
    detail: `Your recovery score has improved by ${Math.round(avgRecent - avgPrior)} points over 3 weeks.`,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildAthleteTimeline(
  workoutHistory:   WorkoutHistoryEntry[],
  readinessHistory: ReadinessHistoryEntry[],
  recoveryScores:   RecoveryScore[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    firstSession(workoutHistory),
    ...sessionMilestones(workoutHistory),
    readinessPeak(readinessHistory),
    recoveryPeak(recoveryScores),
    ...programChanges(workoutHistory),
    recoveryTrendEvent(recoveryScores),
  ].filter(Boolean) as TimelineEvent[];

  // Deduplicate by id and sort chronologically
  const seen = new Set<string>();
  return events
    .filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
