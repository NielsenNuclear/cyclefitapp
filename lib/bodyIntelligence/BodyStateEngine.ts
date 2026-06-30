/**
 * BodyStateEngine
 *
 * Pure computation module. No rendering, no side effects, no imports from React.
 * Receives raw data from existing intelligence engines and produces MuscleRecord[].
 *
 * Phase 59 / 60 will consume the same types — do not change these interfaces.
 */

import type { SymptomRecord } from "./bodyIntelligenceTypes";

// ─── Canonical status vocabulary ─────────────────────────────────────────────

export type MuscleStatus =
  | "training"    // primary target in today's workout
  | "secondary"   // secondary target today
  | "recovering"  // trained recently — < 80% recovered
  | "ready"       // fully recovered, no training today
  | "fatigued"    // fatigue zone is overreached / high
  | "injured"     // active injury or pain symptom
  | "protected"   // modified training due to symptom
  | "rest"        // designated rest day
  | "unknown";    // no data yet

// ─── Canonical muscle record ──────────────────────────────────────────────────

export interface MuscleRecord {
  /** Unique id — matches GLTF node suffix. E.g. "quads_left", "rectus_abdominis" */
  id:               string;
  /** Human-readable name without side suffix */
  displayName:      string;
  side:             "left" | "right" | "bilateral";

  status:           MuscleStatus;
  recoveryPct:      number;   // 0–100
  fatigueLevel:     "low" | "moderate" | "high";
  confidence:       "low" | "moderate" | "high";

  lastTrainedDate:  string | null;  // ISO yyyy-mm-dd
  daysSinceTrained: number | null;
  nextScheduled:    string | null;  // null = not scheduled

  weeklyFrequency:  number;   // training sessions in last 7 days
  weeklyVolume:     number;   // total sets in last 7 days
  volumePct:        number;   // 0–100 relative to MRV estimate

  cycleModifier:    number;   // −1 to +1 hormonal influence
  symptoms:         SymptomRecord[];
  mobilityFlag:     boolean;
}

// ─── Snapshot — the output of one engine run ─────────────────────────────────

export interface BodySnapshot {
  date:       string;   // ISO yyyy-mm-dd
  muscles:    MuscleRecord[];
  /** false until async data load completes */
  isReady:    boolean;
}

// ─── Visualization layer ──────────────────────────────────────────────────────
// Each layer recolors muscles using different dimensions of the MuscleRecord.

export type VisualizationLayer =
  | "status"      // default — status-based semantic colors
  | "recovery"    // recovery percentage gradient
  | "fatigue"     // fatigue level
  | "injury"      // injury / symptom flags
  | "volume"      // weekly volume vs MRV
  | "frequency"   // weekly training frequency
  | "cycle"       // hormonal cycle modifier
  | "mobility";   // mobility restriction flags

// ─── Adapter: MuscleGroupState → MuscleRecord ────────────────────────────────
// Bridges the existing muscleStateEngine output to the new canonical types.
// This is the only place that knows about the legacy MuscleState strings.

const STATE_TO_STATUS: Record<string, MuscleStatus> = {
  scheduled:       "training",
  secondary:       "secondary",
  recently_trained:"recovering",
  recovering:      "recovering",
  recovered:       "ready",
  fatigued:        "fatigued",
  overloaded:      "fatigued",
  injured:         "injured",
  protected:       "protected",
  rest_day:        "rest",
  unknown:         "unknown",
};

export interface LegacyMuscleGroupState {
  id:               string;
  displayName:      string;
  side?:            "left" | "right" | "bilateral";
  state:            string;
  recoveryPercent:  number;
  fatigueLevel:     string;
  confidence:       string;
  lastTrainedDate:  string | null;
  daysSinceTraining: number | null;
  nextScheduledDate: string | null;
  weeklyFrequency:  number;
  weeklyVolume:     number;
  volumeScore:      number;
  cycleModifier:    number;
  symptoms:         SymptomRecord[];
  mobilityFlag:     boolean;
}

export function adaptToMuscleRecord(src: LegacyMuscleGroupState): MuscleRecord {
  return {
    id:               src.id,
    displayName:      src.displayName.replace(/ \((left|right)\)$/, ""),
    side:             src.side ?? "bilateral",
    status:           STATE_TO_STATUS[src.state] ?? "unknown",
    recoveryPct:      src.recoveryPercent,
    fatigueLevel:     (src.fatigueLevel as MuscleRecord["fatigueLevel"]) ?? "low",
    confidence:       (src.confidence as MuscleRecord["confidence"]) ?? "low",
    lastTrainedDate:  src.lastTrainedDate,
    daysSinceTrained: src.daysSinceTraining,
    nextScheduled:    src.nextScheduledDate,
    weeklyFrequency:  src.weeklyFrequency,
    weeklyVolume:     src.weeklyVolume,
    volumePct:        src.volumeScore,
    cycleModifier:    src.cycleModifier,
    symptoms:         src.symptoms,
    mobilityFlag:     src.mobilityFlag,
  };
}

// ─── Body renderer contract ───────────────────────────────────────────────────
// Any renderer (PlaceholderBody, GltfBody) must satisfy this interface.
// Changing the model in Phase 59 requires implementing this and nothing else.

export interface BodyRendererProps {
  /** Full muscle state, indexed by MuscleRecord.id */
  muscleMap:   Map<string, MuscleRecord>;
  layer:       VisualizationLayer;
  hoveredId:   string | null;
  selectedId:  string | null;
  onHover:     (id: string | null) => void;
  onSelect:    (id: string | null) => void;
}
