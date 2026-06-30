"use client";

import { useState } from "react";
import type { RecoveryRating, PerformanceRating, WorkoutFeedback } from "@/lib/workoutExecution/feedback";
import { saveWorkoutFeedback, getWorkoutFeedback } from "@/lib/workoutExecution/feedback";

// ─── Option data ──────────────────────────────────────────────────────────────

const RECOVERY_OPTIONS: { value: RecoveryRating; label: string }[] = [
  { value: "fully_recovered",    label: "Fully recovered"   },
  { value: "slight_fatigue",     label: "Slight fatigue"    },
  { value: "moderate_fatigue",   label: "Moderate fatigue"  },
  { value: "significant_fatigue", label: "Significant fatigue" },
];

const PERFORMANCE_OPTIONS: { value: PerformanceRating; label: string }[] = [
  { value: "better",   label: "Better than expected" },
  { value: "expected", label: "As expected"          },
  { value: "worse",    label: "Worse than expected"  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-semibold text-[#1C1B18] mb-2">{children}</div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick:  () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 rounded-xl text-[11px] font-semibold border transition-colors text-center ${
        selected
          ? "bg-[#EEEDFE] text-[#3C3489] border-[#C9C5EE]"
          : "bg-[#F5F3EE] text-[#5C5850] border-[#E0DDD4] hover:border-[#A09C94]"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface WorkoutFeedbackCardProps {
  date:         string;  // YYYY-MM-DD — must match the logged workout
  onComplete?:  (feedback: WorkoutFeedback) => void;
}

export function WorkoutFeedbackCard({ date, onComplete }: WorkoutFeedbackCardProps) {
  const [submitted, setSubmitted] = useState<boolean>(
    () => typeof window !== "undefined" && getWorkoutFeedback(date) !== null
  );

  const [sessionRPE,        setSessionRPE]        = useState<number>(5);
  const [recoveryRating,    setRecoveryRating]    = useState<RecoveryRating | null>(null);
  const [performanceRating, setPerformanceRating] = useState<PerformanceRating | null>(null);

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-[#EAE7DE] px-5 py-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)] flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-[#E1F5EE] border border-[#A3DCCA] flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[#1C1B18]">Session feedback saved</div>
          <div className="text-[11px] text-[#9B9690]">Used to improve future recommendations</div>
        </div>
      </div>
    );
  }

  const canSubmit = recoveryRating !== null && performanceRating !== null;

  function handleSubmit() {
    if (!canSubmit) return;
    const feedback: WorkoutFeedback = {
      id:                date,
      date,
      sessionRPE,
      recoveryRating:    recoveryRating!,
      performanceRating: performanceRating!,
      savedAt:           new Date().toISOString(),
    };
    saveWorkoutFeedback(feedback);
    setSubmitted(true);
    onComplete?.(feedback);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Session feedback</CardLabel>

      {/* Session RPE */}
      <div className="mb-5">
        <SectionTitle>How difficult was today's workout?</SectionTitle>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[#9B9690]">Effort level</span>
          <span className="text-[13px] font-semibold text-[#1C1B18]">
            {sessionRPE}<span className="text-[#9B9690] font-normal">/10</span>
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={sessionRPE}
          onChange={e => setSessionRPE(Number(e.target.value))}
          className="w-full accent-[#534AB7] cursor-pointer"
        />
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-[#9B9690]">Very easy</span>
          <span className="text-[10px] text-[#9B9690]">Maximal effort</span>
        </div>
      </div>

      {/* Recovery rating */}
      <div className="mb-5">
        <SectionTitle>How recovered do you feel?</SectionTitle>
        <div className="flex flex-col gap-2">
          {RECOVERY_OPTIONS.map(opt => (
            <OptionButton
              key={opt.value}
              selected={recoveryRating === opt.value}
              onClick={() => setRecoveryRating(opt.value)}
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </div>

      {/* Performance rating */}
      <div className="mb-5">
        <SectionTitle>How was your performance today?</SectionTitle>
        <div className="flex gap-2">
          {PERFORMANCE_OPTIONS.map(opt => (
            <OptionButton
              key={opt.value}
              selected={performanceRating === opt.value}
              onClick={() => setPerformanceRating(opt.value)}
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-3 rounded-xl text-[13px] font-semibold transition-colors ${
          canSubmit
            ? "bg-[#534AB7] text-white hover:bg-[#3C3489]"
            : "bg-[#F1EFE8] text-[#C8C5BC] cursor-not-allowed"
        }`}
      >
        Save feedback
      </button>
      {!canSubmit && (
        <p className="text-center text-[11px] text-[#9B9690] mt-2">
          Select recovery and performance to continue
        </p>
      )}
    </div>
  );
}
