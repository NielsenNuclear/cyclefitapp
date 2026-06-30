"use client";

import type { DailyRecommendation } from "@/types/recommendation";

interface DashboardHeaderProps {
  recommendation: DailyRecommendation;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getMotivationalContext(rec: DailyRecommendation): string {
  const badge = rec?.training?.badge ?? "Maintain";
  const phase = rec?.phase?.name ?? "Unknown";

  if (badge === "Push") return "Conditions look good for a strong session today.";
  if (badge === "Recover") return "Your body is signalling recovery — invest in it today.";
  if (phase === "Ovulatory") return "You may be approaching a performance peak this week.";
  if (phase === "Follicular") return "Energy is on an upward trend.";

  return "Your adaptive profile is active and updating.";

}

const BADGE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Push:     { bg: "bg-[#E1F5EE]",  text: "text-[#085041]",  dot: "bg-[#0F6E56]"  },
  Maintain: { bg: "bg-[#EEEDFE]",  text: "text-[#3C3489]",  dot: "bg-[#534AB7]"  },
  Watch:    { bg: "bg-[#FAEEDA]",  text: "text-[#633806]",  dot: "bg-[#854F0B]"  },
  Recover:  { bg: "bg-[#EEF0F2]",  text: "text-[#3D4451]",  dot: "bg-[#6B7280]"  },
};

export function DashboardHeader({ recommendation }: DashboardHeaderProps) {
  const greeting  = getGreeting();
  const context   = getMotivationalContext(recommendation);

  const badge     = recommendation?.training?.badge ?? "Maintain";
  const style     = BADGE_STYLES[badge] ?? BADGE_STYLES.Maintain;

  const today     = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
  return (
    <header className="px-5 pt-8 pb-6">
      <div className="max-w-2xl mx-auto">
        {/* Date */}
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
          {today}
        </div>

        {/* Greeting row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1
              className="text-[clamp(1.6rem,5vw,2.2rem)] font-light text-[#1C1B18] leading-tight mb-1.5"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              {greeting}.
            </h1>
            <p className="text-[13px] text-[#6B6860] leading-relaxed">{context}</p>
          </div>

          {/* Today's readiness badge */}
          <div className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-2xl ${style.bg} border border-white/60`}>
            <div className={`w-2 h-2 rounded-full ${style.dot}`} />
            <span className={`text-[11px] font-bold ${style.text} uppercase tracking-wider whitespace-nowrap`}>
              {badge}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
