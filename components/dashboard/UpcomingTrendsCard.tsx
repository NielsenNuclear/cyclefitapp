"use client";

import type { CycleForecast } from "@/lib/forecasting/forecastCycle";
import type { ForecastEvent } from "@/lib/forecasting/forecastSymptoms";
import type { DayForecast } from "@/lib/forecasting/forecastReadiness";
import { SYMPTOM_BY_ID } from "@/lib/symptoms/symptomCatalog";

// ─── Text helpers ─────────────────────────────────────────────────────────────

function timeText(daysFromNow: number): string {
  if (daysFromNow === 1) return "tomorrow";
  if (daysFromNow <= 7)  return `in ${daysFromNow} days`;
  return "next week";
}

function symptomPhrase(confidence: number, severity: number): string {
  if (confidence >= 0.75 && severity >= 2) return "commonly increases";
  if (confidence >= 0.65)                  return "tends to appear";
  if (confidence >= 0.5)                   return "likely";
  return "may appear";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function TrendBullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-[#F0EDE4] last:border-0">
      <span className="text-[#534AB7] mt-0.5 flex-shrink-0">•</span>
      <span className="text-[12px] text-[#1C1B18] leading-relaxed">{children}</span>
    </div>
  );
}

// ─── Bullet generators ────────────────────────────────────────────────────────

function SymptomBullet({ event }: { event: ForecastEvent }) {
  const symptom = SYMPTOM_BY_ID[event.symptomId];
  const name    = symptom?.name ?? event.symptomId;
  const phrase  = symptomPhrase(event.confidence, event.expectedSeverity);
  const time    = timeText(event.daysUntilStart);

  return (
    <TrendBullet>
      <span className="font-medium">{name}</span>
      {" "}
      <span className="text-[#5C5850]">{phrase} {time}</span>
    </TrendBullet>
  );
}

function ReadinessBullet({ day }: { day: DayForecast }) {
  const time = timeText(day.daysFromNow);

  const text = day.readinessForecast === "recover"
    ? `Recovery demand tends to increase ${time}`
    : `Training intensity may need moderating ${time}`;

  return (
    <TrendBullet>
      <span className="text-[#5C5850]">{text}</span>
    </TrendBullet>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface UpcomingTrendsCardProps {
  forecast: CycleForecast;
}

export function UpcomingTrendsCard({ forecast }: UpcomingTrendsCardProps) {
  const { symptomEvents, readinessDays } = forecast;

  if (symptomEvents.length === 0) return null;

  // Top 4 symptom bullets (already sorted by start day in forecastSymptoms)
  const topSymptoms = symptomEvents.slice(0, 4);

  // Earliest upcoming watch or recover day — shown as a readiness bullet if distinct
  const firstActionDay = readinessDays.find(
    d => d.readinessForecast === "recover" || d.readinessForecast === "watch"
  ) ?? null;

  // Avoid duplicate if that day's symptoms are already listed above
  const showReadinessBullet = firstActionDay !== null && firstActionDay.drivingSymptoms.some(
    id => !topSymptoms.find(e => e.symptomId === id)
  );

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Upcoming trends</CardLabel>

      <p className="text-[11px] text-[#9B9690] mb-1 leading-relaxed">
        Based on your previous cycles:
      </p>

      <div>
        {topSymptoms.map(event => (
          <SymptomBullet key={event.symptomId} event={event} />
        ))}
        {showReadinessBullet && firstActionDay && (
          <ReadinessBullet day={firstActionDay} />
        )}
      </div>

      <p className="text-[10px] text-[#C8C5BC] mt-3">
        Historical estimates only · May, likely, tends to — not guarantees
      </p>
    </div>
  );
}
