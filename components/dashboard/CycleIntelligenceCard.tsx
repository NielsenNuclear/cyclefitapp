"use client";

import type { CycleAccuracyReport } from "@/lib/cycle/cycleAccuracy";
import type { PersonalPerformanceProfile } from "@/lib/cycle/performanceProfile";
import type { SymptomTimeline } from "@/lib/cycle/symptomTimeline";
import type { OvulationEstimate } from "@/lib/cycle/ovulationEstimator";
import type { CycleHealthReport } from "@/lib/cycle/cycleHealth";
import { computeConfidenceScore } from "@/lib/cycle/confidence";

// ─── Sub-components ───────────────────────────────────────────────────────────

const CONFIDENCE_BADGE: Record<
  ReturnType<typeof computeConfidenceScore>["level"],
  { label: string; badge: string }
> = {
  none:     { label: "No data",          badge: "bg-[#F5F3EE] text-[#9B9690]" },
  low:      { label: "Low confidence",   badge: "bg-[#F5F3EE] text-[#5C5850]" },
  moderate: { label: "Moderate",         badge: "bg-[#FDF6EC] text-[#854F0B]" },
  high:     { label: "High confidence",  badge: "bg-[#E1F5EE] text-[#085041]" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-[#C8B89A] mb-2">
      {children}
    </p>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline mb-1.5">
      <span className="text-[11px] text-[#9B9690]">{label}</span>
      <span className="text-[12px] font-semibold text-[#1C1B18]">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[#F0EDE6] my-4" />;
}

// ─── Section: Cycle Metrics ───────────────────────────────────────────────────

function CycleMetricsSection({ accuracy }: { accuracy: CycleAccuracyReport }) {
  return (
    <div>
      <SectionHeading>Cycle metrics</SectionHeading>
      <MetricRow label="Average length"       value={`${accuracy.averageLength} days`} />
      <MetricRow label="Variability"          value={`±${accuracy.variability} days`} />
      <MetricRow label="Shortest / Longest"   value={`${accuracy.shortestLength} / ${accuracy.longestLength} days`} />
      <MetricRow label="Prediction accuracy"  value={`${Math.round(accuracy.predictionAccuracy * 100)}%`} />
      <MetricRow label="Cycles observed"      value={String(accuracy.cycleCount)} />
    </div>
  );
}

// ─── Section: Training Intelligence ──────────────────────────────────────────

function TrainingIntelligenceSection({ profile }: { profile: PersonalPerformanceProfile }) {
  const hasPrime    = profile.primeWindow && profile.primeWindow.confidence !== "low";
  const hasRecovery = profile.recoveryWindow && profile.recoveryWindow.confidence !== "low";
  const hasBest     = profile.bestPhase || profile.worstPhase;

  if (!hasPrime && !hasRecovery && !hasBest) return null;

  return (
    <div>
      <SectionHeading>Training intelligence</SectionHeading>
      {hasPrime && profile.primeWindow && (
        <MetricRow
          label="Prime window"
          value={`Days ${profile.primeWindow.startDay}–${profile.primeWindow.endDay}`}
        />
      )}
      {hasRecovery && profile.recoveryWindow && (
        <MetricRow
          label="Recovery window"
          value={`Days ${profile.recoveryWindow.startDay}–${profile.recoveryWindow.endDay}`}
        />
      )}
      {profile.bestPhase && (
        <MetricRow label="Strongest phase"  value={profile.bestPhase} />
      )}
      {profile.worstPhase && profile.worstPhase !== profile.bestPhase && (
        <MetricRow label="Recovery phase"   value={profile.worstPhase} />
      )}
    </div>
  );
}

// ─── Section: Symptom Patterns ────────────────────────────────────────────────

function SymptomPatternsSection({
  timeline,
  dominantCluster,
}: {
  timeline:        SymptomTimeline;
  dominantCluster: PersonalPerformanceProfile["dominantCluster"];
}) {
  const topSymptom = timeline.entries[0];
  if (!topSymptom && !dominantCluster) return null;

  return (
    <div>
      <SectionHeading>Symptom patterns</SectionHeading>
      {topSymptom && (
        <MetricRow
          label="Most consistent"
          value={`${topSymptom.symptomName} (day ${topSymptom.peakDay})`}
        />
      )}
      {dominantCluster && (
        <>
          <MetricRow label="Strongest cluster" value={dominantCluster.label} />
          <p className="text-[11px] text-[#9B9690] mt-1">
            {dominantCluster.symptoms.slice(0, 3).join(", ")}
            {dominantCluster.symptoms.length > 3 ? ` +${dominantCluster.symptoms.length - 3} more` : ""}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Section: Ovulation Estimate ─────────────────────────────────────────────

function OvulationSection({ estimate }: { estimate: OvulationEstimate }) {
  const confidenceLabel: Record<OvulationEstimate["confidence"], string> = {
    low:    "Low confidence",
    medium: "Medium confidence",
    high:   "High confidence",
  };

  return (
    <div>
      <SectionHeading>Estimated ovulation</SectionHeading>
      <MetricRow
        label="Window"
        value={`Days ${estimate.window[0]}–${estimate.window[2]}`}
      />
      <MetricRow label="Peak day"   value={`Day ${estimate.estimatedDay}`} />
      <MetricRow label="Confidence" value={confidenceLabel[estimate.confidence]} />
    </div>
  );
}

// ─── Section: Cycle Health Observations ──────────────────────────────────────

function CycleHealthSection({ report }: { report: CycleHealthReport }) {
  return (
    <div>
      <SectionHeading>Cycle observations</SectionHeading>
      <ul className="space-y-2">
        {report.observations.map(obs => (
          <li key={obs.id} className="flex items-start gap-2">
            <span className="mt-[4px] w-1.5 h-1.5 rounded-full bg-[#C8B89A] flex-shrink-0" />
            <p className="text-[11px] text-[#5C5850] leading-relaxed">{obs.observation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface CycleIntelligenceCardProps {
  cycleAccuracy:      CycleAccuracyReport | null;
  performanceProfile: PersonalPerformanceProfile | null;
  symptomTimeline:    SymptomTimeline | null;
  ovulationEstimate:  OvulationEstimate | null;
  cycleHealthReport:  CycleHealthReport | null;
}

export function CycleIntelligenceCard({
  cycleAccuracy,
  performanceProfile,
  symptomTimeline,
  ovulationEstimate,
  cycleHealthReport,
}: CycleIntelligenceCardProps) {
  if (!cycleAccuracy) return null;

  const showTraining  = performanceProfile && performanceProfile.dataMaturity !== "early";
  const showSymptoms  = symptomTimeline && symptomTimeline.entries.length > 0;
  const showOvulation = ovulationEstimate !== null;
  const showHealth    = cycleHealthReport?.hasObservations;

  const confidence = computeConfidenceScore(cycleAccuracy.cycleCount);
  const confStyle  = CONFIDENCE_BADGE[confidence.level];

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690]">
          Cycle intelligence
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${confStyle.badge}`}>
          {confStyle.label}
        </span>
      </div>

      <CycleMetricsSection accuracy={cycleAccuracy} />

      {showTraining && (
        <>
          <Divider />
          <TrainingIntelligenceSection profile={performanceProfile} />
        </>
      )}

      {showSymptoms && (
        <>
          <Divider />
          <SymptomPatternsSection
            timeline={symptomTimeline}
            dominantCluster={performanceProfile?.dominantCluster ?? null}
          />
        </>
      )}

      {showOvulation && ovulationEstimate && (
        <>
          <Divider />
          <OvulationSection estimate={ovulationEstimate} />
        </>
      )}

      {showHealth && cycleHealthReport && (
        <>
          <Divider />
          <CycleHealthSection report={cycleHealthReport} />
        </>
      )}

      <p className="text-[10px] text-[#BCBAB4] leading-relaxed border-t border-[#F0EDE6] pt-3 mt-4">
        All cycle insights are behavioral estimates based on your logged data — not medical assessments.
      </p>
    </div>
  );
}
