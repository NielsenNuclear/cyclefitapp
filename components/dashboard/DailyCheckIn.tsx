"use client";

import { useState } from "react";
import type { CheckinData } from "@/lib/checkin";
import { getTodayCheckin, saveTodayCheckin } from "@/lib/checkin";

interface DailyCheckInProps {
  onComplete:         (data: CheckinData) => void;
  lowReadinessAlert?: boolean;
}

const SLEEP_OPTIONS: { value: CheckinData["sleepQuality"]; label: string }[] = [
  { value: "excellent", label: "Excellent" },
  { value: "good",      label: "Good"      },
  { value: "variable",  label: "Variable"  },
  { value: "poor",      label: "Poor"      },
];

export function DailyCheckIn({ onComplete, lowReadinessAlert = false }: DailyCheckInProps) {
  const [priorCheckin] = useState<CheckinData | null>(() => getTodayCheckin());
  const [isEditing, setIsEditing] = useState(false);
  const [sleepQuality, setSleepQuality] = useState<CheckinData["sleepQuality"] | null>(null);
  const [stressLevel, setStressLevel] = useState(5);

  function handleEdit() {
    if (priorCheckin) {
      setSleepQuality(priorCheckin.sleepQuality);
      setStressLevel(priorCheckin.stressLevel);
    }
    setIsEditing(true);
  }

  if (priorCheckin && !isEditing) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5DC] px-5 py-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)] flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-[#E1F5EE] border border-[#A3DCCA] flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-[#1C1B18]">Checked in for today</div>
          <div className="text-[11px] text-[#9B9690]">
            Sleep: {priorCheckin.sleepQuality} · Stress: {priorCheckin.stressLevel}/10
          </div>
        </div>
        <button
          type="button"
          onClick={handleEdit}
          className="flex-shrink-0 text-[11px] font-semibold text-[#534AB7] hover:text-[#3C3489] transition-colors"
        >
          Edit
        </button>
      </div>
    );
  }

  function handleSubmit() {
    if (!sleepQuality) return;
    const data: CheckinData = {
      sleepQuality,
      stressLevel,
      date: new Date().toISOString().slice(0, 10),
    };
    saveTodayCheckin(data);
    onComplete(data);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
        Daily Check-In
      </div>

      <h3
        className="text-[1.1rem] font-light text-[#1C1B18] leading-snug mb-4"
        style={{ fontFamily: "'Lora', Georgia, serif" }}
      >
        How are you feeling today?
      </h3>

      {/* Low-readiness contextual nudge */}
      {lowReadinessAlert && (
        <div className="mb-4 p-3 bg-[#FDF6EC] rounded-xl border border-[#E8C98A]">
          <p className="text-[11px] text-[#633806] leading-relaxed">
            Yesterday&apos;s readiness was in the cautious range. Sleep and stress carry the most
            weight in the model — taking a moment to reflect before selecting may improve
            today&apos;s recommendations.
          </p>
        </div>
      )}

      {/* Sleep quality */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-2">
          Sleep last night
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SLEEP_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSleepQuality(value)}
              className={`py-2 rounded-xl text-[11px] font-semibold border transition-colors ${
                sleepQuality === value
                  ? "bg-[#EEEDFE] text-[#3C3489] border-[#C9C5EE]"
                  : "bg-[#F1EFE8] text-[#5C5850] border-[#E0DDD4] hover:bg-[#EEEDFE] hover:text-[#3C3489] hover:border-[#C9C5EE]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stress level */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9690]">
            Stress level
          </div>
          <div className="text-[13px] font-semibold text-[#1C1B18]">
            {stressLevel}
            <span className="text-[#9B9690] font-normal">/10</span>
          </div>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={stressLevel}
          onChange={(e) => setStressLevel(Number(e.target.value))}
          className="w-full accent-[#534AB7] cursor-pointer"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#9B9690]">Low</span>
          <span className="text-[10px] text-[#9B9690]">High</span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!sleepQuality}
        className={`w-full py-3 rounded-xl text-[13px] font-semibold transition-colors ${
          sleepQuality
            ? "bg-[#534AB7] text-white hover:bg-[#3C3489]"
            : "bg-[#F1EFE8] text-[#C8C5BC] cursor-not-allowed"
        }`}
      >
        Update today&apos;s recommendations
      </button>

      {!sleepQuality && (
        <p className="text-center text-[11px] text-[#9B9690] mt-2">
          Select your sleep quality to continue
        </p>
      )}
    </div>
  );
}
