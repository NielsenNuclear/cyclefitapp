"use client";

// ─── components/dashboard/ConfidenceAccuracyHubCard.tsx ───────────────────────
// Dashboard 2.0 — Layer 4. Merges 9 previously-separate "how accurate/
// confident is Axis" cards (CalibrationIntelligenceCard anchor,
// ReadinessConfidenceCard, PredictionAccuracyCard, ConfidenceDashboardCard,
// AccuracyTimelineCard, UserTrustCard, SignalImportanceCard, CoachAccuracyCard
// — relocated from the misfiled "Performance Tracking" section — and
// RecommendationEffectivenessCard) into one card.
//
// Every source card displayed raw numeric percentages prominently (confidence
// rings, accuracy bars, calibration %) — directly against the brief's "avoid
// numerical contribution percentages... prefer qualitative language" rule.
// This is the single biggest violation found anywhere in the Dashboard 2.0
// audit; every percentage in this hub is converted to a qualitative label.
// Also fixes two ring-chart bugs found while reading source cards
// (ReadinessConfidenceCard, and CapacityCard elsewhere): fill="white" text on
// a white card background, making the number invisible.
// See docs/ux/UXStabilizationAudit.md Batch 18.

import { useState } from "react";
import type { CalibrationProfile }    from "@/lib/intelligence/calibration/calibrationProfile";
import type { BiasReport }            from "@/lib/intelligence/calibration/biasDetection";
import type { ConfidenceCalibration } from "@/lib/intelligence/calibration/confidenceCalibration";
import type { ReadinessConfidence }   from "@/lib/autoregulation/readinessConfidence";
import type { PredictionAccuracyReport } from "@/lib/autoregulation/outcomeValidation";
import type { RecommendationConfidence } from "@/lib/accuracy/recommendationConfidence";
import type { CalibrationReport }     from "@/lib/accuracy/calibrationEngine";
import type { DriftReport }           from "@/lib/accuracy/driftDetection";
import type { ForecastAccuracyReport } from "@/lib/accuracy/forecastAccuracy";
import type { PhysiologyConfidence }  from "@/lib/physiology/physiologyConfidence";
import type { FeedbackSummary }       from "@/lib/evidence/recommendationValidation";
import type { PredictorRankingProfile } from "@/lib/physiology/readinessPredictorRanking";
import type { PersonalReadinessEquation } from "@/lib/physiology/personalReadinessEquation";
import type { AccuracyReport }        from "@/lib/adaptive/readinessValidation";
import type { RecommendationProfile } from "@/lib/intelligence/effectiveness/recommendationProfile";
import { REC_TYPE_LABELS }            from "@/lib/intelligence/effectiveness/recommendationProfile";
import { color as tokenColor }        from "@/lib/design/tokens";
import { AxisIcon } from "@/components/ui/Icon";

// ── Qualitative conversion — no raw percentages anywhere in this file ──────

function qualitative(pct: number): { label: string; color: string; bar: string } {
  if (pct >= 85) return { label: "High accuracy", color: "text-success", bar: "bg-success" };
  if (pct >= 65) return { label: "Moderate accuracy", color: "text-caution", bar: "bg-caution" };
  if (pct >= 40) return { label: "Building accuracy", color: "text-info", bar: "bg-info" };
  return { label: "Early data", color: "text-ink-muted", bar: "bg-ink-faint" };
}

