// ─── lib/recovery/recoveryBank.ts ────────────────────────────────────────────
// Phase 33C — Recovery Bank (resilience reserves).
// The inverse of RecoveryDebt. Tracks positive recovery contributions:
// good sleep, low stress, active recovery — and how much resilience
// the user has built up. A high bank balance means the user can absorb
// harder training without the same risk of breakdown.

import type { FatigueEntry } from "./fatigueHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BankTrend = "building" | "stable" | "depleting";

export interface RecoveryBank {
  balance:         number;    // 0–100 (resilience reserves)
  trend:           BankTrend;
  goodSleepStreak: number;    // consecutive days of excellent/good sleep
  lowStressStreak: number;    // consecutive days of stress ≤ 4
  daysInHistory:   number;
  note:            string;
}

// ─── Sleep quality → numeric score ───────────────────────────────────────────

const SLEEP_SCORE_MAP: Record<string, number> = {
  excellent: 4,
  good:      3,
  variable:  2,
  poor:      1,
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes the recovery bank balance from fatigue history entries.
 *
 * Balance algorithm:
 * - Starts at a neutral 50
 * - Good/excellent sleep adds +5/+8 per day
 * - Variable/poor sleep subtracts −3/−8
 * - Stress ≤ 4 adds +3, stress ≥ 8 subtracts −5
 * - Clamps to [0, 100]
 * - Trend derived from rolling 7d vs prior 7d
 *
 * Uses the most recent 30 days. Fewer than 3 entries returns a default.
 */
export function computeRecoveryBank(fatigueHistory: FatigueEntry[]): RecoveryBank {
  const sorted = [...fatigueHistory]
    .sort((a, b) => a.date.localeCompare(b.date));

  const recent = sorted.slice(-30);
  const n      = recent.length;

  if (n < 3) {
    return {
      balance:         50,
      trend:           "stable",
      goodSleepStreak: 0,
      lowStressStreak: 0,
      daysInHistory:   n,
      note:            "Not enough data yet — log check-ins daily to build your recovery bank picture.",
    };
  }

  // Compute daily delta and accumulate
  let balance = 50;
  for (const e of recent) {
    const sleepScore = SLEEP_SCORE_MAP[e.sleepQuality] ?? 2;
    const sleepDelta =
      sleepScore === 4 ? +8  :
      sleepScore === 3 ? +5  :
      sleepScore === 2 ? -3  : -8;

    const stressDelta =
      e.stressLevel <= 3 ? +4 :
      e.stressLevel <= 5 ? +2 :
      e.stressLevel <= 7 ?  0 :
      e.stressLevel <= 8 ? -4 : -7;

    balance = Math.min(100, Math.max(0, balance + sleepDelta + stressDelta));
  }

  // Trend: compare last 7 entries vs prior 7
  const window1 = recent.slice(-7);
  const window2 = recent.slice(-14, -7);

  const avgBal = (entries: FatigueEntry[]) => {
    if (entries.length === 0) return 50;
    let b = 50;
    for (const e of entries) {
      const s = SLEEP_SCORE_MAP[e.sleepQuality] ?? 2;
      const sd = s === 4 ? +8 : s === 3 ? +5 : s === 2 ? -3 : -8;
      const td = e.stressLevel <= 3 ? +4 : e.stressLevel <= 5 ? +2 : e.stressLevel <= 7 ? 0 : e.stressLevel <= 8 ? -4 : -7;
      b = Math.min(100, Math.max(0, b + sd + td));
    }
    return b;
  };

  const recentAvg = avgBal(window1);
  const priorAvg  = window2.length > 0 ? avgBal(window2) : recentAvg;
  const trend: BankTrend =
    recentAvg > priorAvg + 5 ? "building" :
    recentAvg < priorAvg - 5 ? "depleting" :
    "stable";

  // Streaks
  let goodSleepStreak = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const s = SLEEP_SCORE_MAP[recent[i].sleepQuality] ?? 2;
    if (s >= 3) goodSleepStreak++;
    else break;
  }

  let lowStressStreak = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].stressLevel <= 4) lowStressStreak++;
    else break;
  }

  const note =
    balance >= 70 ? "Strong resilience reserves — your body is well-positioned to absorb harder training." :
    balance >= 50 ? "Moderate reserves. Consistent sleep and stress management will build this further." :
    balance >= 30 ? "Reserves are lower than ideal. Prioritise recovery habits before pushing intensity." :
    "Recovery bank is depleted. Your body needs consistent rest before it can absorb more training stress.";

  return { balance: Math.round(balance), trend, goodSleepStreak, lowStressStreak, daysInHistory: n, note };
}
