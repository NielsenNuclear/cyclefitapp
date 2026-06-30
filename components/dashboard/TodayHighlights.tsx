"use client";

interface TodayHighlightsProps {
  readinessCategory?:   string;
  recoveryCategory?:    string;
  recoveryTrend?:       string;
  phaseName:            string;
  daysUntilNextPhase:   number;
  fatigueZone?:         string;
  momentumDirection?:   string;
}

interface Highlight {
  text:  string;
  tone:  "positive" | "warning" | "neutral";
}

const TONE: Record<Highlight["tone"], { container: string; text: string }> = {
  positive: { container: "bg-[#E1F5EE] border-[#A8DFC8]", text: "text-[#085041]" },
  warning:  { container: "bg-[#FAEEDA] border-[#E4C88A]", text: "text-[#633806]" },
  neutral:  { container: "bg-[#F1EFE8] border-[#EAE7DE]", text: "text-[#5C5850]" },
};

function deriveHighlights(props: TodayHighlightsProps): Highlight[] {
  const {
    readinessCategory,
    recoveryCategory,
    recoveryTrend,
    phaseName,
    daysUntilNextPhase,
    fatigueZone,
    momentumDirection,
  } = props;

  const items: Highlight[] = [];

  // Fatigue override — highest priority when severe
  if (fatigueZone === "overreached") {
    items.push({ text: "Fatigue is elevated — today's volume has been adjusted", tone: "warning" });
  }

  // Readiness quality
  if (readinessCategory === "optimal") {
    items.push({ text: "Conditions are excellent for a strong session today", tone: "positive" });
  } else if (readinessCategory === "cautious") {
    items.push({ text: "Readiness is lower than usual — listen to your body today", tone: "warning" });
  } else if (readinessCategory === "recover") {
    items.push({ text: "Your body is asking for rest — recovery is the priority", tone: "warning" });
  }

  // Recovery trend
  if (recoveryTrend === "improving" && recoveryCategory !== "Poor") {
    items.push({ text: "Recovery has been trending upward over the past week", tone: "positive" });
  } else if (recoveryTrend === "rapidly_declining") {
    items.push({ text: "Recovery has been declining — easier sessions support rebuilding", tone: "warning" });
  }

  // Cycle window
  if ((phaseName === "Ovulatory" || phaseName === "Follicular") && daysUntilNextPhase <= 3) {
    items.push({ text: "Peak performance window — ideal timing for higher-intensity training", tone: "positive" });
  } else if (phaseName === "Ovulatory") {
    items.push({ text: "You may be in a peak performance window this week", tone: "positive" });
  } else if (phaseName === "Late Luteal") {
    items.push({ text: "Prioritise consistency over intensity during this phase", tone: "neutral" });
  } else if (phaseName === "Menstrual") {
    items.push({ text: "Shorter, gentler sessions support recovery during menstruation", tone: "neutral" });
  }

  // Momentum direction
  if (momentumDirection === "building") {
    items.push({ text: "Training momentum is building — consistency is paying off", tone: "positive" });
  } else if (momentumDirection === "fading") {
    items.push({ text: "Momentum is softening — showing up today will help maintain progress", tone: "neutral" });
  }

  return items.slice(0, 3);
}

export function TodayHighlights(props: TodayHighlightsProps) {
  const highlights = deriveHighlights(props);
  if (highlights.length === 0) return null;

  return (
    <div className="space-y-2">
      {highlights.map((h, i) => {
        const s = TONE[h.tone];
        return (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${s.container}`}
          >
            <span className={`text-[13px] leading-relaxed ${s.text}`}>{h.text}</span>
          </div>
        );
      })}
    </div>
  );
}
