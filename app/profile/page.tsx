"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingData } from "@/lib/onboarding-types";
import { canAdvance } from "@/lib/onboarding-types";
import { buildAdaptiveProfile } from "@/lib/adaptive-profile";
import {
  Step1Goals,
  Step2Experience,
  Step3TrainingStyle,
  Step5Sleep,
} from "@/components/onboarding/Steps1to5";
import {
  Step7Energy,
  Step8Cycle,
} from "@/components/onboarding/Steps6to10";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A8880] mb-1">{title}</div>
      {subtitle && <div className="text-[12px] text-[#9B9690] leading-relaxed">{subtitle}</div>}
    </div>
  );
}

function isProfileValid(data: OnboardingData): boolean {
  return (
    canAdvance(1, data) &&
    canAdvance(2, data) &&
    canAdvance(3, data) &&
    canAdvance(5, data) &&
    canAdvance(7, data) &&
    canAdvance(8, data)
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    const raw = localStorage.getItem("axis_onboarding");
    if (!raw) { router.push("/onboarding"); return; }
    try {
      setData(JSON.parse(raw));
    } catch {
      router.push("/onboarding");
    }
  }, [router]);

  const patch = useCallback((update: Partial<OnboardingData>) => {
    setData(prev => prev ? { ...prev, ...update } : null);
  }, []);

  function handleSave() {
    if (!data) return;
    if (!isProfileValid(data)) {
      setSaveState("error");
      return;
    }
    localStorage.setItem("axis_onboarding", JSON.stringify(data));
    localStorage.setItem("axis_adaptive_profile", JSON.stringify(buildAdaptiveProfile(data)));
    setSaveState("saved");
    setTimeout(() => router.push("/dashboard"), 700);
  }

  if (!data) return null;

  const valid  = isProfileValid(data);
  const isBusy = saveState === "saved";

  return (
    <div
      className="min-h-screen bg-[#FAF9F5]"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-[rgba(250,249,245,0.88)] backdrop-blur-md border-b border-[#EAE7DE]">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-[13px] text-[#6B6860] hover:text-[#1C1B18] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Dashboard
          </button>
          <span className="text-[14px] font-semibold text-[#1C1B18] tracking-tight">Edit profile</span>
          <div className="w-[88px]" />
        </div>
      </nav>

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-5 pt-6 pb-32 space-y-8">

        {/* Training — Goals */}
        <section>
          <SectionHeader
            title="Goals"
            subtitle="What are you training for? Select everything that applies."
          />
          <Step1Goals data={data} onChange={patch} />
        </section>

        <div className="border-t border-[#EAE7DE]" />

        {/* Training — Experience */}
        <section>
          <SectionHeader
            title="Training background"
            subtitle="Calibrates your baseline so recommendations stay in the right range."
          />
          <Step2Experience data={data} onChange={patch} />
        </section>

        <div className="border-t border-[#EAE7DE]" />

        {/* Training — Style + sessions */}
        <section>
          <SectionHeader title="Training style" />
          <Step3TrainingStyle data={data} onChange={patch} />
        </section>

        <div className="border-t border-[#EAE7DE]" />

        {/* Cycle */}
        <section>
          <SectionHeader
            title="Cycle information"
            subtitle="Cycle phase is one signal — weighted alongside sleep, energy, and recovery."
          />
          <Step8Cycle data={data} onChange={patch} />
        </section>

        <div className="border-t border-[#EAE7DE]" />

        {/* Lifestyle — Sleep */}
        <section>
          <SectionHeader
            title="Sleep"
            subtitle="The most weighted signal in your readiness score."
          />
          <Step5Sleep data={data} onChange={patch} />
        </section>

        <div className="border-t border-[#EAE7DE]" />

        {/* Lifestyle — Energy */}
        <section>
          <SectionHeader title="Energy patterns" />
          <Step7Energy data={data} onChange={patch} />
        </section>

        {/* Validation error */}
        {saveState === "error" && (
          <div className="p-4 bg-[#FAEEDA] rounded-xl border border-[#E4C88A]">
            <p className="text-[12px] text-[#633806] leading-relaxed">
              Some required fields are incomplete. Check that you have selected goals, a training level,
              at least one training style, sleep quality, energy pattern, and cycle regularity.
            </p>
          </div>
        )}
      </main>

      {/* ── Sticky save bar ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-[#EAE7DE] px-5 py-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={isBusy}
            className={`w-full py-3.5 rounded-full text-[14px] font-semibold transition-all duration-200
              ${isBusy
                ? "bg-[#E1F5EE] text-[#085041] border border-[#A8DFC8]"
                : valid
                  ? "bg-[#534AB7] text-white shadow-[0_4px_24px_rgba(83,74,183,0.28)] hover:shadow-[0_6px_32px_rgba(83,74,183,0.38)] hover:-translate-y-0.5"
                  : "bg-[#F1EFE8] text-[#9B9690] cursor-not-allowed"
              }`}
          >
            {isBusy ? "Saved — returning to dashboard…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
