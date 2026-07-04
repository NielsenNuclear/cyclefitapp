"use client";

import type { DayForecast, ReadinessForecast } from "@/lib/forecasting/forecastReadiness";

// ── Forecast metadata ──────────────────────────────────────────────────────

const FORECAST_META: Record<ReadinessForecast, {
  label:   string;
  bar:     string;
  text:    string;
  dot:     string;
  height:  number;  // bar height in px (visual weight, not a data value)
}> = {
  push:     { label: "Push",     bar: "bg-success",  text: "text-success-text",  dot: "bg-success",  height: 40 },
  maintain: { label: "Maintain", bar: "bg-brand",    text: "text-brand-text",    dot: "bg-brand",    height: 30 },
  watch:    { label: "Watch",    bar: "bg-caution",  text: "text-caution-text",  dot: "bg-caution",  height: 20 },
  recover:  { label: "Recover",  bar: "bg-danger",   text: "text-danger-text",   dot: "bg-danger",   height: 12 },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Bar chart day item ─────────────────────────────────────────────────────

function ForecastDayBar({
  forecast,
  label,
  isToday,
}: {
  forecast: DayForecast;
  label:    string;
  isToday?: boolean;
}) {
  const meta = FORECAST_META[forecast.readinessForecast];
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      {/* Bar track (fixed height container) */}
      <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
        <div
          className={`w-full rounded-t-lg ${meta.bar} transition-all duration-slow`}
          style={{ height: meta.height }}
          aria-label={`${label}: ${meta.label}`}
        />
      </div>

      {/* Day label */}
      <span className={`text-[10px] font-semibold ${isToday ? "text-brand" : "text-ink-muted"}`}>
        {label}
      </span>

      {/* Dot indicator */}
      <div className={`w-1.5 h-1.5 rounded-full ${isToday ? meta.dot : "bg-transparent"}`} aria-hidden="true" />
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────

function ForecastLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
      {(["push", "maintain", "watch", "recover"] as ReadinessForecast[]).map(f => {
        const m = FORECAST_META[f];
        return (
          <div key={f} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${m.dot}`} aria-hidden="true" />
            <span className={`text-[10px] font-semibold ${m.text}`}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

interface PredictionCardProps {
  forecasts:      DayForecast[];
  todayDayOfWeek: number;       // 0 (Sun) – 6 (Sat), used to label days
  className?:     string;
}

export function PredictionCard({ forecasts, todayDayOfWeek, className = "" }: PredictionCardProps) {
  if (forecasts.length === 0) {
    return (
      <div className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}>
        <p className="type-micro text-ink-muted mb-2">7-Day Readiness Outlook</p>
        <p className="text-[12px] text-ink-muted">
          Log a few check-ins to unlock your personalised readiness forecast.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="type-micro text-ink-muted">7-Day Readiness Outlook</p>
        <span className="text-[10px] text-ink-muted">Based on your cycle &amp; history</span>
      </div>

      {/* Bar chart */}
      <div className="flex gap-1.5" role="img" aria-label="7-day readiness forecast">
        {forecasts.map((f, i) => {
          const dow   = (todayDayOfWeek + f.daysFromNow) % 7;
          const label = f.daysFromNow === 1 ? "Tmrw" : DAY_NAMES[dow];
          return (
            <ForecastDayBar
              key={f.cycleDay}
              forecast={f}
              label={label}
              isToday={false}
            />
          );
        })}
      </div>

      <ForecastLegend />

      {/* Highlight any recover / watch days */}
      {forecasts.some(f => f.readinessForecast === "recover" || f.readinessForecast === "watch") && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="type-micro text-ink-muted mb-2">Heads up</p>
          <div className="space-y-1.5">
            {forecasts
              .filter(f => f.readinessForecast === "recover" || f.readinessForecast === "watch")
              .map(f => {
                const dow   = (todayDayOfWeek + f.daysFromNow) % 7;
                const meta  = FORECAST_META[f.readinessForecast];
                const name  = f.daysFromNow === 1 ? "Tomorrow" : DAY_NAMES[dow];
                return (
                  <div key={f.cycleDay} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} aria-hidden="true" />
                    <span className="text-[12px] text-ink-secondary">
                      <span className="font-semibold">{name}</span>
                      {" — "}
                      {f.readinessForecast === "recover"
                        ? "Recovery day recommended"
                        : "Take it easy, monitor how you feel"}
                      {f.drivingSymptoms.length > 0 && (
                        <span className="text-ink-muted"> ({f.drivingSymptoms.length} expected {f.drivingSymptoms.length === 1 ? "symptom" : "symptoms"})</span>
                      )}
                    </span>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}
