"use client";
import { useState, useEffect } from "react";

interface RestTimerOverlayProps {
  totalSeconds:  number;
  exerciseName?: string;
  onDismiss:     () => void;
}

export function RestTimerOverlay({ totalSeconds, exerciseName, onDismiss }: RestTimerOverlayProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (remaining <= 0) { onDismiss(); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onDismiss]);

  const pct    = Math.max(0, remaining / totalSeconds);
  const mins   = Math.floor(remaining / 60);
  const secs   = remaining % 60;
  const display = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`;

  const R    = 20;
  const CIRC = 2 * Math.PI * R;

  return (
    <div
      className="fixed bottom-6 inset-x-0 flex justify-center z-50 pointer-events-none px-4"
      aria-live="polite"
    >
      <div
        className="pointer-events-auto flex items-center gap-4 px-5 py-3.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.16)] border border-[#EAE7DE]/70"
        style={{
          background:           "rgba(253,252,249,0.96)",
          backdropFilter:       "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          minWidth:             260,
          maxWidth:             360,
        }}
      >
        {/* Countdown ring */}
        <div className="relative w-11 h-11 flex-shrink-0">
          <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" r={R} fill="none" stroke="#EAE7DE" strokeWidth="3.5" />
            <circle
              cx="24" cy="24" r={R} fill="none"
              stroke="#534AB7" strokeWidth="3.5"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - pct)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold text-[#534AB7] tabular-nums leading-none">{display}</span>
          </div>
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-0.5">
            Resting
          </div>
          {exerciseName && (
            <div className="text-[12px] font-medium text-[#1C1B18] truncate">{exerciseName}</div>
          )}
        </div>

        {/* Skip */}
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 text-[11px] font-semibold text-[#534AB7] hover:text-[#3C3489] bg-[#F0EEF8] hover:bg-[#E3E0F8] px-3 py-1.5 rounded-full transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
