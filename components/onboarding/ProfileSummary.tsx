"use client";

import { useEffect, useState } from "react";
import type { AdaptiveProfile } from "@/lib/adaptive-profile";
import type { OnboardingData } from "@/lib/onboarding-types";
import { color as tokenColor } from "@/lib/design/tokens";
import { AxisIcon } from "@/components/ui/Icon";

interface ProfileSummaryProps {
  data: OnboardingData;
  profile: AdaptiveProfile;
  onComplete: () => void;
}

// ─── Animated weight bar ──────────────────────────────────────────────────────

function WeightBar({ label, pct, color, delay }: { label: string; pct: number; color: string; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 400);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[11px] text-ink-secondary text-right flex-shrink-0">{label}</div>
      <div className="flex-1 h-[5px] bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: `${width}%`, background: color, transitionDelay: `${delay}ms` }}
        />
      </div>
      <div className="w-8 text-[11px] font-semibold text-ink tabular-nums">{pct}%</div>
    </div>
  );
}

// ─── Score ring with counting animation ──────────────────────────────────────

function BuildingRing({ size = 88 }: { size?: number }) {
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    let frame: number;
    let start: number;
    const duration = 2000;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setAngle(ease * 270);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    const t = setTimeout(() => { frame = requestAnimationFrame(tick); }, 600);
    return () => { clearTimeout(t); cancelAnimationFrame(frame); };
  }, []);

  const r = (size / 2) - 7;
  const circ = 2 * Math.PI * r;
  const offset = circ - (angle / 360) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-brand)" strokeOpacity={0.1} strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-brand)" strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] text-ink-muted">Score builds</span>
        <span className="text-[24px] font-semibold font-serif text-brand">—</span>
        <span className="text-[9px] text-ink-muted">in {7} days</span>
      </div>
    </div>
  );
}

// ─── Main profile summary ─────────────────────────────────────────────────────

