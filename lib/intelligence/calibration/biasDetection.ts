// ─── lib/intelligence/calibration/biasDetection.ts ───────────────────────────
// Phase 57D — Forecast Bias Detection
// Detects systematic over/under-estimation per domain.
// OBSERVABILITY ONLY — no auto-correction applied.

import type { StoredPrediction, PredictionDomain } from "./predictionRegistry";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BiasDirection = "overestimate" | "underestimate" | "balanced";

export interface DomainBias {
  domain:      PredictionDomain;
  meanError:   number;            // signed: positive = overestimates
  direction:   BiasDirection;
  magnitude:   number;            // |meanError|, scale matches domain (0-100)
  sampleSize:  number;
  significant: boolean;
}

export interface BiasReport {
  domains:    DomainBias[];
  mostBiased: PredictionDomain | null;
  dataReady:  boolean;
}

const DOMAINS: PredictionDomain[] = ["readiness", "recovery", "adherence", "cycle", "outcome"];

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectForecastBias(registry: StoredPrediction[]): BiasReport {
  const domains: DomainBias[] = DOMAINS.map(domain => {
    const evaluated = registry.filter(
      p => p.domain === domain && p.evaluated && p.actualValue !== undefined,
    );

    if (evaluated.length < 3) {
      return {
        domain, meanError: 0, direction: "balanced" as BiasDirection,
        magnitude: 0, sampleSize: evaluated.length, significant: false,
      };
    }

    // Signed error on a 0-100 scale (probability domains × 100)
    const meanError = evaluated.reduce((s, p) => {
      const pred   = (domain === "adherence") ? p.predictedValue * 100 : p.predictedValue;
      const actual = p.actualValue ?? 0;
      return s + (pred - actual);
    }, 0) / evaluated.length;

    const rounded    = Math.round(meanError * 10) / 10;
    const magnitude  = Math.abs(rounded);
    const direction: BiasDirection =
      magnitude < 3 ? "balanced" : rounded > 0 ? "overestimate" : "underestimate";

    return {
      domain,
      meanError:   rounded,
      direction,
      magnitude,
      sampleSize:  evaluated.length,
      significant: evaluated.length >= 5 && magnitude >= 5,
    };
  });

  const significant = domains.filter(d => d.significant);
  const mostBiased  = significant.length > 0
    ? significant.sort((a, b) => b.magnitude - a.magnitude)[0].domain
    : null;

  return {
    domains,
    mostBiased,
    dataReady: domains.some(d => d.sampleSize >= 3),
  };
}
