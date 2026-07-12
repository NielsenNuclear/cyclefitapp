"use client";

// ─── components/workout/RestScreen.tsx ────────────────────────────────────────
// Phase UX-1 — full rest-period experience.
// Larger, more prominent than RestTimerOverlay; shows the next exercise.

import { useState, useEffect } from "react";

interface RestScreenProps {
  totalSeconds:     number;
  nextExerciseName: string | null; // null if this was the last set of the workout
  onDismiss:        () => void;
  onExtend?:        () => void;
}

const EXTEND_SECONDS = 30;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0
    ? `${m}:${String(s).padStart(2, "0")}`
    : `${s}`;
}

export function RestScreen({ totalSeconds, nextExerciseName, onDismiss, onExtend }: RestScreenProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [extended,  setExtended]  = useState(false);

  useEffect(() => {
    if (remaining <= 0) { onDismiss(); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onDismiss]);

  function handleExtend() {
    setRemaining(r => r + EXTEND_SECONDS);
    setExtended(true);
    onExtend?.();
  }

  const pct  = Math.max(0, remaining / (extended ? totalSeconds + EXTEND_SECONDS : totalSeconds));
  const R    = 48;
  const CIRC = 2 * Math.PI * R;
  const mins = Math.floor(remaining / 60);
  const unit = mins > 0 ? "min" : "sec";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center"
      role="timer"
      aria-live="polite"
      aria-label={`Rest timer: ${remaining} seconds remaining`}
    >
      {/* Backdrop tap to dismiss */}
      <button
        type="button"
        className="absolute inset-0 -top-[100vh]"
        onClick={onDismiss}
        aria-label="Skip rest"
        tabIndex={-1}
      />

      <div
        className="relative w-full max-w-md mx-auto rounded-t-3xl border border-[#EAE7DE]/60 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] px-8 pt-8 pb-10"
        style={{
          background:           "rgba(253,252,249,0.98)",
          backdropFilter:       "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Drag handle */}
        <div className="absolute top-3 inset-x-0 flex justify-center">
          <div className="w-9 h-1 rounded-full bg-[#E0DDD4]" />
        </div>

        {/* Label */}
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9B9690] text-center mb-6">
          Rest
        </p>

        {/* Ring timer */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 112 112" className="w-full h-full -rotate-90">
              <circle cx="56" cy="56" r={R} fill="none" stroke="#EAE7DE" strokeWidth="5" />
              <circle
                cx="56" cy="56" r={R}
                fill="none"
                stroke="#534AB7"
                strokeWidth="5"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - pct)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[36px] font-bold text-[#1C1B18] tabular-nums leading-none">
                {formatTime(remaining)}
              </span>
              <span className="text-[11px] text-[#9B9690] mt-0.5">{unit}</span>
            </div>
          </div>
        </div>

        {/* Next exercise preview */}
        {nextExerciseName && (
          <div className="flex items-center gap-2 px-4 py-3 bg-[#F5F3EE] rounded-2xl mb-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9B9690] flex-shrink-0">
              Up next
            </span>
            <span className="text-[13px] font-semibold text-[#1C1B18] leading-snug truncate">
              {nextExerciseName}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!extended && (
            <button
              type="button"
              onClick={handleExtend}
              className="flex-1 py-3 rounded-2xl bg-[#F5F3EE] text-[#5C5850] text-[13px] font-semibold border border-[#E0DDD4] hover:border-[#A09C94] transition-colors"
            >
              +{EXTEND_SECONDS}s
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-3 rounded-2xl bg-[#534AB7] text-white text-[13px] font-semibold hover:bg-[#3C3489] transition-colors"
          >
            Skip rest
          </button>
        </div>
      </div>
    </div>
  );
}
