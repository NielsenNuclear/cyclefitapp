// ─── lib/launch/__tests__/dailyLaunch.test.ts ──────────────────────────────────
// Daily Briefing — launch-tracking tests. Run: npm test

import { describe, it, expect, beforeEach } from "vitest";
import { getLastLaunchDate, isFirstLaunchToday, markLaunchedToday } from "../dailyLaunch";

const store = new Map<string, string>();
const localStorageMock = {
  getItem:    (k: string) => store.get(k) ?? null,
  setItem:    (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear:      () => store.clear(),
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = localStorageMock;

beforeEach(() => {
  store.clear();
});

describe("dailyLaunch", () => {
  it("treats a never-launched app as a first launch today", () => {
    expect(getLastLaunchDate()).toBeNull();
    expect(isFirstLaunchToday()).toBe(true);
  });

  it("is no longer a first launch once marked today", () => {
    markLaunchedToday();
    expect(isFirstLaunchToday()).toBe(false);
  });

  it("stores today's date on mark", () => {
    markLaunchedToday();
    const today = new Date().toISOString().slice(0, 10);
    expect(getLastLaunchDate()).toBe(today);
  });

  it("is a first launch again once the stored date is a prior day", () => {
    localStorageMock.setItem("axis_last_launch_date", "2020-01-01");
    expect(isFirstLaunchToday()).toBe(true);
  });
});
