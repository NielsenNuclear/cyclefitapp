"use client";

import type { PersonalRecoveryProfile } from "@/lib/recovery/personalRecoveryProfile";
import type { RecoveryBank }             from "@/lib/recovery/recoveryBank";
import type { RecoveryOutlook }          from "@/lib/recovery/recoveryOutlook";

// ─── Bank balance bar ─────────────────────────────────────────────────────────

const TREND_CONFIG = {
  building:  { color: "#1A7A3E", label: "Building" },
  stable:    { color: "#534AB7", label: "Stable" },
  depleting: { color: "#B35C00", label: "Depleting" },
};

function BankBar({ bank }: { bank: RecoveryBank }) {
  const cfg   = TREND_CONFIG[bank.trend];
  const width = `${bank.balance}%`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[#6B6560]">Resilience reserves</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#1C1B18]">{bank.balance}/100</span>
          <span
            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
            style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
      </div>
      <div className="h-2 bg-[#EAE7DE] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width, backgroundColor: cfg.color }}
        />
      </div>
      {(bank.goodSleepStreak > 2 || bank.lowStressStreak > 2) && (
        <div className="flex gap-2 mt-1.5">
          {bank.goodSleepStreak > 2 && (
            <span className="text-[10px] text-[#1A7A3E]">
              {bank.goodSleepStreak}d good sleep streak
            </span>
          )}
          {bank.lowStressStreak > 2 && (
            <span className="text-[10px] text-[#1A7A3E]">
              {bank.lowStressStreak}d low stress streak
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 7-day outlook row ────────────────────────────────────────────────────────

const FORECAST_CONFIG = {
  high:     { color: "#1A7A3E", bg: "#EAF8EF" },
  moderate: { color: "#534AB7", bg: "#EEF1FD" },
  low:      { color: "#B35C00", bg: "#FFF3E8" },
};

function OutlookRow({ outlook }: { outlook: RecoveryOutlook }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#9B9690]">
          7-Day Outlook
        </p>
        <span className="text-[10px] text-[#9B9690]">
          {outlook.overallTrend === "improving" ? "↑ Improving" :
           outlook.overallTrend === "declining" ? "↓ Declining" : "→ Stable"}
        </span>
      </div>
      <div className="flex gap-1">
        {outlook.days.map(d => {
          const cfg = FORECAST_CONFIG[d.forecast];
          return (
            <div key={d.date} className="flex-1 text-center">
              <div
                className="rounded-lg py-1.5 mb-0.5"
                style={{ backgroundColor: cfg.bg }}
              >
                <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>
                  {d.score}
                </span>
              </div>
              <span className="text-[9px] text-[#9B9690]">{d.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-[#6B6560] mt-1.5 leading-relaxed">{outlook.summaryNote}</p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PersonalRecoveryCardProps {
  profile:  PersonalRecoveryProfile;
  bank:     RecoveryBank;
  outlook:  RecoveryOutlook;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function PersonalRecoveryCard({ profile, bank, outlook }: PersonalRecoveryCardProps) {
  return (
    <div className="rounded-2xl border border-[#EAE7DE] bg-white overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-4 py-3 bg-[#EAF8EF] border-b border-[#C3E8D0]">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A7A3E]">
          Recovery Intelligence
        </p>
        <p className="text-[13px] font-semibold text-[#1C1B18] mt-0.5">
          Your Personal Recovery Profile
        </p>
      </div>

      <div className="px-4 py-3 space-y-4">

        {/* Recovery bank */}
        <BankBar bank={bank} />
        <p className="text-[11px] text-[#6B6560] leading-relaxed -mt-1">{bank.note}</p>

        {/* 7-day outlook */}
        <div className="pt-2 border-t border-[#F0EDE4]">
          <OutlookRow outlook={outlook} />
        </div>

        {/* What supports recovery */}
        {profile.optimalConditions.length > 0 && (
          <div className="pt-2 border-t border-[#F0EDE4]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9B9690] mb-1.5">
              What Supports Your Recovery
            </p>
            <div className="space-y-1">
              {profile.optimalConditions.map((c, i) => (
                <div key={i} className="flex gap-2 text-[11px] text-[#6B6560] leading-relaxed">
                  <span className="text-[#1A7A3E] shrink-0">·</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top strategies */}
        {profile.topStrategies.length > 0 && profile.topStrategies[0] !== "Keep logging recovery strategies to discover what works for you" && (
          <div className="pt-2 border-t border-[#F0EDE4]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9B9690] mb-1.5">
              Most Effective Strategies
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.topStrategies.map(s => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF8EF] text-[#1A7A3E]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recovery bottleneck */}
        {profile.recoveryBottleneck && (
          <div className="pt-2 border-t border-[#F0EDE4]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9B9690] mb-1">
              Main Recovery Lever
            </p>
            <p className="text-[11px] text-[#6B6560] leading-relaxed">{profile.recoveryBottleneck}</p>
          </div>
        )}

        {/* Capacity insight */}
        {profile.confidence !== "early" && (
          <div className="pt-2 border-t border-[#F0EDE4]">
            <p className="text-[11px] text-[#6B6560] leading-relaxed">{profile.capacityInsight}</p>
          </div>
        )}

      </div>
    </div>
  );
}
