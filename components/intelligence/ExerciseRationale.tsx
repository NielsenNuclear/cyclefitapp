"use client";

import type { WorkoutExercise } from "@/lib/exercises/generateWorkout";

// ── Small rationale badge ──────────────────────────────────────────────────

function RationaleTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-bg-mid text-brand-text border border-brand-border">
      {label}
    </span>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
// Rendered inside ExerciseCard — expandable "Why this exercise?" section.

interface ExerciseRationaleProps {
  exercise:   WorkoutExercise;
  className?: string;
}

export function ExerciseRationale({ exercise, className = "" }: ExerciseRationaleProps) {
  const { rationale, notes, exercise: ex } = exercise;

  // Extract the movement pattern + primary muscles for context tags
  const tags: string[] = [];
  if (ex.movementPattern)  tags.push(ex.movementPattern);
  if (ex.primaryMuscles?.length) tags.push(ex.primaryMuscles[0]);

  return (
    <div className={`text-left ${className}`}>
      {/* Context tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {tags.map(t => <RationaleTag key={t} label={t} />)}
        </div>
      )}

      {/* Rationale copy */}
      {rationale && (
        <p className="text-[12px] text-ink-secondary leading-relaxed">{rationale}</p>
      )}

      {/* Coach's cue */}
      {notes && (
        <div className="mt-2.5 pt-2.5 border-t border-border">
          <p className="type-micro text-ink-muted mb-1">Coaching cue</p>
          <p className="text-[12px] text-ink-secondary leading-relaxed">{notes}</p>
        </div>
      )}
    </div>
  );
}
