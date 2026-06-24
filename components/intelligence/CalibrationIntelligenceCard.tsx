"use client";

import type { CalibrationProfile } from "@/lib/intelligence/calibration/calibrationProfile";
import type { BiasReport }         from "@/lib/intelligence/calibration/biasDetection";
import type { ConfidenceCalibration } from "@/lib/intelligence/calibration/confidenceCalibration";

interface Props {
  calibration?: CalibrationProfile;
  bias?:        BiasReport;
  confidence?:  ConfidenceCalibration;
}

const TREND_COLORS = {
  improving: "text-emerald-400",
  stable:    "text-slate-400",
  declining: "text-rose-400",
};

const TREND_LABELS = {
  improving: "Improving",
  stable:    "Stable",
  declining: "Declining",
};

const RELIABILITY_COLORS = {
  reliable:   "text-emerald-400",
  moderate:   "text-amber-400",
  unreliable: "text-rose-400",
};

const BIAS_COLORS = {
  overestimate:  "text-amber-400",
  underestimate: "text-sky-400",
  balanced:      "text-slate-400",
};

function AccuracyBar({ accuracy, dataReady }: { accuracy: number; dataReady: boolean }) {
  if (!dataReady) {
    return <span className="text-xs text-slate-600 font-mono">—</span>;
  }
  const pct   = Math.round(accuracy * 100);
  const color = pct >= 85 ? "bg-emerald-500/60" : pct >= 65 ? "bg-amber-500/60" : "bg-rose-500/60";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-300 w-8 text-right">{pct}%</span>
    </div>
  );
}

function DomainRow({ label, domain }: { label: string; domain: { accuracy: number; sampleSize: number; dataReady: boolean } }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-24 flex-shrink-0">{label}</span>
      <AccuracyBar accuracy={domain.accuracy} dataReady={domain.dataReady} />
      <span className="text-xs text-slate-600 w-10 text-right flex-shrink-0">
        {domain.dataReady ? `n=${domain.sampleSize}` : ""}
      </span>
    </div>
  );
}

export function CalibrationIntelligenceCard({ calibration, bias, confidence }: Props) {
  if (!calibration?.dataReady && !bias?.dataReady && !confidence?.dataReady) return null;

  const overallPct  = calibration ? Math.round(calibration.overallAccuracy * 100) : 0;
  const overallColor =
    overallPct >= 85 ? "text-emerald-400"
    : overallPct >= 65 ? "text-amber-400"
    : "text-rose-400";

  return (
    <div className="bg-slate-800/60 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Prediction Accuracy</h3>
        <div className="flex items-center gap-2">
          {calibration?.dataReady && (
            <span className={`text-xs font-semibold font-mono ${overallColor}`}>
              {overallPct}% overall
            </span>
          )}
          {calibration?.dataReady && (
            <span className={`text-xs ${TREND_COLORS[calibration.trend]}`}>
              {TREND_LABELS[calibration.trend]}
            </span>
          )}
        </div>
      </div>

      {/* Per-domain accuracy */}
      {calibration && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Accuracy by domain</p>
          <DomainRow label="Readiness"  domain={calibration.readiness} />
          <DomainRow label="Recovery"   domain={calibration.recovery} />
          <DomainRow label="Adherence"  domain={calibration.adherence} />
          <DomainRow label="Cycle"      domain={calibration.cycle} />
          <DomainRow label="Outcome"    domain={calibration.outcome} />
        </div>
      )}

      {/* Confidence reliability */}
      {confidence?.dataReady && (
        <div className="space-y-2 pt-2 border-t border-slate-700/40">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Confidence reliability</p>
            <span className={`text-xs font-medium ${RELIABILITY_COLORS[confidence.overallReliability]}`}>
              {confidence.overallReliability.charAt(0).toUpperCase() + confidence.overallReliability.slice(1)}
            </span>
          </div>
          {confidence.tiers.filter(t => t.count >= 3).map(tier => (
            <div key={tier.level} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-14 capitalize">{tier.level}</span>
              <AccuracyBar accuracy={tier.accuracy} dataReady={true} />
              <span className={`text-xs w-16 text-right flex-shrink-0 ${tier.wellCalibrated ? "text-emerald-400" : "text-rose-400"}`}>
                {tier.wellCalibrated ? "calibrated" : "off-target"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bias summary */}
      {bias?.dataReady && bias.mostBiased && (
        <div className="pt-2 border-t border-slate-700/40">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Systematic bias</p>
          {bias.domains.filter(d => d.significant).map(d => (
            <div key={d.domain} className="flex items-center justify-between">
              <span className="text-xs text-slate-400 capitalize">{d.domain}</span>
              <span className={`text-xs font-medium ${BIAS_COLORS[d.direction]}`}>
                {d.direction} by {d.magnitude.toFixed(1)}pts
              </span>
            </div>
          ))}
        </div>
      )}

      {/* No data message */}
      {!calibration?.dataReady && (
        <p className="text-xs text-slate-500 italic">
          Accuracy data accumulates over time as predictions are evaluated.
        </p>
      )}
    </div>
  );
}
