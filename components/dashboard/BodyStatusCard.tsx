"use client";

import { useRouter }    from "next/navigation";
import type { BodyIntelligenceSnapshot, MuscleState } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { STATE_COLOR, STATE_LABEL } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { EmptyState } from "@/components/ui/EmptyState";

interface BodyStatusCardProps {
  snapshot: BodyIntelligenceSnapshot | undefined;
}

// Compact muscle-status strip — summary chips only, no 3D on dashboard
function StatusChip({ state, count }: { state: MuscleState; count: number }) {
  if (count === 0) return null;
  const color = STATE_COLOR[state];
  const label = STATE_LABEL[state];
  return (
    <div className="flex items-center gap-1.5 bg-surface-subtle rounded-full px-2.5 py-1">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px] font-medium text-ink">{count}</span>
      <span className="text-[11px] text-ink-muted">{label}</span>
    </div>
  );
}

// Body silhouette made of pure CSS — front/back hints
function BodySilhouette({ snapshot }: { snapshot: BodyIntelligenceSnapshot }) {
  // Find dominant state counts
  const counts: Partial<Record<MuscleState, number>> = {};
  for (const m of snapshot.muscles) {
    counts[m.state] = (counts[m.state] ?? 0) + 1;
  }

  const topStates: MuscleState[] = ["scheduled", "fatigued", "overloaded", "injured", "recovering", "recovered"];
  const dominant = topStates.find(s => (counts[s] ?? 0) > 0);
  const dotColor = dominant ? STATE_COLOR[dominant] : "var(--color-border)";

  return (
    <div className="flex gap-3 items-center">
      {/* Simplified SVG silhouette */}
      <svg
        width="44" height="88"
        viewBox="0 0 44 88"
        fill="none"
        aria-hidden="true"
      >
        {/* Head */}
        <ellipse cx="22" cy="8" rx="6" ry="7" fill="var(--color-border)" />
        {/* Torso */}
        <rect x="12" y="17" width="20" height="28" rx="4" fill="var(--color-border)" />
        {/* Left arm */}
        <rect x="4" y="18" width="7" height="22" rx="3.5" fill="var(--color-border)" />
        {/* Right arm */}
        <rect x="33" y="18" width="7" height="22" rx="3.5" fill="var(--color-border)" />
        {/* Left leg */}
        <rect x="13" y="47" width="8" height="28" rx="4" fill="var(--color-border)" />
        {/* Right leg */}
        <rect x="23" y="47" width="8" height="28" rx="4" fill="var(--color-border)" />
        {/* Status dot overlay */}
        <circle cx="22" cy="30" r="6" fill={dotColor} opacity="0.7" />
      </svg>

      {/* Status summary */}
      <div className="space-y-1.5">
        {topStates
          .filter(s => (counts[s] ?? 0) > 0)
          .slice(0, 4)
          .map(s => (
            <StatusChip key={s} state={s} count={counts[s] ?? 0} />
          ))}
        {snapshot.muscles.every(m => m.state === "unknown") && (
          <div className="text-[11px] text-ink-muted">Log workouts to see muscle status</div>
        )}
      </div>
    </div>
  );
}

export function BodyStatusCard({ snapshot }: BodyStatusCardProps) {
  const router = useRouter();

  if (!snapshot) {
    return (
      <div className="bg-surface rounded-2xl border border-border shadow-card p-5">
        <EmptyState
          size="sm"
          title="Body Intelligence not started yet"
          description="Log a workout to activate your muscle map."
        />
      </div>
    );
  }

  const todayMuscles = snapshot.muscles.filter(m => m.state === "scheduled");
  const injuredCount = snapshot.muscles.filter(m => m.state === "injured").length;

  return (
    <button
      onClick={() => router.push("/body")}
      className="w-full text-left bg-surface rounded-2xl border border-border shadow-card p-5 hover:bg-canvas active:bg-surface-subtle transition-colors"
      aria-label="Open Body Intelligence — interactive muscle map"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-1">
            Body Intelligence
          </div>
          <div className="text-[16px] font-semibold text-ink">Muscle Map</div>
          {injuredCount > 0 && (
            <div className="text-[11px] text-danger mt-0.5 font-medium">
              {injuredCount} injury flag{injuredCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
        <div className="text-ink-faint mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      <BodySilhouette snapshot={snapshot} />

      {todayMuscles.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-ink-muted mb-2">
            Today's Targets
          </div>
          <div className="flex flex-wrap gap-1.5">
            {todayMuscles
              .filter(m => !m.id.endsWith("_right"))
              .slice(0, 5)
              .map(m => (
                <span
                  key={m.id}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-bg-mid text-brand-text"
                >
                  {m.displayName.replace(/ \((left|right)\)$/, "")}
                </span>
              ))}
            {todayMuscles.filter(m => !m.id.endsWith("_right")).length > 5 && (
              <span className="text-[10px] text-ink-muted px-1 py-0.5">
                +{todayMuscles.filter(m => !m.id.endsWith("_right")).length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 text-[11px] text-ink-muted flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Tap to open 3D muscle map
      </div>
    </button>
  );
}
