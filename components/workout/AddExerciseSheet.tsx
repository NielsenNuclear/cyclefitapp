"use client";

// ─── components/workout/AddExerciseSheet.tsx ──────────────────────────────────
// UX Stabilization Batch 2 (#9) — lets a user add an exercise mid-session.
// A focused picker, not the full exercise-library page: search only, no
// multi-filter UI, since this is a quick in-session action, not browsing.

import { useMemo, useState } from "react";
import { getMergedExercisePool } from "@/lib/exercises/customExercises";
import type { Exercise } from "@/lib/exercises/exerciseLibrary";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import { isCompatibleWith } from "@/lib/exercises/exerciseSubstitutions";
import { Sheet } from "@/components/ui/Sheet";

interface AddExerciseSheetProps {
  isOpen:      boolean;
  onClose:     () => void;
  onSelect:    (exercise: Exercise) => void;
  environment: TrainingEnvironment;
}

export function AddExerciseSheet({ isOpen, onClose, onSelect, environment }: AddExerciseSheetProps) {
  const [search, setSearch] = useState("");
  const allExercises = useMemo(() => getMergedExercisePool(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allExercises
      .filter(ex => isCompatibleWith(ex, environment))
      .filter(ex =>
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscles.some(m => m.toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [allExercises, search, environment]);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} side="bottom" title="Add exercise" bodyPadding={false}>
      <div className="p-4 border-b border-border">
        <input
          type="text"
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or muscle…"
          className="w-full px-4 py-3 text-[13px] rounded-xl border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7] shadow-sm"
        />
      </div>
      <div className="overflow-y-auto p-4 space-y-1.5">
        {filtered.length === 0 && (
          <p className="text-[12px] text-ink-muted text-center py-6">
            No exercises match your search.
          </p>
        )}
        {filtered.map(ex => (
          <button
            key={ex.name}
            type="button"
            onClick={() => onSelect(ex)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-white rounded-xl border border-[#E5E2DA] text-left hover:border-[#534AB7]/40 transition-colors"
          >
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[#1C1B18] truncate">{ex.name}</div>
              <div className="text-[10px] text-[#9B9690] mt-0.5">
                {ex.primaryMuscles.slice(0, 2).join(", ")} · {ex.equipment}
              </div>
            </div>
            <span className="flex-shrink-0 text-[11px] font-semibold text-[#534AB7]">Add</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
