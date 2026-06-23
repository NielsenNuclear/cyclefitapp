// ─── lib/athlete/milestoneDetection.ts ───────────────────────────────────────
// 47F / 48C — Milestone Detection
// Detects when the user crosses training milestones. Stored in localStorage so
// each milestone is only flagged once, then marked as celebrated.

import type { MultiDomainStreaks }  from "@/lib/adherence/streaks";

const STORAGE_KEY = "axis_athlete_milestones";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MilestoneType =
  | "sessions_10" | "sessions_25" | "sessions_50" | "sessions_100" | "sessions_200"
  | "streak_7"    | "streak_30"   | "streak_60"
  | "first_complete";

export interface DevelopmentMilestone {
  type:         MilestoneType;
  label:        string;
  achievedDate: string;
  celebrated:   boolean;
}

export interface NextMilestone {
  label:       string;
  progressPct: number;   // 0–100
  remaining:   number;
}

export interface MilestoneReport {
  recentlyAchieved: DevelopmentMilestone[];   // not yet celebrated
  allMilestones:    DevelopmentMilestone[];
  nextMilestone:    NextMilestone | null;
  totalAchieved:    number;
  dataReady:        boolean;
}

// ─── Definitions ─────────────────────────────────────────────────────────────

const SESSION_THRESHOLDS: { type: MilestoneType; threshold: number; label: string }[] = [
  { type: "first_complete", threshold: 1,   label: "First workout complete" },
  { type: "sessions_10",    threshold: 10,  label: "10 workouts" },
  { type: "sessions_25",    threshold: 25,  label: "25 workouts" },
  { type: "sessions_50",    threshold: 50,  label: "50 workouts" },
  { type: "sessions_100",   threshold: 100, label: "100 workouts" },
  { type: "sessions_200",   threshold: 200, label: "200 workouts" },
];

const STREAK_THRESHOLDS: { type: MilestoneType; threshold: number; label: string }[] = [
  { type: "streak_7",  threshold: 7,  label: "7-day training streak" },
  { type: "streak_30", threshold: 30, label: "30-day training streak" },
  { type: "streak_60", threshold: 60, label: "60-day training streak" },
];

// ─── Storage ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

function load(): DevelopmentMilestone[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DevelopmentMilestone[]) : [];
  } catch { return []; }
}

function save(milestones: DevelopmentMilestone[]): void {
  if (!isClient()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(milestones)); } catch {}
}

export function markMilestoneCelebrated(type: MilestoneType): void {
  const existing = load();
  const idx      = existing.findIndex(m => m.type === type);
  if (idx !== -1) { existing[idx].celebrated = true; save(existing); }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectMilestones(
  totalSessions: number,
  streaks:       MultiDomainStreaks | undefined,
  today:         string,
): MilestoneReport {
  if (totalSessions === 0) {
    return { recentlyAchieved: [], allMilestones: [], nextMilestone: null, totalAchieved: 0, dataReady: false };
  }

  const stored     = load();
  const storedKeys = new Set(stored.map(m => m.type));
  const newOnes:   DevelopmentMilestone[] = [];

  // Check session milestones
  for (const def of SESSION_THRESHOLDS) {
    if (totalSessions >= def.threshold && !storedKeys.has(def.type)) {
      const m: DevelopmentMilestone = { type: def.type, label: def.label, achievedDate: today, celebrated: false };
      newOnes.push(m);
    }
  }

  // Check streak milestones
  const longestStreak = Math.max(streaks?.training.current ?? 0, streaks?.training.longest ?? 0);
  for (const def of STREAK_THRESHOLDS) {
    if (longestStreak >= def.threshold && !storedKeys.has(def.type)) {
      const m: DevelopmentMilestone = { type: def.type, label: def.label, achievedDate: today, celebrated: false };
      newOnes.push(m);
    }
  }

  const all = [...stored, ...newOnes];
  if (newOnes.length > 0) save(all);

  const recentlyAchieved = all.filter(m => !m.celebrated);

  // Next milestone
  const nextSession = SESSION_THRESHOLDS.find(d => totalSessions < d.threshold);
  const nextMilestone: NextMilestone | null = nextSession
    ? {
        label:       nextSession.label,
        progressPct: Math.round((totalSessions / nextSession.threshold) * 100),
        remaining:   nextSession.threshold - totalSessions,
      }
    : null;

  return {
    recentlyAchieved,
    allMilestones: all.sort((a, b) => a.achievedDate.localeCompare(b.achievedDate)),
    nextMilestone,
    totalAchieved: all.length,
    dataReady: totalSessions > 0,
  };
}
