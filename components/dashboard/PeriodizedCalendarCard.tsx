"use client";

import type { PeriodizedCalendar, CalendarWeek, WeekLabel } from "@/lib/planning/periodizedCalendar";

const LABEL_CONFIG: Record<WeekLabel, { badge: string }> = {
  Foundation: { badge: "bg-[#F5F3EE] text-[#5C5850]"   },
  Build:      { badge: "bg-[#EEEDFE] text-[#3C3489]"   },
  Push:       { badge: "bg-[#E1F5EE] text-[#085041]"   },
  Deload:     { badge: "bg-[#FDF6EC] text-[#854F0B]"   },
  Recovery:   { badge: "bg-[#FEF2F2] text-[#991B1B]"   },
};

const INTENSITY_BAR: Record<CalendarWeek["intensity"], { filled: number; color: string }> = {
  high:     { filled: 5, color: "bg-[#6B5CE7]" },
  moderate: { filled: 3, color: "bg-[#6B5CE7]" },
  low:      { filled: 1, color: "bg-[#C8C5BC]" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function IntensityDots({ intensity }: { intensity: CalendarWeek["intensity"] }) {
  const config = INTENSITY_BAR[intensity];
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i < config.filled ? config.color : "bg-[#EBEBEB]"}`}
        />
      ))}
    </div>
  );
}

function formatWeekStart(isoDate: string, offset: number): string {
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function WeekRow({ week }: { week: CalendarWeek }) {
  const labelConfig = LABEL_CONFIG[week.label];
  const weekLabel   = formatWeekStart(week.weekStart, week.weekOffset);

  return (
    <div className="py-3 border-b border-[#F0EDE4] last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#1C1B18] w-20 shrink-0">
            {weekLabel}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${labelConfig.badge}`}>
            {week.label}
          </span>
        </div>
        <span className="text-[11px] text-[#9B9690]">
          {week.sessions} session{week.sessions !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <IntensityDots intensity={week.intensity} />
        {week.notes.length > 0 && week.weekOffset > 0 && (
          <span className="text-[10px] text-[#C8870E] leading-tight max-w-[160px] text-right">
            {week.notes[0]}
          </span>
        )}
      </div>
    </div>
  );
}

interface PeriodizedCalendarCardProps {
  calendar: PeriodizedCalendar | null;
}

export function PeriodizedCalendarCard({ calendar }: PeriodizedCalendarCardProps) {
  if (!calendar) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Upcoming 4 weeks</CardLabel>

      <div>
        {calendar.weeks.map(week => (
          <WeekRow key={week.weekOffset} week={week} />
        ))}
      </div>

      <p className="text-[10px] text-[#C8C5BC] mt-3 leading-relaxed">
        Projected from your training block and current signals · Subject to change
      </p>
    </div>
  );
}
