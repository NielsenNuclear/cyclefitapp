// ─── lib/preferences/__tests__/dashboardDensity.test.ts ───────────────────────
// Dashboard 3.0 — Batch 20, Phase 6. Run: npm test

import { describe, it, expect, beforeEach } from "vitest";
import { getDashboardDensity, setDashboardDensity, defaultOpenFor } from "../dashboardDensity";

// ─── localStorage stub ────────────────────────────────────────────────────────

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

describe("getDashboardDensity / setDashboardDensity", () => {
  it("defaults to standard when nothing is stored", () => {
    expect(getDashboardDensity()).toBe("standard");
  });

  it("round-trips a stored value", () => {
    setDashboardDensity("full");
    expect(getDashboardDensity()).toBe("full");
  });

  it("falls back to standard for a corrupted/unknown stored value", () => {
    localStorageMock.setItem("axis_dashboard_density", "not-a-real-density");
    expect(getDashboardDensity()).toBe("standard");
  });
});

describe("defaultOpenFor", () => {
  it("focused: nothing defaults open", () => {
    for (const id of ["recovery", "cycle", "nutrition", "lifestyle", "this-week", "unknown-section"]) {
      expect(defaultOpenFor(id, "focused")).toBe(false);
    }
  });

  it("standard: only recovery defaults open (unchanged from pre-density behavior)", () => {
    expect(defaultOpenFor("recovery", "standard")).toBe(true);
    for (const id of ["cycle", "nutrition", "lifestyle", "this-week", "unknown-section"]) {
      expect(defaultOpenFor(id, "standard")).toBe(false);
    }
  });

  it("full: recovery, cycle, nutrition, lifestyle, and this-week all default open", () => {
    for (const id of ["recovery", "cycle", "nutrition", "lifestyle", "this-week"]) {
      expect(defaultOpenFor(id, "full")).toBe(true);
    }
    expect(defaultOpenFor("unknown-section", "full")).toBe(false);
  });
});
