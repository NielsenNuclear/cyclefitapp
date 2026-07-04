"use client";

import type { AthleteProfile }      from "@/lib/athlete/athleteProfile";
import type { PersonalBaselines }   from "@/lib/athlete/adaptiveBaselines";
import type { RecoverySignature }   from "@/lib/athlete/recoverySignature";
import type { TrainingFingerprint } from "@/lib/athlete/trainingFingerprint";

// ── Baseline row ───────────────────────────────────────────────────────────

function BaselineRow({
  label,
  value,
  vsPersonal,
}: {
  label:      string;
  value:      string;
  vsPersonal?: "above" | "at" | "below" | "unknown";
}) {
  const arrow =
    vsPersonal === "above" ? { char: "↑", cls: "text-success-text" } :
    vsPersonal === "below" ? { char: "↓", cls: "text-caution-text" } :
    vsPersonal === "at"    ? { char: "→", cls: "text-ink-muted"    } :
    null;

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] text-ink-secondary">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-semibold text-ink">{value}</span>
        {arrow && (
          <span className={`text-[11px] font-bold ${arrow.cls}`}>{arrow.char}</span>
        )}
      </div>
    </div>
  );
}

// ── Fingerprint bar ────────────────────────────────────────────────────────

function BiasBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ink-muted">{label}</span>
        <span className="text-[10px] font-semibold text-ink-secondary">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-subtle overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%`, transition: "width 0.5s cubic-bezier(0,0,0.2,1)" }}
        />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

interface AthleteProfileCardProps {
  profile:    AthleteProfile;
  className?: string;
}

export function AthleteProfileCard({ profile, className = "" }: AthleteProfileCardProps) {
  const { baselines, fingerprint, signature, adaptationInsights } = profile;

  const confidenceLabel =
    profile.profileConfidence >= 70 ? "Established" :
    profile.profileConfidence >= 40 ? "Building" :
    "Just starting";

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <p className="type-micro text-ink-muted mb-1">Athlete Profile</p>
            <p className="text-[15px] font-semibold text-ink">Your training identity</p>
          </div>
          <div className="text-right">
            <p className="type-micro text-ink-muted mb-0.5">Profile confidence</p>
            <p className={`text-[12px] font-semibold ${
              profile.profileConfidence >= 70 ? "text-success-text" :
              profile.profileConfidence >= 40 ? "text-brand-text" :
              "text-ink-muted"
            }`}>{confidenceLabel}</p>
          </div>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Sessions",     value: String(profile.totalSessionsLogged) },
            { label: "Weeks active", value: `${profile.weeksActive}w`           },
            { label: "Avg duration", value: baselines.avgSessionDurationMin > 0 ? `${baselines.avgSessionDurationMin}min` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-raised rounded-xl p-3 text-center border border-border">
              <p className="text-[15px] font-bold text-ink">{value}</p>
              <p className="type-micro text-ink-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Training fingerprint */}
      {fingerprint.dataReady && (
        <div className="px-5 py-4 border-b border-border">
          <p className="type-micro text-ink-muted mb-3">Training style</p>
          <div className="space-y-2.5">
            <BiasBar label="Strength"     value={fingerprint.strengthBias}    color="bg-brand"   />
            <BiasBar label="Hypertrophy"  value={fingerprint.hypertrophyBias} color="bg-success" />
            <BiasBar label="Conditioning" value={fingerprint.conditioningBias} color="bg-caution" />
          </div>
          <p className={`mt-2 text-[11px] font-semibold capitalize ${
            fingerprint.primaryBias === "strength-focused"    ? "text-brand-text" :
            fingerprint.primaryBias === "hypertrophy-focused" ? "text-success-text" :
            fingerprint.primaryBias === "conditioning-focused"? "text-caution-text" :
            "text-ink-muted"
          }`}>
            Primary bias: {fingerprint.primaryBias.replace(/-/g, " ")}
          </p>
        </div>
      )}

      {/* Baselines */}
      {baselines.dataReady && (
        <div className="px-5 py-4 border-b border-border">
          <p className="type-micro text-ink-muted mb-1">Your personal baselines</p>
          <div className="divide-y divide-border/50">
            <BaselineRow
              label="Readiness"
              value={`${baselines.avgReadiness}/100`}
              vsPersonal={baselines.readinessTodayVsBaseline}
            />
            <BaselineRow
              label="Recovery"
              value={`${baselines.avgRecovery}/100`}
              vsPersonal={baselines.recoveryTodayVsBaseline}
            />
            <BaselineRow
              label="Weekly sessions"
              value={`${baselines.avgWeeklyFrequency} / wk`}
            />
            <BaselineRow
              label="Weekly volume"
              value={baselines.avgWeeklyVolumeSets > 0 ? `${baselines.avgWeeklyVolumeSets} sets` : "—"}
            />
          </div>
          <p className="text-[10px] text-ink-muted mt-2">
            Arrows show how today compares to your personal average.
          </p>
        </div>
      )}

      {/* Recovery signature */}
      {signature.dataReady && (
        <div className="px-5 py-4 border-b border-border">
          <p className="type-micro text-ink-muted mb-3">Recovery signature</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Average",    value: `${signature.avgScore}/100`  },
              { label: "Best",       value: `${signature.peakScore}/100` },
              { label: "Stability",  value: signature.stabilityLabel     },
              { label: "Best day",   value: signature.bestDayOfWeek ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-raised rounded-xl p-3 border border-border">
                <p className="text-[13px] font-semibold text-ink capitalize">{value}</p>
                <p className="type-micro text-ink-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adaptation insights */}
      {adaptationInsights.length > 0 && (
        <div className="px-5 py-4">
          <p className="type-micro text-ink-muted mb-3">What Axis has learned</p>
          <div className="space-y-3">
            {adaptationInsights.slice(0, 3).map(insight => (
              <div key={insight.id} className="p-3 bg-surface-raised rounded-xl border border-border">
                <p className="text-[12px] text-ink-secondary leading-snug">{insight.text}</p>
                <p className="text-[11px] text-brand-text mt-1.5 font-medium">{insight.actionable}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
