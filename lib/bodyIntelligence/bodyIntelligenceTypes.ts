// ─── lib/bodyIntelligence/bodyIntelligenceTypes.ts ───────────────────────────

export type MuscleState =
  | "scheduled"      // primary focus in today's workout
  | "secondary"      // secondary target today
  | "recently_trained"
  | "recovering"
  | "recovered"
  | "fatigued"
  | "overloaded"
  | "injured"
  | "protected"
  | "rest_day"
  | "unknown";

export type FatigueLevel = "low" | "moderate" | "high" | "unknown";
export type ConfidenceLevel = "low" | "moderate" | "high";

export type VisualizationMode =
  | "today"
  | "recovery"
  | "fatigue"
  | "injury"
  | "volume"
  | "frequency"
  | "cycle_influence"
  | "mobility";

export interface SymptomRecord {
  symptomId: string;
  label:     string;
  severity:  0 | 1 | 2 | 3;
  date:      string;
}

export interface MuscleGroupState {
  id:               string;           // e.g. "quads", "glute_max"
  displayName:      string;
  side?:            "left" | "right" | "bilateral";
  state:            MuscleState;
  recoveryPercent:  number;           // 0–100
  fatigueLevel:     FatigueLevel;
  lastTrainedDate:  string | null;
  daysSinceTraining: number | null;
  nextScheduledDate: string | null;
  weeklyFrequency:  number;           // sessions targeting this muscle in past 7d
  weeklyVolume:     number;           // total sets in past 7d
  symptoms:         SymptomRecord[];
  confidence:       ConfidenceLevel;
  // Cycle phase influence (0 = no effect, -1 = reduce, 1 = increase)
  cycleModifier:    number;
  // For heatmap modes
  volumeScore:      number;           // 0–100 relative to MRV
  mobilityFlag:     boolean;
}

export interface BodyIntelligenceSnapshot {
  date:        string;
  muscles:     MuscleGroupState[];
  mode:        VisualizationMode;
  timeline:    "today" | "tomorrow" | "this_week" | "next_week";
  dataReady:   boolean;
}

// Color for each state
export const STATE_COLOR: Record<MuscleState, string> = {
  scheduled:        "#534AB7",   // brand purple
  secondary:        "#7B74CF",   // lighter purple
  recently_trained: "#1B5FA0",   // blue
  recovering:       "#3A7BD5",   // lighter blue
  recovered:        "#0F6E56",   // green
  fatigued:         "#854F0B",   // amber
  overloaded:       "#C0392B",   // red
  injured:          "#C0392B",   // red
  protected:        "#9B9690",   // muted
  rest_day:         "#C8C5BC",   // lightest
  unknown:          "#EAE7DE",   // near-transparent
};

export const STATE_LABEL: Record<MuscleState, string> = {
  scheduled:        "Today's Focus",
  secondary:        "Secondary Target",
  recently_trained: "Recently Trained",
  recovering:       "Recovering",
  recovered:        "Ready",
  fatigued:         "Fatigued",
  overloaded:       "Overloaded",
  injured:          "Injured",
  protected:        "Protected",
  rest_day:         "Rest Day",
  unknown:          "No Data",
};
