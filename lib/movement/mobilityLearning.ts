// ─── lib/movement/mobilityLearning.ts ─────────────────────────────────────────
// Tracks mobility complaint history so the system learns which limitations
// are recurring. Outputs primaryLimitation + secondaryLimitation + confidence.

const STORAGE_KEY    = "axis_mobility_history";
const RETENTION_DAYS = 90;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MobilityComplaint {
  date:        string;    // YYYY-MM-DD
  symptomIds:  string[];  // which symptoms drove today's mobility additions
}

export interface MobilityPattern {
  primaryLimitation?:   string;   // most frequent complaint area
  secondaryLimitation?: string;
  confidence:           "early" | "growing" | "established";
  totalEntries:         number;
  insight:              string;
}

// ─── SSR guard ────────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

// ─── I/O ──────────────────────────────────────────────────────────────────────

function load(): MobilityComplaint[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: MobilityComplaint[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

function pruneOld(entries: MobilityComplaint[]): MobilityComplaint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return entries.filter(e => e.date >= cutoffStr);
}

// ─── Symptom → human-readable area ───────────────────────────────────────────

const AREA_LABELS: Record<string, string> = {
  back_pain:          "lower back",
  back_stiffness:     "lower back",
  lower_back_pain:    "lower back",
  hip_tightness:      "hips",
  hip_pain:           "hips",
  shoulder_pain:      "shoulders",
  shoulder_tightness: "shoulders",
  neck_tension:       "neck & upper back",
  neck_pain:          "neck",
  knee_pain:          "knees",
  calf_tightness:     "calves & ankles",
  wrist_pain:         "wrists",
  hamstring_tightness:"hamstrings",
  cramps:             "hips & core",
};

function getAreaLabel(symptomId: string): string {
  return AREA_LABELS[symptomId] ?? symptomId.replace(/_/g, " ");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Record today's mobility complaints. Upserts by date. */
export function logMobilityComplaints(
  date:       string,
  symptoms:   Array<{ symptomId: string }>,
): void {
  const mobilitySymptomIds = symptoms
    .map(s => s.symptomId)
    .filter(id => id in AREA_LABELS);

  if (mobilitySymptomIds.length === 0) return;

  const existing = pruneOld(load());
  const idx = existing.findIndex(e => e.date === date);
  const entry: MobilityComplaint = { date, symptomIds: mobilitySymptomIds };
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.unshift(entry);
  }
  persist(existing);
}

/** Compute the recurring mobility pattern from stored history. */
export function getMobilityPattern(): MobilityPattern {
  const entries = pruneOld(load());
  const total   = entries.length;

  if (total < 3) {
    return {
      confidence:  "early",
      totalEntries: total,
      insight:     "Log 3+ sessions with symptoms to reveal your recurring mobility patterns.",
    };
  }

  // Count symptom occurrences
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    for (const id of entry.symptomIds) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [primary, secondary] = sorted;

  const confidence: MobilityPattern["confidence"] =
    total >= 20 ? "established" :
    total >= 7  ? "growing"     :
    "early";

  const primaryLabel    = primary   ? getAreaLabel(primary[0])   : undefined;
  const secondaryLabel  = secondary ? getAreaLabel(secondary[0]) : undefined;
  const primaryRate     = primary   ? Math.round((primary[1] / total) * 100) : 0;

  const insight = primaryLabel
    ? `${primaryLabel.charAt(0).toUpperCase() + primaryLabel.slice(1)} is your most recurring mobility limitation (${primaryRate}% of sessions). ${
        secondaryLabel ? `${secondaryLabel.charAt(0).toUpperCase() + secondaryLabel.slice(1)} is a secondary pattern.` : ""
      }`.trim()
    : "No recurring mobility limitation detected yet.";

  return {
    primaryLimitation:   primaryLabel,
    secondaryLimitation: secondaryLabel,
    confidence,
    totalEntries:        total,
    insight,
  };
}
