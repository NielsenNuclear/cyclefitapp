"use client";

import { useState } from "react";
import { SKIP_REASONS, type SkipReason } from "@/lib/adherence/skipReasonStore";

interface Props {
  date:       string;
  onComplete: (reason: SkipReason) => void;
  onDismiss:  () => void;
}

export function SkipReasonCard({ date: _date, onComplete, onDismiss }: Props) {
  const [selected, setSelected] = useState<SkipReason | null>(null);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Why did you skip?</h3>
        <p className="text-[11px] text-white/45 mt-0.5">
          This helps Axis learn when to offer you a shorter session.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SKIP_REASONS.map(reason => (
          <button
            key={reason}
            onClick={() => setSelected(reason)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selected === reason
                ? "bg-violet-500/30 border-violet-400/60 text-violet-200"
                : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            {reason}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            if (selected) onComplete(selected);
          }}
          disabled={!selected}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-violet-500 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/70 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
