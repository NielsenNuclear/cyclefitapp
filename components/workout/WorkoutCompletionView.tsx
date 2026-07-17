"use client";

// ─── components/workout/WorkoutCompletionView.tsx ─────────────────────────────
// Phase UX-1 — post-workout summary screen.
// Shows duration, completion rate, positive reinforcement, recovery reminder.
//
// Workout Engine Sprint — Phase C.9: re-skinned for the dark Workout Mode
// canvas — still the "gym floor" surface per docs/ux/WorkoutModeProposal.md's
// screen flow (Workout Complete precedes "Return to Dashboard").

import type { WorkoutExercise } from "@/lib/exercises/generateWorkout";
import type { SetRecord }        from "./types";
import { AxisIcon }              from "@/components/ui/Icon";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const REINFORCEMENT_LINES = [
  "Consistency builds champions. Great work today.",
  "Every session is a vote for the athlete you're becoming.",
  "Smart training is better than hard training. You did both.",
  "Recovery starts now. You've earned it.",
  "Another session in the bank.",
];

function pickReinforcement(date: string): string {
  const seed = date.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return REINFORCEMENT_LINES[seed % REINFORCEMENT_LINES.length];
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-3 bg-white/5 rounded-2xl flex-1">
      <span className="text-[22px] font-bold text-[#F5F3EE] tabular-nums leading-none">{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A8580] mt-0.5">{label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkoutCompletionViewProps {
  exercises:       WorkoutExercise[];
  actuals:         Record<number, SetRecord[]>;
  durationMinutes: number;
  onDone:          () => void;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function WorkoutCompletionView({
  exercises,
  actuals,
  durationMinutes,
  onDone,
}: WorkoutCompletionViewProps) {
  const today = new Date().toISOString().slice(0, 10);

  const completedExercises = exercises.filter((_, i) => {
    const sets = actuals[i] ?? [];
    return sets.length > 0 && sets.some(s => s.completed);
  }).length;

  const totalSetsLogged = Object.values(actuals)
    .reduce((sum, sets) => sum + sets.filter(s => s.completed).length, 0);

  const reinforcement = pickReinforcement(today);

  return (
    <div className="space-y-6" aria-live="polite">
      {/* Completion mark */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="w-14 h-14 rounded-full bg-[#0F6E56]/15 border-2 border-[#0F6E56]/50 flex items-center justify-center">
          <AxisIcon name="check" size={24} strokeWidth={2.5} className="text-[#5FD1A8]" />
        </div>
        <div className="text-center">
          <h2
            className="text-[1.25rem] font-light text-[#F5F3EE] leading-snug"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Workout complete
          </h2>
          <p className="text-[11px] text-[#8A8580] mt-0.5">{today}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        <StatCard value={formatDuration(durationMinutes)} label="Duration" />
        <StatCard value={`${completedExercises}/${exercises.length}`} label="Exercises" />
        <StatCard value={String(totalSetsLogged)} label="Sets" />
      </div>

      {/* Reinforcement line */}
      <p className="text-[12px] text-[#B5B0A6] italic leading-relaxed text-center px-2">
        {reinforcement}
      </p>

      {/* Recovery reminder */}
      <div className="px-4 py-3 bg-[#534AB7]/10 rounded-2xl border border-[#534AB7]/30">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8B84DD] mb-1">Recovery</p>
        <p className="text-[11px] text-[#D6D2F5] leading-relaxed">
          Prioritise sleep and nutrition in the next 24 hours. Your next session will benefit from it.
        </p>
      </div>

      {/* Done — ONE primary action */}
      <button
        type="button"
        onClick={onDone}
        className="w-full py-4 rounded-2xl bg-[#534AB7] text-white text-[15px] font-semibold tracking-wide hover:bg-[#3C3489] active:scale-[0.98] transition-all min-h-[56px]"
        aria-label="Return to dashboard"
      >
        Done
      </button>
    </div>
  );
}
