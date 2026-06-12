export interface CycleSymptomEvent {
  cycleNumber: number;   // 1+ = completed cycles (1 = most recently completed)
  cycleDay:    number;   // 1-indexed day within the cycle
  symptomId:   string;
  severity:    1 | 2 | 3;
}

export interface LearnedPattern {
  symptomId:        string;
  averageCycleDay:  number;  // mean cycle day the symptom appears
  averageSeverity:  number;  // mean severity (1–3)
  consistencyScore: number;  // 0–100
  supportingCycles: number;  // distinct completed cycles where symptom was logged
  confidence:       "low" | "medium" | "high";
}
