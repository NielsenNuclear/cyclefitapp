"use client";

import type { PersonalizedNutritionProfile } from "@/lib/nutrition/personalNutritionProfile";
import type { NutritionTargets }             from "@/lib/nutrition/nutritionTargets";

// ─── Macro bar ────────────────────────────────────────────────────────────────

interface MacroBarProps {
  label:  string;
  value:  number;
  unit:   string;
  color:  string;
  max:    number;
}

function MacroBar({ label, value, unit, color, max }: MacroBarProps) {
  const pct = Math.round(Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[#6B6560]">{label}</span>
        <span className="text-[11px] font-semibold text-[#1C1B18]">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-[#E8E5DC] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Compliance chip ──────────────────────────────────────────────────────────

const IMPACT_CONFIG = {
  positive:           { label: "↑ Boosts readiness", bg: "#EAF8EF", text: "#1A7A3E" },
  neutral:            { label: "No clear signal",    bg: "#F5F3EE", text: "#6B6560" },
  insufficient_data:  { label: "Learning…",          bg: "#F5F3EE", text: "#9B9690" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface NutritionIntelligenceCardProps {
  profile:          PersonalizedNutritionProfile;
  targets:          NutritionTargets;
  periodizationNote?: string;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function NutritionIntelligenceCard({
  profile,
  targets,
  periodizationNote,
}: NutritionIntelligenceCardProps) {
  if (profile.sampleDays === 0 && profile.confidence === "early") return null;

  return (
    <div className="rounded-2xl border border-[#E8E5DC] bg-white overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-4 py-3 bg-[#EEF1FD] border-b border-[#DDD9F5]">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#534AB7]">
          Nutrition Intelligence
        </p>
        <p className="text-[13px] font-semibold text-[#1C1B18] mt-0.5">
          What Axis has learned
        </p>
      </div>

      <div className="px-4 py-3 space-y-3">

        {/* Today's targets */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9B9690]">
            Today's Targets
          </p>
          <MacroBar label="Calories"   value={targets.calories}        unit=" kcal" color="#534AB7" max={3000} />
          <MacroBar label="Protein"    value={targets.protein}         unit="g"     color="#1A7A3E" max={200}  />
          <MacroBar label="Carbs"      value={targets.carbs}           unit="g"     color="#B35C00" max={400}  />
          <MacroBar label="Fats"       value={targets.fats}            unit="g"     color="#C0392B" max={120}  />
          <MacroBar label="Hydration"  value={targets.hydrationLiters} unit="L"     color="#0A7AC4" max={4}    />
          <MacroBar label="Fiber"      value={targets.fiber}           unit="g"     color="#5C7A1A" max={50}   />
        </div>

        {/* Phase note */}
        {targets.phaseNote && (
          <div className="px-3 py-2 bg-[#F5F3EE] rounded-xl">
            <p className="text-[11px] text-[#6B6560] leading-relaxed">{targets.phaseNote}</p>
          </div>
        )}

        {/* Periodization note */}
        {periodizationNote && (
          <div className="px-3 py-2 bg-[#EEF1FD] rounded-xl border border-[#DDD9F5]">
            <p className="text-[10px] font-bold text-[#534AB7] mb-0.5">Training Block</p>
            <p className="text-[11px] text-[#534AB7] leading-relaxed">{periodizationNote}</p>
          </div>
        )}

        {/* Learned patterns */}
        {profile.sampleDays >= 7 && (
          <div className="pt-2 border-t border-[#F0EDE4] space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9B9690]">
              What Axis Has Learned · {profile.sampleDays} days
            </p>

            {/* Protein vs readiness */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6B6560]">Protein → Readiness</span>
              {(() => {
                const cfg = IMPACT_CONFIG[profile.proteinImpact];
                return (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: cfg.bg, color: cfg.text }}
                  >
                    {cfg.label}
                  </span>
                );
              })()}
            </div>

            {/* Hydration vs readiness */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6B6560]">Hydration → Readiness</span>
              {(() => {
                const cfg = IMPACT_CONFIG[profile.hydrationImpact];
                return (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: cfg.bg, color: cfg.text }}
                  >
                    {cfg.label}
                  </span>
                );
              })()}
            </div>

            <p className="text-[11px] text-[#6B6560] leading-relaxed">{profile.primaryInsight}</p>
          </div>
        )}

        {/* Recommendations */}
        {profile.recommendations.length > 0 && (
          <div className="pt-2 border-t border-[#F0EDE4] space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9B9690]">
              Personalised Nudges
            </p>
            {profile.recommendations.map((r, i) => (
              <div key={i} className="flex gap-2 text-[11px] text-[#6B6560] leading-relaxed">
                <span className="text-[#534AB7] shrink-0">·</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
