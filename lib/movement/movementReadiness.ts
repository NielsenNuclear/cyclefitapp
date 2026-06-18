// ─── lib/movement/movementReadiness.ts ────────────────────────────────────────
// Determines movement readiness level and focus areas from cycle phase, energy,
// symptoms, and historical patterns. Drives how warmup/prep blocks are built.

import type { BodyRegion } from "./mobilityLibrary";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadinessLevel = "high" | "moderate" | "low" | "recovery_only";

export interface MovementReadiness {
  readinessLevel:   ReadinessLevel;
  focusAreas:       BodyRegion[];       // body regions needing extra prep
  restrictions:     string[];           // symptom IDs that restrict movement
  notes:            string[];           // coaching notes shown in the UI
  extendedWarmup:   boolean;            // true → add 2–3 extra minutes
  emphasizeQuality: boolean;            // true → movement quality cues shown
}

// ─── Symptom → focus area mapping ────────────────────────────────────────────

const SYMPTOM_FOCUS: Record<string, BodyRegion[]> = {
  back_pain:          ["lower_back", "thoracic"],
  back_stiffness:     ["lower_back", "thoracic"],
  lower_back_pain:    ["lower_back"],
  hip_tightness:      ["hips", "glutes"],
  hip_pain:           ["hips"],
  shoulder_pain:      ["shoulders", "thoracic"],
  shoulder_tightness: ["shoulders"],
  neck_tension:       ["neck", "thoracic"],
  neck_pain:          ["neck"],
  knee_pain:          ["quadriceps", "hamstrings", "ankles"],
  ankle_pain:         ["ankles", "calves"],
  wrist_pain:         ["wrists", "forearms"],
  hamstring_tightness:["hamstrings"],
  calf_tightness:     ["calves", "ankles"],
  quad_tightness:     ["quadriceps"],
  cramps:             ["hips", "lower_back"],
  bloating:           ["lower_back", "core"],
  fatigue:            [],   // handled via extendedWarmup flag
  low_energy:         [],
  headache:           ["neck"],
  joint_pain:         ["hips", "shoulders", "ankles"],
};

// Symptom IDs that should RESTRICT certain movements (passed to modifier engine)
const SYMPTOM_RESTRICTIONS: Record<string, string[]> = {
  back_pain:       ["back_pain", "lower_back_pain"],
  lower_back_pain: ["back_pain", "lower_back_pain"],
  shoulder_pain:   ["shoulder_pain"],
  knee_pain:       ["knee_pain"],
  ankle_pain:      ["ankle_pain"],
  wrist_pain:      ["wrist_pain"],
  neck_pain:       ["neck_pain"],
};

// ─── Phase → focus area hints ─────────────────────────────────────────────────

const PHASE_FOCUS: Record<string, BodyRegion[]> = {
  menstrual:    ["lower_back", "hips"],
  follicular:   [],
  ovulatory:    [],
  luteal:       ["hips", "lower_back"],
};

// ─── Energy → readiness tier ──────────────────────────────────────────────────

function energyToReadiness(energy: number): ReadinessLevel {
  if (energy >= 3) return "high";
  if (energy >= 2) return "moderate";
  if (energy >= 1) return "low";
  return "recovery_only";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function assessMovementReadiness(input: {
  energyLevel:  number;          // 0–4
  phaseName:    string;          // "menstrual" | "follicular" | "ovulatory" | "luteal"
  symptoms:     Array<{ symptomId: string; severity: 0 | 1 | 2 | 3 }>;
  trainingState: string;         // "fresh" | "moderate" | "fatigued" | "overtrained"
}): MovementReadiness {
  const { energyLevel, phaseName, symptoms, trainingState } = input;

  // Override energy level with training state degradation
  let effectiveEnergy = energyLevel;
  if (trainingState === "fatigued")    effectiveEnergy = Math.max(0, effectiveEnergy - 1);
  if (trainingState === "overtrained") effectiveEnergy = Math.max(0, effectiveEnergy - 2);

  const readinessLevel = energyToReadiness(effectiveEnergy);

  // Collect focus areas from symptoms
  const focusSet = new Set<BodyRegion>();
  const restrictions: string[] = [];
  const notes: string[] = [];

  for (const sym of symptoms) {
    const areas = SYMPTOM_FOCUS[sym.symptomId];
    if (areas) areas.forEach(a => focusSet.add(a));
    const restr = SYMPTOM_RESTRICTIONS[sym.symptomId];
    if (restr) restrictions.push(...restr);

    // High-severity symptoms generate explicit notes
    if (sym.severity >= 2) {
      if (sym.symptomId.includes("back"))       notes.push("Focus on spinal decompression — no heavy axial loading today.");
      if (sym.symptomId.includes("shoulder"))   notes.push("Protect the shoulder — avoid overhead pressing if it hurts.");
      if (sym.symptomId.includes("hip"))        notes.push("Open the hips thoroughly before any loaded hip hinge.");
      if (sym.symptomId.includes("knee"))       notes.push("Warm knees up progressively — avoid locking out under load.");
      if (sym.symptomId.includes("wrist"))      notes.push("Use neutral grip or straps — protect the wrist joint.");
    }
  }

  // Add phase-based focus areas
  const phaseKey = phaseName.toLowerCase().split(" ")[0];
  const phaseAreas = PHASE_FOCUS[phaseKey] ?? [];
  phaseAreas.forEach(a => focusSet.add(a));

  // Phase-specific notes
  if (phaseKey === "menstrual") {
    notes.push("Prioritise movement quality over intensity — lower back and hip mobility first.");
  }
  if (phaseKey === "luteal") {
    notes.push("Joints may be looser — control range of motion and avoid pushing flexibility limits.");
  }

  // Energy-based notes
  const extendedWarmup  = effectiveEnergy <= 1 || trainingState === "fatigued" || trainingState === "overtrained";
  const emphasizeQuality = effectiveEnergy <= 2 || trainingState !== "fresh";

  if (extendedWarmup) {
    notes.push("Low energy detected — taking an extra 3–4 minutes to prepare your body will pay off.");
  }
  if (trainingState === "overtrained") {
    notes.push("Your body is showing signs of overtraining. Limit today's session to movement quality work.");
  }

  return {
    readinessLevel,
    focusAreas:      [...focusSet],
    restrictions:    [...new Set(restrictions)],
    notes:           [...new Set(notes)],
    extendedWarmup,
    emphasizeQuality,
  };
}