function QualBar({ pct }: { pct: number }) {
  const q = qualitative(pct);
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-[3px] bg-surface-hover rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${q.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-semibold ${q.color} flex-shrink-0`}>{q.label}</span>
    </div>
  );
}

function QualRing({ pct }: { pct: number }) {
  const q = qualitative(pct);
  const r = 28, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  const ringColor = pct >= 85 ? tokenColor.success : pct >= 65 ? tokenColor.caution : pct >= 40 ? tokenColor.info : tokenColor.inkFaint;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={ringColor} strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 36 36)" />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central" fill={tokenColor.ink} fontSize="11" fontWeight="700">{q.label.split(" ")[0]}</text>
    </svg>
  );
}

function Divider() { return <div className="border-t border-surface-hover my-4" />; }
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}

interface ConfidenceAccuracyHubCardProps {
  calibration?: CalibrationProfile;
  bias?:        BiasReport;
  confCalibration?: ConfidenceCalibration;
  readinessConfidence?: ReadinessConfidence;
  predictionAccuracy?: PredictionAccuracyReport;
  recConfidence?: RecommendationConfidence;
  calibrationReport?: CalibrationReport;
  driftReport?: DriftReport;
  forecastAccuracy?: ForecastAccuracyReport;
  physiologyConf?: PhysiologyConfidence;
  feedbackSummary?: FeedbackSummary;
  predictorRanking?: PredictorRankingProfile;
  personalEquation?: PersonalReadinessEquation;
  coachAccuracy?: AccuracyReport;
  recEffectiveness?: RecommendationProfile;
}

export function ConfidenceAccuracyHubCard({
  calibration, bias, confCalibration, readinessConfidence, predictionAccuracy,
  recConfidence, calibrationReport, driftReport, forecastAccuracy, physiologyConf,
  feedbackSummary, predictorRanking, personalEquation, coachAccuracy, recEffectiveness,
}: ConfidenceAccuracyHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const hasAny = calibration?.dataReady || readinessConfidence || predictionAccuracy || recConfidence ||
    forecastAccuracy?.dataReady || physiologyConf || predictorRanking?.dataReady || coachAccuracy || recEffectiveness?.dataReady;
  if (!hasAny) return null;

  const overallPct = calibration?.dataReady ? Math.round(calibration.overallAccuracy * 100) : null;
  const overallQual = overallPct !== null ? qualitative(overallPct) : null;

  const hasDetails = !!(calibration?.dataReady || confCalibration?.dataReady || bias?.dataReady ||
    predictionAccuracy || calibrationReport || driftReport?.driftDetected || forecastAccuracy?.dataReady ||
    physiologyConf || feedbackSummary || predictorRanking?.dataReady || recEffectiveness?.dataReady);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Confidence &amp; Accuracy</h2>
          {overallQual && <span className={`text-[11px] font-semibold ${overallQual.color}`}>{overallQual.label}</span>}
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">How much should I trust Axis right now?</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {readinessConfidence && (
          <div className="flex items-center gap-4">
            <QualRing pct={readinessConfidence.confidence} />
            <div className="flex-1 space-y-1">
              <div className="text-[13px] font-semibold text-ink">Readiness {readinessConfidence.readinessScore}</div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                {readinessConfidence.confidenceLevel === "high" ? "Axis has a clear picture of your status today." :
                 readinessConfidence.confidenceLevel === "medium" ? "Some data gaps exist — recommendations are informed but may be conservative." :
                 "Limited data available — log a check-in to improve accuracy."}
              </p>
            </div>
          </div>
        )}

        {calibration?.dataReady && (
          <div>
            <SectionLabel>By signal</SectionLabel>
            <div className="space-y-2">
              {([
                { label: "Readiness", d: calibration.readiness },
                { label: "Recovery", d: calibration.recovery },
                { label: "Adherence", d: calibration.adherence },
                { label: "Cycle", d: calibration.cycle },
                { label: "Outcome", d: calibration.outcome },
              ]).map(({ label, d }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[12px] text-ink-secondary w-20 flex-shrink-0">{label}</span>
                  {d.dataReady ? <QualBar pct={Math.round(d.accuracy * 100)} /> : <span className="text-[11px] text-ink-faint flex-1">—</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {coachAccuracy && coachAccuracy.totalSamples >= 3 && (
          <div className="bg-surface-hover rounded-xl p-3">
            <p className="text-[12px] text-ink leading-relaxed">
              Axis correctly predicted readiness <span className="font-semibold">{qualitative(Math.round((coachAccuracy.last30Days > 0 ? coachAccuracy.last30Days : coachAccuracy.lifetime) * 100)).label.toLowerCase()}</span> over
              the {coachAccuracy.last30Days > 0 ? "last 30 days" : "period tracked"}.
            </p>
          </div>
        )}
      </div>

      {hasDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors min-h-[44px]"
          aria-expanded={showDetails}
        >
          <span className="text-[12px] font-semibold text-brand">{showDetails ? "Hide details" : "Full accuracy breakdown"}</span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {predictionAccuracy && predictionAccuracy.sampleSize >= 3 && (
            <div>
              <SectionLabel>Prediction accuracy</SectionLabel>
              <QualBar pct={predictionAccuracy.overallAccuracy} />
              <p className="text-[11px] text-ink-muted leading-relaxed mt-1.5">
                {predictionAccuracy.dataMaturity === "high" ? "Strong dataset — predictions are well-calibrated." :
                 predictionAccuracy.dataMaturity === "medium" ? "Growing dataset — accuracy improving." :
                 "Early data — accuracy will improve with more sessions."}
              </p>
            </div>
          )}

          {recConfidence && (
            <>
              <Divider />
              <div>
                <SectionLabel>Today&apos;s plan confidence</SectionLabel>
                <QualBar pct={recConfidence.score} />
                {recConfidence.reasons.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {recConfidence.reasons.map((r, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-success text-[9px] mt-0.5">✓</span>
                        <span className="text-[11px] text-ink-muted">{r}</span>
                      </div>
                    ))}
                  </div>
                )}
                {driftReport?.driftDetected && (
                  <div className="bg-caution-bg border border-caution-border rounded-xl px-3 py-2 mt-2">
                    <div className="text-[10px] font-semibold text-caution">Pattern shift detected</div>
                    <div className="text-[10px] text-ink-muted">{driftReport.message}</div>
                  </div>
                )}
              </div>
            </>
          )}

          {forecastAccuracy?.dataReady && (
            <>
              <Divider />
              <div>
                <SectionLabel>Forecast accuracy by engine</SectionLabel>
                <div className="space-y-2">
                  {([
                    { label: "Readiness", d: forecastAccuracy.readiness },
                    { label: "Recovery", d: forecastAccuracy.recovery },
                    { label: "Performance", d: forecastAccuracy.performance },
                  ]).map(({ label, d }) => d.sampleSize >= 3 && (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-[12px] text-ink-secondary w-20 flex-shrink-0">{label}</span>
                      <QualBar pct={d.accuracy} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {predictorRanking?.dataReady && (
            <>
              <Divider />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel>Signal importance</SectionLabel>
                  {personalEquation?.applied && <span className="text-[10px] text-brand font-semibold">Personal model active</span>}
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed mb-2">{predictorRanking.summary}</p>
                <div className="space-y-2">
                  {predictorRanking.rankings.map(r => (
                    <div key={r.factor} className="flex items-center gap-3">
                      <span className="text-[12px] text-ink-secondary w-28 flex-shrink-0 truncate">{r.label}</span>
                      <QualBar pct={r.normalized} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {physiologyConf && (
            <>
              <Divider />
              <div>
                <SectionLabel>How well Axis knows you</SectionLabel>
                <div className="space-y-2">
                  {([
                    { label: "Physiology model", value: physiologyConf.overall },
                    { label: "Phase pattern", value: physiologyConf.phaseModel },
                    { label: "Symptom mapping", value: physiologyConf.symptomModel },
                    { label: "Recovery mapping", value: physiologyConf.recoveryModel },
                  ]).map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-[12px] text-ink-secondary w-32 flex-shrink-0">{label}</span>
                      <QualBar pct={value} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {feedbackSummary && feedbackSummary.total >= 3 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Your feedback · {feedbackSummary.total} sessions</SectionLabel>
                <div className="flex gap-2">
                  <div className="flex-1 bg-success-bg rounded-lg p-2 text-center">
                    <div className="text-[11px] font-semibold text-success-text">{qualitative(feedbackSummary.perfectRate + feedbackSummary.helpfulRate).label}</div>
                    <div className="text-[9px] text-ink-faint mt-0.5">Positive</div>
                  </div>
                  <div className="flex-1 bg-surface-hover rounded-lg p-2 text-center">
                    <div className="text-[11px] font-semibold text-ink-secondary">Some sessions</div>
                    <div className="text-[9px] text-ink-faint mt-0.5">Too hard / easy</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {recEffectiveness?.dataReady && (
            <>
              <Divider />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel>Did it help?</SectionLabel>
                  <span className={`text-[11px] font-semibold ${qualitative(Math.round(recEffectiveness.overallEffectiveness * 100)).color}`}>
                    {qualitative(Math.round(recEffectiveness.overallEffectiveness * 100)).label}
                  </span>
                </div>
                <div className="space-y-2">
                  {recEffectiveness.byType.filter(t => t.sampleSize >= 1).map(t => (
                    <div key={t.recommendationType} className="flex items-center gap-3">
                      <span className="text-[12px] text-ink-secondary w-32 flex-shrink-0 truncate">{REC_TYPE_LABELS[t.recommendationType]}</span>
                      <QualBar pct={Math.round(t.averageScore * 100)} />
                    </div>
                  ))}
                </div>
                {recEffectiveness.mostEffective && (
                  <p className="text-[12px] text-ink-secondary mt-2">
                    <span className="text-success font-medium">Most effective:</span> {REC_TYPE_LABELS[recEffectiveness.mostEffective]}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
