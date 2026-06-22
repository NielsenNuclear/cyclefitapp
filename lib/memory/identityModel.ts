// ─── lib/memory/identityModel.ts ─────────────────────────────────────────────
// 45F — Long-Term Identity Model
// Synthesises patterns over months/years into a stable model of how THIS user
// succeeds — their training identity, not just their current metrics.

import { getSituationHistory } from "./situationMemory";
import type { PhaseResponseProfile }  from "@/lib/physiology/phaseResponseModel";
import type { RecommendationMemoryProfile } from "./recommendationMemory";
import type { SuccessPatternReport }  from "@/lib/outcomes/successPatternDetection";

const STORAGE_KEY = "axis_identity_model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IdentityTrait {
  trait:       string;
  description: string;
  confidence:  "low" | "moderate" | "high";
}

export interface IdentityModel {
  traits:              IdentityTrait[];
  successSummary:      string;
  peakConditions:      string[];
  riskConditions:      string[];
  dataDepthDays:       number;
  dataReady:           boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildIdentityModel(
  phaseResponse:    PhaseResponseProfile | undefined,
  recMemory:        RecommendationMemoryProfile,
  successPatterns:  SuccessPatternReport,
): IdentityModel {
  const EMPTY: IdentityModel = {
    traits: [], successSummary: "Building your long-term identity model.", peakConditions: [],
    riskConditions: [], dataDepthDays: 0, dataReady: false,
  };

  const history      = getSituationHistory();
  const dataDepthDays = history.length;
  if (dataDepthDays < 14) return { ...EMPTY, dataDepthDays };

  const traits: IdentityTrait[] = [];
  const peakConditions: string[]  = [];
  const riskConditions: string[]  = [];

  // Trait: best cycle phase
  if (phaseResponse?.dataReady && phaseResponse.bestPhase) {
    traits.push({
      trait:       `Peaks in ${phaseResponse.bestPhase}`,
      description: phaseResponse.deviatesFromPopulation
        ? `Unlike most women, your highest readiness occurs in ${phaseResponse.bestPhase}.`
        : `Your readiness peaks during ${phaseResponse.bestPhase}, as expected.`,
      confidence: phaseResponse.phaseProfiles.length >= 3 ? "high" : "moderate",
    });
    peakConditions.push(phaseResponse.bestPhase);
  }

  // Trait: best day of week
  if (successPatterns.dataReady && successPatterns.bestDayOfWeek) {
    traits.push({
      trait:       `Strongest on ${successPatterns.bestDayOfWeek}s`,
      description: `Readiness and completion rates are consistently highest on ${successPatterns.bestDayOfWeek}s.`,
      confidence:  "moderate",
    });
    peakConditions.push(`${successPatterns.bestDayOfWeek} training`);
  }

  // Trait: recommendation memory
  if (recMemory.dataReady && recMemory.bestType) {
    traits.push({
      trait:       `Responds best to "${recMemory.bestType}" sessions`,
      description: recMemory.insight,
      confidence:  recMemory.outcomes[0]?.sampleSize >= 10 ? "high" : "moderate",
    });
  }

  // Trait: consistency under pressure
  if (successPatterns.dataReady) {
    const neverDoubleSkip = successPatterns.patterns.find(p => p.label.includes("consecutive"));
    if (neverDoubleSkip) {
      traits.push({
        trait:       "Rarely misses two sessions in a row",
        description: "Consistent bounce-back after off days — a hallmark of sustainable training.",
        confidence:  "high",
      });
    }
  }

  // Worst phase as risk condition
  if (phaseResponse?.dataReady && phaseResponse.worstPhase) {
    riskConditions.push(phaseResponse.worstPhase);
  }

  const successSummary = traits.length >= 2
    ? `You are most effective when training in ${peakConditions.join(" and ")}. ${traits[0].description}`
    : "More data needed to build a complete identity profile.";

  // Persist lightweight summary
  if (isClient()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), traitCount: traits.length }));
    } catch {}
  }

  return {
    traits: traits.slice(0, 5),
    successSummary,
    peakConditions,
    riskConditions,
    dataDepthDays,
    dataReady: traits.length >= 1,
  };
}
