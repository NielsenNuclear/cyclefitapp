"use client";

/**
 * ExerciseIntelligencePanel — Phase 60
 *
 * Exercise tab for the Body Intelligence viewer.
 * Shows: smart insights, today's workout integration, grouped exercise cards
 * with equipment availability, and substitution suggestions.
 *
 * Future extensions slot into ExerciseFutureExtensions without altering this
 * component's interface (Phase 61: videos, Phase 62: technique, etc.).
 */

import { useState } from "react";
import type { MuscleRecord }        from "@/lib/bodyIntelligence/BodyStateEngine";
import type {
  EnrichedExercise,
  ExerciseIntelligenceGroup,
  TodayScheduledExercise,
  MuscleInsight,
  InsightType,
}                                   from "@/lib/bodyIntelligence/exerciseIntelligence";
import type { Exercise }            from "@/lib/exercises/exerciseLibrary";
import { useExerciseIntelligence }  from "../hooks/useExerciseIntelligence";

// ─── Small design primitives ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9B9690] px-5 pt-5 pb-2">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[#F0EDE4] mx-5" />;
}

const DIFFICULTY_STYLE: Record<string, { bg: string; text: string }> = {
  Beginner:     { bg: "#E8F5F0", text: "#0A4D3B" },
  Intermediate: { bg: "#EEF0FC", text: "#3C3489" },
  Advanced:     { bg: "#FDF3F2", text: "#5C1A14" },
};

function DifficultyBadge({ level }: { level: string }) {
  const s = DIFFICULTY_STYLE[level] ?? { bg: "#F1EFE8", text: "#6B6860" };
  return (
    <span
      className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.text }}
    >
      {level}
    </span>
  );
}

function PatternTag({ label }: { label: string }) {
  return (
    <span className="text-[10px] text-[#9B9690] bg-[#F5F3EE] px-1.5 py-0.5 rounded">
      {label}
    </span>
  );
}

// ─── Insight banner ───────────────────────────────────────────────────────────

const INSIGHT_STYLE: Record<InsightType, { bg: string; border: string; titleColor: string; bodyColor: string }> = {
  positive: { bg: "#F0FBF7", border: "#A8E0CE", titleColor: "#0A4D3B", bodyColor: "#0F6E56" },
  info:     { bg: "#EEF0FC", border: "#C4C1F5", titleColor: "#3C3489", bodyColor: "#4B4299" },
  warning:  { bg: "#FAEEDA", border: "#E4C88A", titleColor: "#633806", bodyColor: "#7A5A1A" },
  alert:    { bg: "#FDF3F2", border: "#F5C6C1", titleColor: "#5C1A14", bodyColor: "#7C2A1E" },
};

function InsightBanner({ insight }: { insight: MuscleInsight }) {
  const s = INSIGHT_STYLE[insight.type];
  return (
    <div
      className="rounded-2xl px-4 py-3 border"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <div className="text-[11px] font-semibold mb-0.5" style={{ color: s.titleColor }}>
        {insight.title}
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: s.bodyColor }}>
        {insight.body}
      </p>
    </div>
  );
}

// ─── Today's workout section ──────────────────────────────────────────────────

