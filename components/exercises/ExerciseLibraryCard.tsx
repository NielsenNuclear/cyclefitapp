"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/exercises/exerciseLibrary";
import { getCoachingData } from "@/lib/exercises/exerciseCoaching";
import { getExerciseHistory } from "@/lib/history/exerciseHistory";
import { isFavorite, toggleFavorite } from "@/lib/exercises/exerciseFavorites";
import {
  isRestricted,
  addRestriction,
  removeRestriction,
  type RestrictionReason,
  RESTRICTION_LABELS,
} from "@/lib/exercises/exerciseRestrictions";

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function MuscleBadge({ label, primary }: { label: string; primary: boolean }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
      primary
        ? "bg-[#F0EEF8] text-[#534AB7]"
        : "bg-[#F5F3EE] text-[#6B6860] border border-[#E0DDD4]"
    }`}>
      {label}
    </span>
  );
}

// ─── Coaching section ────────────────────────────────────────────────────────

function CoachingSection({ exerciseName }: { exerciseName: string }) {
  const coaching = getCoachingData(exerciseName);
  if (!coaching) return null;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">How to perform</div>
        <ol className="space-y-1.5">
          {coaching.instructions.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[10px] font-bold text-[#534AB7] flex-shrink-0 w-4">{i + 1}.</span>
              <span className="text-[10px] text-[#5C5850] leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">Coaching cues</div>
        <div className="space-y-1">
          {coaching.coachingCues.map((cue, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-[10px] text-[#085041] flex-shrink-0 mt-0.5">✓</span>
              <span className="text-[10px] text-[#5C5850] leading-relaxed">{cue}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">Common mistakes</div>
        <div className="space-y-1">
          {coaching.commonMistakes.map((mistake, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-[10px] text-[#B25E1B] flex-shrink-0 mt-0.5">⚠</span>
              <span className="text-[10px] text-[#5C5850] leading-relaxed">{mistake}</span>
            </div>
          ))}
        </div>
      </div>

      {(coaching.beginnerTip || coaching.advancedTip) && (
        <div className="space-y-1.5">
          {coaching.beginnerTip && (
            <div className="px-2.5 py-2 bg-[#E1F5EE] rounded-lg">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#085041]">Beginner tip  </span>
              <span className="text-[10px] text-[#085041] leading-relaxed">{coaching.beginnerTip}</span>
            </div>
          )}
          {coaching.advancedTip && (
            <div className="px-2.5 py-2 bg-[#FDF6EC] rounded-lg border border-[#E8C98A]">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#633806]">Advanced tip  </span>
              <span className="text-[10px] text-[#633806] leading-relaxed">{coaching.advancedTip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── History stats ────────────────────────────────────────────────────────────

function HistorySection({ exerciseName }: { exerciseName: string }) {
  const history = getExerciseHistory(exerciseName);
  if (history.completionCount === 0) return null;

  const { completionCount, bestSet, lastPerformed, trend } = history;
  const daysAgo = lastPerformed
    ? Math.floor((Date.now() - new Date(lastPerformed).getTime()) / 86_400_000)
    : null;

  const trendIcon  = trend ? { improving: "↑", stable: "→", declining: "↓" }[trend.direction] : null;
  const trendColor = trend ? { improving: "text-[#085041]", stable: "text-[#9B9690]", declining: "text-[#B25E1B]" }[trend.direction] : "";

  return (
    <div className="px-2.5 py-2 bg-[#FAFAF7] rounded-lg border border-[#E5E2DA]">
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">Your history</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[10px] text-[#9B9690]">Completed</div>
          <div className="text-[13px] font-semibold text-[#1C1B18]">{completionCount}×</div>
        </div>
        {bestSet && bestSet.reps > 0 && (
          <div>
            <div className="text-[10px] text-[#9B9690]">Best set</div>
            <div className="text-[13px] font-semibold text-[#1C1B18]">
              {bestSet.weight > 0 ? `${bestSet.weight}kg × ${bestSet.reps}` : `${bestSet.reps} reps`}
            </div>
          </div>
        )}
        {daysAgo !== null && (
          <div>
            <div className="text-[10px] text-[#9B9690]">Last done</div>
            <div className="text-[13px] font-semibold text-[#1C1B18]">
              {daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`}
            </div>
          </div>
        )}
      </div>
      {trend && trendIcon && (
        <div className={`mt-2 text-[10px] font-semibold ${trendColor}`}>
          {trendIcon} {trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)}
        </div>
      )}
    </div>
  );
}

// ─── Restriction toggle ───────────────────────────────────────────────────────

