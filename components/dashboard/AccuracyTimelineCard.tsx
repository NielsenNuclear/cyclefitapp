"use client";

import type { ForecastAccuracyReport, AccuracyTrend } from "@/lib/accuracy/forecastAccuracy";

interface Props {
  accuracy: ForecastAccuracyReport | undefined;
}

const TREND_ICON: Record<AccuracyTrend, string>  = {
  improving:    "↑",
  stable:       "→",
  declining:    "↓",
  insufficient: "—",
};

const TREND_COLOR: Record<AccuracyTrend, string> = {
  improving:    "text-success",
  stable:       "text-info",
  declining:    "text-danger",
  insufficient: "text-ink-faint",
};

const ACC_BAR = (acc: number) =>
  acc >= 80 ? "bg-emerald-500"
  : acc >= 60 ? "bg-sky-500"
  : acc >= 40 ? "bg-amber-500"
  : "bg-rose-500";

export function AccuracyTimelineCard({ accuracy }: Props) {
  if (!accuracy?.dataReady) return null;

  const engines = [
    { label: "Readiness",   data: accuracy.readiness   },
    { label: "Recovery",    data: accuracy.recovery    },
    { label: "Performance", data: accuracy.performance },
  ] as const;

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Forecast Accuracy</h3>
        <span className="text-sm font-semibold text-ink">{accuracy.overall}%</span>
      </div>

      <div className="space-y-3">
        {engines.map(({ label, data }) => {
          if (data.sampleSize < 3) return null;
          const trendIcon  = TREND_ICON[data.trend];
          const trendColor = TREND_COLOR[data.trend];
          return (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-ink-secondary">{label}</span>
                <div className="flex items-center gap-2">
                  <span className={`${trendColor} text-[10px]`}>{trendIcon}</span>
                  <span className="text-ink-muted">{data.accuracy}%</span>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/8">
                <div
                  className={`h-1.5 rounded-full transition-all ${ACC_BAR(data.accuracy)}`}
                  style={{ width: `${data.accuracy}%` }}
                />
              </div>
              <div className="text-[9px] text-ink-faint">{data.sampleSize} observations</div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-ink-faint text-center">
        Accuracy improves as Axis observes more outcomes over time.
      </p>
    </div>
  );
}
