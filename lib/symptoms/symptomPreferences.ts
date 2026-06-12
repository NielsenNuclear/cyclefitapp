// ─── lib/symptoms/symptomPreferences.ts ──────────────────────────────────────
// Manages user's quick-symptom customization.
// Pure logic — no React, no side effects beyond localStorage.

import { SYMPTOM_CATALOG, type Symptom } from "./symptomCatalog";

export interface SymptomPreferences {
  quickSymptomIds: string[];  // ordered list of exactly 10 symptom ids
}

const STORAGE_KEY  = "axis_symptom_preferences";
const QUICK_COUNT  = 10;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function defaultPreferences(): SymptomPreferences {
  return {
    quickSymptomIds: SYMPTOM_CATALOG
      .filter(s => s.defaultQuickAccess)
      .map(s => s.id),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSymptomPreferences(): SymptomPreferences {
  if (!isClient()) return defaultPreferences();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences();
    const parsed = JSON.parse(raw) as SymptomPreferences;
    if (!Array.isArray(parsed.quickSymptomIds) || parsed.quickSymptomIds.length === 0) {
      return defaultPreferences();
    }
    // Strip any ids that no longer exist in the catalog
    const valid = parsed.quickSymptomIds.filter(
      id => SYMPTOM_CATALOG.some(s => s.id === id)
    );
    return { quickSymptomIds: valid.length > 0 ? valid : defaultPreferences().quickSymptomIds };
  } catch {
    return defaultPreferences();
  }
}

export function saveSymptomPreferences(prefs: SymptomPreferences): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable — fail silently
  }
}

// Returns the 10 quick symptoms in user-defined order.
export function getQuickSymptoms(): Symptom[] {
  const { quickSymptomIds } = getSymptomPreferences();
  return quickSymptomIds
    .map(id => SYMPTOM_CATALOG.find(s => s.id === id))
    .filter((s): s is Symptom => s !== undefined);
}

// Returns all symptoms NOT in the quick list, in catalog order.
export function getOtherSymptoms(): Symptom[] {
  const { quickSymptomIds } = getSymptomPreferences();
  const quickSet = new Set(quickSymptomIds);
  return SYMPTOM_CATALOG.filter(s => !quickSet.has(s.id));
}

export { QUICK_COUNT };
