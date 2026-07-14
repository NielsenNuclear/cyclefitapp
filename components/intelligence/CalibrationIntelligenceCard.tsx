"use client";

import type { CalibrationProfile }    from "@/lib/intelligence/calibration/calibrationProfile";
import type { BiasReport }            from "@/lib/intelligence/calibration/biasDetection";
import type { ConfidenceCalibration } from "@/lib/intelligence/calibration/confidenceCalibration";

interface Props {
  calibration?: CalibrationProfile;
  bias?:        BiasReport;
  confidence?:  ConfidenceCalibration;
}

const TREND_COLORS = {
  improving: "text-success",
  stable:    "text-ink-muted",
  declining: "text-danger",
};

const TREND_LABELS = {
  improving: "Improving",
  stable:    "Stable",
  declining: "Declining",
};

const RELIABILITY_COLORS = {
  reliable:   "text-success",
  moderate:   "text-caution",
  unreliable: "text-danger",
};

const BIAS_COLORS = {
  overestimate:  "text-caution",
  underestimate: "text-info",
  balanced:      "text-ink-muted",
};

function AccuracyBar({ accuracy, dataReady }: { accuracy: number; dataReady: boolean }) {
  if (!dataReady) {
    return <span className="text-[12px] text-ink-faint font-mono">—</span>;
  }
  const pct   = Math.round(accuracy * 100);
  const color = pct >= 85 ? "bg-success" : pct >= 65 ? "bg-caution" : "bg-danger";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-[3px] bg-black/8 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-mono text-ink w-8 text-right">{pct}%</span>
    </div>
  );
}

function DomainRow({
  label,
  domain,
}: {
  label: string;
  domain: { accuracy: number; sampleSize: number; dataReady: boolean };
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-ink-secondary w-24 flex-shrink-0">{label}</span>
      <AccuracyBar accuracy={domain.accuracy} dataReady={domain.dataReady} />
      <span className="text-[11px] text-ink-faint w-10 text-right flex-shrink-0">
        {domain.dataReady ? `n=${domain.sampleSize}` : ""}
      </span>
    </div>
  );
}

export function CalibrationIntelligenceCard({ calibration, bias, confidence }: Props) {
  if (!calibration?.dataReady && !bias?.dataReady && !confidence?.dataReady) return null;

  const overallPct   = calibration ? Math.round(calibration.overallAccuracy * 100) : 0;
  const overallColor =
    overallPct >= 85 ? "text-success"
    : overallPct >= 65 ? "text-caution"
    : "text-danger";

  return (
    <div className="bg-white rounded-2xl border border-border p-4 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Prediction accuracy</h3>
        <div className="flex items-center gap-2">
          {calibration?.dataReady && (
            <span className={`text-[12px] font-semibold font-mono ${overallColor}`}>
              {overallPct}% overall
            </span>
          )}
          {calibration?.dataReady && (
            <span className={`text-[12px] ${TREND_COLORS[calibration.trend]}`}>
              {TREND_LABELS[calibration.trend]}
            </span>
          )}
        </div>
      </div>

      {/* Per-domain accuracy */}
      {calibration && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-ink-muted">
            By signal
          </p>
          <DomainRow label="Readiness"  domain={calibration.readiness} />
          <DomainRow label="Recovery"   domain={calibration.recovery} />
          <DomainRow label="Adherence"  domain={calibration.adherence} />
          <DomainRow label="Cycle"      domain={calibration.cycle} />
          <DomainRow label="Outcome"    domain={calibration.outcome} />
        </div>
      )}

      {/* Confidence reliability */}
      {confidence?.dataReady && (
        <div className="space-y-2 pt-2 border-t border-black/6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-ink-muted">
              Confidence calibration
            </p>
            <span className={`text-[12px] font-medium ${RELIABILITY_COLORS[confidence.overallReliability]}`}>
              {confidence.overallReliability.charAt(0).toUpperCase() + confidence.overallReliability.slice(1)}
            </span>
          </div>
          {confidence.tiers.filter(t => t.count >= 3).map(tier => (
            <div key={tier.level} className="flex items-center gap-2">
              <span className="text-[12px] text-ink-secondary w-14 capitalize">{tier.level}</span>
              <AccuracyBar accuracy={tier.accuracy} dataReady={true} />
              <span className={`text-[11px] w-16 text-right flex-shrink-0 ${
                tier.wellCalibrated ? "text-success" : "text-danger"
              }`}>
                {tier.wellCalibrated ? "calibrated" : "off-target"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bias summary */}
      {bias?.dataReady && bias.mostBiased && (
        <div className="pt-2 border-t border-black/6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-ink-muted mb-2">
            Detected patterns
          </p>
          {bias.domains.filter(d => d.significant).map(d => (
            <div key={d.domain} className="flex items-center justify-between">
              <span className="text-[12px] text-ink-secondary capitalize">{d.domain}</span>
              <span className={`text-[12px] font-medium ${BIAS_COLORS[d.direction]}`}>
                {d.direction} by {d.magnitude.toFixed(1)} pts
              </span>
            </div>
          ))}
        </div>
      )}

      {/* No data */}
      {!calibration?.dataReady && (
        <p className="text-[12px] text-ink-muted italic">
          Accuracy data accumulates over time as predictions are evaluated.
        </p>
      )}
    </div>
  );
}