function TodaySection({ exercises }: { exercises: TodayScheduledExercise[] }) {
  if (exercises.length === 0) return null;

  return (
    <div>
      <SectionLabel>In Today's Session</SectionLabel>
      <div className="px-5 space-y-2">
        {exercises.map((ex, i) => (
          <div
            key={i}
            className="rounded-xl border px-4 py-3"
            style={{ background: "#EEEDFE", borderColor: "#C4C1F5" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-[12px] text-[#3C3489] leading-snug">{ex.name}</div>
              <span
                className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#534AB7", color: "white" }}
              >
                #{ex.orderIndex}
              </span>
            </div>
            <div className="flex gap-3 mt-1.5 text-[11px] text-[#4B4299]">
              <span>{ex.sets} sets · {ex.reps}</span>
              {ex.rpe !== undefined && <span>RPE {ex.rpe}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Exercise detail drawer (expanded view) ───────────────────────────────────

interface DetailDrawerProps {
  enriched: EnrichedExercise;
  onBack:   () => void;
}

function ExerciseDetailDrawer({ enriched, onBack }: DetailDrawerProps) {
  const { exercise: ex, isAvailable, substitute, isScheduledToday, todayEntry } = enriched;

  return (
    <div className="pb-8">
      {/* Back row */}
      <div
        className="flex items-center gap-2 px-5 py-3 border-b border-[#F0EDE4] cursor-pointer"
        onClick={onBack}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="#9B9690" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        <span className="text-[11px] text-[#9B9690]">Back to exercises</span>
      </div>

      <div className="px-5 pt-4">
        <h3 className="text-[15px] font-semibold text-[#1C1B18] leading-snug">{ex.name}</h3>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <DifficultyBadge level={ex.difficulty} />
          <PatternTag label={ex.movementPattern} />
        </div>

        {/* Equipment availability */}
        <div
          className="mt-3 px-3 py-2.5 rounded-xl border text-[11px] flex items-center gap-2"
          style={{
            background:   isAvailable ? "#F0FBF7" : "#FDF3F2",
            borderColor:  isAvailable ? "#A8E0CE" : "#F5C6C1",
          }}
        >
          <span style={{ color: isAvailable ? "#0F6E56" : "#C0392B" }}>
            {isAvailable ? "✓" : "✗"}
          </span>
          <span style={{ color: isAvailable ? "#0A4D3B" : "#5C1A14", fontWeight: 500 }}>
            {ex.equipment}
          </span>
        </div>

        {/* Substitute */}
        {!isAvailable && substitute && (
          <div className="mt-2 px-3 py-2.5 rounded-xl border border-[#EAE7DE] bg-[#F5F3EE] text-[11px]">
            <span className="text-[#9B9690]">Best substitute: </span>
            <span className="font-medium text-[#1C1B18]">{substitute.name}</span>
            <span className="text-[#9B9690] ml-1">({substitute.equipment})</span>
          </div>
        )}

        {/* Today's entry */}
        {isScheduledToday && todayEntry && (
          <>
            <SectionLabel>Today's Prescription</SectionLabel>
            <div className="rounded-xl border px-4 py-3" style={{ background: "#EEEDFE", borderColor: "#C4C1F5" }}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[18px] font-bold text-[#3C3489]">{todayEntry.sets}</div>
                  <div className="text-[10px] text-[#9B9690]">Sets</div>
                </div>
                <div>
                  <div className="text-[15px] font-bold text-[#3C3489]">{todayEntry.reps}</div>
                  <div className="text-[10px] text-[#9B9690]">Reps</div>
                </div>
                {todayEntry.rpe !== undefined && (
                  <div>
                    <div className="text-[18px] font-bold text-[#3C3489]">{todayEntry.rpe}</div>
                    <div className="text-[10px] text-[#9B9690]">RPE</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Muscles */}
      <SectionLabel>Muscles</SectionLabel>
      <div className="px-5 space-y-1.5">
        {ex.primaryMuscles.length > 0 && (
          <div>
            <div className="text-[10px] text-[#9B9690] mb-1">Primary</div>
            <div className="flex flex-wrap gap-1">
              {ex.primaryMuscles.map(m => (
                <span key={m} className="text-[11px] bg-[#EEEDFE] text-[#3C3489] px-2 py-0.5 rounded-full">{m}</span>
              ))}
            </div>
          </div>
        )}
        {ex.secondaryMuscles.length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] text-[#9B9690] mb-1">Secondary</div>
            <div className="flex flex-wrap gap-1">
              {ex.secondaryMuscles.map(m => (
                <span key={m} className="text-[11px] bg-[#F5F3EE] text-[#6B6860] px-2 py-0.5 rounded-full">{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Coaching note */}
      {ex.biomechanicalNote && (
        <>
          <SectionLabel>Coaching Note</SectionLabel>
          <div className="mx-5 px-4 py-3 bg-[#F5F3EE] rounded-xl">
            <p className="text-[11px] text-[#6B6860] leading-relaxed">{ex.biomechanicalNote}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Exercise card ────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  enriched: EnrichedExercise;
  onExpand: (e: EnrichedExercise) => void;
}

function ExerciseCard({ enriched, onExpand }: ExerciseCardProps) {
  const { exercise: ex, isAvailable, substitute, isScheduledToday, todayEntry } = enriched;

  const borderColor = isScheduledToday ? "#C4C1F5" : isAvailable ? "#EAE7DE" : "#E8E5DC";
  const bgColor     = isScheduledToday ? "#EEEDFE" : "white";
  const nameColor   = isScheduledToday ? "#3C3489" : isAvailable ? "#1C1B18" : "#9B9690";

  return (
    <button
      onClick={() => onExpand(enriched)}
      className="w-full text-left rounded-xl border px-4 py-3 transition-colors hover:bg-[#F5F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7]"
      style={{ background: bgColor, borderColor }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-semibold leading-snug" style={{ color: nameColor }}>
          {ex.name}
          {isScheduledToday && (
            <span
              className="ml-2 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded align-middle"
              style={{ background: "#534AB7", color: "white" }}
            >
              Today
            </span>
          )}
        </span>
        <DifficultyBadge level={ex.difficulty} />
      </div>

      {/* Pattern + equipment row */}
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <PatternTag label={ex.movementPattern} />
        <span className="text-[10px]" style={{ color: isAvailable ? "#0F6E56" : "#C0392B" }}>
          {isAvailable ? "✓" : "✗"} {ex.equipment}
        </span>
      </div>

      {/* Today's prescription */}
      {isScheduledToday && todayEntry && (
        <div className="mt-2 text-[11px] text-[#4B4299] font-medium">
          {todayEntry.sets} sets · {todayEntry.reps}
          {todayEntry.rpe !== undefined && ` · RPE ${todayEntry.rpe}`}
        </div>
      )}

      {/* Substitute hint */}
      {!isAvailable && substitute && (
        <div className="mt-1.5 text-[10px] text-[#9B9690]">
          → {substitute.name}
        </div>
      )}
    </button>
  );
}

// ─── Exercise group section ───────────────────────────────────────────────────

interface GroupSectionProps {
  group:    ExerciseIntelligenceGroup;
  onExpand: (e: EnrichedExercise) => void;
}

function GroupSection({ group, onExpand }: GroupSectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 pt-5 pb-2 focus-visible:outline-none"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9B9690]">
          {group.label}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="#C8C5BC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 space-y-1.5">
          {group.exercises.map((e, i) => (
            <ExerciseCard key={i} enriched={e} onExpand={onExpand} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Equipment notice ─────────────────────────────────────────────────────────

function NoEquipmentNotice() {
  return (
    <div className="mx-5 mt-4 bg-[#F5F3EE] border border-[#EAE7DE] rounded-2xl px-4 py-3.5">
      <p className="text-[11px] text-[#6B6860] leading-relaxed">
        Set up your equipment in Profile to filter exercises to what you can actually perform.
        All exercises are shown when no equipment is configured.
      </p>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export interface ExerciseIntelligencePanelProps {
  muscle: MuscleRecord;
}

export function ExerciseIntelligencePanel({ muscle }: ExerciseIntelligencePanelProps) {
  const { groups, todayExercises, insights, userEquipment, isLoading } =
    useExerciseIntelligence(muscle);

  // Navigation state: null = list view; exercise = detail view
  const [expanded, setExpanded] = useState<EnrichedExercise | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Exercise detail view ─────────────────────────────────────────────────────

  if (expanded) {
    return (
      <ExerciseDetailDrawer
        enriched={expanded}
        onBack={() => setExpanded(null)}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────

  const topInsights = insights.slice(0, 2);

  return (
    <div className="pb-8">
      {/* Smart insights */}
      {topInsights.length > 0 && (
        <div className="px-5 pt-4 space-y-2">
          {topInsights.map(ins => (
            <InsightBanner key={ins.id} insight={ins} />
          ))}
        </div>
      )}

      {/* Equipment notice when no equipment configured */}
      {userEquipment.length === 0 && <NoEquipmentNotice />}

      {/* Today's workout exercises for this muscle */}
      <TodaySection exercises={todayExercises} />

      {/* Grouped exercise library */}
      {groups.length > 0 ? (
        <>
          {topInsights.length > 0 || todayExercises.length > 0 ? <Divider /> : null}
          {groups.map(g => (
            <GroupSection
              key={g.id}
              group={g}
              onExpand={setExpanded}
            />
          ))}
        </>
      ) : (
        <p className="px-5 pt-5 text-[12px] text-[#9B9690]">
          No exercises found for this muscle group.
        </p>
      )}
    </div>
  );
}
