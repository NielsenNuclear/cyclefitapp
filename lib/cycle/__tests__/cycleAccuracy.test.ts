// ─── lib/cycle/__tests__/cycleAccuracy.test.ts ─────────────────────────────────
// Cycle Logging Quick Action — conflict-detection tests. Run: npm test

import { describe, it, expect } from "vitest";
import { checkPeriodLogConflict, type PeriodEntry } from "../cycleAccuracy";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("checkPeriodLogConflict", () => {
  it("returns null for a first-time log with no existing history", () => {
    expect(checkPeriodLogConflict(daysAgo(0), [])).toBeNull();
  });

  it("blocks a future date", () => {
    const tomorrow = (() => {
      const d = new Date(); d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();
    expect(checkPeriodLogConflict(tomorrow, [])).toEqual({ type: "future_date" });
  });

  it("flags an exact duplicate of the latest logged date", () => {
    const history: PeriodEntry[] = [{ startDate: daysAgo(30) }, { startDate: daysAgo(2) }];
    expect(checkPeriodLogConflict(daysAgo(2), history)).toEqual({ type: "duplicate", existingDate: daysAgo(2) });
  });

  it("flags a date earlier than the latest logged period", () => {
    const history: PeriodEntry[] = [{ startDate: daysAgo(30) }, { startDate: daysAgo(5) }];
    expect(checkPeriodLogConflict(daysAgo(10), history)).toEqual({ type: "before_latest", latestDate: daysAgo(5) });
  });

  it("flags a gap under 10 days from the latest logged period as too soon", () => {
    const history: PeriodEntry[] = [{ startDate: daysAgo(30) }, { startDate: daysAgo(8) }];
    const result = checkPeriodLogConflict(daysAgo(0), history);
    expect(result).toEqual({ type: "too_soon", latestDate: daysAgo(8), daysSince: 8 });
  });

  it("returns null for a plausible new period at least 10 days after the latest", () => {
    const history: PeriodEntry[] = [{ startDate: daysAgo(58) }, { startDate: daysAgo(30) }];
    expect(checkPeriodLogConflict(daysAgo(0), history)).toBeNull();
  });

  it("accepts a backdated entry (yesterday, two days ago) with no conflict", () => {
    const history: PeriodEntry[] = [{ startDate: daysAgo(58) }, { startDate: daysAgo(30) }];
    expect(checkPeriodLogConflict(daysAgo(1), history)).toBeNull();
    expect(checkPeriodLogConflict(daysAgo(2), history)).toBeNull();
  });
});
