"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getMergedExercisePool } from "@/lib/exercises/customExercises";
import type { MuscleCategory, DifficultyLevel, MovementPattern } from "@/lib/exercises/exerciseLibrary";
import { ExerciseLibraryCard } from "@/components/exercises/ExerciseLibraryCard";

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
  const router = useRouter();

  const allExercises = useMemo(() => getMergedExercisePool(), []);

  const [search,     setSearch]     = useState("");
  const [category,   setCategory]   = useState<MuscleCategory | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [pattern,    setPattern]    = useState<MovementPattern | null>(null);

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
    <div
      className="min-h-screen bg-[#FAF9F5]"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* Top nav */}
      <nav className="sticky top-0 z-40 bg-[rgba(250,249,245,0.88)] backdrop-blur-md border-b border-[#EAE7DE]">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center text-[#9B9690] hover:text-[#1C1B18] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <span className="text-[15px] font-semibold text-[#1C1B18]">Exercise Library</span>
          </div>
          <span className="text-[12px] text-[#9B9690]">{filtered.length} exercises</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 pb-16">
        {/* Search */}
        <div className="pt-4 pb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
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
            onChange={setCategory}
          />
          <FilterRow<DifficultyLevel>
            label="Difficulty"
            options={DIFFICULTIES}
            value={difficulty}
            onChange={setDifficulty}
          />
          <FilterRow<MovementPattern>
            label="Movement pattern"
            options={PATTERNS}
            value={pattern}
            onChange={setPattern}
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => { setSearch(""); setCategory(null); setDifficulty(null); setPattern(null); }}
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
              onClick={() => { setSearch(""); setCategory(null); setDifficulty(null); setPattern(null); }}
              className="mt-3 text-[12px] font-semibold text-[#534AB7]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(ex => (
              <ExerciseLibraryCard key={ex.name} exercise={ex} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
