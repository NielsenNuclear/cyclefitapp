"use client";

import { useRouter } from "next/navigation";
import { OnboardingFlow } from "./OnboardingFlow";
import type { OnboardingData } from "@/lib/onboarding-types";

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = async (data: OnboardingData) => {

      // ── In production: POST to /api/onboarding/complete ───────────────────
    // const res = await fetch("/api/onboarding/complete", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(data),
    // });
    // if (!res.ok) throw new Error("Failed to save onboarding data");

    // ── For now: save to localStorage and redirect ────────────────────────
    
    if (typeof window !== "undefined") {
      localStorage.setItem("axis_onboarding", JSON.stringify(data));
    }

    router.push("/dashboard");
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}