const REASON_OPTIONS: RestrictionReason[] = ["pain", "dislike", "equipment_issue", "other"];

function RestrictionToggle({
  exerciseName,
  blocked,
  onToggle,
}: {
  exerciseName: string;
  blocked:      boolean;
  onToggle:     (blocked: boolean) => void;
}) {
  const [picking, setPicking] = useState(false);

  if (blocked) {
    return (
      <button
        type="button"
        onClick={() => { removeRestriction(exerciseName); onToggle(false); }}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-[#C0390B] transition-colors"
      >
        <span>⊘</span>
        <span>Blocked — tap to unblock</span>
      </button>
    );
  }

  if (picking) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {REASON_OPTIONS.map(r => (
          <button
            key={r}
            type="button"
            onClick={() => { addRestriction(exerciseName, r); onToggle(true); setPicking(false); }}
            className="text-[10px] font-semibold text-[#C0390B] bg-[#FDE8E8] hover:bg-[#FACACA] px-2 py-1 rounded-full transition-colors"
          >
            {RESTRICTION_LABELS[r]}
          </button>
        ))}
        <button type="button" onClick={() => setPicking(false)} className="text-[10px] text-[#9B9690] px-2 py-1">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPicking(true)}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9B9690] hover:text-[#C0390B] transition-colors"
    >
      <span>⊘</span>
      <span>Block exercise</span>
    </button>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function ExerciseLibraryCard({ exercise }: { exercise: Exercise }) {
  const [expanded, setExpanded] = useState(false);
  const [starred, setStarred]   = useState(() => isFavorite(exercise.name));
  const [blocked, setBlocked]   = useState(() => isRestricted(exercise.name));

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-colors ${
      blocked ? "border-[#FDE8E8] opacity-70" : "border-[#E5E2DA]"
    }`}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <span className="text-[9px] text-[#9B9690] mt-1.5 flex-shrink-0">{expanded ? "▼" : "▶"}</span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[#1C1B18] leading-snug">
                {starred && <span className="text-[#B25E1B] mr-1">★</span>}
                {exercise.name}
                {blocked && <span className="ml-1.5 text-[9px] text-[#C0390B] font-semibold">BLOCKED</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-[#9B9690]">{exercise.category}</span>
                <span className="text-[#D8D4CC]">·</span>
                <span className="text-[10px] text-[#9B9690]">{exercise.equipment}</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
              exercise.difficulty === "Beginner"
                ? "bg-[#E1F5EE] text-[#085041]"
                : exercise.difficulty === "Intermediate"
                ? "bg-[#F0EEF8] text-[#534AB7]"
                : "bg-[#FDF6EC] text-[#633806]"
            }`}>
              {exercise.difficulty}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#F0EDE4] pt-3 space-y-3">
          {/* Favourite + restrict toggles */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStarred(toggleFavorite(exercise.name))}
              className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
                starred ? "text-[#B25E1B]" : "text-[#9B9690] hover:text-[#5C5850]"
              }`}
            >
              <span>{starred ? "★" : "☆"}</span>
              <span>{starred ? "Favourited" : "Favourite"}</span>
            </button>
            <RestrictionToggle exerciseName={exercise.name} blocked={blocked} onToggle={setBlocked} />
          </div>

          {/* Muscles */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-1.5">Primary</div>
            <div className="flex flex-wrap gap-1">
              {exercise.primaryMuscles.map(m => <MuscleBadge key={m} label={m} primary />)}
            </div>
          </div>
          {exercise.secondaryMuscles.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-1.5">Secondary</div>
              <div className="flex flex-wrap gap-1">
                {exercise.secondaryMuscles.map(m => <MuscleBadge key={m} label={m} primary={false} />)}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690]">Pattern  </span>
              <span className="text-[10px] text-[#5C5850]">{exercise.movementPattern}</span>
            </div>
            <span className="text-[#D8D4CC]">·</span>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690]">Difficulty  </span>
              <span className="text-[10px] text-[#5C5850]">{exercise.difficulty}</span>
            </div>
          </div>

          {/* Coach's note */}
          <div className="px-2.5 py-2 bg-[#F5F3EE] rounded-lg">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-1">Coach's note</div>
            <p className="text-[10px] text-[#5C5850] leading-relaxed">{exercise.biomechanicalNote}</p>
          </div>

          {/* History */}
          <HistorySection exerciseName={exercise.name} />

          {/* Coaching content */}
          <CoachingSection exerciseName={exercise.name} />
        </div>
      )}
    </div>
  );
}
