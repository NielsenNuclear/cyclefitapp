// ─── lib/progression/cycleAwareProgression.ts ────────────────────────────────
// Applies cycle-phase modifiers to computed progression targets.
// Follicular: proceed aggressively.
// Ovulatory: performance test — slightly higher load.
// Luteal: maintain load, focus consistency.
// Menstrual: technique emphasis, no load increases.

import type { ProgressionTarget } from "./progressionTargets";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CycleProgressionContext {
  phaseName:    string;   // "Follicular" | "Ovulatory" | "Luteal" | "Late Luteal" | "Menstrual"
  cycleDay:     number;
}

export interface CycleProgressionAdjustment {
  modified:     boolean;
  phaseNote:    string;
  targets:      ProgressionTarget[];
}

// ─── Phase classification ─────────────────────────────────────────────────────

type CyclePhaseClass = "follicular" | "ovulatory" | "luteal" | "late_luteal" | "menstrual";

function classifyPhase(phaseName: string): CyclePhaseClass {
  const p = phaseName.toLowerCase();
  if (p.includes("late luteal"))  return "late_luteal";
  if (p.includes("luteal"))       return "luteal";
  if (p.includes("ovulatory"))    return "ovulatory";
  if (p.includes("menstrual"))    return "menstrual";
  return "follicular";
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Applies cycle phase modifiers to progression targets before they are
 * shown to the user or used in the workout generator.
 *
 * Only alters target weight / progression type / note — never changes exercise name.
 */
export function applyCycleAwareProgression(
  targets:  ProgressionTarget[],
  context:  CycleProgressionContext,
): CycleProgressionAdjustment {
  const phase = classifyPhase(context.phaseName);

  if (targets.length === 0) {
    return { modified: false, phaseNote: "", targets };
  }

  switch (phase) {
    case "ovulatory": {
      // Peak window — test slightly higher load where progression is already advised
      const modified = targets.map(t => {
        if (t.progressionType !== "load" || t.targetWeight === 0) return t;
        const boosted = Math.round(t.targetWeight * 1.025 * 2) / 2;   // extra +2.5% above normal
        return {
          ...t,
          targetWeight: boosted,
          note: `${t.note} · Ovulatory peak — performance test at higher load`,
        };
      });
      return {
        modified:  true,
        phaseNote: "Ovulatory phase — energy and strength peak. Axis is offering a slightly higher load target for testing.",
        targets:   modified,
      };
    }

    case "luteal": {
      // Sustain — override load jumps to maintain
      const modified = targets.map(t =>
        t.progressionType === "load"
          ? {
              ...t,
              progressionType: "maintain" as const,
              note:            "Luteal phase — holding load this week. Consistency now builds capacity for next follicular push.",
            }
          : t,
      );
      return {
        modified:  true,
        phaseNote: "Luteal phase — maintaining load to protect recovery. Progression resumes in your follicular window.",
        targets:   modified,
      };
    }

    case "late_luteal": {
      // Protect — soften load, no increases
      const modified = targets.map(t => ({
        ...t,
        progressionType: "maintain" as const,
        targetWeight:    t.targetWeight > 0 ? Math.round(t.targetWeight * 0.95 * 2) / 2 : 0,
        note:            "Late luteal — reducing load 5%. Prioritise movement quality over output.",
      }));
      return {
        modified:  true,
        phaseNote: "Late luteal phase — load softened and technique prioritised to protect recovery before menstruation.",
        targets:   modified,
      };
    }

    case "menstrual": {
      // Technique emphasis — maintain weight, note is technique-focused
      const modified = targets.map(t => ({
        ...t,
        progressionType: "maintain" as const,
        note:            "Menstrual phase — technique focus today. Move well; load can wait.",
      }));
      return {
        modified:  true,
        phaseNote: "Menstrual phase — technique and feel take priority. No load increases prescribed today.",
        targets:   modified,
      };
    }

    case "follicular":
    default:
      // Optimal progression window — use computed targets unchanged
      return {
        modified:  false,
        phaseNote: "Follicular phase — rising estrogen supports adaptation. Axis is applying your full progression targets.",
        targets,
      };
  }
}