export function ProfileSummary({ data, profile, onComplete }: ProfileSummaryProps) {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState(0); // 0=building, 1=revealed

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setStage(1), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const goalLabels: Record<string, string> = {
    build_strength: "Strength", improve_endurance: "Endurance",
    body_composition: "Body composition", improve_performance: "Performance",
    recover_better: "Recovery", understand_my_body: "Awareness",
    stay_consistent: "Consistency",
  };

  // Inline-style color values (not className strings) — this is exactly the
  // documented use case for lib/design/tokens.ts's `color` export.
  const weightColors: Record<string, string> = {
    sleep: tokenColor.brand, energy: tokenColor.success, stress: tokenColor.caution,
    recovery: tokenColor.inkSecondary, cyclePhase: tokenColor.brandBorder,
  };

  return (
    <div
      className={`min-h-screen bg-canvas flex flex-col transition-all duration-slower
        ${visible ? "opacity-100" : "opacity-0"}`}
    >

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-5 h-5 rounded-md bg-brand flex items-center justify-center">
              <AxisIcon name="brand-mark" size={10} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="text-[13px] font-semibold text-ink">Axis</span>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand mb-2">Your adaptive profile</div>
          <h1 className="text-[clamp(1.6rem,5vw,2.2rem)] font-light font-serif text-ink leading-tight">
            {stage === 0 ? "Building your profile…" : "Your profile is ready."}
          </h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="max-w-lg mx-auto space-y-4">

          {/* Score + badge */}
          <div className="bg-surface rounded-2xl border border-border p-5 flex items-center gap-5 shadow-card">
            <BuildingRing size={96} />
            <div className="flex-1">
              <div className="text-[11px] text-ink-muted mb-1.5">
                Readiness score activates after {profile.estimatedDaysToPersonalization} check-ins
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-bg-mid text-brand-text border border-brand-border text-[11px] font-semibold mb-2">
                {profile.trainingBadge}
              </div>
              <div className="text-[12px] text-ink-secondary leading-relaxed">{profile.primaryFocus}</div>
            </div>
          </div>

          {/* Coaching insight */}
          <div className="border-l-2 border-brand pl-4 pr-4 py-3.5 bg-brand-bg-mid rounded-r-xl">
            <div className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AxisIcon name="grid" size={12} strokeWidth={2} />
              Adaptive engine insight
            </div>
            <p className="text-[12px] text-brand-text leading-relaxed italic">"{profile.coachingInsight}"</p>
          </div>

          {/* Readiness weight model */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-4">
              Your readiness model weights
            </div>
            <div className="space-y-3">
              <WeightBar label="Sleep"       pct={profile.readinessWeights.sleep}      color={weightColors.sleep} delay={0} />
              <WeightBar label="Energy"      pct={profile.readinessWeights.energy}     color={weightColors.energy} delay={80} />
              <WeightBar label="Stress"      pct={profile.readinessWeights.stress}     color={weightColors.stress} delay={160} />
              <WeightBar label="Recovery"    pct={profile.readinessWeights.recovery}   color={weightColors.recovery} delay={240} />
              <WeightBar label="Cycle phase" pct={profile.readinessWeights.cyclePhase} color={weightColors.cyclePhase} delay={320} />
            </div>
            <div className="mt-3 pt-3 border-t border-border text-[10px] text-ink-muted leading-relaxed">
              Weights are calibrated to your profile. They evolve as you log more check-ins.
            </div>
          </div>

          {/* Goals */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Training goals</div>
            <div className="flex flex-wrap gap-2">
              {data.goals.map(g => (
                <span key={g} className="px-3 py-1 rounded-full text-[11px] font-medium bg-surface-subtle text-ink-secondary border border-border-strong">
                  {goalLabels[g] ?? g}
                </span>
              ))}
            </div>
          </div>

          {/* Nutrition + recovery */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-surface rounded-xl border border-border p-4 shadow-subtle">
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-lg bg-success-bg flex items-center justify-center text-success flex-shrink-0">
                  <AxisIcon name="leaf" size={13} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-success mb-1">Nutrition approach</div>
                  <div className="text-[12px] text-ink-secondary leading-snug">{profile.nutritionApproach}</div>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border p-4 shadow-subtle">
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-lg bg-brand-bg-mid flex items-center justify-center text-brand flex-shrink-0">
                  <AxisIcon name="moon" size={13} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-brand mb-1">Recovery protocol</div>
                  <div className="text-[12px] text-ink-secondary leading-snug">{profile.recoveryProtocol}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase strategy */}
          <div className="p-4 bg-canvas rounded-xl border border-border">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">Physiological context strategy</div>
            <p className="text-[12px] text-ink-secondary leading-relaxed">{profile.phaseStrategy}</p>
          </div>

          {/* Key signals */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Key signals in your model</div>
            <div className="flex flex-wrap gap-2">
              {profile.keySignals.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-subtle border border-border-strong">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span className="text-[11px] font-medium text-ink-secondary">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What's next */}
          <div className="bg-ink rounded-2xl p-5 text-white">
            <div className="text-[11px] font-semibold text-brand uppercase tracking-wider mb-3">What happens next</div>
            <div className="space-y-3">
              {[
                { num: "1", text: "Complete your first daily check-in tomorrow morning (takes 60 seconds)." },
                { num: "2", text: `After ${profile.estimatedDaysToPersonalization} check-ins, your readiness score activates.` },
                { num: "3", text: "Recommendations personalise progressively — the more you log, the more precise they become." },
              ].map(item => (
                <div key={item.num} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                    {item.num}
                  </div>
                  {/* text-[#D3D1C7]: light-on-dark text with no equivalent token yet —
                      this app has no dark-surface text scale (see DS2Progress.md). Kept
                      as a scoped, documented exception rather than a poor-fit token. */}
                  <p className="text-[12px] text-[#D3D1C7] leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 pt-4 bg-surface border-t border-border">
        <div className="max-w-lg mx-auto">
          {/* Purple-glow pill CTA — a third button treatment alongside Button's
              `primary` and `dark` variants (StepContinueButton). Not consolidated
              in this batch per DS-2 scope (styling adoption only, no consolidation
              decisions); tokenized in place. See DS2Progress.md. */}
          <button
            type="button"
            onClick={onComplete}
            className="w-full py-4 rounded-full text-[15px] font-semibold bg-brand text-white flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(83,74,183,0.3)] hover:shadow-[0_6px_32px_rgba(83,74,183,0.4)] hover:bg-brand/90 transition-all duration-normal hover:-translate-y-0.5"
          >
            Go to my dashboard
            <AxisIcon name="arrow-right" size={16} />
          </button>
          <p className="text-center text-[11px] text-ink-faint mt-3">
            Your profile is saved. You can update any settings from your account.
          </p>
        </div>
      </div>
    </div>
  );
}
