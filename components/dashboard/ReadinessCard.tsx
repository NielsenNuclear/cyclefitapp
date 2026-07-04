"use client";

import type { ReadinessScore, ReadinessContributors } from "@/lib/readiness/calculateReadiness";
import type { ReadinessCategory }                      from "@/lib/readiness/calculateReadiness";
import type { ReadinessTrend, ReadinessHistoryEntry }  from "@/lib/readiness/readinessHistory";
import { explainReadiness }                            from "@/lib/readiness/explainReadiness";
import { color }                                       from "@/lib/design/tokens";
import { Badge }                                       from "@/components/ui/Badge";
import { CardLabel }                                   from "@/components/ui/SectionHeader";
import { EmptyState }                                  from "@/components/ui/EmptyState";

// ── Category → token mappings ──────────────────────────────────────────────

type CategoryStyle = { badgeVariant: "success" | "brand" | "info" | "caution" | "neutral"; scoreColor: string; label: string };

const CATEGORY_STYLE: Record<ReadinessCategory, CategoryStyle> = {
  optimal:  { badgeVariant: "success", scoreColor: color.success,  label: "Optimal"  },
  ready:    { badgeVariant: "brand",   scoreColor: color.brand,    label: "Ready"    },
  moderate: { badgeVariant: "info",    scoreColor: color.info,     label: "Moderate" },
  cautious: { badgeVariant: "caution", scoreColor: color.caution,  label: "Cautious" },
  recover:  { badgeVariant: "neutral", scoreColor: color.neutral,  label: "Recover"  },
};

const CONTRIBUTOR_LABELS: Record<keyof ReadinessContributors, string> = {
  sleep:        "Sleep quality",
  stress:       "Stress level",
  energy:       "Energy pattern",
  cycle:        "Cycle phase",
  trainingLoad: "Training load",
  adherence:    "Training consistency",
};

// ── Trend ──────────────────────────────────────────────────────────────────

type TrendStyle = { arrow: string; badgeVariant: "success" | "brand" | "caution" };
const TREND_STYLE: Partial<Record<ReadinessTrend, TrendStyle>> = {
  improving: { arrow: "↑", badgeVariant: "success" },
  stable:    { arrow: "→", badgeVariant: "brand"   },
  declining: { arrow: "↓", badgeVariant: "caution" },
};

// ── Sparkline ──────────────────────────────────────────────────────────────

const BAR_COLOR: Record<ReadinessCategory, string> = {
  optimal:  color.success,
  ready:    color.brand,
  moderate: color.info,
  cautious: color.caution,
  recover:  color.neutral,
};

function Sparkline({ history }: { history: ReadinessHistoryEntry[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const ascending = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const slots: (ReadinessHistoryEntry | null)[] = [
    ...Array(7 - ascending.length).fill(null),
    ...ascending,
  ];

  return (
    <div className="mb-3">
      <p className="type-micro text-ink-muted mb-2">7-day trend</p>
      <div className="flex items-end gap-[3px]" style={{ height: 38 }}>
        {slots.map((entry, i) => {
          if (!entry) {
            return (
              <div key={i} className="flex-1 rounded-t-[2px] bg-border" style={{ height: 3 }} />
            );
          }
          const height  = Math.max(3, Math.round((entry.score / 100) * 36));
          const isToday = entry.date === today;
          return (
            <div
              key={entry.date}
              className="flex-1 rounded-t-[2px] transition-opacity"
              style={{
                height:          `${height}px`,
                backgroundColor: BAR_COLOR[entry.category],
                opacity:         isToday ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

interface ReadinessCardProps {
  score:    ReadinessScore | null;
  trend?:   ReadinessTrend;
  history?: ReadinessHistoryEntry[];
}

export function ReadinessCard({ score, trend, history }: ReadinessCardProps) {
  if (!score) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
        <CardLabel className="mb-3">Readiness</CardLabel>
        <EmptyState
          title="No readiness data yet"
          description="Complete your first check-in to activate the readiness engine."
          size="sm"
        />
      </div>
    );
  }

  const style     = CATEGORY_STYLE[score.category];
  const trendMeta = trend ? TREND_STYLE[trend] : undefined;

  const entries   = Object.entries(score.contributors) as [keyof ReadinessContributors, number][];
  const positives = entries.filter(([, v]) => v >= 70).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const limiting  = entries.filter(([, v]) => v <= 45).sort((a, b) => a[1] - b[1]).slice(0, 3);

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <CardLabel>Readiness</CardLabel>
        <Badge variant={style.badgeVariant}>{style.label}</Badge>
      </div>

      {/* Score + trend */}
      <div className="flex items-baseline gap-3 mb-4">
        <div className="flex items-baseline gap-1.5">
          <span
            className="type-metric-xl"
            style={{ color: style.scoreColor }}
          >
            {score.score}
          </span>
          <span className="text-[13px] text-ink-muted">/ 100</span>
        </div>
        {trendMeta && (
          <Badge variant={trendMeta.badgeVariant}>
            {trendMeta.arrow}&nbsp;{trend!.charAt(0).toUpperCase() + trend!.slice(1)}
          </Badge>
        )}
      </div>

      {/* 7-day sparkline */}
      {history && history.length > 1 && <Sparkline history={history} />}

      {/* Positive drivers */}
      {positives.length > 0 && (
        <div className="mb-3">
          <p className="type-micro text-ink-muted mb-1.5">Positive drivers</p>
          <div className="space-y-1.5">
            {positives.map(([key]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-success text-[11px] font-bold" aria-hidden="true">✓</span>
                <span className="text-[11px] text-ink">{CONTRIBUTOR_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Limiting factors */}
      {limiting.length > 0 && (
        <div className="mb-3">
          <p className="type-micro text-ink-muted mb-1.5">Limiting factors</p>
          <div className="space-y-1.5">
            {limiting.map(([key]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-caution text-[11px]" aria-hidden="true">•</span>
                <span className="text-[11px] text-ink">{CONTRIBUTOR_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="pt-3 border-t border-border">
        <p className="type-caption text-ink-secondary leading-relaxed">
          {explainReadiness(score)}
        </p>
      </div>
    </div>
  );
}
