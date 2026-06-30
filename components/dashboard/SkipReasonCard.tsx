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
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div>
        <h3 className="text-sm font-semibold text-[#1C1B18]">Why did you skip?</h3>
        <p className="text-[11px] text-[#9B9690] mt-0.5">
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
                ? "bg-[#EEEDFE] border-[#C4C0EE] text-[#3C3489]"
                : "bg-[#F1EFE8] border-[#EAE7DE] text-[#5C5850] hover:bg-[#E8E5DE] hover:text-[#1C1B18]"
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
          className="px-4 py-2.5 rounded-xl text-sm text-[#6B6860] hover:text-[#1C1B18] transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
