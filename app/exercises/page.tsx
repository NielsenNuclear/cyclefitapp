"use client";

import { useState, useMemo } from "react";
import { getMergedExercisePool } from "@/lib/exercises/customExercises";
import type { MuscleCategory, DifficultyLevel, MovementPattern } from "@/lib/exercises/exerciseLibrary";
import { ExerciseLibraryCard } from "@/components/exercises/ExerciseLibraryCard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

// ─── Filter constants ─────────────────────────────────────────────────────────

const CATEGORIES: MuscleCategory[] = [
  "Upper Push", "Upper Pull", "Lower Quad", "Lower Posterior",
  "Core", "Full Body", "Mobility",
];

const DIFFICULTIES: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];

const PATTERNS: MovementPattern[] = [
  "Horizontal Push", "Vertical Push", "Horizontal Pull", "Vertical Pull",
  "Squat", "Hinge", "Carry", "Rotation", "Anti-Rotation",
  "Explosive", "Isometric", "Stability", "Mobility",
];

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
}: {
  label:   string;
  active:  boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
        active
          ? "bg-[#1C1B18] text-[#F5F3EE] border-[#1C1B18]"
          : "bg-white text-[#6B6860] border-[#E0DDD4] hover:border-[#A09C94]"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Filter row (scrollable) ──────────────────────────────────────────────────

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label:    string;
  options:  T[];
  value:    T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-1.5">{label}</div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterChip label="All" active={value === null} onClick={() => onChange(null)} />
        {options.map(opt => (
          <FilterChip
            key={opt}
            label={opt}
            active={value === opt}
            onClick={() => onChange(value === opt ? null : opt)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExercisesPage() {
  const allExercises = useMemo(() => getMergedExercisePool(), []);

  const [search,       setSearch]       = useState("");
  const [category,     setCategory]     = useState<MuscleCategory | null>(null);
  const [difficulty,   setDifficulty]   = useState<DifficultyLevel | null>(null);
  const [pattern,      setPattern]      = useState<MovementPattern | null>(null);
  const [displayCount, setDisplayCount] = useState(30);

  // Reset pagination whenever any filter changes
  function updateSearch(v: string)                     { setSearch(v);     setDisplayCount(30); }
  function updateCategory(v: MuscleCategory | null)    { setCategory(v);   setDisplayCount(30); }
  function updateDifficulty(v: DifficultyLevel | null) { setDifficulty(v); setDisplayCount(30); }
  function updatePattern(v: MovementPattern | null)    { setPattern(v);    setDisplayCount(30); }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allExercises.filter(ex => {
      if (q && !ex.name.toLowerCase().includes(q) &&
          !ex.primaryMuscles.some(m => m.toLowerCase().includes(q))) return false;
      if (category   && ex.category        !== category)   return false;
      if (difficulty && ex.difficulty      !== difficulty) return false;
      if (pattern    && ex.movementPattern !== pattern)    return false;
      return true;
    });
  }, [allExercises, search, category, difficulty, pattern]);

  const hasActiveFilter = search || category || difficulty || pattern;

  return (
    <DashboardShell>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-[15px] font-semibold text-ink">Exercise Library</span>
        <span className="text-[12px] text-ink-muted">{filtered.length} exercises</span>
      </div>

      <div className="px-4 pb-16">
        {/* Search */}
        <div className="pt-4 pb-3">
          <input
            type="text"
            value={search}
            onChange={e => updateSearch(e.target.value)}
            placeholder="Search by name or muscle…"
            className="w-full px-4 py-3 text-[13px] rounded-xl border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7] shadow-sm"
          />
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-4">
          <FilterRow<MuscleCategory>
            label="Muscle group"
            options={CATEGORIES}
            value={category}
            onChange={updateCategory}
          />
          <FilterRow<DifficultyLevel>
            label="Difficulty"
            options={DIFFICULTIES}
            value={difficulty}
            onChange={updateDifficulty}
          />
          <FilterRow<MovementPattern>
            label="Movement pattern"
            options={PATTERNS}
            value={pattern}
            onChange={updatePattern}
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => { setSearch(""); setCategory(null); setDifficulty(null); setPattern(null); setDisplayCount(30); }}
            className="mb-3 text-[11px] font-semibold text-[#534AB7] hover:text-[#3C3489] transition-colors"
          >
            Clear all filters
          </button>
        )}

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[14px] text-[#9B9690]">No exercises match your filters.</div>
            <button
              type="button"
              onClick={() => { setSearch(""); setCategory(null); setDifficulty(null); setPattern(null); setDisplayCount(30); }}
              className="mt-3 text-[12px] font-semibold text-[#534AB7]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filtered.slice(0, displayCount).map(ex => (
                <ExerciseLibraryCard key={ex.name} exercise={ex} />
              ))}
            </div>
            {filtered.length > displayCount && (
              <button
                type="button"
                onClick={() => setDisplayCount(c => c + 30)}
                className="mt-4 w-full py-3 text-[12px] font-semibold text-[#534AB7] border border-[#534AB7] rounded-xl hover:bg-[#F0EEF8] transition-colors"
              >
                Load more ({filtered.length - displayCount} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
