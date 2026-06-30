"use client";

import { useEffect, useState } from "react";
import type { AdaptiveProfile } from "@/lib/adaptive-profile";
import type { OnboardingData } from "@/lib/onboarding-types";

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
      <div className="w-24 text-[11px] text-[#6B6860] text-right flex-shrink-0">{label}</div>
      <div className="flex-1 h-[5px] bg-[#F0EDE4] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: `${width}%`, background: color, transitionDelay: `${delay}ms` }}
        />
      </div>
      <div className="w-8 text-[11px] font-semibold text-[#1C1B18] tabular-nums">{pct}%</div>
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(83,74,183,0.10)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#534AB7" strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] text-[#8A8880]">Score builds</span>
        <span className="text-[24px] font-semibold text-[#534AB7]" style={{ fontFamily: "'DM Serif Display', serif" }}>—</span>
        <span className="text-[9px] text-[#8A8880]">in {7} days</span>
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

  const weightColors: Record<string, string> = {
    sleep: "#534AB7", energy: "#0F6E56", stress: "#854F0B",
    recovery: "#5F5E5A", cyclePhase: "#C4C0EE",
  };

  return (
    <div
      className={`min-h-screen bg-[#FAF9F6] flex flex-col transition-all duration-500
        ${visible ? "opacity-100" : "opacity-0"}`}
    >

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-5 h-5 rounded-md bg-[#534AB7] flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-[#1C1B18]">Axis</span>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#534AB7] mb-2">Your adaptive profile</div>
          <h1
            className="text-[clamp(1.6rem,5vw,2.2rem)] font-light text-[#1C1B18] leading-tight"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            {stage === 0 ? "Building your profile…" : "Your profile is ready."}
          </h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="max-w-lg mx-auto space-y-4">

          {/* Score + badge */}
          <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 flex items-center gap-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <BuildingRing size={96} />
            <div className="flex-1">
              <div className="text-[11px] text-[#8A8880] mb-1.5">
                Readiness score activates after {profile.estimatedDaysToPersonalization} check-ins
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEEDFE] text-[#3C3489] border border-[#C4C0EE] text-[11px] font-semibold mb-2">
                {profile.trainingBadge}
              </div>
              <div className="text-[12px] text-[#6B6860] leading-relaxed">{profile.primaryFocus}</div>
            </div>
          </div>

          {/* Coaching insight */}
          <div className="border-l-2 border-[#534AB7] pl-4 pr-4 py-3.5 bg-[#EEEDFE] rounded-r-xl">
            <div className="text-[10px] font-semibold text-[#534AB7] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>
              Adaptive engine insight
            </div>
            <p className="text-[12px] text-[#3C3489] leading-relaxed italic">"{profile.coachingInsight}"</p>
          </div>

          {/* Readiness weight model */}
          <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-4">
              Your readiness model weights
            </div>
            <div className="space-y-3">
              <WeightBar label="Sleep"       pct={profile.readinessWeights.sleep}      color="#534AB7" delay={0} />
              <WeightBar label="Energy"      pct={profile.readinessWeights.energy}     color="#0F6E56" delay={80} />
              <WeightBar label="Stress"      pct={profile.readinessWeights.stress}     color="#854F0B" delay={160} />
              <WeightBar label="Recovery"    pct={profile.readinessWeights.recovery}   color="#5F5E5A" delay={240} />
              <WeightBar label="Cycle phase" pct={profile.readinessWeights.cyclePhase} color="#C4C0EE" delay={320} />
            </div>
            <div className="mt-3 pt-3 border-t border-[#F0EDE4] text-[10px] text-[#8A8880] leading-relaxed">
              Weights are calibrated to your profile. They evolve as you log more check-ins.
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-3">Training goals</div>
            <div className="flex flex-wrap gap-2">
              {data.goals.map(g => (
                <span key={g} className="px-3 py-1 rounded-full text-[11px] font-medium bg-[#F5F3EE] text-[#5F5E5A] border border-[#E0DDD4]">
                  {goalLabels[g] ?? g}
                </span>
              ))}
            </div>
          </div>

          {/* Nutrition + recovery */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white rounded-xl border border-[#EAE7DE] p-4 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-[#0F6E56] flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#0F6E56] mb-1">Nutrition approach</div>
                  <div className="text-[12px] text-[#6B6860] leading-snug">{profile.nutritionApproach}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#EAE7DE] p-4 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-lg bg-[#EEEDFE] flex items-center justify-center text-[#534AB7] flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#534AB7] mb-1">Recovery protocol</div>
                  <div className="text-[12px] text-[#6B6860] leading-snug">{profile.recoveryProtocol}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase strategy */}
          <div className="p-4 bg-[#FAF9F6] rounded-xl border border-[#EAE7DE]">
            <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-2">Physiological context strategy</div>
            <p className="text-[12px] text-[#6B6860] leading-relaxed">{profile.phaseStrategy}</p>
          </div>

          {/* Key signals */}
          <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-3">Key signals in your model</div>
            <div className="flex flex-wrap gap-2">
              {profile.keySignals.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F3EE] border border-[#E0DDD4]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#534AB7]" />
                  <span className="text-[11px] font-medium text-[#5F5E5A]">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What's next */}
          <div className="bg-[#1C1B18] rounded-2xl p-5 text-white">
            <div className="text-[11px] font-semibold text-[#534AB7] uppercase tracking-wider mb-3">What happens next</div>
            <div className="space-y-3">
              {[
                { num: "1", text: "Complete your first daily check-in tomorrow morning (takes 60 seconds)." },
                { num: "2", text: `After ${profile.estimatedDaysToPersonalization} check-ins, your readiness score activates.` },
                { num: "3", text: "Recommendations personalise progressively — the more you log, the more precise they become." },
              ].map(item => (
                <div key={item.num} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#534AB7] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                    {item.num}
                  </div>
                  <p className="text-[12px] text-[#D3D1C7] leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 pt-4 bg-white border-t border-[#F0EDE4]">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={onComplete}
            className="w-full py-4 rounded-full text-[15px] font-semibold bg-[#534AB7] text-white flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(83,74,183,0.3)] hover:shadow-[0_6px_32px_rgba(83,74,183,0.4)] hover:bg-[#3D35A0] transition-all duration-200 hover:-translate-y-0.5"
          >
            Go to my dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <p className="text-center text-[11px] text-[#B0AEA6] mt-3">
            Your profile is saved. You can update any settings from your account.
          </p>
        </div>
      </div>
    </div>
  );
}
